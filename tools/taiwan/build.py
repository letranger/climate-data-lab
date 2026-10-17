#!/usr/bin/env python3
"""把 raw/ 裡的原始檔組合成台灣版第五課資料集。

輸出（都在 climate-data-lab/data/）：
  climate-change_twn.csv   長格式年資料（和 HDX 的世界銀行檔同欄位、同排法，含 #標籤列），1980–2025
  climate-change_twn_monthly.csv   長格式逐月資料（多一個 Month 欄，其餘和年檔相同），1998-01–2025-12
  SOURCES-taiwan.md        每一個欄位的來源、網址、原始檔、計算方式（由本程式自動產生）

原則：不改任何原始數值。只做三種事：(1) 直接搬值；(2) 明確註明的單位換算（例如公頃→平方公里）；
(3) 明確註明的彙總（例如六個測站取平均、12 個月加總、交易量加權平均）。每個欄位的做法都寫在 SOURCES。
"""
import csv, io, json, re, html, zipfile, statistics, datetime as dt
from pathlib import Path
from collections import defaultdict

HERE = Path(__file__).resolve().parent
RAW = HERE / "raw"
OUT = HERE.parent.parent / "data"
Y0, Y1 = 1980, 2025
M0 = 1998          # 逐月檔的起始年（農業部產地價格從 1998 年開始；更早只有氣象資料）
manifest = json.loads((RAW / "manifest.json").read_text())

# ───────────────────────── 小工具 ─────────────────────────
def read_csv(name, enc="utf-8-sig"):
    return list(csv.reader(io.StringIO((RAW / name).read_bytes().decode(enc))))

def num(s):
    if s is None: return None
    t = str(s).strip().replace(",", "")
    if t in ("", "-", "NE", "NA", "…", "nan", "null"): return None
    try: return float(t)
    except ValueError: return None

def ods_rows(name):
    x = zipfile.ZipFile(RAW / name).read("content.xml").decode()
    rows = []
    for r in re.findall(r"<table:table-row[^>]*>(.*?)</table:table-row>", x, re.S):
        out = []
        for m in re.finditer(r"<table:table-cell([^>]*?)(?:/>|>(.*?)</table:table-cell>)", r, re.S):
            a, b = m.group(1), m.group(2) or ""
            rep = re.search(r'number-columns-repeated="(\d+)"', a); n = int(rep.group(1)) if rep else 1
            v = re.search(r'office:value="([^"]*)"', a)
            txt = v.group(1) if v else html.unescape(re.sub("<[^>]+>", "", b)).strip()
            out += [txt] * min(n, 50)
        while out and out[-1] == "": out.pop()
        rows.append(out)
    return rows

def rnd(v, nd):
    return None if v is None else round(v, nd)

def mean(xs):
    xs = [x for x in xs if x is not None]
    return statistics.fmean(xs) if xs else None

# ───────────────────────── 指標登錄 ─────────────────────────
IND = {}      # name -> dict(code, zh, unit, source, how, data={year: value})
MON = {}      # name -> dict(code, zh, source, how, data={(y, m): value})
MON_ORDER = []
SRC = {}      # source key -> dict(org, title, urls=[...], files=[...], note)

def source(key, org, title, note="", files=(), urls=()):
    SRC[key] = {"org": org, "title": title, "note": note, "files": list(files), "urls": list(urls)}

def add(name, code, zh, source_key, how, data, nd=None):
    d = {y: (rnd(v, nd) if nd is not None else v) for y, v in data.items() if v is not None and Y0 <= y <= Y1}
    if not d: print(f"   ✗ {name}: 沒有資料，略過"); return
    IND[name] = {"code": code, "zh": zh, "source": source_key, "how": how, "data": d}
    ys = sorted(d); print(f"   ✓ {name}: {ys[0]}–{ys[-1]}，{len(d)} 年")

def addm(name, zh, source_key, how, data, nd=None):
    d = {k: (rnd(v, nd) if nd is not None else v) for k, v in data.items() if v is not None and M0 <= k[0] <= Y1}
    if not d: return
    code = "TW.M." + re.sub(r"[^A-Z0-9]+", ".", re.sub(r"\(.*?\)", "", name).upper()).strip(".")[:40]
    MON[name] = {"code": code, "zh": zh, "source": source_key, "how": how, "data": d}; MON_ORDER.append(name)

def files_for(prefix):
    return sorted(k for k in manifest if k.startswith(prefix))

def urls_for(prefix):
    return sorted({manifest[k]["url"] for k in manifest if k.startswith(prefix)})

# ───────────────────────── 1. 氣候：CODiS 六個百年測站 ─────────────────────────
STATIONS = {"466920": "臺北", "467490": "臺中", "467410": "臺南", "467660": "臺東", "466990": "花蓮", "467590": "恆春"}

