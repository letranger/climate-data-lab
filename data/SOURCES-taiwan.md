# 台灣資料集的來源說明（SOURCES-taiwan）

本文件由 `tools/taiwan/build.py` 自動產生（2026-10-17）。`climate-change_twn.csv`（年）與 `climate-change_twn_monthly.csv`（月）裡的每一個數字，都能依下表對回原始機構的檔案。

## 怎麼查證

1. 原始下載檔原樣放在 `tools/taiwan/raw/`，`raw/manifest.json` 記錄每個檔的下載網址、下載時間、大小與 SHA-256。
2. 每個指標的「做法」只有三種：直接搬值、註明的單位換算、註明的彙總（平均／加總／加權）。沒有任何估算或補值。
3. 想重新產生：`python3 tools/taiwan/fetch.py`（重抓原始檔）→ `python3 tools/taiwan/build.py`。
4. 「六站平均」是六個氣象署百年測站的平均，不是全臺面平均；「尖峰負載」是全年最高負載，用來代表夏季用電高峰；颱風統計是維基百科整理的二手資料。

## 年資料 `climate-change_twn.csv`（1980–2025）

| 欄位（Indicator Name） | 中文 | 年份 | 筆數 | 來源 | 做法 |
|---|---|---|---|---|---|
| Agricultural land (sq. km) | 農地面積（平方公里） | 1981–2025 | 25 | 農業部統計處 | 「農耕土地 合計」（公頃）÷ 100 |
| Aquaculture pond area (sq. km) | 魚塭面積（平方公里） | 1981–2025 | 25 | 農業部統計處 | 「魚塭」（公頃）÷ 100 |
| Forest area (sq. km) | 森林面積（平方公里） | 1981–2025 | 25 | 農業部統計處 | 「林地」（公頃）÷ 100 |
| Annual precipitation, 6-station mean (mm) | 年降雨量，六站平均（mm） | 1980–2025 | 36 | 中央氣象署 | 12 個月的月雨量加總，再六站平均 |
| Annual precipitation, Tainan (mm) | 年降雨量，臺南（mm） | 1980–2025 | 42 | 中央氣象署 | 12 個月的月雨量加總（臺南站 467410 單站） |
| Annual precipitation, Taipei (mm) | 年降雨量，臺北（mm） | 1980–2025 | 40 | 中央氣象署 | 12 個月的月雨量加總（臺北站 466920 單站） |
| Days with maximum temperature >= 35°C, 6-station mean (days) | 日最高溫 ≥35°C 的日數，六站平均（天） | 1980–2025 | 36 | 中央氣象署 | 12 個月的 ≥35°C 日數加總，再六站平均 |
| Days with maximum temperature >= 35°C, Taipei (days) | 日最高溫 ≥35°C 的日數，臺北（天） | 1980–2025 | 40 | 中央氣象署 | 12 個月的 ≥35°C 日數加總（臺北站 466920 單站） |
| Days with minimum temperature <= 10°C, 6-station mean (days) | 日最低溫 ≤10°C 的日數，六站平均（天） | 1980–2025 | 36 | 中央氣象署 | 12 個月的 ≤10°C 日數加總，再六站平均 |
| Maximum daily precipitation, 6-station mean (mm) | 年最大日雨量，六站平均（mm） | 1980–2025 | 36 | 中央氣象署 | 12 個月的月最大日雨量取最大值（＝該年最大日雨量），再六站平均 |
| Mean annual temperature, 6-station mean (°C) | 年平均氣溫，六站平均（°C） | 1980–2025 | 36 | 中央氣象署 | 12 個月的月平均氣溫取平均，再六站平均 |
| Mean annual temperature, Tainan (°C) | 年平均氣溫，臺南（°C） | 1980–2025 | 42 | 中央氣象署 | 12 個月的月平均氣溫取平均（臺南站 467410 單站） |
| Mean annual temperature, Taipei (°C) | 年平均氣溫，臺北（°C） | 1980–2025 | 40 | 中央氣象署 | 12 個月的月平均氣溫取平均（臺北站 466920 單站） |
| Mean daily maximum temperature, 6-station mean (°C) | 年平均日最高溫，六站平均（°C） | 1980–2025 | 36 | 中央氣象署 | 12 個月的月平均日最高溫取平均，再六站平均 |
| Mean daily minimum temperature, 6-station mean (°C) | 年平均日最低溫，六站平均（°C） | 1980–2025 | 36 | 中央氣象署 | 12 個月的月平均日最低溫取平均，再六站平均 |
| Mean relative humidity, 6-station mean (%) | 年平均相對濕度，六站平均（%） | 1980–2025 | 36 | 中央氣象署 | 12 個月的月平均相對濕度取平均，再六站平均 |
| Rainy days (>= 0.1 mm), 6-station mean (days) | 降雨日數（≥0.1 mm），六站平均（天） | 1980–2025 | 36 | 中央氣象署 | 12 個月的降雨日數加總，再六站平均 |
| Sunshine duration, 6-station mean (hours) | 年日照時數，六站平均（小時） | 1980–2025 | 36 | 中央氣象署 | 12 個月的日照時數加總，再六站平均 |
| Typhoon-season (Jul-Sep) precipitation, 6-station mean (mm) | 颱風季（7–9 月）降雨量，六站平均（mm） | 1980–2025 | 36 | 中央氣象署 | 7、8、9 月的月雨量加總，再六站平均 |
| Banana production (tonnes) | 香蕉產量（公噸） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Bananas」Element「Production」（t）直接搬 |
| Cabbage production (tonnes) | 甘藍（高麗菜）產量（公噸） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Cabbages」Element「Production」（t）直接搬 |
| Mango, guava and mangosteen production (tonnes) | 芒果（含番石榴、山竹）產量（公噸） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Mangoes, guavas and mangosteens」Element「Production」（t）直接搬 |
| Pineapple production (tonnes) | 鳳梨產量（公噸） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Pineapples」Element「Production」（t）直接搬 |
| Rice area harvested (ha) | 稻米收穫面積（公頃） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Rice」Element「Area harvested」（ha）直接搬 |
| Rice production (tonnes) | 稻米產量（公噸） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Rice」Element「Production」（t）直接搬 |
| Rice yield (kg per hectare) | 稻米每公頃產量（公斤／公頃） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Rice」Element「Yield」（kg/ha）直接搬 |
| Tea production (tonnes) | 茶葉產量（公噸） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Tea leaves」Element「Production」（t）直接搬 |
| Vegetable production, total (tonnes) | 蔬菜總產量（公噸） | 1980–2024 | 45 | 聯合國糧農組織 FAOSTAT | FAOSTAT Item「Vegetables Primary」Element「Production」（t）直接搬 |
| Aquaculture production (tonnes) | 養殖漁業產量（公噸） | 2003–2023 | 21 | 農業部漁業署 | 代碼 5、6 開頭（海面養殖、內陸養殖）加總 |
| Fisheries production, distant-water (tonnes) | 遠洋漁業產量（公噸） | 2003–2023 | 21 | 農業部漁業署 | 漁業種類代碼 1 開頭的生產量加總 |
| Fisheries production, offshore and coastal (tonnes) | 近海＋沿岸漁業產量（公噸） | 2003–2023 | 21 | 農業部漁業署 | 代碼 2、3 開頭加總 |
| Grey mullet catch, offshore and coastal (tonnes) | 烏魚（鯔）捕獲量，近海＋沿岸（公噸） | 2003–2023 | 21 | 農業部漁業署 | 代碼 2、3 開頭且魚類代碼 37001 鯔加總 |
| Mackerel catch, offshore and coastal (tonnes) | 鯖魚捕獲量，近海＋沿岸（公噸） | 2003–2023 | 21 | 農業部漁業署 | 代碼 2、3 開頭且魚類代碍 5300 開頭（鯖、花腹鯖、白腹鯖）加總 |
| Heat illness emergency visits, reporting hospitals (visits) | 熱傷害急診就診人次（通報醫院） | 2011–2025 | 15 | 衛生福利部國民健康署 | 所有列的 SUM_of_count 依就診年加總 |
| Bok choy (xiao bai cai) producer price, annual mean (NT$/kg) | 小白菜產地價格，年平均（元／公斤） | 2005–2025 | 20 | 農業部農糧署 | 「小白菜(元/公斤)」12 個月價格的算術平均 |
| Cabbage producer price, Aug-Oct mean (NT$/kg) | 甘藍產地價格，8–10 月平均（元／公斤） | 1999–2025 | 19 | 農業部農糧署 | 「甘藍(元/公斤)」8、9、10 月價格的算術平均（颱風季之後的菜價） |
| Cabbage producer price, Aug-Oct mean over annual mean (ratio) | 甘藍 8–10 月均價 ÷ 全年均價（倍） | 1999–2025 | 19 | 農業部農糧署 | 上面兩個指標相除 |
| Cabbage producer price, Jan-Mar mean (NT$/kg) | 甘藍產地價格，1–3 月平均（元／公斤） | 1999–2025 | 26 | 農業部農糧署 | 1、2、3 月價格的算術平均（盛產季） |
| Cabbage producer price, annual mean (NT$/kg) | 甘藍（高麗菜）產地價格，年平均（元／公斤） | 1999–2025 | 19 | 農業部農糧署 | 「甘藍(元/公斤)」12 個月價格的算術平均 |
| Cauliflower producer price, annual mean (NT$/kg) | 花椰菜（白）產地價格，年平均（元／公斤） | 2002–2025 | 13 | 農業部農糧署 | 「花椰菜(白)(元/公斤)」12 個月價格的算術平均 |
| Cucumber (black-spined) producer price, annual mean (NT$/kg) | 胡瓜（黑刺）產地價格，年平均（元／公斤） | 1998–2025 | 27 | 農業部農糧署 | 「胡瓜(黑刺)(元/公斤)」12 個月價格的算術平均 |
| Green onion producer price, annual mean (NT$/kg) | 青蔥產地價格，年平均（元／公斤） | 2016–2025 | 10 | 農業部農糧署 | 「青蔥(元/公斤)」12 個月價格的算術平均 |
| Radish producer price, annual mean (NT$/kg) | 蘿蔔產地價格，年平均（元／公斤） | 2005–2019 | 13 | 農業部農糧署 | 「蘿蔔(元/公斤)」12 個月價格的算術平均 |
| Tomato (black persimmon type) producer price, annual mean (NT$/kg) | 番茄（黑柿）產地價格，年平均（元／公斤） | 2013–2025 | 12 | 農業部農糧署 | 「番茄(黑柿)(元/公斤)」12 個月價格的算術平均 |
| Water spinach producer price, annual mean (NT$/kg) | 蕹菜（空心菜）產地價格，年平均（元／公斤） | 1998–2025 | 20 | 農業部農糧署 | 「蕹菜(空心菜)(元/公斤)」12 個月價格的算術平均 |
| Cabbage wholesale price, all markets, annual (NT$/kg) | 甘藍（初秋）批發均價，全部市場，年（元／公斤） | 2012–2025 | 14 | 農業部農糧署 | 12 個月以交易量加權平均 |
| Cabbage wholesale volume, all markets, annual (tonnes) | 甘藍（初秋）批發交易量，全部市場，年（公噸） | 2012–2025 | 14 | 農業部農糧署 | 12 個月交易量加總 ÷ 1000 |
| Vegetable wholesale price, all vegetables, Taipei First Market, annual (NT$/kg) | 蔬菜批發均價，台北一市場，年（元／公斤） | 2012–2025 | 14 | 農業部農糧署 | 12 個月以交易量加權平均 |
| CO2 emissions from fuel combustion, official (million tonnes) | 燃料燃燒 CO2 排放量，能源署（百萬公噸） | 2005–2025 | 21 | 經濟部能源署 | set_id=13「燃料燃燒二氧化碳排放量(百萬公噸)」直接搬 |
| Coal electricity share, official (% of total) | 燃煤發電占比，能源署（%） | 2005–2025 | 21 | 經濟部能源署 | set_id=70「火力_燃煤_全國」÷「總發電量_全國」× 100 |
| Electric power consumption (kWh per capita) | 人均用電量（度／人） | 2005–2025 | 21 | 經濟部能源署 | set_id=13 能源指標年資料「平均每人用電量(度/人)」直接搬 |
| Electricity carbon intensity (kg CO2e per kWh) | 電力排碳係數（公斤 CO2e／度） | 2005–2025 | 21 | 經濟部能源署 | set_id=13「電力排碳係數(公斤CO2e/度)」直接搬 |
| Electricity consumption, total (GWh) | 總用電量（GWh，百萬度） | 2005–2025 | 21 | 經濟部能源署 | set_id=257（2005–2017）與 set_id=148（2018 起）的「電力消費_總計」（百萬度）接起來，同一機構同一序列分兩檔 |
| Electricity generation, official (GWh) | 總發電量，能源署（GWh，百萬度） | 2005–2025 | 21 | 經濟部能源署 | set_id=70「總發電量_全國」（百萬度＝GWh）直接搬 |
| Energy import dependency (%) | 進口能源依存度（%） | 2005–2025 | 21 | 經濟部能源署 | set_id=13「進口能源依存度(%)」直接搬 |
| Natural gas electricity share, official (% of total) | 天然氣發電占比，能源署（%） | 2005–2025 | 21 | 經濟部能源署 | set_id=70「火力_燃氣_全國」÷「總發電量_全國」× 100 |
| Natural gas imports (thousand cubic meters) | 天然氣進口量（千立方公尺） | 2005–2025 | 21 | 經濟部能源署 | set_id=136「天然氣供給_進口量」直接搬 |
| Nuclear electricity share, official (% of total) | 核能發電占比，能源署（%） | 2005–2025 | 21 | 經濟部能源署 | set_id=70「核能_全國」÷「總發電量_全國」× 100 |
| Renewable electricity output, official (% of total electricity output) | 再生能源發電占比，能源署（%） | 2005–2025 | 21 | 經濟部能源署 | set_id=13「再生能源發電占總發電量比例(%)」直接搬 |
| Solar PV installed capacity (MW) | 太陽光電裝置容量（MW，千瓩） | 2005–2025 | 21 | 經濟部能源署 | set_id=69「再生能源_太陽光電_全國」（千瓩＝MW）直接搬 |
| Methane emissions (kt of CO2 equivalent) | 甲烷排放量（千噸 CO2 當量） | 1990–2024 | 35 | 環境部 | 「ch4_value」直接搬 |
| Net greenhouse gas emissions after removals (kt of CO2 equivalent) | 淨溫室氣體排放量（扣除碳匯吸收，千公噸 CO2e） | 1990–2024 | 35 | 環境部 | 「net_ghg_emission_value」直接搬 |
| Total greenhouse gas emissions (kt of CO2 equivalent) | 溫室氣體總排放量（千噸 CO2 當量） | 1990–2024 | 35 | 環境部 | 「total_ghg_emission_value」直接搬（去千分位逗號） |
| Land area (sq. km) | 土地面積（平方公里） | 1980–2025 | 46 | 內政部（國發會轉載） | 2024 年臺閩地區「土地面積」36197.3371 平方公里，每一年填同一值 |
| CO2 emissions (kt) | 二氧化碳排放量（千噸） | 1980–2024 | 45 | Our World in Data（OWID） | OWID「Annual CO₂ emissions」（公噸）÷ 1000 → 千公噸 |
| CO2 emissions (metric tons per capita) | 人均二氧化碳排放量（公噸） | 1980–2024 | 45 | Our World in Data（OWID） | OWID「CO₂ emissions per capita」直接搬 |
| Electricity generation per capita (kWh per person) | 人均發電量（度／人） | 1985–2025 | 41 | Our World in Data（OWID） | OWID「Total electricity」直接搬 |
| Electricity generation, total (TWh) | 總發電量（TWh，十億度） | 1985–2025 | 41 | Our World in Data（OWID） | OWID 各能源別發電量（TWh）加總：Other renewables＋Bioenergy＋Solar＋Wind＋Hydropower＋Nuclear＋Gas＋Oil＋Coal |
| Electricity production from coal sources (% of total) | 燃煤發電占比（%） | 1985–2025 | 41 | Our World in Data（OWID） | OWID「Coal」直接搬 |
| Electricity production from hydroelectric sources (% of total) | 水力發電占比（%） | 1985–2025 | 41 | Our World in Data（OWID） | OWID「Hydropower」直接搬 |
| Electricity production from natural gas sources (% of total) | 天然氣發電占比（%） | 1985–2025 | 41 | Our World in Data（OWID） | OWID「Gas」直接搬 |
| Electricity production from nuclear sources (% of total) | 核能發電占比（%） | 1985–2025 | 41 | Our World in Data（OWID） | OWID「Nuclear」直接搬 |
| Electricity production from oil sources (% of total) | 燃油發電占比（%） | 1985–2025 | 41 | Our World in Data（OWID） | OWID「Oil」直接搬 |
| Electricity production from solar and wind (% of total) | 太陽光電＋風力發電占比（%） | 1985–2025 | 41 | Our World in Data（OWID） | OWID「Solar」＋「Wind」 |
| GDP per capita (international-$ in 2011 prices, Maddison) | 人均 GDP（2011 年國際元，Maddison） | 1980–2022 | 43 | Our World in Data（OWID） | OWID「GDP per capita」直接搬 |
| Natural gas consumption (TWh) | 天然氣消費量（TWh） | 1980–2025 | 46 | Our World in Data（OWID） | OWID「Gas」直接搬 |
| Population, total | 總人口 | 1980–2023 | 44 | Our World in Data（OWID） | OWID「Population」直接搬 |
| Primary energy consumption (TWh) | 初級能源消費量（TWh） | 1980–2025 | 46 | Our World in Data（OWID） | OWID「Total energy supply」直接搬 |
| Peak electricity load (MW) | 年尖峰負載（MW） | 1982–2025 | 44 | 台灣電力公司 | 「尖峰負載(MW)」直接搬 |
| Mean sea level, Kaohsiung (m above TWVD2001) | 年平均潮位，高雄（公尺，TWVD2001） | 2006–2025 | 20 | 中央氣象署 | 高雄潮位站「Annual」的 MeanTideLevel 直接搬，年份依 DataYear |
| Mean sea level, Keelung (m above TWVD2001) | 年平均潮位，基隆（公尺，TWVD2001） | 2006–2025 | 20 | 中央氣象署 | 基隆潮位站「Annual」的 MeanTideLevel 直接搬，年份依 DataYear |
| Typhoons affecting Taiwan (count) | 侵臺颱風數（個） | 1980–2025 | 46 | 維基百科（整理自中央氣象署颱風資料庫） | 侵臺路徑欄不是「--」的颱風數 |
| Typhoons making landfall (count) | 登陸颱風數（個） | 1980–2025 | 46 | 維基百科（整理自中央氣象署颱風資料庫） | 登陸點欄有地名的颱風數 |
| Typhoons of strong intensity or above, warning issued (count) | 強烈以上颱風數（個，有發警報） | 1980–2025 | 46 | 維基百科（整理自中央氣象署颱風資料庫） | 近臺強度為強烈或超強的颱風數 |
| Typhoons with CWA warning issued (count) | 氣象署發布警報的颱風數（個） | 1980–2025 | 46 | 維基百科（整理自中央氣象署颱風資料庫） | 該年警報期間起始的颱風列數 |
| Agricultural water use (million cubic meters) | 農業用水量（百萬立方公尺） | 1998–2020 | 23 | 經濟部水利署 | 北中南東四區的灌溉、養殖、畜牧用水 12 欄加總；年＝民國年＋1911 |

