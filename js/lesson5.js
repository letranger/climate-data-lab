/* 第五課：獨立資料分析專題。把第二～四課的動作用在自己挑的國家上。 */
(() => {
"use strict";
const { $, $$, esc, zh, toast } = CDL;
const store = CDL.makeStore("cdl-lesson5");
const S = store.load() || {};
S.done = S.done || {}; S.viz = S.viz || {}; S.ml = S.ml || {}; S.view = S.view || {};
const save = () => store.save(S);
let nav = null, viz = null, ml = null;

CDL.initPage();
const X = CDL.Explore({ S, save, onChange: () => { nav && nav.refresh(); pill(); printInterests(); renderViewer(); viz && viz.render(); ml && ml.render(); } });

function pill() {
  const p = $("#datasetPill");
  p.hidden = !X.loaded();
  if (X.loaded()) p.textContent = `📂 ${CDL.countryLabel(X.country(), X.iso())}${X.iso() ? `（${X.iso()}）` : ""}`;
}
function printInterests() { $$(".interest-print").forEach(el => el.innerHTML = X.interestPrint()); }

// ───────── 選國家：產生 HDX 連結 ─────────
const slug = s => s.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function showLink() {
  const v = $("#countryIn").value, s = slug(v), out = $("#countryLink");
  if (!s) { out.innerHTML = ""; return; }
  if (/taiwan/.test(s)) { out.innerHTML = '<p class="callout">世界銀行的資料庫裡沒有台灣的資料，請改選其他國家。</p>'; return; }
  const url = `https://data.humdata.org/dataset/world-bank-climate-change-indicators-for-${s}`;
  out.innerHTML = `<p>👉 <a href="${url}" target="_blank" rel="noopener">${esc(url)}</a></p><p class="muted tiny">打不開的話，可能是國名寫法不一樣，請改到 HDX 首頁搜尋。</p>`;
  S.countryIn = v; save();
}
$("#countryIn").value = S.countryIn || "";
$("#mkLink").addEventListener("click", showLink);
$("#countryIn").addEventListener("keydown", e => { if (e.key === "Enter") showLink(); });
if (S.countryIn) showLink();

// ───────── 資料探索 ─────────
X.mountUpload($("#upload"));
X.mountReformat($("#reformat"));
X.mountMissing($("#missing"), { slider: false });
X.mountPicker($("#pick"), { slots: [0, 1, 2], corr: true, years: true });
X.mountClean($("#clean"));

// ───────── 自由探索：看整個資料框、某些欄位、某些年份 ─────────
function renderViewer() {
  const el = $("#viewer"), c = X.clean();
  if (!c) { el.innerHTML = '<div class="muted">請先完成清理資料框。</div>'; return; }
  const v = S.view;
  if (!v.cols || !v.cols.every(x => c.cols.includes(x))) v.cols = c.cols.slice();
  if (!c.years.includes(v.y0)) v.y0 = c.years[0];
  if (!c.years.includes(v.y1)) v.y1 = c.years.at(-1);
  const yrs = c.years.filter(y => y >= v.y0 && y <= v.y1);
  el.innerHTML = `<h3>看看你的資料框</h3>
    <div class="toolbar">${c.cols.map(k => `<label><input type="checkbox" value="${esc(k)}"${v.cols.includes(k) ? " checked" : ""}> ${esc(zh(k))}</label>`).join("")}</div>
    <div class="toolbar">年份 <select class="y0">${c.years.map(y => `<option${y === v.y0 ? " selected" : ""}>${y}</option>`).join("")}</select> 到 <select class="y1">${c.years.map(y => `<option${y === v.y1 ? " selected" : ""}>${y}</option>`).join("")}</select></div>
    <div class="table-wrap small">${v.cols.length ? CDL.tableHTML(c, v.cols, { years: yrs }) : '<div class="muted" style="padding:.5rem">至少勾一欄</div>'}</div>`;
  $$("input[type=checkbox]", el).forEach(i => i.addEventListener("input", () => { v.cols = $$("input[type=checkbox]", el).filter(x => x.checked).map(x => x.value); S.done.view = 1; save(); renderViewer(); }));
  $(".y0", el).addEventListener("change", e => { v.y0 = Number(e.target.value); S.done.view = 1; save(); renderViewer(); });
  $(".y1", el).addEventListener("change", e => { v.y1 = Number(e.target.value); S.done.view = 1; save(); renderViewer(); });
}

const data = () => X.clean();
const d = S.done;
const cols = () => data() ? data().cols : [];
const count = p => () => cols().filter(c => d[`${p}${c}`]).length;
const anySingle = t => () => cols().some(c => d[`${t}-single-${c}`]);
viz = CDL.ChartBuilder($("#vizBuilder"), {
  id: "viz", store: S.viz, getData: data, types: ["line", "scatter"], xcol: true, custom: true, done: d, save,
  tasks: [
    { id: "view", label: "看看資料框裡某些欄位或某幾年的資料" },
    { id: "l", label: "畫折線圖", count: anySingle("line") },
    { id: "s", label: "畫散布圖", count: anySingle("scatter") },
    { id: "n", label: "把多個欄位正規化後畫在一起", count: () => d["line-norm2"] || d["scatter-norm2"] },
    { id: "color", label: "換成你覺得最能說故事的顏色" },
  ],
  onDraw: () => nav && nav.refresh(),
});
ml = CDL.ModelBuilder($("#mlBuilder"), {
  id: "ml", store: S.ml, getData: data, models: ["lin", "svr"], extension: true, done: d, save, onDraw: () => nav && nav.refresh(),
  colLabel: (c, i) => `欄位 ${i + 1}`,
  tasks: [
    { id: "l", label: "三個欄位都做線性迴歸", total: 3, count: count("lin-") },
    { id: "s", label: "三個欄位都做支援向量迴歸（SVR）", total: 3, count: count("svr-") },
  ],
});

CDL.Notes($("#notes"), { S, save, onInput: () => nav && nav.refresh(), title: "我的發現", fileName: "第五課（其他國家）筆記.txt", placeholder: "例如：根據日本 1990–2020 年的資料，核能發電占比在 2011 年後……" });
$("#dlClean").addEventListener("click", () => { const c = X.clean(); if (!c) { toast("請先完成清理資料。"); return; } CDL.download(X.saveName(), CDL.wideCSV(c)); });

$("#resetAll").addEventListener("click", () => {
  if (!window.confirm("確定要清除第五課（其他國家）的所有進度嗎？")) return;
  store.clear(); location.reload();
});

const isDone = {
  1: () => X.loaded(), 2: () => X.pivoted() && S.dropped.length > 0, 3: () => X.selectedCols().length === 3, 4: () => !!S.cleaned,
  5: () => anySingle("line")() && anySingle("scatter")(), 6: () => count("lin-")() >= 3 && count("svr-")() >= 3, 7: () => !!(S.notes || "").trim(),
};
nav = CDL.steps([
  { stage: "explore", name: "資料探索", steps: [{ n: 1, label: "選國家" }, { n: 2, label: "整理資料" }, { n: 3, label: "選欄位" }, { n: 4, label: "清理" }] },
  { stage: "viz", name: "資料視覺化", steps: [{ n: 5, label: "自由探索" }] },
  { stage: "ml", name: "機器學習", steps: [{ n: 6, label: "延伸：預測" }] },
  { stage: "story", name: "分享", steps: [{ n: 7, label: "分享成果" }] },
], {
  canGo: n => n === 1 || (n === 2 && X.loaded()) || (n === 3 && X.pivoted()) || (n === 4 && X.selectedCols().length === 3) || (n >= 5 && !!S.cleaned),
  why: n => n === 2 ? "請先上傳你的國家的 CSV。" : n === 3 ? "請先把資料整理成資料表。" : n === 4 ? "請先選好三個欄位。" : "請先完成清理資料。",
  isDone: n => !!(isDone[n] && isDone[n]()),
  render: { 3: printInterests, 5: () => { renderViewer(); viz.render(); }, 6: () => ml.render() },
  onGo: n => { S.step = n; save(); X.refresh(); },
  // 按「◀ 上一步」離開資料探索的步驟時，清掉這一步的進度，回來可以重做（同第二課）
  onBack: from => {
    if (from === 2) { X.undo("reform"); X.undo("missing"); }
    else if (from === 3) X.undo("pickall");
    else if (from === 4) X.undo("clean");
    else return;
    toast("已清除這一步的進度，回來時可以重做。");
  },
});
pill(); printInterests(); renderViewer();
if (!nav.go(S.step || 1, { scroll: false })) nav.go(1, { scroll: false });
})();