def climate():
    print("▶ 氣候（CODiS）")
    files = files_for("codis/")
    if not files: print("   ✗ 沒有 codis 資料"); return
    source("codis", "中央氣象署", "觀測資料查詢系統 CODiS 年報表（逐月統計）",
           note="六個百年署屬測站：臺北 466920、臺中 467490、臺南 467410、臺東 467660、花蓮 466990、恆春 467590（高雄站 467440 於 2022 年 1 月遷站停用，為避免序列不連續，改用臺東站）。"
                "API：POST https://codis.cwa.gov.tw/api/station，參數 type=report_year、stn_ID、stn_type=cwb、start/end 為該年 1/1–12/31；"
                "每站每年一個 JSON，12 個月的統計值（月均溫、月雨量、≥35°C 日數…）原樣存在 raw/codis/。"
                "「六站平均」＝六站各自的年值再取算術平均，不是全臺平均；少任何一站或一個月就留空。"
                "CODiS 的 API 在臺北站 1992 年 2 月～1997 年 8 月、臺南站 1998 年 5 月～2001 年 12 月回傳空值（逐日資料也是空的），這些年份的臺北／臺南單站值與六站平均因此留空，沒有用其他資料補。",
           files=["codis/<站號>_<年>.json（共 %d 個）" % len(files)], urls=["https://codis.cwa.gov.tw/", "https://codis.cwa.gov.tw/api/station"])
    # st[stn][year] = list of 12 month dicts
    st = defaultdict(dict)
    for f in files:
        stn, y = Path(f).stem.split("_"); y = int(y)
        dts = json.loads((RAW / f).read_text())["data"][0]["dts"]
        if len(dts) != 12: print(f"   ! {f} 只有 {len(dts)} 個月"); continue
        st[stn][y] = dts
    def g(m, *path):
        v = m
        for p in path: v = v.get(p) if isinstance(v, dict) else None
        return v
    # 年值（每站）
    def annual(stn, y, fn):
        dts = st[stn].get(y)
        if not dts: return None
        vals = [fn(m) for m in dts]
        return None if any(v is None for v in vals) else vals
    def per_station(fn, agg):
        out = defaultdict(dict)
        for stn in STATIONS:
            for y in range(Y0, Y1 + 1):
                v = annual(stn, y, fn)
                if v is not None: out[stn][y] = agg(v)
        return out
    def six(ps):
        return {y: mean([ps[s][y] for s in STATIONS]) for y in range(Y0, Y1 + 1) if all(y in ps[s] for s in STATIONS)}
    S = sum
    specs = [
        ("Mean annual temperature, 6-station mean (°C)", "TW.CLM.TEMP.MEAN", "年平均氣溫，六站平均（°C）", lambda m: g(m, "AirTemperature", "Mean"), mean, "12 個月的月平均氣溫取平均，再六站平均", 2),
        ("Mean annual temperature, Taipei (°C)", "TW.CLM.TEMP.MEAN.TPE", "年平均氣溫，臺北（°C）", None, None, None, 2),
        ("Mean annual temperature, Tainan (°C)", "TW.CLM.TEMP.MEAN.TNN", "年平均氣溫，臺南（°C）", None, None, None, 2),
        ("Mean daily maximum temperature, 6-station mean (°C)", "TW.CLM.TEMP.TMAX", "年平均日最高溫，六站平均（°C）", lambda m: g(m, "AirTemperature", "MeanDailyMaximum"), mean, "12 個月的月平均日最高溫取平均，再六站平均", 2),
        ("Mean daily minimum temperature, 6-station mean (°C)", "TW.CLM.TEMP.TMIN", "年平均日最低溫，六站平均（°C）", lambda m: g(m, "AirTemperature", "MeanDailyMinimum"), mean, "12 個月的月平均日最低溫取平均，再六站平均", 2),
        ("Days with maximum temperature >= 35°C, 6-station mean (days)", "TW.CLM.HOT35", "日最高溫 ≥35°C 的日數，六站平均（天）", lambda m: g(m, "AirTemperature", "MaximumGE35Days"), S, "12 個月的 ≥35°C 日數加總，再六站平均", 1),
        ("Days with maximum temperature >= 35°C, Taipei (days)", "TW.CLM.HOT35.TPE", "日最高溫 ≥35°C 的日數，臺北（天）", None, None, None, 0),
        ("Days with minimum temperature <= 10°C, 6-station mean (days)", "TW.CLM.COLD10", "日最低溫 ≤10°C 的日數，六站平均（天）", lambda m: g(m, "AirTemperature", "MinimumLE10Days"), S, "12 個月的 ≤10°C 日數加總，再六站平均", 1),
        ("Annual precipitation, 6-station mean (mm)", "TW.CLM.PRCP", "年降雨量，六站平均（mm）", lambda m: g(m, "Precipitation", "Accumulation"), S, "12 個月的月雨量加總，再六站平均", 1),
        ("Annual precipitation, Taipei (mm)", "TW.CLM.PRCP.TPE", "年降雨量，臺北（mm）", None, None, None, 1),
        ("Annual precipitation, Tainan (mm)", "TW.CLM.PRCP.TNN", "年降雨量，臺南（mm）", None, None, None, 1),
        ("Typhoon-season (Jul-Sep) precipitation, 6-station mean (mm)", "TW.CLM.PRCP.JAS", "颱風季（7–9 月）降雨量，六站平均（mm）", lambda m: g(m, "Precipitation", "Accumulation"), lambda v: S(v[6:9]), "7、8、9 月的月雨量加總，再六站平均", 1),
        ("Rainy days (>= 0.1 mm), 6-station mean (days)", "TW.CLM.RAINDAYS", "降雨日數（≥0.1 mm），六站平均（天）", lambda m: g(m, "Precipitation", "PrecipitationDays"), S, "12 個月的降雨日數加總，再六站平均", 1),
        ("Maximum daily precipitation, 6-station mean (mm)", "TW.CLM.PRCP.MAXDAY", "年最大日雨量，六站平均（mm）", lambda m: g(m, "Precipitation", "DailyMaximum"), max, "12 個月的月最大日雨量取最大值（＝該年最大日雨量），再六站平均", 1),
        ("Sunshine duration, 6-station mean (hours)", "TW.CLM.SUNSHINE", "年日照時數，六站平均（小時）", lambda m: g(m, "SunshineDuration", "Total"), S, "12 個月的日照時數加總，再六站平均", 1),
        ("Mean relative humidity, 6-station mean (%)", "TW.CLM.RH", "年平均相對濕度，六站平均（%）", lambda m: g(m, "RelativeHumidity", "Mean"), mean, "12 個月的月平均相對濕度取平均，再六站平均", 1),
    ]
    cache = {}
    for name, code, zh, fn, agg, how, nd in specs:
        if fn is None:
            base = [s for s in specs if s[0].startswith(name.split(",")[0]) and s[3] is not None][0]
            ps = cache[base[0]]
            stn = "466920" if "Taipei" in name else "467410"
            add(name, code, zh, "codis", base[5].replace("，再六站平均", f"（{STATIONS[stn]}站 {stn} 單站）"), ps[stn], nd)
            continue
        ps = per_station(fn, agg); cache[name] = ps
        add(name, code, zh, "codis", how, six(ps), nd)
    # 逐月
    def monthly(fn, nd, zh, name, how):
        d6 = {}
        for y in range(Y0, Y1 + 1):
            for mi in range(12):
                vals = [fn(st[s][y][mi]) if y in st[s] else None for s in STATIONS]
                if all(v is not None for v in vals): d6[(y, mi + 1)] = mean(vals)
        addm(name, zh, "codis", how, d6, nd)
    monthly(lambda m: g(m, "AirTemperature", "Mean"), 2, "月平均氣溫，六站平均（°C）", "Mean temperature, 6-station mean (°C)", "六站的月平均氣溫取平均")
    monthly(lambda m: g(m, "AirTemperature", "MeanDailyMaximum"), 2, "月平均日最高溫，六站平均（°C）", "Mean daily maximum temperature, 6-station mean (°C)", "六站取平均")
    monthly(lambda m: g(m, "AirTemperature", "MaximumGE35Days"), 1, "≥35°C 日數，六站平均（天）", "Days with maximum temperature >= 35°C, 6-station mean (days)", "六站取平均")
    monthly(lambda m: g(m, "Precipitation", "Accumulation"), 1, "月雨量，六站平均（mm）", "Precipitation, 6-station mean (mm)", "六站取平均")
    monthly(lambda m: g(m, "Precipitation", "PrecipitationDays"), 1, "降雨日數，六站平均（天）", "Rainy days, 6-station mean (days)", "六站取平均")
    for stn, en in (("466920", "Taipei"), ("467410", "Tainan"), ("467660", "Taitung")):
        for key, nd, zh, nm in (("Mean", 2, "月平均氣溫", "Mean temperature"), ("Accumulation", 1, "月雨量", "Precipitation")):
            d = {}
            for y in range(Y0, Y1 + 1):
                if y in st[stn]:
                    for mi, m in enumerate(st[stn][y]):
                        v = g(m, "AirTemperature" if key == "Mean" else "Precipitation", key)
                        if v is not None: d[(y, mi + 1)] = v
            addm(f"{nm}, {en} ({'°C' if key == 'Mean' else 'mm'})", f"{zh}，{STATIONS[stn]}（{'°C' if key == 'Mean' else 'mm'}）", "codis", f"{STATIONS[stn]}站 {stn} 單站月值，直接搬", d, nd)