## 逐月資料 `climate-change_twn_monthly.csv`（1998-01–2025-12）

和年檔同樣的長格式，多一個 `Month` 欄；網站讀到 Month 欄就自動切成逐月模式（一列是一個月）。從 1998 年起，因為農業部的產地價格從 1998 年開始；再早只剩氣象資料。

| 欄位（Indicator Name） | 中文 | 起訖 | 筆數 | 來源 | 做法 |
|---|---|---|---|---|---|
| Bok choy (xiao bai cai) producer price (NT$/kg) | 小白菜產地價格（元／公斤） | 2004-11–2025-12 | 253 | 農業部農糧署 | 「小白菜(元/公斤)」各月直接搬 |
| Cabbage producer price (NT$/kg) | 甘藍（高麗菜）產地價格（元／公斤） | 1999-01–2025-12 | 263 | 農業部農糧署 | 「甘藍(元/公斤)」各月直接搬 |
| Cabbage wholesale price, all markets (NT$/kg) | 甘藍（初秋）批發均價，全部市場（元／公斤） | 2012-01–2025-12 | 168 | 農業部農糧署 | LA1 甘藍-初秋，各市場逐日「平均價」以「交易量」加權 |
| Cabbage wholesale volume, all markets (kg) | 甘藍（初秋）批發交易量，全部市場（公斤） | 2012-01–2025-12 | 168 | 農業部農糧署 | LA1 交易量加總 |
| Cauliflower producer price (NT$/kg) | 花椰菜（白）產地價格（元／公斤） | 1998-01–2025-12 | 253 | 農業部農糧署 | 「花椰菜(白)(元/公斤)」各月直接搬 |
| Cucumber (black-spined) producer price (NT$/kg) | 胡瓜（黑刺）產地價格（元／公斤） | 1998-01–2025-12 | 334 | 農業部農糧署 | 「胡瓜(黑刺)(元/公斤)」各月直接搬 |
| Days with maximum temperature >= 35°C, 6-station mean (days) | ≥35°C 日數，六站平均（天） | 1998-01–2025-12 | 292 | 中央氣象署 | 六站取平均 |
| Green onion producer price (NT$/kg) | 青蔥產地價格（元／公斤） | 1998-01–2025-12 | 263 | 農業部農糧署 | 「青蔥(元/公斤)」各月直接搬 |
| Heat illness emergency visits (visits) | 熱傷害急診人次 | 2011-01–2025-12 | 180 | 衛生福利部國民健康署 | 依就診年月加總 |
| Mean daily maximum temperature, 6-station mean (°C) | 月平均日最高溫，六站平均（°C） | 1998-01–2025-12 | 292 | 中央氣象署 | 六站取平均 |
| Mean sea level, Kaohsiung (m) | 月平均潮位，高雄（公尺） | 2006-01–2025-12 | 239 | 中央氣象署 | 高雄潮位站「Monthly」的 MeanTideLevel，每 12 筆一年 |
| Mean sea level, Keelung (m) | 月平均潮位，基隆（公尺） | 2006-01–2025-11 | 238 | 中央氣象署 | 基隆潮位站「Monthly」的 MeanTideLevel，每 12 筆一年 |
| Mean temperature, 6-station mean (°C) | 月平均氣溫，六站平均（°C） | 1998-01–2025-12 | 292 | 中央氣象署 | 六站的月平均氣溫取平均 |
| Mean temperature, Tainan (°C) | 月平均氣溫，臺南（°C） | 1998-01–2025-12 | 292 | 中央氣象署 | 臺南站 467410 單站月值，直接搬 |
| Mean temperature, Taipei (°C) | 月平均氣溫，臺北（°C） | 1998-01–2025-12 | 336 | 中央氣象署 | 臺北站 466920 單站月值，直接搬 |
| Mean temperature, Taitung (°C) | 月平均氣溫，臺東（°C） | 1998-01–2025-12 | 336 | 中央氣象署 | 臺東站 467660 單站月值，直接搬 |
| Precipitation, 6-station mean (mm) | 月雨量，六站平均（mm） | 1998-01–2025-12 | 292 | 中央氣象署 | 六站取平均 |
| Precipitation, Tainan (mm) | 月雨量，臺南（mm） | 1998-01–2025-12 | 292 | 中央氣象署 | 臺南站 467410 單站月值，直接搬 |
| Precipitation, Taipei (mm) | 月雨量，臺北（mm） | 1998-01–2025-12 | 336 | 中央氣象署 | 臺北站 466920 單站月值，直接搬 |
| Precipitation, Taitung (mm) | 月雨量，臺東（mm） | 1998-01–2025-12 | 336 | 中央氣象署 | 臺東站 467660 單站月值，直接搬 |
| Radish producer price (NT$/kg) | 蘿蔔產地價格（元／公斤） | 1998-01–2025-12 | 285 | 農業部農糧署 | 「蘿蔔(元/公斤)」各月直接搬 |
| Rainy days, 6-station mean (days) | 降雨日數，六站平均（天） | 1998-01–2025-12 | 292 | 中央氣象署 | 六站取平均 |
| Solar PV installed capacity (MW) | 太陽光電裝置容量（MW） | 2007-01–2025-12 | 228 | 經濟部能源署 | set_id=49 月資料「再生能源發電裝置_太陽光電」（千瓩＝MW）直接搬 |
| Tomato (black persimmon type) producer price (NT$/kg) | 番茄（黑柿）產地價格（元／公斤） | 2012-01–2025-12 | 166 | 農業部農糧署 | 「番茄(黑柿)(元/公斤)」各月直接搬 |
| Typhoons affecting Taiwan (count) | 侵臺颱風數（個） | 1998-01–2025-12 | 336 | 維基百科（整理自中央氣象署颱風資料庫） | 同上，且侵臺路徑不是「--」 |
| Typhoons with CWA warning issued (count) | 警報颱風數（個） | 1998-01–2025-12 | 336 | 維基百科（整理自中央氣象署颱風資料庫） | 警報期間起始在該月的颱風數 |
| Vegetable wholesale price, all vegetables, Taipei First Market (NT$/kg) | 蔬菜批發均價，全部蔬菜，台北一市場（元／公斤） | 2012-01–2025-12 | 168 | 農業部農糧署 | 台北一市場所有蔬菜（N04）逐日平均價以交易量加權 |
| Vegetable wholesale volume, Taipei First Market (kg) | 蔬菜批發交易量，台北一市場（公斤） | 2012-01–2025-12 | 168 | 農業部農糧署 | 交易量加總 |
| Water spinach producer price (NT$/kg) | 蕹菜（空心菜）產地價格（元／公斤） | 1998-01–2025-12 | 279 | 農業部農糧署 | 「蕹菜(空心菜)(元/公斤)」各月直接搬 |

