# 氣候資料實驗室（Climate Data Lab）

把 Day of AI「Telling Climate Stories with Data」第二～五課原本要在 Deepnote 寫 Python 的活動，改成不會寫程式也能操作的網頁：點選、拖拉、勾選就能完成。步驟順序照原課程，每一課一個頁面，從首頁切換。

## 使用方式

- **直接打開**：雙擊 `index.html` 就能用，不需要安裝 Node、Python 或任何伺服器。
- **放上網路**：把整個 `climate-data-lab` 資料夾上傳到任何靜態網站空間（GitHub Pages、Netlify、學校網站等）即可。
- 所有運算都在學生的瀏覽器中進行，資料不會上傳到伺服器。每一課的進度各自存在瀏覽器的 localStorage。
- **資料要學生自己下載**：和原課程一樣，第二課到 HDX 下載巴西的 `climate-change_bra.csv`，第五課下載自己選的國家，再上傳到網頁。網站不內建任何國家的資料，只有一個例外：**第五課（臺灣資料）**。世界銀行沒有臺灣，所以我們用臺灣官方開放資料整理成同格式的 `data/climate-change_twn.csv` 放在本站，學生一樣要先下載再上傳（見下方「臺灣資料」）。
- 第三、四課上傳的是第二課存下的 `my_brazil_climate_data.csv`。檔案不見的學生，可以下載原課程 Deepnote 專案附的範例檔 `ex_brazil_climate_data.csv`（內容與原檔相同）。

## 和原課程 Notebook 的對照（給老師參考）

網頁上不出現程式碼。Notebook 裡和寫程式有關、沒有對應意義的部分直接省略；有實質學習內容的，改成類似的點選動作：

| Notebook 的內容 | 網頁的做法 |
|---|---|
| Duplicate、改名、執行 `print` 儲存格、`import` 函式庫 | 省略（第二課開始只請學生輸入名字） |
| `print` 出小 CSV | 先看 CSV 原始文字，再按鈕切成表格 |
| `df_foods` 的 `.head()`、`.tail()`、`[[ ]]`、`.loc` | 「怎麼看資料表」：按鈕切換看整張、前 5 列、某一欄、某幾列 |
| `iloc[1:]`、`drop`、`pivot` | 按兩個按鈕，一步一步看表格怎麼變（舊版檔案有 `#country+name` 標籤列時才多一步「刪掉第一列」） |
| `interest_1～3`、`column_1～3`、`print` 檢查 | 「欄位 1～3」格子，下方列出已選的欄位 |
| `df_example`、`dropna` 範例 | 勾選欄位的小範例，三張表並排 |
| 寫 `sns.lineplot`／`scatterplot`、正規化、`set_style`、`color=` | 拖曳欄位畫圖、勾選正規化、選背景、挑顏色或輸入顏色英文名 |
| 寫 `LinearRegression`、`StandardScaler`＋`SVR` | 選欄位就畫出最佳擬合線／曲線，勾選預測未來 5 年；可展開看標準化後的數字 |

### 第二課 `lesson2.html`（Lesson 2: Explore Data）

| 網頁步驟 | Notebook | 投影片 |
|---|---|---|
| 1 開始 | （省略 Duplicate 等操作）輸入名字 | — |
| 2 什麼是 CSV | Step 1：`print` 出小 CSV、用試算表的樣子看 | P27–P28 |
| 3 下載資料 | Step 2：到 HDX 下載 `climate-change_bra.csv`、為什麼選巴西 | — |
| 4 看資料表 | Step 3：`df_foods` 的各種看法 | P29–P30 |
| 5 整理資料表 | `read_csv` → `iloc[1:]` → `drop` 三欄 → `pivot` → Code Cell A | — |
| 6 處理缺失 | Code Cell B：刪除缺失 ≥ 60% 的欄位 | P31–P33 |
| 7 選一個欄位 | Step 4：Code Cell C 列出欄位、看單一欄位、`interest_1` | P34 |
| 8 再選兩個 | Code Cell D（森林面積範例）、Code Cell E（interest_1 的相關）、`interest_2/3`、`print` | P35–P40 |
| 9 只留需要的 | `df_example` → `small_df_example` → Code Cell F `dropna`；自己的 `my_df`、`my_filtered_df` | P41 |
| 10 存檔 | Step 5：`to_csv("my_brazil_climate_data.csv")` 並下載 | P42 |

### 第三課 `lesson3.html`（Lesson 3: Visualize Data）