# ───────────────────────── 2. 颱風：維基百科警報颱風列表 ─────────────────────────
def typhoon():
    print("▶ 颱風（維基百科列表）")
    f = "wiki_typhoon_warning_list.html"
    if f not in manifest: return
    source("wiki_typhoon", "維基百科（整理自中央氣象署颱風資料庫）", "中央氣象署有發佈警報的颱風列表",
           note="二手整理資料：維基百科編者依氣象署颱風資料庫（https://rdc28.cwa.gov.tw/TDB/）整理的表格，1958 年起。"
                "氣象署資料庫本身的表格需登入才能下載，所以這裡用維基的 HTML 表格；年份取「警報期間」的起始年，月份取起始月。"
                "「侵臺」＝侵臺路徑欄不是「--」（路徑 1–9 或特殊）；「登陸」＝登陸點欄有地名；「強烈以上」＝近臺強度為強烈或超強。建議抽查幾年與氣象署資料庫核對。",
           files=[f], urls=[manifest[f]["url"], "https://rdc28.cwa.gov.tw/TDB/public/warning_typhoon_list/"])
    t = (RAW / f).read_text(encoding="utf-8")
    tables = re.findall(r'<table class="wikitable[^>]*>(.*?)</table>', t, re.S)
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tables[1], re.S)
    cells = lambda r: [html.unescape(re.sub("<[^>]+>", "", c)).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)]
    INT = {"輕度", "中度", "強烈", "超強"}
    recs = []
    for r in rows:
        c = cells(r)
        per = [x for x in c if re.match(r"\d{4}年\d{1,2}月", x)]
        if not per: continue
        m = re.match(r"(\d{4})年(\d{1,2})月", per[0]); y, mo = int(m.group(1)), int(m.group(2))
        pi = c.index(per[0]); path = c[pi - 1] if pi >= 1 else "--"
        ii = next((i for i, x in enumerate(c) if x in INT), None)
        inten = c[ii] if ii is not None else ""
        land = c[ii + 5] if ii is not None and ii + 5 < len(c) - 1 else ""
        recs.append({"y": y, "m": mo, "path": path, "int": inten, "land": land, "name": re.sub(r"[†‡*]", "", c[0])})
    (RAW.parent / "typhoon_parsed.csv").write_text("year,month,name,path,intensity,landfall\n" + "\n".join(f"{r['y']},{r['m']},{r['name']},{r['path']},{r['int']},{r['land']}" for r in recs), encoding="utf-8")
    def count(pred):
        d = defaultdict(int)
        for r in recs:
            if pred(r): d[r["y"]] += 1
        return {y: d.get(y, 0) for y in range(max(Y0, 1958), Y1 + 1)}
    def countm(pred):
        d = defaultdict(int)
        for r in recs:
            if pred(r): d[(r["y"], r["m"])] += 1
        return {(y, m): d.get((y, m), 0) for y in range(Y0, Y1 + 1) for m in range(1, 13)}
    aff = lambda r: r["path"] not in ("--", "", "—")
    land = lambda r: r["land"] not in ("", "--", "—", "-")
    strong = lambda r: r["int"] in ("強烈", "超強")
    add("Typhoons with CWA warning issued (count)", "TW.TYP.WARN", "氣象署發布警報的颱風數（個）", "wiki_typhoon", "該年警報期間起始的颱風列數", count(lambda r: True))
    add("Typhoons affecting Taiwan (count)", "TW.TYP.AFFECT", "侵臺颱風數（個）", "wiki_typhoon", "侵臺路徑欄不是「--」的颱風數", count(aff))
    add("Typhoons making landfall (count)", "TW.TYP.LANDFALL", "登陸颱風數（個）", "wiki_typhoon", "登陸點欄有地名的颱風數", count(land))
    add("Typhoons of strong intensity or above, warning issued (count)", "TW.TYP.STRONG", "強烈以上颱風數（個，有發警報）", "wiki_typhoon", "近臺強度為強烈或超強的颱風數", count(strong))
    addm("Typhoons with CWA warning issued (count)", "警報颱風數（個）", "wiki_typhoon", "警報期間起始在該月的颱風數", countm(lambda r: True))
    addm("Typhoons affecting Taiwan (count)", "侵臺颱風數（個）", "wiki_typhoon", "同上，且侵臺路徑不是「--」", countm(aff))
    print(f"   解析 {len(recs)} 個颱風，{min(r['y'] for r in recs)}–{max(r['y'] for r in recs)}")

# ───────────────────────── 3. 能源／排放／人口（OWID、能源署、台電、環境部） ─────────────────────────
def owid_series(slug):
    rows = read_csv(f"owid_{slug}.csv")
    hdr = rows[0]; out = {}
    for r in rows[1:]:
        if len(r) >= 4 and r[1] == "TWN" and r[2].lstrip("-").isdigit():
            out[int(r[2])] = {hdr[i]: num(r[i]) for i in range(3, len(hdr))}
    return hdr[3:], out