## 各來源

### 中央氣象署：觀測資料查詢系統 CODiS 年報表（逐月統計）

六個百年署屬測站：臺北 466920、臺中 467490、臺南 467410、臺東 467660、花蓮 466990、恆春 467590（高雄站 467440 於 2022 年 1 月遷站停用，為避免序列不連續，改用臺東站）。API：POST https://codis.cwa.gov.tw/api/station，參數 type=report_year、stn_ID、stn_type=cwb、start/end 為該年 1/1–12/31；每站每年一個 JSON，12 個月的統計值（月均溫、月雨量、≥35°C 日數…）原樣存在 raw/codis/。「六站平均」＝六站各自的年值再取算術平均，不是全臺平均；少任何一站或一個月就留空。CODiS 的 API 在臺北站 1992 年 2 月～1997 年 8 月、臺南站 1998 年 5 月～2001 年 12 月回傳空值（逐日資料也是空的），這些年份的臺北／臺南單站值與六站平均因此留空，沒有用其他資料補。

網址：
- https://codis.cwa.gov.tw/
- https://codis.cwa.gov.tw/api/station

原始檔（tools/taiwan/raw/）：
- `codis/<站號>_<年>.json（共 276 個）`

### 維基百科（整理自中央氣象署颱風資料庫）：中央氣象署有發佈警報的颱風列表

