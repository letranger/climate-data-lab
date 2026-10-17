#!/usr/bin/env python3
"""下載台灣版第五課資料集的所有原始檔。

每個來源的原始回應「原樣」存到 raw/，不做任何修改；同時把網址、下載時間、
位元組數、SHA-256 寫進 raw/manifest.json，之後 build.py 只讀 raw/ 組合，
任何數字都能對回這裡列的網址。

用法：
  python3 fetch.py            # 已存在的檔案不重抓
  python3 fetch.py --force    # 全部重抓
  python3 fetch.py codis owid # 只抓指定來源（名稱見 SOURCES 字典）

只用標準函式庫（urllib）。部分政府網站憑證鏈不完整，連線時不驗證憑證。
"""
import hashlib, json, ssl, sys, time, urllib.request, urllib.parse, zipfile, io, os, datetime as dt
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE / "raw"
RAW.mkdir(exist_ok=True)
MANIFEST = RAW / "manifest.json"
FORCE = "--force" in sys.argv
ONLY = [a for a in sys.argv[1:] if not a.startswith("--")]
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
UA = "Mozilla/5.0 (climate-data-lab Taiwan dataset builder; educational use)"

manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
mine = {}  # 這一次執行新增的項目；存檔時和磁碟上的清單合併，幾個 fetch.py 同時跑也不會互相覆蓋

def save_manifest():
    disk = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    disk.update(mine); manifest.update(disk)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True))

def fetch(url, dest, *, data=None, headers=None, note="", retries=3, sleep=0):
    """下載 url 到 raw/dest（已存在就跳過），記錄到 manifest。回傳 bytes。"""
    path = RAW / dest
    if path.exists() and not FORCE and dest in manifest:
        return path.read_bytes()
    body = urllib.parse.urlencode(data).encode() if isinstance(data, dict) else data
    url = urllib.parse.quote(url, safe=":/?&=%$~,.-_+")  # 網址裡的中文要先編碼
    req = urllib.request.Request(url, data=body, headers={"User-Agent": UA, **(headers or {})})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, context=CTX, timeout=180) as r:
                content = r.read()
            break
        except Exception as e:
            if i == retries - 1: raise
            print(f"   重試 {dest}: {e}"); time.sleep(5)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    mine[dest] = manifest[dest] = {
        "url": url, "post": data if isinstance(data, dict) else None, "note": note,
        "fetched": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(),
    }
    save_manifest()
    print(f"   ✓ {dest} ({len(content):,} bytes)")
    if sleep: time.sleep(sleep)
    return content

# ───────────────────────── 來源 ─────────────────────────
Y0, Y1 = 1980, 2025  # 年檔範圔

STATIONS = {"466920": "臺北", "467490": "臺中", "467410": "臺南", "467660": "臺東", "466990": "花蓮", "467590": "恆春"}

def codis():
    """中央氣象署 CODiS 觀測資料查詢系統，年報表（每年 12 個月的月統計）。"""
    for stn, name in STATIONS.items():
        for y in range(Y0, Y1 + 1):
            dest = f"codis/{stn}_{y}.json"
            fetch("https://codis.cwa.gov.tw/api/station", dest,
                  data={"type": "report_year", "date": f"{y}-01-01T00:00:00", "start": f"{y}-01-01T00:00:00",
                        "end": f"{y}-12-31T23:59:59", "stn_ID": stn, "stn_type": "cwb"},
                  note=f"氣象署 CODiS 年報表 {name}站 {y} 年（逐月統計）", sleep=1.5)

def typhoon():
    """維基百科「中央氣象署有發佈警報的颱風列表」（1958–），HTML 原頁。"""
    fetch("https://zh.wikipedia.org/zh-hant/中央氣象署有發佈警報的颱風列表", "wiki_typhoon_warning_list.html",
          note="維基百科整理之氣象署警報颱風列表（二手整理，含侵台路徑、警報期間、近臺強度、登陸點）")

MOEAEA = {13: "能源指標年資料", 70: "發電量年資料（依能源別）", 136: "天然氣供給與消費年資料",
          148: "電力消費年資料（2018 起）", 257: "電力消費年資料（2005–2017）", 69: "發電裝置容量年資料", 49: "再生能源裝置容量月資料"}

def moeaea():
    """經濟部能源署開放資料（data.gov.tw 轉載），CSV。"""
    for sid, name in MOEAEA.items():
        fetch(f"https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id={sid}",
              f"moeaea_set{sid}.csv", note=f"經濟部能源署 {name}")