def energy():
    print("▶ 能源、排放、人口")
    # OWID
    source("owid", "Our World in Data（OWID）", "Grapher 圖表資料，台灣（TWN）序列",
           note="OWID 彙整各原始機構的資料：CO₂ 來自 Global Carbon Project；發電量與各能源占比來自 Energy Institute Statistical Review 與 Ember；"
                "天然氣與初級能源來自 Energy Institute；人口來自聯合國 World Population Prospects 等；人均 GDP 來自 Maddison Project Database。"
                "每個圖表的 .metadata.json 也存在 raw/，裡面有原始出處與欄位定義。台灣不在世界銀行資料庫，所以這些長序列用 OWID 補。",
           files=files_for("owid_"), urls=["https://ourworldindata.org/"] + urls_for("owid_"))
    if "owid_annual-co2-emissions-per-country.csv" in manifest:
        h, d = owid_series("annual-co2-emissions-per-country")
        add("CO2 emissions (kt)", "EN.ATM.CO2E.KT", None, "owid", f"OWID「{h[0]}」（公噸）÷ 1000 → 千公噸", {y: v[h[0]] / 1000 for y, v in d.items() if v[h[0]] is not None}, 3)
        h, d = owid_series("co2-emissions-per-capita")
        add("CO2 emissions (metric tons per capita)", "EN.ATM.CO2E.PC", None, "owid", f"OWID「{h[0]}」直接搬", {y: v[h[0]] for y, v in d.items()}, 3)
        h, d = owid_series("population")
        add("Population, total", "SP.POP.TOTL", None, "owid", f"OWID「{h[0]}」直接搬", {y: v[h[0]] for y, v in d.items()}, 0)
        h, d = owid_series("gdp-per-capita-maddison-project-database")
        add("GDP per capita (international-$ in 2011 prices, Maddison)", "TW.ECO.GDPPC", "人均 GDP（2011 年國際元，Maddison）", "owid", f"OWID「{h[0]}」直接搬", {y: v[h[0]] for y, v in d.items()}, 1)
        h, d = owid_series("electricity-prod-source-stacked")
        add("Electricity generation, total (TWh)", "TW.EGY.ELEC.GEN", "總發電量（TWh，十億度）", "owid", "OWID 各能源別發電量（TWh）加總：" + "＋".join(h), {y: sum(v[k] or 0 for k in h) for y, v in d.items()}, 2)
        h, d = owid_series("share-elec-by-source")
        for col, name, zh in (("Coal", "Electricity production from coal sources (% of total)", None), ("Gas", "Electricity production from natural gas sources (% of total)", None),
                              ("Nuclear", "Electricity production from nuclear sources (% of total)", None), ("Hydropower", "Electricity production from hydroelectric sources (% of total)", None),
                              ("Oil", "Electricity production from oil sources (% of total)", None)):
            add(name, "TW.EGY.SHARE." + col.upper(), zh, "owid", f"OWID「{col}」直接搬", {y: v[col] for y, v in d.items()}, 2)
        add("Electricity production from solar and wind (% of total)", "TW.EGY.SHARE.SOLARWIND", "太陽光電＋風力發電占比（%）", "owid", "OWID「Solar」＋「Wind」", {y: (v["Solar"] or 0) + (v["Wind"] or 0) for y, v in d.items() if v["Solar"] is not None or v["Wind"] is not None}, 2)
        h, d = owid_series("per-capita-electricity-generation")
        add("Electricity generation per capita (kWh per person)", "TW.EGY.ELEC.GEN.PC", "人均發電量（度／人）", "owid", f"OWID「{h[0]}」直接搬", {y: v[h[0]] for y, v in d.items()}, 0)
        h, d = owid_series("gas-consumption-by-country")
        add("Natural gas consumption (TWh)", "TW.EGY.GAS.CONS", "天然氣消費量（TWh）", "owid", f"OWID「{h[0]}」直接搬", {y: v[h[0]] for y, v in d.items()}, 2)
        h, d = owid_series("primary-energy-cons")
        add("Primary energy consumption (TWh)", "TW.EGY.PRIMARY", "初級能源消費量（TWh）", "owid", f"OWID「{h[0]}」直接搬", {y: v[h[0]] for y, v in d.items()}, 1)
    # 能源署
    source("moeaea", "經濟部能源署", "能源統計開放資料（年資料 CSV）",
           note="由 data.gov.tw 連到能源署網站下載，檔案只涵蓋最近約 21 年（2005 起），每年會滾動。raw/ 內的 CSV 原樣保留；欄位名稱寫在各指標的「做法」。",
           files=files_for("moeaea_"), urls=urls_for("moeaea_") + ["https://data.gov.tw/dataset/8308", "https://data.gov.tw/dataset/16481", "https://data.gov.tw/dataset/33271", "https://data.gov.tw/dataset/36683", "https://data.gov.tw/dataset/16480", "https://data.gov.tw/dataset/160061"])
    def moe(setid, col, yearcol="西元年"):
        rows = read_csv(f"moeaea_set{setid}.csv"); h = rows[0]
        ci = h.index(col); yi = h.index(yearcol)
        return {int(r[yi][:4]): num(r[ci]) for r in rows[1:] if r and r[yi][:4].isdigit()}
    if "moeaea_set13.csv" in manifest:
        add("Electric power consumption (kWh per capita)", "EG.USE.ELEC.KH.PC", None, "moeaea", "set_id=13 能源指標年資料「平均每人用電量(度/人)」直接搬", moe(13, "平均每人用電量(度/人)"), 1)
        add("Energy import dependency (%)", "TW.EGY.IMPORT.DEP", "進口能源依存度（%）", "moeaea", "set_id=13「進口能源依存度(%)」直接搬", moe(13, "進口能源依存度(%)"), 2)
        add("Electricity carbon intensity (kg CO2e per kWh)", "TW.EGY.ELEC.CO2", "電力排碳係數（公斤 CO2e／度）", "moeaea", "set_id=13「電力排碳係數(公斤CO2e/度)」直接搬", moe(13, "電力排碳係數(公斤CO2e/度)"), 3)
        add("Renewable electricity output, official (% of total electricity output)", "TW.EGY.RENEW.OFFICIAL", "再生能源發電占比，能源署（%）", "moeaea", "set_id=13「再生能源發電占總發電量比例(%)」直接搬", moe(13, "再生能源發電占總發電量比例(%)"), 2)
        add("CO2 emissions from fuel combustion, official (million tonnes)", "TW.ENV.CO2.FUEL", "燃料燃燒 CO2 排放量，能源署（百萬公噸）", "moeaea", "set_id=13「燃料燃燒二氧化碳排放量(百萬公噸)」直接搬", moe(13, "燃料燃燒二氧化碳排放量(百萬公噸)"), 3)
    if "moeaea_set70.csv" in manifest:
        tot = moe(70, "總發電量_全國(統計數值)"); nuc = moe(70, "核能_全國(統計數值)"); coal = moe(70, "火力_燃煤_全國(統計數值)"); gas = moe(70, "火力_燃氣_全國(統計數值)")
        add("Electricity generation, official (GWh)", "TW.EGY.ELEC.GEN.OFFICIAL", "總發電量，能源署（GWh，百萬度）", "moeaea", "set_id=70「總發電量_全國」（百萬度＝GWh）直接搬", tot, 1)
        add("Nuclear electricity share, official (% of total)", "TW.EGY.NUC.OFFICIAL", "核能發電占比，能源署（%）", "moeaea", "set_id=70「核能_全國」÷「總發電量_全國」× 100", {y: nuc[y] / tot[y] * 100 for y in tot if tot.get(y) and nuc.get(y) is not None}, 2)
        add("Coal electricity share, official (% of total)", "TW.EGY.COAL.OFFICIAL", "燃煤發電占比，能源署（%）", "moeaea", "set_id=70「火力_燃煤_全國」÷「總發電量_全國」× 100", {y: coal[y] / tot[y] * 100 for y in tot if tot.get(y) and coal.get(y) is not None}, 2)
        add("Natural gas electricity share, official (% of total)", "TW.EGY.GAS.OFFICIAL", "天然氣發電占比，能源署（%）", "moeaea", "set_id=70「火力_燃氣_全國」÷「總發電量_全國」× 100", {y: gas[y] / tot[y] * 100 for y in tot if tot.get(y) and gas.get(y) is not None}, 2)
    if "moeaea_set136.csv" in manifest:
        add("Natural gas imports (thousand cubic meters)", "TW.EGY.GAS.IMPORT", "天然氣進口量（千立方公尺）", "moeaea", "set_id=136「天然氣供給_進口量」直接搬", moe(136, "天然氣供給_進口量(統計數值)"), 0)
    if "moeaea_set257.csv" in manifest and "moeaea_set148.csv" in manifest:
        a = moe(257, "電力消費_總計(統計數值)"); b = moe(148, "電力消費_總計(統計數值)")
        add("Electricity consumption, total (GWh)", "TW.EGY.ELEC.CONS", "總用電量（GWh，百萬度）", "moeaea", "set_id=257（2005–2017）與 set_id=148（2018 起）的「電力消費_總計」（百萬度）接起來，同一機構同一序列分兩檔", {**a, **b}, 1)
    if "moeaea_set69.csv" in manifest:
        add("Solar PV installed capacity (MW)", "TW.EGY.SOLAR.CAP", "太陽光電裝置容量（MW，千瓩）", "moeaea", "set_id=69「再生能源_太陽光電_全國」（千瓩＝MW）直接搬", moe(69, "再生能源_太陽光電_全國(統計數值)"), 1)
    if "moeaea_set49.csv" in manifest:
        rows = read_csv("moeaea_set49.csv"); h = rows[0]; ci = h.index("再生能源發電裝置_太陽光電(數值)")
        addm("Solar PV installed capacity (MW)", "太陽光電裝置容量（MW）", "moeaea", "set_id=49 月資料「再生能源發電裝置_太陽光電」（千瓩＝MW）直接搬", {(int(r[0][:4]), int(r[0][4:6])): num(r[ci]) for r in rows[1:] if r and r[0][:6].isdigit()}, 1)
    # 台電
    if "taipower_peak_load.csv" in manifest: source("taipower", "台灣電力公司", "歷年尖峰負載及備用容量率", note="data.gov.tw 8307。尖峰負載是全年最高瞬時負載（MW），通常出現在夏季，可當「夏季用電高峰」的代理指標。民國 111 年起備用容量率改以夜間計算。",
           files=["taipower_peak_load.csv"], urls=[manifest["taipower_peak_load.csv"]["url"], "https://data.gov.tw/dataset/8307"])
    if "taipower_peak_load.csv" in manifest:
        rows = read_csv("taipower_peak_load.csv")
        add("Peak electricity load (MW)", "TW.EGY.PEAK", "年尖峰負載（MW）", "taipower", "「尖峰負載(MW)」直接搬", {int(r[0]): num(r[1]) for r in rows[1:] if r and r[0].isdigit()}, 0)
    # 環境部
    if "moenv_ghg_inventory.csv" in manifest: source("moenv", "環境部", "國家溫室氣體排放清冊（ghg_p_02）", note="data.moenv.gov.tw API，單位千公噸 CO₂ 當量；原始數值帶千分位逗號，讀取時去掉逗號。NE＝未估計。",
           files=["moenv_ghg_inventory.csv"], urls=[manifest["moenv_ghg_inventory.csv"]["url"].split("api_key=")[0] + "api_key=<key>&limit=1000&format=CSV", "https://data.moenv.gov.tw/dataset/detail/GHG_P_02"])
    if "moenv_ghg_inventory.csv" in manifest:
        rows = read_csv("moenv_ghg_inventory.csv"); h = rows[0]
        col = lambda c: {int(r[0]): num(r[h.index(c)]) for r in rows[1:] if r and r[0].isdigit()}
        add("Total greenhouse gas emissions (kt of CO2 equivalent)", "EN.ATM.GHGT.KT.CE", None, "moenv", "「total_ghg_emission_value」直接搬（去千分位逗號）", col("total_ghg_emission_value"), 0)
        add("Methane emissions (kt of CO2 equivalent)", "EN.ATM.METH.KT.CE", None, "moenv", "「ch4_value」直接搬", col("ch4_value"), 0)
        add("Net greenhouse gas emissions after removals (kt of CO2 equivalent)", "TW.ENV.GHG.NET", "淨溫室氣體排放量（扣除碳匯吸收，千公噸 CO2e）", "moenv", "「net_ghg_emission_value」直接搬", col("net_ghg_emission_value"), 0)
    # 土地面積
    if "ndc_land_area_population.csv" in manifest:
        source("ndc_land", "內政部（國發會轉載）", "土地面積、戶數、人口數（2024 年，分縣市）", note="data.gov.tw 6326，只有單一年度。土地面積幾乎不變，所以每一年都填同一個值（臺閩地區）。",
               files=["ndc_land_area_population.csv"], urls=[manifest["ndc_land_area_population.csv"]["url"], "https://data.gov.tw/dataset/6326"])
        rows = read_csv("ndc_land_area_population.csv"); h = rows[0]
        r = [x for x in rows[1:] if len(x) > 2 and x[1] == "臺閩地區"][0]
        add("Land area (sq. km)", "AG.LND.TOTL.K2", "土地面積（平方公里）", "ndc_land", f"{r[0]} 年臺閩地區「土地面積」{r[2]} 平方公里，每一年填同一值", {y: num(r[2]) for y in range(Y0, Y1 + 1)}, 4)