二手整理資料：維基百科編者依氣象署颱風資料庫（https://rdc28.cwa.gov.tw/TDB/）整理的表格，1958 年起。氣象署資料庫本身的表格需登入才能下載，所以這裡用維基的 HTML 表格；年份取「警報期間」的起始年，月份取起始月。「侵臺」＝侵臺路徑欄不是「--」（路徑 1–9 或特殊）；「登陸」＝登陸點欄有地名；「強烈以上」＝近臺強度為強烈或超強。建議抽查幾年與氣象署資料庫核對。

網址：
- https://zh.wikipedia.org/zh-hant/%E4%B8%AD%E5%A4%AE%E6%B0%A3%E8%B1%A1%E7%BD%B2%E6%9C%89%E7%99%BC%E4%BD%88%E8%AD%A6%E5%A0%B1%E7%9A%84%E9%A2%B1%E9%A2%A8%E5%88%97%E8%A1%A8
- https://rdc28.cwa.gov.tw/TDB/public/warning_typhoon_list/

原始檔（tools/taiwan/raw/）：
- `wiki_typhoon_warning_list.html`

### Our World in Data（OWID）：Grapher 圖表資料，台灣（TWN）序列

OWID 彙整各原始機構的資料：CO₂ 來自 Global Carbon Project；發電量與各能源占比來自 Energy Institute Statistical Review 與 Ember；天然氣與初級能源來自 Energy Institute；人口來自聯合國 World Population Prospects 等；人均 GDP 來自 Maddison Project Database。每個圖表的 .metadata.json 也存在 raw/，裡面有原始出處與欄位定義。台灣不在世界銀行資料庫，所以這些長序列用 OWID 補。