| 網頁步驟 | Notebook | 投影片 |
|---|---|---|
| 1 匯入 CSV | Upload file、`read_csv`、`my_cols` | P47–P48 |
| 2 折線圖 | Code Cell A（三欄各一張）、Code Cell B（兩欄同圖＋圖例標題軸名）、Code Cell C（min-max 正規化兩欄）、三欄正規化 | P49、P51 |
| 3 散布圖 | 三欄各一張 `scatterplot`、三欄正規化散布圖 | P50、P52 |
| 4 自訂樣式 | `sns.set_style` 五種背景、`color=` HTML 顏色名稱、`plt.title/xlabel/ylabel`、存圖 | — |
| 5 分享發現 | 討論問題、筆記儲存格 | P53 |

### 第四課 `lesson4.html`（Lesson 4: Predict Trends with Machine Learning）

| 網頁步驟 | Notebook | 投影片 |
|---|---|---|
| 1 看散布圖 | 匯入資料、`column_1～3`、三欄散布圖 | P62–P63 |
| 2 線性迴歸 | `LinearRegression` 範例＋column_2/3、預測未來 5 年（綠色虛線）、「試試看」讀出某年的預測值 | P64–P68 |
| 3 支援向量迴歸 | `StandardScaler`＋`SVR()`、預測未來 5 年、評估問題 | P69–P74 |
| 4 儲存與分享 | 存圖、和夥伴討論的六個問題 | P75–P77 |

### 第五課（其他國家）`lesson5.html`（Lesson 5: Independent Data Analysis Project）

| 網頁步驟 | Notebook | 投影片 |
|---|---|---|
| 1 選國家 | 選國家、到 HDX 下載（網頁會依國名產生連結）、上傳 | P82 |
| 2 整理資料 | `read_csv`、`pivot`、刪除缺失 ≥ 60% 的欄位（TODO） | — |
| 3 選欄位 | 列出欄位、看單一欄位或某幾年、`interest_1`、相關係數、`interest_2/3` | P83 |
| 4 清理 | 三欄、`dropna` | P84–P85 |
| 5 自由探索 | 看整個資料框／某些欄位、某些年份；折線圖、散布圖、正規化、配色 | P86 |
| 6 延伸：預測 | 三欄都做線性迴歸、SVR | P87 |
| 7 分享成果 | 討論問題、下載整理好的 CSV 與筆記 | P88 |

### 第五課（臺灣資料）`lesson5tw.html`

和 `lesson5.html` 完全相同的七個步驟與元件，差別只在步驟 1：不是輸入國名到 HDX 下載，而是按連結下載本站整理的 `data/climate-change_twn.csv`（年）或 `data/climate-change_twn_monthly.csv`（月，上傳後自動進入逐月模式），並列出幾個臺灣在地的探究起點（颱風×菜價、高溫×用電、能源轉型×排碳、雨量×農業、暖化×作物、海平面）。進度另外存在 `cdl-lesson5tw`，和原第五課互不影響。原第五課的頁面與程式沒有改。

## 原課程沒有、標為「延伸」的功能

- 散布圖的 X 軸換成另一個欄位（加趨勢線）
- SVR 調整 γ、C、ε；考試模式（藏起最後幾年看過度擬合）；預測超過 5 年

## 實作細節

- 線性迴歸與 scikit-learn 相同；SVR 依 Notebook 先用 StandardScaler 標準化，預設 γ=1、C=1、ε=0.1（等同 `SVR()`），結果與 scikit-learn 相差不到 1%。
- 正規化依 Notebook 用 min-max（0～1）。
- 時間鍵：年資料用西元年（2024），逐月資料用「年×100＋月」（202407）；畫圖和迴歸時逐月的 x 換成「年＋(月−1)/12」，所以斜率的單位一樣是「每年」。相關程式在 `core.js` 的 `tLabel`、`tX`、`tKey`、`tNext`。
- HDX 新版檔案（2025 年起）沒有 `#country+name` 標籤列，也沒有 CO2、甲烷、溫室氣體總排放量欄位；網頁會偵測標籤列，沒有就不刪。

## 臺灣資料（第五課臺灣版用）

