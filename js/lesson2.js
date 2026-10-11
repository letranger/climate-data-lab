/* 第二課：探索資料。步驟順序同原課程第二課；和寫程式有關的部分改成點選或省略。 */
(() => {
"use strict";
const { $, $$, esc, toast } = CDL;
const store = CDL.makeStore("cdl-lesson2");
const S = store.load() || {};
S.seen = S.seen || {};
const save = () => store.save(S);
let nav = null;

CDL.initPage();
const X = CDL.Explore({ S, save, onChange: () => { nav && nav.refresh(); pill(); printInterests(); renderSave(); showPeek(peekI, { mark: false }); } });

function pill() {
  const p = $("#datasetPill");
  p.hidden = !X.loaded();
  if (X.loaded()) p.textContent = `📂 ${S.fileName}`;
}
function printInterests() { $$(".interest-print").forEach(el => el.innerHTML = X.interestPrint()); }

// ───────── 開始：名字 ─────────
// 名字通常在首頁就填好了；只有直接點進第二課、還沒填名字（或填的是範例「王小明」）時才請學生輸入
const hasName = n => !!n && n !== "王小明";
$("#nameCard").hidden = hasName(CDL.getName());
const nameIn = $("#nameInput");
nameIn.value = CDL.getName();
nameIn.addEventListener("input", () => CDL.setName(nameIn.value.trim()));

// ───────── 步驟 1：CSV ─────────
const CSV_LINES = ["Name,Age,Favorite Food", "Ada Lovelace,36,Hot Dogs", "Grace Hopper,85,Strawberries", "Alan Turing,41,Cheese Sandwich"];
function showCsv() {
  $("#csvTableWrap").hidden = false;
  const rows = CSV_LINES.map(l => l.split(","));
  $("#csvTable").innerHTML = `<table class="data"><thead><tr>${rows[0].map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td class="left">${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
$("#showCsv").addEventListener("click", () => { showCsv(); S.seen.csv = 1; save(); nav.refresh(); });
if (S.seen.csv) showCsv();

// ───────── 步驟 3：怎麼看資料表 ─────────
// 用學生剛上傳的巴西原始檔練習：檔案太大，先只看前 100 列
const N = 100;
const ZHCOL = { "Country Name": "國家名稱", "Country ISO3": "國家代碼", Year: "年份", "Indicator Name": "指標名稱", "Indicator Code": "指標代碼", Value: "數值" };
const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
const PRESETS = [
  { label: `看前 ${N} 列`, cols: null, rows: n => range(0, Math.min(N, n)) },
  { label: "只看最前面 5 列", cols: null, rows: () => range(0, 5) },
  { label: "只看最後面 5 列", cols: null, rows: n => range(n - 5, n) },
  { label: "只看一欄：指標名稱", cols: ["Indicator Name"], rows: n => range(0, Math.min(N, n)) },
  { label: "看兩欄：年份和數值", cols: ["Year", "Value"], rows: n => range(0, Math.min(N, n)) },
  { label: "只看第一列（編號 0）", cols: null, rows: () => [0] },
  { label: "看編號 1 和 5 這兩列", cols: null, rows: () => [1, 5] },
  { label: "看編號 2 到 7 這一段", cols: null, rows: () => range(2, 8) },
];
let peekI = 0;
function showPeek(i = peekI, { mark = true } = {}) {
  peekI = i;
  const R = X.raw();
  $$("#foodBtns button").forEach((b, j) => { b.classList.toggle("on", j === i); b.disabled = !R; });
  if (!R) { $("#foodInfo").textContent = ""; $("#foodTable").innerHTML = '<div class="muted" style="padding:1rem">請先在步驟 2 上傳 climate-change_bra.csv，這裡就會顯示它的內容。</div>'; return; }
  const p = PRESETS[i], n = R.rows.length;
  const cols = (p.cols || R.header).map(c => R.header.indexOf(c)).filter(j => j >= 0);
  const rows = p.rows(n).filter(r => r >= 0 && r < n);
  $("#foodTable").innerHTML = `<table class="data"><thead><tr><th></th>${cols.map(j => `<th>${esc(ZHCOL[R.header[j]] || R.header[j])}<span class="en">${esc(R.header[j])}</span></th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr><td>${r}</td>${cols.map(j => `<td class="left">${esc(R.rows[r][j] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  $("#foodInfo").textContent = `顯示 ${rows.length} 列 × ${cols.length} 欄（整個檔案共 ${n.toLocaleString()} 列 × ${R.header.length} 欄）`;
  if (mark) { S.seen.foods = Object.assign(S.seen.foods || {}, { [i]: 1 }); save(); nav && nav.refresh(); }
}
$("#foodBtns").innerHTML = PRESETS.map(p => `<button class="btn small toggle" type="button">${esc(p.label)}</button>`).join("");
$$("#foodBtns button").forEach((b, i) => b.addEventListener("click", () => showPeek(i)));
showPeek(0, { mark: false });

// ───────── 步驟 4：小範例 ─────────
const EXC = ["Column1", "Column2", "Column3", "Column4", "Column5"];
const NANS = { Column1: 0, Column2: 4, Column3: 1, Column4: 3, Column5: 2 };
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const EX = EXC.reduce((o, c) => (o[c] = [0, 1, 2, 3, 4].map(r => NANS[c] === r ? NaN : rnd()), o), {});
S.exCols = S.exCols || ["Column1", "Column4"];
function exTable(cols, rows) {
  return `<table class="data"><thead><tr><th></th>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr><td>${r}</td>${cols.map(c => `<td>${CDL.isNum(EX[c][r]) ? EX[c][r].toFixed(6) : '<span class="nan">—</span>'}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function renderEx() {
  $("#exCols").innerHTML = `<span>留下：</span>` + EXC.map(c => `<label><input type="checkbox" value="${c}"${S.exCols.includes(c) ? " checked" : ""}> ${c}</label>`).join("");
  $$("#exCols input").forEach(i => i.addEventListener("input", () => { S.exCols = $$("#exCols input").filter(x => x.checked).map(x => x.value); save(); renderEx(); }));
  const cols = EXC.filter(c => S.exCols.includes(c));
  $("#exAll").innerHTML = exTable(EXC, [0, 1, 2, 3, 4]);
  $("#exSmall").innerHTML = cols.length ? exTable(cols, [0, 1, 2, 3, 4]) : '<div class="muted" style="padding:.5rem">至少勾一欄</div>';
  $("#exNoNan").innerHTML = cols.length ? exTable(cols, [0, 1, 2, 3, 4].filter(r => cols.every(c => CDL.isNum(EX[c][r])))) : "";
}
renderEx();

// ───────── 元件 ─────────
X.mountUpload($("#upload"), { expectIso: "BRA", fileHint: "climate-change_bra.csv" });
X.mountReformat($("#reformat"));
X.mountMissing($("#missing"));
X.mountPicker($("#pick1"), { slots: [0] });
X.mountPicker($("#pick3"), { slots: [0, 1, 2], corr: true, example: true });
X.mountClean($("#clean"), { download: false });

function renderSave() {
  const el = $("#saveArea"), c = X.clean();
  if (!c) { el.innerHTML = '<div class="card muted">請先完成上一步的篩選。</div>'; return; }
  const name = X.saveName();
  el.innerHTML = `<div class="card done-card">
      <p>你整理好的資料：${c.years.length} 年（${c.years[0]}–${c.years.at(-1)}）× 3 欄。</p>
      <button class="btn primary" id="dlMy">⬇ 下載 ${esc(name)}</button>
      ${S.downloaded ? '<span class="ok-line">　✓ 已下載</span>' : ""}
    </div>
    <div class="table-wrap small" style="margin-top:.8rem">${CDL.tableHTML(c, c.cols)}</div>
`;
  $("#dlMy").addEventListener("click", () => { CDL.download(name, CDL.wideCSV(c)); S.downloaded = true; save(); renderSave(); nav.refresh(); });
}

$("#resetAll").addEventListener("click", () => {
  if (!window.confirm("確定要清除第二課的所有進度嗎？")) return;
  store.clear(); location.reload();
});

// ───────── 步驟導覽 ─────────
const done = {
  1: () => !!S.seen[2], 2: () => !!S.seen.csv, 3: () => X.loaded(), 4: () => Object.keys(S.seen.foods || {}).length >= 4,
  5: () => X.pivoted(), 6: () => X.pivoted() && S.dropped.length > 0, 7: () => !!S.selected[0], 8: () => X.selectedCols().length === 3,
  9: () => !!S.cleaned, 10: () => !!S.downloaded,
};
nav = CDL.steps([
  { stage: "explore", name: "開始", steps: [{ n: 1, label: "開始" }] },
  { stage: "explore", name: "步驟 1", steps: [{ n: 2, label: "什麼是 CSV" }] },
  { stage: "explore", name: "步驟 2", steps: [{ n: 3, label: "下載資料" }] },
  { stage: "explore", name: "步驟 3", steps: [{ n: 4, label: "看資料表" }, { n: 5, label: "整理資料表" }, { n: 6, label: "處理缺失" }] },
  { stage: "explore", name: "步驟 4", steps: [{ n: 7, label: "選一個欄位" }, { n: 8, label: "再選兩個" }, { n: 9, label: "只留需要的" }] },
  { stage: "explore", name: "步驟 5", steps: [{ n: 10, label: "存檔" }] },
], {
  canGo: n => n <= 4 || (n === 5 && X.loaded()) || ((n === 6 || n === 7) && X.pivoted()) || (n === 8 && X.pivoted() && !!S.selected[0])
    || (n === 9 && X.pivoted() && X.selectedCols().length === 3) || (n === 10 && !!S.cleaned),
  why: n => n === 5 ? "請先在步驟 2 上傳 climate-change_bra.csv。" : n <= 7 ? "請先把資料整理成資料表。" : n === 8 ? "請先選好欄位 1。" : n === 9 ? "請先選好三個欄位。" : "請先完成「只留下想要的資料」。",
  isDone: n => done[n] ? done[n]() : false,
  render: { 4: () => showPeek(peekI, { mark: false }), 7: printInterests, 8: printInterests, 10: renderSave },
  onGo: n => { S.step = n; S.seen[n] = 1; save(); X.refresh(); },
  onBack: from => {
    const step = { 5: "reform", 6: "missing", 7: "pick1", 8: "pick23", 9: "clean" }[from];
    if (step) X.undo(step);
    if (from === 10) { S.downloaded = false; save(); renderSave(); }
    if (step || from === 10) toast("已清除這一步的進度，回來時可以重做。");
  },
});
pill(); printInterests(); renderSave();
if (!nav.go(S.step || 1, { scroll: false })) nav.go(1, { scroll: false });
})();