def taipower():
    fetch("https://service.taipower.com.tw/data/opendata/apply/file/d003002/001.csv", "taipower_peak_load.csv",
          note="台灣電力公司 歷年尖峰負載及備用容量率（data.gov.tw 8307）")
    fetch("https://service.taipower.com.tw/data/opendata/apply/file/d003005/001.csv", "taipower_generation_by_source.csv",
          note="台灣電力公司 發購電量依能源別（data.gov.tw 35392，Big5 編碼）")
    fetch("https://service.taipower.com.tw/data/opendata/apply/file/d003005/002.csv", "taipower_sales_by_sector.csv",
          note="台灣電力公司 售電量依部門別（data.gov.tw 35392，Big5 編碼）")

MOENV_KEY = "846e44e1-8cc5-4893-ad87-c79d2d383706"  # 環境部資料開放平台在 data.gov.tw 頁面公開的示範 key

def moenv():
    fetch(f"https://data.moenv.gov.tw/api/v2/ghg_p_02?api_key={MOENV_KEY}&limit=1000&format=CSV", "moenv_ghg_inventory.csv",
          note="環境部 國家溫室氣體排放清冊 ghg_p_02（千公噸 CO2 當量）")

OWID = ["annual-co2-emissions-per-country", "co2-emissions-per-capita", "share-elec-by-source",
        "electricity-prod-source-stacked", "per-capita-electricity-generation", "gas-consumption-by-country",
        "primary-energy-cons", "population", "gdp-per-capita-maddison-project-database"]

def owid():
    """Our World in Data grapher CSV，只取台灣（TWN）。"""
    for slug in OWID:
        fetch(f"https://ourworldindata.org/grapher/{slug}.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest",
              f"owid_{slug}.csv", note=f"Our World in Data grapher「{slug}」台灣序列")
        fetch(f"https://ourworldindata.org/grapher/{slug}.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest",
              f"owid_{slug}.metadata.json", note=f"OWID「{slug}」的欄位說明與原始出處")

def moa_price():
    fetch("https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=652&FOTT=CSV&IsTransData=1",
          "moa_producer_price_monthly.csv", note="農業部 農產品產地價格月資料（data.gov.tw 33326，元/公斤）")

def roc(y, m, d): return f"{y - 1911}.{m:02d}.{d:02d}"

def month_range(y0, m0):
    y, m = y0, m0
    today = dt.date.today()
    while (y, m) <= (today.year, today.month):
        yield y, m
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)

def last_day(y, m): return (dt.date(y + (m == 12), m % 12 + 1, 1) - dt.timedelta(days=1)).day

def moa_wholesale():
    """農產品批發市場交易行情（逐日），API 一次最多 10,000 列，所以逐月分批。
    甘藍：全台所有市場；全部蔬菜（TcType=N04）：台北第一果菜市場（台北一）。"""
    for y, m in month_range(2012, 1):
        s, e = roc(y, m, 1), roc(y, m, last_day(y, m))
        base = "https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx?FOTT=CSV"
        fetch(f"{base}&StartDate={s}&EndDate={e}&Crop={urllib.parse.quote('甘藍')}", f"wholesale/cabbage_{y}-{m:02d}.csv",
              note=f"農業部 批發市場交易行情 甘藍 全部市場 {y}-{m:02d}", sleep=0.5)
        fetch(f"{base}&StartDate={s}&EndDate={e}&TcType=N04&Market={urllib.parse.quote('台北一')}", f"wholesale/veg_taipei1_{y}-{m:02d}.csv",
              note=f"農業部 批發市場交易行情 全部蔬菜 台北一市場 {y}-{m:02d}", sleep=0.5)

AGRSTAT = {"1440_52": "農業統計年報 114 年 農耕土地面積", "1440_10": "農業統計年報 114 年 作物生產",
           "1440_15": "農業統計年報 114 年 糧食價格", "1440_48": "農業統計年報 114 年 糧食自給率",
           "1440_29": "農業統計年報 114 年 農林漁牧業就業人口", "1440_70": "農業統計年報 114 年 化學肥料",
           "1440_17": "農業統計年報 114 年 蔬菜價格", "1443_9": "農業統計要覽 114 年 農耕土地、林地及魚塭面積",
           "1443_3": "農業統計要覽 114 年 重要指標"}

def agrstat():
    for ch, name in AGRSTAT.items():
        fetch(f"https://agrstat.moa.gov.tw/moasdweb/book/Book_File.ashx?chapter_id={ch}_1", f"agrstat_{ch}.ods", note=f"農業部 {name}（ODS）")