# ───────────────────────── 4. 農業（農業部要覽、FAOSTAT、水利署） ─────────────────────────
def agriculture():
    print("▶ 農業")
    if "agrstat_1443_9.ods" in manifest:
        source("agrstat_1443_9", "農業部統計處", "農業統計要覽 114 年「5. 農耕土地、林地及魚塭面積」（ODS）",
               note="1981 年起，2006 年以前每 5 年一筆，2006 年起逐年。單位公頃；本資料集換成平方公里（÷100）以和世界銀行欄位一致。",
               files=["agrstat_1443_9.ods"], urls=[manifest["agrstat_1443_9.ods"]["url"], "https://agrstat.moa.gov.tw/moasdweb/book/Book.aspx?bookID=1443"])
        rows = ods_rows("agrstat_1443_9.ods"); agri = {}; forest = {}; fish = {}
        for r in rows:
            yi = next((i for i, c in enumerate(r) if re.fullmatch(r"(19|20)\d\d", c)), None)
            if yi is None: continue
            y = int(r[yi]); vals = [num(c) for c in r[yi + 1:]]
            vals = [v for v in vals if v is not None]
            if len(vals) >= 3: agri[y], forest[y], fish[y] = vals[0], vals[-2], vals[-1]
        add("Agricultural land (sq. km)", "AG.LND.AGRI.K2", None, "agrstat_1443_9", "「農耕土地 合計」（公頃）÷ 100", {y: v / 100 for y, v in agri.items()}, 2)
        add("Forest area (sq. km)", "AG.LND.FRST.K2", None, "agrstat_1443_9", "「林地」（公頃）÷ 100", {y: v / 100 for y, v in forest.items()}, 2)
        add("Aquaculture pond area (sq. km)", "TW.AGR.FISHPOND.K2", "魚塭面積（平方公里）", "agrstat_1443_9", "「魚塭」（公頃）÷ 100", {y: v / 100 for y, v in fish.items()}, 2)
    if "faostat_crops_twn.csv" in manifest:
        source("faostat", "聯合國糧農組織 FAOSTAT", "Production: Crops and livestock products（bulk 下載，Area Code 214「China, Taiwan Province of」）",
               note="FAOSTAT 的台灣資料來自農業部提供的官方統計，1961 年起。raw/faostat_crops_twn.csv 只保留台灣的列，zip 原檔的大小與 SHA-256 記在 manifest。",
               files=["faostat_crops_twn.csv"], urls=[manifest["faostat_crops_twn.csv"]["url"], "https://www.fao.org/faostat/en/#data/QCL"])
        rows = read_csv("faostat_crops_twn.csv"); h = rows[0]
        ii, ei, yi, vi, ui = h.index("Item"), h.index("Element"), h.index("Year"), h.index("Value"), h.index("Unit")
        def fao(item, element):
            d = {int(r[yi]): num(r[vi]) for r in rows[1:] if len(r) > vi and r[ii] == item and r[ei] == element}
            u = {r[ui] for r in rows[1:] if len(r) > vi and r[ii] == item and r[ei] == element}
            return d, (u.pop() if u else "")
        items = {r[ii] for r in rows[1:] if len(r) > ii}
        for item, el, name, code, zh in (("Rice", "Area harvested", "Rice area harvested (ha)", "TW.AGR.RICE.AREA", "稻米收穫面積（公頃）"),
                                        ("Rice", "Production", "Rice production (tonnes)", "TW.AGR.RICE.PROD", "稻米產量（公噸）"),
                                        ("Rice", "Yield", "Rice yield (kg per hectare)", "TW.AGR.RICE.YIELD", "稻米每公頃產量（公斤／公頃）"),
                                        ("Vegetables Primary", "Production", "Vegetable production, total (tonnes)", "TW.AGR.VEG.PROD", "蔬菜總產量（公噸）"),
                                        ("Mangoes, guavas and mangosteens", "Production", "Mango, guava and mangosteen production (tonnes)", "TW.AGR.MANGO.PROD", "芒果（含番石榴、山竹）產量（公噸）"),
                                        ("Tea leaves", "Production", "Tea production (tonnes)", "TW.AGR.TEA.PROD", "茶葉產量（公噸）"),
                                        ("Cabbages", "Production", "Cabbage production (tonnes)", "TW.AGR.CABBAGE.PROD", "甘藍（高麗菜）產量（公噸）"),
                                        ("Bananas", "Production", "Banana production (tonnes)", "TW.AGR.BANANA.PROD", "香蕉產量（公噸）"),
                                        ("Pineapples", "Production", "Pineapple production (tonnes)", "TW.AGR.PINEAPPLE.PROD", "鳳梨產量（公噸）")):
            if item not in items: print(f"   ! FAOSTAT 沒有 item「{item}」"); continue
            d, u = fao(item, el)
            how = f"FAOSTAT Item「{item}」Element「{el}」（{u}）直接搬"
            if el == "Yield" and u in ("100 g/ha", "hg/ha"): d = {y: v / 10 for y, v in d.items()}; how += "，÷10 → 公斤／公頃"
            if el == "Yield" and u == "kg/ha": how = how
            add(name, code, zh, "faostat", how, d, 1 if el == "Yield" else 0)
    if "wra_agri_water.csv" in manifest:
        source("wra_agri", "經濟部水利署", "各項農業用水統計（data.gov.tw 58698）", note="欄位為北／中／南／東四區 × 灌溉／養殖／畜牧用水，單位百萬立方公尺，年為民國年。全國值＝12 個欄位加總。2020 年起統計方法有調整。",
               files=["wra_agri_water.csv"], urls=[manifest["wra_agri_water.csv"]["url"], "https://data.gov.tw/dataset/58698"])
        rows = read_csv("wra_agri_water.csv"); h = rows[0]
        cols = [i for i, c in enumerate(h) if c.endswith("thedomesticconsumptionofwater")]
        yi = h.index("year")
        d = {}
        for r in rows[1:]:
            if not r or not r[yi].isdigit(): continue
            y = int(r[yi]) + 1911
            vals = [num(r[i]) for i in cols]
            if all(v is not None for v in vals) and len(vals) == 12: d[y] = sum(vals)
        add("Agricultural water use (million cubic meters)", "TW.AGR.WATER", "農業用水量（百萬立方公尺）", "wra_agri", "北中南東四區的灌溉、養殖、畜牧用水 12 欄加總；年＝民國年＋1911", d, 2)