網址：
- https://ourworldindata.org/
- https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/annual-co2-emissions-per-country.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/co2-emissions-per-capita.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/co2-emissions-per-capita.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/electricity-prod-source-stacked.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/electricity-prod-source-stacked.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/gas-consumption-by-country.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/gas-consumption-by-country.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/gdp-per-capita-maddison-project-database.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/gdp-per-capita-maddison-project-database.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/per-capita-electricity-generation.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/per-capita-electricity-generation.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/population.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/population.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/primary-energy-cons.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/primary-energy-cons.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/share-elec-by-source.csv?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest
- https://ourworldindata.org/grapher/share-elec-by-source.metadata.json?tab=chart&csvType=filtered&country=~TWN&time=earliest..latest

原始檔（tools/taiwan/raw/）：
- `owid_annual-co2-emissions-per-country.csv`
- `owid_annual-co2-emissions-per-country.metadata.json`
- `owid_co2-emissions-per-capita.csv`
- `owid_co2-emissions-per-capita.metadata.json`
- `owid_electricity-prod-source-stacked.csv`
- `owid_electricity-prod-source-stacked.metadata.json`
- `owid_gas-consumption-by-country.csv`
- `owid_gas-consumption-by-country.metadata.json`
- `owid_gdp-per-capita-maddison-project-database.csv`
- `owid_gdp-per-capita-maddison-project-database.metadata.json`
- `owid_per-capita-electricity-generation.csv`
- `owid_per-capita-electricity-generation.metadata.json`
- `owid_population.csv`
- `owid_population.metadata.json`
- `owid_primary-energy-cons.csv`
- `owid_primary-energy-cons.metadata.json`
- `owid_share-elec-by-source.csv`
- `owid_share-elec-by-source.metadata.json`