- `data/climate-change_twn.csv`：長格式年資料，1980–2025，欄位和 HDX 的世界銀行檔一樣（`Country Name,Country ISO3,Year,Indicator Name,Indicator Code,Value`，含 `#country+name…` 標籤列），國名 `Taiwan`、代碼 `TWN`。沿用世界銀行名稱的指標（如 `CO2 emissions (kt)`、`Population, total`）用原名，臺灣特有的用 `TW.` 開頭的代碼。
- `data/climate-change_twn_monthly.csv`：逐月資料（1998-01 到 2025-12，29 個指標），和年檔同樣的長格式，只多一個 `Month` 欄。網站讀到 Month 欄會自動切成**逐月模式**：整理、刪缺失、選欄位、清理、畫圖、迴歸全部一樣，只是「一年一列」變「一個月一列」，時間軸顯示 `2024-07`；存檔叫 `my_taiwan_climate_data_monthly.csv`，第三、四課的上傳也認得。年檔（或任何 HDX 檔）走原本的流程，完全不受影響。
- `data/SOURCES-taiwan.md`：**每一個欄位的來源機關、資料集網址、原始檔、計算方式**，由程式自動產生。數字只做三種處理：直接搬值、註明的單位換算、註明的彙總（例如六個氣象站取平均、12 個月加總、交易量加權）；沒有估算或補值。
- `tools/taiwan/fetch.py`：從各機關下載原始檔到 `tools/taiwan/raw/`，原樣保留，並在 `raw/manifest.json` 記錄每個檔的網址、下載時間、大小與 SHA-256。`tools/taiwan/build.py`：只讀 `raw/` 組合出上面三個檔。重新產生：`python3 tools/taiwan/fetch.py && python3 tools/taiwan/build.py`（CODiS 與批發市場要幾百次請求，約 20 分鐘）。
- 來源一覽：中央氣象署 CODiS（六個百年測站的氣溫、雨量、高溫日數…）、維基百科整理的氣象署警報颱風列表、經濟部能源署與台電（發電、用電、尖峰負載、天然氣、太陽光電）、環境部溫室氣體清冊、Our World in Data（CO₂、人口、GDP、1985 年起的發電結構）、農業部（農耕土地與林地面積、產地價格、批發市場行情、漁業產量）、FAOSTAT（稻米、蔬菜、芒果、茶、香蕉產量）、水利署（農業用水）、國健署（熱傷害急診）、氣象署潮位統計（基隆、高雄海平面）。
- 注意：「六站平均」不是全臺面平均；颱風統計是二手整理；尖峰負載是全年最高負載，當夏季用電的代理指標；2005 年以後才有的欄位在 1980 年起的年檔裡會被網站「缺失 ≥60%」規則刪掉，這是刻意保留的，讓學生經歷和其他國家一樣的整理步驟。

## 檔案

```
index.html              首頁（選課）
lesson2.html … lesson5.html   各課頁面
lesson5tw.html          第五課（臺灣資料）
style.css               樣式（配色取自投影片）
js/core.js              共用：CSV 解析、樞紐、統計與模型、圖表、拖曳、步驟導覽
js/explore.js           資料探索元件（第二、五課）
js/wide.js              上傳整理好的 CSV、筆記框（第三、四、五課）
js/viz.js               畫圖元件（第三、五課）
js/ml.js                預測元件（第四、五課）
js/lessonN.js           各課的步驟與任務清單
js/example-data.js      原課程附的範例檔 ex_brazil_climate_data.csv
data/climate-change_twn.csv, climate-change_twn_monthly.csv, SOURCES-taiwan.md   臺灣資料（年、月）與來源說明
tools/taiwan/           產生臺灣資料的程式（fetch.py、build.py）與原始檔（raw/）
lib/chart.umd.min.js    Chart.js 4.4.1（MIT 授權）
data/indicators-zh.js   指標中英對照
assets/                 Day of AI 標誌、STOP 標誌、Notebook 截圖
```

## 線上版與共同編輯（給組員）

- 網址：https://letranger.github.io/climate-data-lab/
- 原始碼：https://github.com/letranger/climate-data-lab （推送到 `main` 後，GitHub Pages 約 1～2 分鐘自動更新）
- **小改文字**：在 GitHub 網頁上打開檔案，按鉛筆圖示直接編輯、Commit 即可。學生看到的文字大多在 `lesson2.html`～`lesson5.html`；整理資料、選欄位、畫圖、預測這些共用元件的文字在 `js/explore.js`、`js/viz.js`、`js/ml.js`。
- **在自己電腦上改**：`git clone` 下來，雙擊 `index.html` 就能測試，改好再 `git push`。
- **改了 js 或 css 之後**：把各 html 裡 `?v=` 後面的數字改大（例如改成當天日期時間），學生的瀏覽器才會讀到新版，不會卡在舊的快取。
- **「待討論」標籤**：網頁上黃色虛線的「待討論」是還沒定案、要小組決定的地方。決定後，把該處的 `<span class="tbd" …>待討論</span>`（以及旁邊說明用的 `tbd-note`）刪掉即可。

## 授權

改編自麻省理工學院 Day of AI™ 課程，依 CC BY-NC-SA 4.0 授權；Day of AI 標誌為麻省理工學院商標，使用前請確認符合其使用條款：https://www.dayofai.org/privacy-and-terms-of-use