# ───────────────────────── 5. 菜價（農業部產地價格、批發市場） ─────────────────────────
VEG = [("甘藍(元/公斤)", "Cabbage", "甘藍（高麗菜）"), ("小白菜(元/公斤)", "Bok choy (xiao bai cai)", "小白菜"), ("蕹菜(空心菜)(元/公斤)", "Water spinach", "蕹菜（空心菜）"),
       ("青蔥(元/公斤)", "Green onion", "青蔥"), ("番茄(黑柿)(元/公斤)", "Tomato (black persimmon type)", "番茄（黑柿）"), ("蘿蔔(元/公斤)", "Radish", "蘿蔔"),
       ("花椰菜(白)(元/公斤)", "Cauliflower", "花椰菜（白）"), ("胡瓜(黑刺)(元/公斤)", "Cucumber (black-spined)", "胡瓜（黑刺）")]

def prices():
    print("▶ 菜價")
    if "moa_producer_price_monthly.csv" in manifest:
        source("moa_price", "農業部農糧署", "農產品產地價格月資料（data.gov.tw 33326）", note="每種作物每年一列、12 個月的產地（農場）價格，單位元/公斤，1998 年起。年平均＝12 個月都有值時取算術平均（月份不足 12 個的年份留空）。原始檔裡「甘藍」2008–2014 年的 6–12 月與 2015 全年是空白（「甘藍芽」是另一種作物，不合併）；青蔥 2015 年以前多數年份只有產季月份有價格，所以年平均從 2016 年起。",
               files=["moa_producer_price_monthly.csv"], urls=[manifest["moa_producer_price_monthly.csv"]["url"], "https://data.gov.tw/dataset/33326"])
        rows = [r for r in read_csv("moa_producer_price_monthly.csv") if len(r) >= 14]
        for crop, en, zh in VEG:
            m = {}
            for r in rows:
                if r[0] == crop and re.match(r"\d{4}年", r[1]):
                    y = int(r[1][:4])
                    for i in range(12):
                        v = num(r[2 + i])
                        if v is not None: m[(y, i + 1)] = v
            if not m: print(f"   ! 產地價格沒有「{crop}」"); continue
            addm(f"{en} producer price (NT$/kg)", f"{zh}產地價格（元／公斤）", "moa_price", f"「{crop}」各月直接搬", m, 2)
            ann = {y: mean([m.get((y, k)) for k in range(1, 13)]) for y in range(Y0, Y1 + 1) if all((y, k) in m for k in range(1, 13))}
            add(f"{en} producer price, annual mean (NT$/kg)", f"TW.PRC.{en.split()[0].upper()}", f"{zh}產地價格，年平均（元／公斤）", "moa_price", f"「{crop}」12 個月價格的算術平均", ann, 2)
            if en == "Cabbage":
                aso = {y: mean([m[(y, k)] for k in (8, 9, 10)]) for y in range(Y0, Y1 + 1) if all((y, k) in m for k in (8, 9, 10))}
                add("Cabbage producer price, Aug-Oct mean (NT$/kg)", "TW.PRC.CABBAGE.ASO", "甘藍產地價格，8–10 月平均（元／公斤）", "moa_price", "「甘藍(元/公斤)」8、9、10 月價格的算術平均（颱風季之後的菜價）", aso, 2)
                add("Cabbage producer price, Aug-Oct mean over annual mean (ratio)", "TW.PRC.CABBAGE.RATIO", "甘藍 8–10 月均價 ÷ 全年均價（倍）", "moa_price", "上面兩個指標相除", {y: aso[y] / ann[y] for y in aso if y in ann and ann[y]}, 3)
                feb = {y: mean([m[(y, k)] for k in (1, 2, 3)]) for y in range(Y0, Y1 + 1) if all((y, k) in m for k in (1, 2, 3))}
                add("Cabbage producer price, Jan-Mar mean (NT$/kg)", "TW.PRC.CABBAGE.JFM", "甘藍產地價格，1–3 月平均（元／公斤）", "moa_price", "1、2、3 月價格的算術平均（盛產季）", feb, 2)
    whole = files_for("wholesale/")
    if whole:
        source("moa_wholesale", "農業部農糧署", "農產品批發市場交易行情（逐日）", note="API 每次最多回 10,000 列，所以逐月分批抓；raw/wholesale/ 每月兩個檔：甘藍（全部市場）、全部蔬菜（種類代碼 N04，只取台北第一果菜市場「台北一」）。"
               "休市列（作物代號 rest）不計。月平均價＝Σ(平均價×交易量)÷Σ交易量（以交易量加權），月交易量＝Σ交易量。甘藍只取作物代號 LA1「甘藍-初秋」（本地主要品種），不含進口與其他品種。年值＝12 個月再以交易量加權。",
               files=["wholesale/cabbage_<年-月>.csv、wholesale/veg_taipei1_<年-月>.csv（共 %d 個）" % len(whole)],
               urls=["https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx?StartDate=<民國年.月.日>&EndDate=…&Crop=甘藍&FOTT=CSV", "https://data.gov.tw/dataset/8066"])
        def agg(prefix, keep):
            pm = {}; vm = {}
            for f in whole:
                if not Path(f).name.startswith(prefix): continue
                y, mo = map(int, Path(f).stem.split("_")[-1].split("-"))
                rows = read_csv(f); h = rows[0]
                try: ci, pi, qi = h.index("作物代號"), h.index("平均價"), h.index("交易量")
                except ValueError: continue
                sp = sq = 0.0
                for r in rows[1:]:
                    if len(r) <= qi or r[ci] == "rest" or not keep(r[ci]): continue
                    p, q = num(r[pi]), num(r[qi])
                    if p is None or q is None or q <= 0: continue
                    sp += p * q; sq += q
                if sq > 0: pm[(y, mo)] = sp / sq; vm[(y, mo)] = sq
            return pm, vm
        def annual_w(pm, vm):
            out = {}
            for y in range(Y0, Y1 + 1):
                ks = [(y, k) for k in range(1, 13) if (y, k) in pm]
                if len(ks) == 12: out[y] = sum(pm[k] * vm[k] for k in ks) / sum(vm[k] for k in ks)
            return out
        pm, vm = agg("cabbage_", lambda c: c == "LA1")
        addm("Cabbage wholesale price, all markets (NT$/kg)", "甘藍（初秋）批發均價，全部市場（元／公斤）", "moa_wholesale", "LA1 甘藍-初秋，各市場逐日「平均價」以「交易量」加權", pm, 2)
        addm("Cabbage wholesale volume, all markets (kg)", "甘藍（初秋）批發交易量，全部市場（公斤）", "moa_wholesale", "LA1 交易量加總", vm, 0)
        add("Cabbage wholesale price, all markets, annual (NT$/kg)", "TW.PRC.CABBAGE.WHOLESALE", "甘藍（初秋）批發均價，全部市場，年（元／公斤）", "moa_wholesale", "12 個月以交易量加權平均", annual_w(pm, vm), 2)
        add("Cabbage wholesale volume, all markets, annual (tonnes)", "TW.PRC.CABBAGE.VOLUME", "甘藍（初秋）批發交易量，全部市場，年（公噸）", "moa_wholesale", "12 個月交易量加總 ÷ 1000", {y: sum(vm[(y, k)] for k in range(1, 13)) / 1000 for y in range(Y0, Y1 + 1) if all((y, k) in vm for k in range(1, 13))}, 1)
        pm, vm = agg("veg_taipei1_", lambda c: True)
        addm("Vegetable wholesale price, all vegetables, Taipei First Market (NT$/kg)", "蔬菜批發均價，全部蔬菜，台北一市場（元／公斤）", "moa_wholesale", "台北一市場所有蔬菜（N04）逐日平均價以交易量加權", pm, 2)
        addm("Vegetable wholesale volume, Taipei First Market (kg)", "蔬菜批發交易量，台北一市場（公斤）", "moa_wholesale", "交易量加總", vm, 0)
        add("Vegetable wholesale price, all vegetables, Taipei First Market, annual (NT$/kg)", "TW.PRC.VEG.WHOLESALE", "蔬菜批發均價，台北一市場，年（元／公斤）", "moa_wholesale", "12 個月以交易量加權平均", annual_w(pm, vm), 2)