### 經濟部能源署：能源統計開放資料（年資料 CSV）

由 data.gov.tw 連到能源署網站下載，檔案只涵蓋最近約 21 年（2005 起），每年會滾動。raw/ 內的 CSV 原樣保留；欄位名稱寫在各指標的「做法」。

網址：
- https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id=13
- https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id=136
- https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id=148
- https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id=257
- https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id=49
- https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id=69
- https://www.moeaea.gov.tw/ECW/populace/opendata/wHandOpenData_File.ashx?set_id=70
- https://data.gov.tw/dataset/8308
- https://data.gov.tw/dataset/16481
- https://data.gov.tw/dataset/33271
- https://data.gov.tw/dataset/36683
- https://data.gov.tw/dataset/16480
- https://data.gov.tw/dataset/160061

原始檔（tools/taiwan/raw/）：
- `moeaea_set13.csv`
- `moeaea_set136.csv`
- `moeaea_set148.csv`
- `moeaea_set257.csv`
- `moeaea_set49.csv`
- `moeaea_set69.csv`
- `moeaea_set70.csv`

### 台灣電力公司：歷年尖峰負載及備用容量率

data.gov.tw 8307。尖峰負載是全年最高瞬時負載（MW），通常出現在夏季，可當「夏季用電高峰」的代理指標。民國 111 年起備用容量率改以夜間計算。