def faostat():
    """FAOSTAT 作物與畜產 bulk（約 34 MB），只保留 Area Code 214（China, Taiwan Province of）的列。"""
    dest = "faostat_crops_twn.csv"
    if (RAW / dest).exists() and not FORCE: return
    url = "https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data_(Normalized).zip"
    print("   下載 FAOSTAT zip…")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=CTX, timeout=600) as r: blob = r.read()
    z = zipfile.ZipFile(io.BytesIO(blob))
    name = [n for n in z.namelist() if n.endswith(".csv") and "Normalized" in n and "Flags" not in n and "ItemCodes" not in n and "AreaCodes" not in n][0]
    out = []
    with z.open(name) as f:
        head = f.readline().decode("latin-1"); out.append(head)
        for line in f:
            s = line.decode("latin-1")
            if s.startswith('"214",') or s.startswith("214,"): out.append(s)
    content = "".join(out).encode("utf-8")
    (RAW / dest).write_bytes(content)
    mine[dest] = manifest[dest] = {"url": url, "post": None, "note": f"FAOSTAT {name} 中 Area Code 214 的列（zip 原檔 {len(blob):,} bytes，sha256 {hashlib.sha256(blob).hexdigest()}）",
                      "fetched": dt.datetime.now().astimezone().isoformat(timespec="seconds"), "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}
    save_manifest(); print(f"   ✓ {dest} ({len(out) - 1:,} 列)")

def wra():
    fetch("https://opendata.wra.gov.tw/api/v2/55bd8e78-5e8b-47a5-9ea3-d7403d06a131?format=CSV", "wra_agri_water.csv",
          note="經濟部水利署 各項農業用水統計（data.gov.tw 58698）")
    fetch("https://opendata.wra.gov.tw/api/v2/a6f34dee-05f3-48e9-9fb1-94c688609018?format=CSV", "wra_domestic_water.csv",
          note="經濟部水利署 生活用水量統計（data.gov.tw 58694）")

def fisheries():
    base = "https://data.moa.gov.tw/Service/OpenData/FaRss.aspx?key=078&FOTT=CSV&IsTransData=1&UnitId=E58"
    for i in range(0, 5):
        skip = i * 10000
        c = fetch(f"{base}&$top=10000&$skip={skip}", f"fisheries_production_{i}.csv", note=f"農業部漁業署 每年度漁業種類別魚類別生產量（第 {i + 1} 頁，每頁 10,000 列）")
        if c.count(b"\n") < 10000: break

def tide():
    fetch("https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Climate/C-B0052-001.json", "cwa_tide_statistics.json",
          note="中央氣象署 潮位統計 C-B0052-001（data.gov.tw 98773，各潮位站逐月／逐年平均潮位）")

def ndc_land():
    fetch("https://ws.ndc.gov.tw/Download.ashx?u=LzAwMS9hZG1pbmlzdHJhdG9yLzEwL3JlbGZpbGUvNTc4MS82Mzk2L2E1ZTVhMzcwLTFhMjItNDkwNC04NTZjLTQwMjI3YjUyZWJmOC5jc3Y%3d&n=MS0xIOWcn%2bWcsOmdouepjeOAgeaItuaVuOOAgeS6uuWPo%2baVuOOAgeS6uuWPo%2bWvhuW6puOAgeW5tOm9oee1kOani%2bWPiuaJtumkiuavlOS%2biy5jc3Y%3d&icon=.csv",
          "ndc_land_area_population.csv", note="國發會轉載內政部 1-1 土地面積、戶數、人口數（data.gov.tw 6326，單一年度、分縣市）")

def hpa():
    try:
        c = fetch("https://www.hpa.gov.tw//Pages/ashx/GetFile.ashx?lang=c&type=1&sid=6985791107fc4ae0b7f6b0ba9d6ac32a", "hpa_heat_illness.csv",
                  note="衛福部國健署 熱傷害人次監測數據（data.gov.tw 157637）")
        if c.lstrip().startswith(b"<"):
            print("   ✗ 國健署回傳的是網頁不是 CSV，略過"); (RAW / "hpa_heat_illness.csv").unlink(); manifest.pop("hpa_heat_illness.csv", None); save_manifest()
    except Exception as e:
        print("   ✗ 國健署熱傷害抓不到：", e)

SOURCES = {"codis": codis, "typhoon": typhoon, "moeaea": moeaea, "taipower": taipower, "moenv": moenv, "owid": owid,
           "moa_price": moa_price, "moa_wholesale": moa_wholesale, "agrstat": agrstat, "faostat": faostat, "wra": wra,
           "fisheries": fisheries, "tide": tide, "hpa": hpa, "ndc_land": ndc_land}

if __name__ == "__main__":
    for name, fn in SOURCES.items():
        if ONLY and name not in ONLY: continue
        print(f"▶ {name}")
        fn()
    print("完成。清單：", MANIFEST)