# ───────────────────────── 6. 生活：漁業、潮位、熱傷害 ─────────────────────────
def living():
    print("▶ 漁業、潮位、熱傷害")
    fish = files_for("fisheries_production_")
    if fish:
        source("fisheries", "農業部漁業署", "每年度漁業種類別魚類別生產量（data.gov.tw 80036）", note="漁業種類代碼首位：1 遠洋、2 近海、3 沿岸、4 內陸漁撈、5 海面養殖、6 內陸養殖。資料年月為民國年（三位數），＋1911。單位公噸。",
               files=fish, urls=[manifest[fish[0]]["url"].split("&$top")[0], "https://data.gov.tw/dataset/80036"])
        recs = []
        for f in fish:
            for r in read_csv(f)[1:]:
                if len(r) >= 4 and r[2].strip().isdigit(): recs.append((r[0].strip(), r[1].strip(), int(r[2]) + 1911, num(r[3]) or 0))
        def tot(pred):
            d = defaultdict(float)
            for cat, sp, y, v in recs:
                if pred(cat, sp): d[y] += v
            return dict(d)
        add("Fisheries production, distant-water (tonnes)", "TW.FSH.DISTANT", "遠洋漁業產量（公噸）", "fisheries", "漁業種類代碼 1 開頭的生產量加總", tot(lambda c, s: c[:1] == "1"), 0)
        add("Fisheries production, offshore and coastal (tonnes)", "TW.FSH.COASTAL", "近海＋沿岸漁業產量（公噸）", "fisheries", "代碼 2、3 開頭加總", tot(lambda c, s: c[:1] in "23"), 0)
        add("Aquaculture production (tonnes)", "TW.FSH.AQUA", "養殖漁業產量（公噸）", "fisheries", "代碼 5、6 開頭（海面養殖、內陸養殖）加總", tot(lambda c, s: c[:1] in "56"), 0)
        add("Mackerel catch, offshore and coastal (tonnes)", "TW.FSH.MACKEREL", "鯖魚捕獲量，近海＋沿岸（公噸）", "fisheries", "代碼 2、3 開頭且魚類代碍 5300 開頭（鯖、花腹鯖、白腹鯖）加總", tot(lambda c, s: c[:1] in "23" and s.startswith("5300")), 0)
        add("Grey mullet catch, offshore and coastal (tonnes)", "TW.FSH.MULLET", "烏魚（鯔）捕獲量，近海＋沿岸（公噸）", "fisheries", "代碼 2、3 開頭且魚類代碼 37001 鯔加總", tot(lambda c, s: c[:1] in "23" and s.startswith("37001")), 0)
    if "cwa_tide_statistics.json" in manifest:
        source("tide", "中央氣象署", "潮位統計 C-B0052-001（data.gov.tw 98773）", note="各潮位站逐年與逐月的平均潮位（公尺，相對臺灣高程基準 TWVD2001）。基隆、高雄 2006 年起。",
               files=["cwa_tide_statistics.json"], urls=[manifest["cwa_tide_statistics.json"]["url"], "https://data.gov.tw/dataset/98773"])
        locs = json.loads((RAW / "cwa_tide_statistics.json").read_text())["cwaopendata"]["Resources"]["Resource"]["Data"]["SeaSurfaceObs"]["Location"]
        for name, en in (("基隆潮位站", "Keelung"), ("高雄潮位站", "Kaohsiung")):
            l = [x for x in locs if x["Station"]["StationName"] == name][0]["StationObsStatistics"]
            years = [int(y) for y in l["DataYear"]]
            ann = {y: num(a["MeanTideLevel"]) for y, a in zip(years, l["Annual"])}
            add(f"Mean sea level, {en} (m above TWVD2001)", f"TW.SEA.{en.upper()}", f"年平均潮位，{name[:2]}（公尺，TWVD2001）", "tide", f"{name}「Annual」的 MeanTideLevel 直接搬，年份依 DataYear", ann, 3)
            mon = {}
            for i, m in enumerate(l["Monthly"]):
                y = years[i // 12] if i // 12 < len(years) else None
                if y: mon[(y, int(m["DataMonth"]))] = num(m["MeanTideLevel"])
            addm(f"Mean sea level, {en} (m)", f"月平均潮位，{name[:2]}（公尺）", "tide", f"{name}「Monthly」的 MeanTideLevel，每 12 筆一年", mon, 3)
    if "hpa_heat_illness.csv" in manifest:
        source("hpa", "衛生福利部國民健康署", "熱傷害人次監測數據（data.gov.tw 157637）", note="急診通報的熱傷害就診人次，逐日、分年齡性別縣市；只涵蓋通報醫院，不等於全國總數，適合看趨勢。檔案為 Big5 編碼。2011 年起。",
               files=["hpa_heat_illness.csv"], urls=[manifest["hpa_heat_illness.csv"]["url"], "https://data.gov.tw/dataset/157637"])
        rows = read_csv("hpa_heat_illness.csv", "cp950"); h = rows[0]; di, ci = h.index("admit_date"), h.index("SUM_of_count")
        yy = defaultdict(float); mm = defaultdict(float)
        for r in rows[1:]:
            if len(r) <= ci or not r[di][:4].isdigit(): continue
            y, mo = int(r[di][:4]), int(r[di][5:7]); v = num(r[ci]) or 0
            yy[y] += v; mm[(y, mo)] += v
        add("Heat illness emergency visits, reporting hospitals (visits)", "TW.HLT.HEAT", "熱傷害急診就診人次（通報醫院）", "hpa", "所有列的 SUM_of_count 依就診年加總", dict(yy), 0)
        addm("Heat illness emergency visits (visits)", "熱傷害急診人次", "hpa", "依就診年月加總", dict(mm), 0)

# ───────────────────────── 中文對照（給 indicators-zh.js） ─────────────────────────
def write_zh():
    existing = (OUT / "indicators-zh.js").read_text(encoding="utf-8")
    allzh = {n: d["zh"] for n, d in IND.items() if d["zh"]}
    for n, d in MON.items(): allzh.setdefault(n, d["zh"])
    p = HERE / "indicators-zh-taiwan.json"
    p.write_text(json.dumps(allzh, ensure_ascii=False, indent=1), encoding="utf-8")
    missing = [n for n in allzh if f'"{n}"' not in existing]
    print(f"   {len(allzh)} 個臺灣指標的中文名寫到 {p.name}（其中 {len(missing)} 個還不在 data/indicators-zh.js），執行 merge_zh.py 併入")
    noname = [n for n, d in IND.items() if not d["zh"] and f'"{n}"' not in existing]
    if noname: print("   ! 這些沿用世界銀行名稱的指標在 indicators-zh.js 找不到中文：", noname)

# ───────────────────────── 輸出 ─────────────────────────
def fmt(v):
    if v is None: return ""
    if isinstance(v, float) and v.is_integer(): return str(int(v))
    return repr(v) if isinstance(v, float) else str(v)

def write_long():
    q = lambda s: f'"{s}"' if ("," in s or '"' in s) else s
    lines = ["Country Name,Country ISO3,Year,Indicator Name,Indicator Code,Value", "#country+name,#country+code,#date+year,#indicator+name,#indicator+code,#indicator+value+num"]
    for name in sorted(IND):
        d = IND[name]
        for y in sorted(d["data"], reverse=True):
            lines.append(f"Taiwan,TWN,{y},{q(name)},{d['code']},{fmt(d['data'][y])}")
    (OUT / "climate-change_twn.csv").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"   climate-change_twn.csv：{len(IND)} 個指標，{len(lines) - 2:,} 列")