網址：
- https://service.taipower.com.tw/data/opendata/apply/file/d003002/001.csv
- https://data.gov.tw/dataset/8307

原始檔（tools/taiwan/raw/）：
- `taipower_peak_load.csv`

### 環境部：國家溫室氣體排放清冊（ghg_p_02）

data.moenv.gov.tw API，單位千公噸 CO₂ 當量；原始數值帶千分位逗號，讀取時去掉逗號。NE＝未估計。

網址：
- https://data.moenv.gov.tw/api/v2/ghg_p_02?api_key=<key>&limit=1000&format=CSV
- https://data.moenv.gov.tw/dataset/detail/GHG_P_02

原始檔（tools/taiwan/raw/）：
- `moenv_ghg_inventory.csv`

### 內政部（國發會轉載）：土地面積、戶數、人口數（2024 年，分縣市）

data.gov.tw 6326，只有單一年度。土地面積幾乎不變，所以每一年都填同一個值（臺閩地區）。

網址：
- https://ws.ndc.gov.tw/Download.ashx?u=LzAwMS9hZG1pbmlzdHJhdG9yLzEwL3JlbGZpbGUvNTc4MS82Mzk2L2E1ZTVhMzcwLTFhMjItNDkwNC04NTZjLTQwMjI3YjUyZWJmOC5jc3Y%3d&n=MS0xIOWcn%2bWcsOmdouepjeOAgeaItuaVuOOAgeS6uuWPo%2baVuOOAgeS6uuWPo%2bWvhuW6puOAgeW5tOm9oee1kOani%2bWPiuaJtumkiuavlOS%2biy5jc3Y%3d&icon=.csv
- https://data.gov.tw/dataset/6326

原始檔（tools/taiwan/raw/）：
- `ndc_land_area_population.csv`

### 農業部統計處：農業統計要覽 114 年「5. 農耕土地、林地及魚塭面積」（ODS）

1981 年起，2006 年以前每 5 年一筆，2006 年起逐年。單位公頃；本資料集換成平方公里（÷100）以和世界銀行欄位一致。

網址：
- https://agrstat.moa.gov.tw/moasdweb/book/Book_File.ashx?chapter_id=1443_9_1
- https://agrstat.moa.gov.tw/moasdweb/book/Book.aspx?bookID=1443

原始檔（tools/taiwan/raw/）：
- `agrstat_1443_9.ods`

### 聯合國糧農組織 FAOSTAT：Production: Crops and livestock products（bulk 下載，Area Code 214「China, Taiwan Province of」）

