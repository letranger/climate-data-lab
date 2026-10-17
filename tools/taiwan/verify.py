#!/usr/bin/env python3
"""抽查：輸出檔裡的數字要和原始檔（或原始網站上看得到的數字）一樣。
每一條檢查寫明「原始檔哪個欄位」。跑完全部 OK 才算通過。"""
import csv, json, io
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE / "raw"
OUT = HERE.parent.parent / "data"

long = {}
for r in csv.reader(io.StringIO((OUT / "climate-change_twn.csv").read_text(encoding="utf-8"))):
    if len(r) == 6 and r[2].isdigit(): long[(r[3], int(r[2]))] = float(r[5])
mon = {}
for r in csv.reader(io.StringIO((OUT / "climate-change_twn_monthly.csv").read_text(encoding="utf-8"))):
    if len(r) == 7 and r[2].isdigit(): mon[(r[4], f"{r[2]}-{int(r[3]):02d}")] = float(r[6])

ok = True
def check(label, got, want, tol=1e-6):
    global ok
    good = got is not None and abs(got - want) <= tol * max(1, abs(want))
    ok &= good
    print(f"{'OK ' if good else 'FAIL'} {label}: 輸出 {got}，原始 {want}")

# 台電尖峰負載：raw/taipower_peak_load.csv 最後一列
tp = [r for r in csv.reader(io.StringIO((RAW / "taipower_peak_load.csv").read_text("utf-8-sig"))) if r and r[0].isdigit()]
check("Peak electricity load 2025 ＝ 台電 CSV 2025 列「尖峰負載(MW)」", long.get(("Peak electricity load (MW)", 2025)), float(tp[-1][1]))
check("Peak electricity load 1982", long.get(("Peak electricity load (MW)", 1982)), float(tp[0][1]))

# 環境部溫室氣體 2024 total_ghg_emission_value
g = list(csv.DictReader(io.StringIO((RAW / "moenv_ghg_inventory.csv").read_text("utf-8-sig"))))
g24 = [r for r in g if r["year"] == "2024"][0]
check("Total GHG 2024 ＝ 環境部 API total_ghg_emission_value", long.get(("Total greenhouse gas emissions (kt of CO2 equivalent)", 2024)), float(g24["total_ghg_emission_value"].replace(",", "")))

# OWID 核能占比 1985
o = [r for r in csv.DictReader(io.StringIO((RAW / "owid_share-elec-by-source.csv").read_text("utf-8-sig"))) if r["Year"] == "1985"][0]
check("Nuclear share 1985 ＝ OWID Nuclear", long.get(("Electricity production from nuclear sources (% of total)", 1985)), float(o["Nuclear"]), 1e-2)

# OWID CO2 2024（公噸 → 千公噸）
o = [r for r in csv.DictReader(io.StringIO((RAW / "owid_annual-co2-emissions-per-country.csv").read_text("utf-8-sig"))) if r["Year"] == "2024"][0]
check("CO2 kt 2024 ＝ OWID 公噸 ÷ 1000", long.get(("CO2 emissions (kt)", 2024)), float(list(o.values())[3]) / 1000, 1e-5)

# FAOSTAT 稻米 2023 產量
f = [r for r in csv.DictReader(io.StringIO((RAW / "faostat_crops_twn.csv").read_text("utf-8"))) if r["Item"] == "Rice" and r["Element"] == "Production" and r["Year"] == "2023"][0]
check("Rice production 2023 ＝ FAOSTAT Value", long.get(("Rice production (tonnes)", 2023)), float(f["Value"]))

# 能源署 set13 2024 人均用電
e = [r for r in csv.DictReader(io.StringIO((RAW / "moeaea_set13.csv").read_text("utf-8-sig"))) if r["西元年"] == "2024"][0]
check("kWh per capita 2024 ＝ 能源署 set13", long.get(("Electric power consumption (kWh per capita)", 2024)), float(e["平均每人用電量(度/人)"]), 1e-3)