def write_monthly():
    """逐月檔也用 HDX 的長格式，只多一個 Month 欄（網站讀到 Month 欄就切換成逐月模式）。"""
    q = lambda s: f'"{s}"' if ("," in s or '"' in s) else s
    lines = ["Country Name,Country ISO3,Year,Month,Indicator Name,Indicator Code,Value",
             "#country+name,#country+code,#date+year,#date+month,#indicator+name,#indicator+code,#indicator+value+num"]
    for name in sorted(MON):
        d = MON[name]
        for (y, m) in sorted(d["data"], reverse=True):
            lines.append(f"Taiwan,TWN,{y},{m},{q(name)},{d['code']},{fmt(d['data'][(y, m)])}")
    (OUT / "climate-change_twn_monthly.csv").write_text("\n".join(lines) + "\n", encoding="utf-8")
    old = OUT / "taiwan_monthly.csv"
    if old.exists(): old.unlink()
    print(f"   climate-change_twn_monthly.csv：{len(MON)} 個指標，{len(lines) - 2:,} 列（{M0}-01–{Y1}-12）")

def write_sources():
    L = ["# 台灣資料集的來源說明（SOURCES-taiwan）", "",
         f"本文件由 `tools/taiwan/build.py` 自動產生（{dt.date.today()}）。`climate-change_twn.csv`（年）與 `climate-change_twn_monthly.csv`（月）裡的每一個數字，都能依下表對回原始機構的檔案。",
         "", "## 怎麼查證", "",
         "1. 原始下載檔原樣放在 `tools/taiwan/raw/`，`raw/manifest.json` 記錄每個檔的下載網址、下載時間、大小與 SHA-256。",
         "2. 每個指標的「做法」只有三種：直接搬值、註明的單位換算、註明的彙總（平均／加總／加權）。沒有任何估算或補值。",
         "3. 想重新產生：`python3 tools/taiwan/fetch.py`（重抓原始檔）→ `python3 tools/taiwan/build.py`。",
         "4. 「六站平均」是六個氣象署百年測站的平均，不是全臺面平均；「尖峰負載」是全年最高負載，用來代表夏季用電高峰；颱風統計是維基百科整理的二手資料。",
         "", "## 年資料 `climate-change_twn.csv`（%d–%d）" % (Y0, Y1), "",
         "| 欄位（Indicator Name） | 中文 | 年份 | 筆數 | 來源 | 做法 |", "|---|---|---|---|---|---|"]
    existing = (OUT / "indicators-zh.js").read_text(encoding="utf-8")
    for name in sorted(IND, key=lambda n: (IND[n]["source"], n)):
        d = IND[name]; ys = sorted(d["data"])
        zh = d["zh"] or (re.search(r'"%s": "([^"]+)"' % re.escape(name), existing) or [None, "（沿用世界銀行名稱）"])[1]
        L.append(f"| {name} | {zh} | {ys[0]}–{ys[-1]} | {len(ys)} | {SRC[d['source']]['org']} | {d['how']} |")
    L += ["", "## 逐月資料 `climate-change_twn_monthly.csv`（%d-01–%d-12）" % (M0, Y1), "",
          "和年檔同樣的長格式，多一個 `Month` 欄；網站讀到 Month 欄就自動切成逐月模式（一列是一個月）。從 1998 年起，因為農業部的產地價格從 1998 年開始；再早只剩氣象資料。", "",
          "| 欄位（Indicator Name） | 中文 | 起訖 | 筆數 | 來源 | 做法 |", "|---|---|---|---|---|---|"]
    for n in sorted(MON):
        d = MON[n]; ks = sorted(d["data"])
        L.append(f"| {n} | {d['zh']} | {ks[0][0]}-{ks[0][1]:02d}–{ks[-1][0]}-{ks[-1][1]:02d} | {len(ks)} | {SRC[d['source']]['org']} | {d['how']} |")
    L += ["", "## 各來源", ""]
    for k, s in SRC.items():
        L += [f"### {s['org']}：{s['title']}", ""]
        if s["note"]: L += [s["note"], ""]
        L += ["網址：", *[f"- {u}" for u in s["urls"]], "", "原始檔（tools/taiwan/raw/）：", *[f"- `{f}`" for f in s["files"]], ""]
    L += ["## 沒有納入的題目（查過但不可行）", "",
          "- 登革熱病例：疾管署在 data.gov.tw 與 od.cdc.gov.tw 的 CSV 已於 2026 年 3 月下架，只剩需互動查詢的 NIDSS。",
          "- 空氣品質、垃圾量：環境部 API 只有 2021 年起的資料。",
          "- 水庫蓄水量：開放資料只有最近兩天，沒有歷史。",
          "- 機動車輛數、全國人口與 GDP 長序列（主計總處、公路局）：需要互動查詢，沒有可直接下載的檔案。",
          "- 農業統計年報各表（稻米、糧食自給率、農業就業、化肥）：ODS 可下載但只有最近 10 年，在 1980 年起的年檔裡會被「缺失 60%」規則刪掉，所以改用 FAOSTAT 的長序列；要覽的農耕土地、林地面積 1981 年起則有納入。", ""]
    (OUT / "SOURCES-taiwan.md").write_text("\n".join(L), encoding="utf-8")
    print("   SOURCES-taiwan.md 已更新")

def report_missing_rule():
    n = Y1 - Y0 + 1
    print(f"\n網站「刪掉缺失 ≥60%」規則（{n} 年，需 ≥{-(-n * 40 // 100)} 年才會留下）會刪掉：")
    for name in sorted(IND):
        pct = 100 * (1 - len(IND[name]["data"]) / n)
        if pct >= 60: print(f"   − {name}（缺 {pct:.0f}%）")

if __name__ == "__main__":
    climate(); typhoon(); energy(); agriculture(); prices(); living()
    print("\n▶ 輸出"); write_long(); write_monthly(); write_sources(); write_zh(); report_missing_rule()