FAOSTAT 的台灣資料來自農業部提供的官方統計，1961 年起。raw/faostat_crops_twn.csv 只保留台灣的列，zip 原檔的大小與 SHA-256 記在 manifest。

網址：
- https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data_(Normalized).zip
- https://www.fao.org/faostat/en/#data/QCL

原始檔（tools/taiwan/raw/）：
- `faostat_crops_twn.csv`

### 經濟部水利署：各項農業用水統計（data.gov.tw 58698）

欄位為北／中／南／東四區 × 灌溉／養殖／畜牧用水，單位百萬立方公尺，年為民國年。全國值＝12 個欄位加總。2020 年起統計方法有調整。

網址：
- https://opendata.wra.gov.tw/api/v2/55bd8e78-5e8b-47a5-9ea3-d7403d06a131?format=CSV
- https://data.gov.tw/dataset/58698

原始檔（tools/taiwan/raw/）：
- `wra_agri_water.csv`

### 農業部農糧署：農產品產地價格月資料（data.gov.tw 33326）

每種作物每年一列、12 個月的產地（農場）價格，單位元/公斤，1998 年起。年平均＝12 個月都有值時取算術平均（月份不足 12 個的年份留空）。原始檔裡「甘藍」2008–2014 年的 6–12 月與 2015 全年是空白（「甘藍芽」是另一種作物，不合併）；青蔥 2015 年以前多數年份只有產季月份有價格，所以年平均從 2016 年起。

網址：
- https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=652&FOTT=CSV&IsTransData=1
- https://data.gov.tw/dataset/33326

原始檔（tools/taiwan/raw/）：
- `moa_producer_price_monthly.csv`

### 農業部農糧署：農產品批發市場交易行情（逐日）

API 每次最多回 10,000 列，所以逐月分批抓；raw/wholesale/ 每月兩個檔：甘藍（全部市場）、全部蔬菜（種類代碼 N04，只取台北第一果菜市場「台北一」）。休市列（作物代號 rest）不計。月平均價＝Σ(平均價×交易量)÷Σ交易量（以交易量加權），月交易量＝Σ交易量。甘藍只取作物代號 LA1「甘藍-初秋」（本地主要品種），不含進口與其他品種。年值＝12 個月再以交易量加權。

網址：
- https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx?StartDate=<民國年.月.日>&EndDate=…&Crop=甘藍&FOTT=CSV
- https://data.gov.tw/dataset/8066

原始檔（tools/taiwan/raw/）：
- `wholesale/cabbage_<年-月>.csv、wholesale/veg_taipei1_<年-月>.csv（共 356 個）`

### 農業部漁業署：每年度漁業種類別魚類別生產量（data.gov.tw 80036）

漁業種類代碼首位：1 遠洋、2 近海、3 沿岸、4 內陸漁撈、5 海面養殖、6 內陸養殖。資料年月為民國年（三位數），＋1911。單位公噸。

網址：
- https://data.moa.gov.tw/Service/OpenData/FaRss.aspx?key=078&FOTT=CSV&IsTransData=1&UnitId=E58
- https://data.gov.tw/dataset/80036

原始檔（tools/taiwan/raw/）：
- `fisheries_production_0.csv`
- `fisheries_production_1.csv`
- `fisheries_production_2.csv`

### 中央氣象署：潮位統計 C-B0052-001（data.gov.tw 98773）

各潮位站逐年與逐月的平均潮位（公尺，相對臺灣高程基準 TWVD2001）。基隆、高雄 2006 年起。

網址：
- https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Climate/C-B0052-001.json
- https://data.gov.tw/dataset/98773

原始檔（tools/taiwan/raw/）：
- `cwa_tide_statistics.json`

### 衛生福利部國民健康署：熱傷害人次監測數據（data.gov.tw 157637）

急診通報的熱傷害就診人次，逐日、分年齡性別縣市；只涵蓋通報醫院，不等於全國總數，適合看趨勢。檔案為 Big5 編碼。2011 年起。

網址：
- https://www.hpa.gov.tw//Pages/ashx/GetFile.ashx?lang=c&type=1&sid=6985791107fc4ae0b7f6b0ba9d6ac32a
- https://data.gov.tw/dataset/157637

原始檔（tools/taiwan/raw/）：
- `hpa_heat_illness.csv`

## 沒有納入的題目（查過但不可行）

- 登革熱病例：疾管署在 data.gov.tw 與 od.cdc.gov.tw 的 CSV 已於 2026 年 3 月下架，只剩需互動查詢的 NIDSS。
- 空氣品質、垃圾量：環境部 API 只有 2021 年起的資料。
- 水庫蓄水量：開放資料只有最近兩天，沒有歷史。
- 機動車輛數、全國人口與 GDP 長序列（主計總處、公路局）：需要互動查詢，沒有可直接下載的檔案。
- 農業統計年報各表（稻米、糧食自給率、農業就業、化肥）：ODS 可下載但只有最近 10 年，在 1980 年起的年檔裡會被「缺失 60%」規則刪掉，所以改用 FAOSTAT 的長序列；要覽的農耕土地、林地面積 1981 年起則有納入。