# 能源署 set70 2024 核能占比 ＝ 核能/總發電
e = [r for r in csv.DictReader(io.StringIO((RAW / "moeaea_set70.csv").read_text("utf-8-sig"))) if r["西元年"] == "2024"][0]
check("Nuclear share official 2024 ＝ set70 核能_全國 ÷ 總發電量_全國 ×100", long.get(("Nuclear electricity share, official (% of total)", 2024)), float(e["核能_全國(統計數值)"]) / float(e["總發電量_全國(統計數值)"]) * 100, 1e-3)

# 土地面積
n = [r for r in csv.reader(io.StringIO((RAW / "ndc_land_area_population.csv").read_text("utf-8-sig"))) if len(r) > 2 and r[1] == "臺閩地區"][0]
check("Land area ＝ 內政部 2024 臺閩地區土地面積", long.get(("Land area (sq. km)", 2000)), float(n[2]))

# 要覽 農耕土地 2025（公頃→km²）：原始檔 2025 列的合計 775200.97 公頃（農業統計年報 114 年同值）
check("Agricultural land 2025 ＝ 要覽 775200.97 ha ÷ 100", long.get(("Agricultural land (sq. km)", 2025)), 775200.97 / 100, 1e-4)

# 產地價格：甘藍 2025 年 1 月 13.89（原始檔列「甘藍(元/公斤),2025年,13.89,…」）
check("Cabbage producer price 2025-01 ＝ 13.89", mon.get(("Cabbage producer price (NT$/kg)", "2025-01")), 13.89)

# CODiS：臺北 1980 年 7 月月均溫 ＝ raw/codis/466920_1980.json 第 7 個月 AirTemperature.Mean
j = json.loads((RAW / "codis/466920_1980.json").read_text())["data"][0]["dts"]
j98 = json.loads((RAW / "codis/466920_1998.json").read_text())["data"][0]["dts"]
check("Taipei mean temp 1998-07（逐月檔）＝ CODiS JSON", mon.get(("Mean temperature, Taipei (°C)", "1998-07")), j98[6]["AirTemperature"]["Mean"])
check("Taipei annual precipitation 1980 ＝ 12 個月 Accumulation 加總", long.get(("Annual precipitation, Taipei (mm)", 1980)), sum(m["Precipitation"]["Accumulation"] for m in j), 1e-3)
# 六站平均年均溫 2024 ＝ 六站各自 12 個月平均再平均
vals = []
for stn in ("466920", "467490", "467410", "467660", "466990", "467590"):
    d = json.loads((RAW / f"codis/{stn}_2024.json").read_text())["data"][0]["dts"]
    vals.append(sum(m["AirTemperature"]["Mean"] for m in d) / 12)
check("6-station mean temperature 2024", long.get(("Mean annual temperature, 6-station mean (°C)", 2024)), sum(vals) / 6, 1e-3)

# 潮位：基隆 2006 年平均潮位 ＝ JSON Annual[0]
t = json.loads((RAW / "cwa_tide_statistics.json").read_text())["cwaopendata"]["Resources"]["Resource"]["Data"]["SeaSurfaceObs"]["Location"]
k = [x for x in t if x["Station"]["StationName"] == "基隆潮位站"][0]["StationObsStatistics"]
check("Keelung MSL 2006 ＝ JSON Annual[0].MeanTideLevel", long.get(("Mean sea level, Keelung (m above TWVD2001)", int(k["DataYear"][0]))), float(k["Annual"][0]["MeanTideLevel"]))

# 颱風：2024 年氣象署發布警報的颱風（凱米、山陀兒、康芮、天兔）
tw = [r for r in csv.DictReader(io.StringIO((HERE / "typhoon_parsed.csv").read_text("utf-8"))) if r["year"] == "2024"]
print("     2024 年警報颱風：", [r["name"] for r in tw])
check("Typhoons with warning 2024 ＝ 解析列數", long.get(("Typhoons with CWA warning issued (count)", 2024)), len(tw))

print("\n全部通過" if ok else "\n有不一致，請檢查")
