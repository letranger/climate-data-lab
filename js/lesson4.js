/* 第四課：用機器學習預測趨勢。步驟順序同原課程第四課。 */
(() => {
"use strict";
const { $, $$, esc, zh, isNum } = CDL;
const store = CDL.makeStore("cdl-lesson4");
const S = store.load() || {};
S.done = S.done || {}; S.ml = S.ml || {}; S.ml.lin = S.ml.lin || {}; S.ml.svr = S.ml.svr || {};
const save = () => store.save(S);
let nav = null;
const builders = [];

CDL.initPage();
const W = CDL.WideLoader({ S, save, onChange: () => { pill(); renderSc3(); builders.forEach(b => b.render()); nav && nav.refresh(); } });
const data = () => W.data();
const cols = () => data() ? data().cols : [];
const d = S.done;
const count = p => () => cols().filter(c => d[`${p}${c}`]).length;

function pill() {
  const p = $("#datasetPill");
  p.hidden = !W.loaded();
  if (W.loaded()) p.textContent = `📂 ${S.fileName}`;
}
W.mount($("#loader"), { lesson: 2 });

// 三個欄位的散布圖：按「畫出來」才畫
function renderSc3() {
  const el = $("#sc3"), ds = data();
  if (!ds) { el.innerHTML = '<div class="card muted">請先上傳資料。</div>'; return; }
  el.innerHTML = ds.cols.map((c, i) => `<div class="cell">
      <div class="cell-head"><b>欄位 ${i + 1}</b><span>${esc(zh(c))}</span>${d["sc-" + c] ? "" : `<button class="btn small primary" data-run="${i}">畫出來</button>`}</div>
      <div class="chart-box short" ${d["sc-" + c] ? "" : "hidden"}><canvas id="sc_${i}"></canvas></div></div>`).join("");
  $$("[data-run]", el).forEach(b => b.addEventListener("click", () => { d["sc-" + ds.cols[b.dataset.run]] = 1; save(); renderSc3(); nav.refresh(); }));
  ds.cols.forEach((c, i) => {
    if (!d["sc-" + c]) return;
    CDL.drawChart(`sc_${i}`, {
      type: "scatter",
      data: { datasets: [{ label: zh(c), data: ds.years.filter(y => isNum(ds.data[c][y])).map(y => ({ x: y, y: ds.data[c][y] })), backgroundColor: CDL.SNS[0], pointRadius: 4 }] },
      options: CDL.baseOpts({ legend: false, theme: "darkgrid", xTitle: "年份", yTitle: zh(c) }),
    });
  });
}
renderSc3();

builders.push(CDL.ModelBuilder($("#linBuilder"), {
  id: "lin", store: S.ml.lin, getData: data, models: ["lin"], done: d, save, colLabel: W.colLabel, onDraw: () => nav && nav.refresh(),
  tasks: [
    { id: "l1", label: "替三個欄位都畫出最佳擬合線", total: 3, count: count("lin-") },
    { id: "l2", label: "用最佳擬合線預測未來 5 年，畫成虛線", total: 3, count: count("lin-future-") },
    { id: "tryit", label: "試試看：找一個年份，讀出線上的預測值（投影片 P66）" },
  ],
}));
builders.push(CDL.ModelBuilder($("#svrBuilder"), {
  id: "svr", store: S.ml.svr, getData: data, models: ["svr"], extension: true, done: d, save, colLabel: W.colLabel, onDraw: () => nav && nav.refresh(),
  tasks: [
    { id: "s1", label: "替三個欄位都畫出最佳擬合曲線", total: 3, count: count("svr-") },
    { id: "s2", label: "用最佳擬合曲線預測未來 5 年", total: 3, count: count("svr-future-") },
  ],
}));

CDL.Notes($("#notes"), { S, save, onInput: () => nav && nav.refresh(), title: "我的預測心得", fileName: "第四課筆記.txt", placeholder: "• 我預測的欄位是……\n• 線性迴歸說……，SVR 說……\n• 我比較相信……，因為……" });

$("#resetAll").addEventListener("click", () => {
  if (!window.confirm("確定要清除第四課的所有進度嗎？")) return;
  store.clear(); location.reload();
});

const isDone = {
  1: () => W.loaded() && cols().every(c => d["sc-" + c]),
  2: () => count("lin-")() >= 3 && count("lin-future-")() >= 3,
  3: () => count("svr-")() >= 3 && count("svr-future-")() >= 3,
  4: () => !!(S.notes || "").trim(),
};
nav = CDL.steps([
  { stage: "ml", name: "機器學習", steps: [{ n: 1, label: "看散布圖" }, { n: 2, label: "線性迴歸" }, { n: 3, label: "支援向量迴歸" }, { n: 4, label: "儲存與分享" }] },
], {
  canGo: n => n === 1 || W.loaded(),
  why: () => "請先上傳第二課存下來的 CSV 檔。",
  isDone: n => !!(isDone[n] && isDone[n]()),
  render: { 1: renderSc3, 2: () => builders[0].render(), 3: () => builders[1].render() },
  onGo: n => { S.step = n; save(); },
});
pill();
if (!nav.go(S.step || 1, { scroll: false })) nav.go(1, { scroll: false });
})();
