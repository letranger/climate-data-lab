/* 第三課：將資料視覺化。步驟順序同原課程第三課。 */
(() => {
"use strict";
const { $, toast } = CDL;
const store = CDL.makeStore("cdl-lesson3");
const S = store.load() || {};
S.done = S.done || {}; S.viz = S.viz || {};
["line", "scatter", "custom"].forEach(k => S.viz[k] = S.viz[k] || {});
const save = () => store.save(S);
let nav = null;
const builders = [];

CDL.initPage();
const W = CDL.WideLoader({ S, save, onChange: () => { pill(); builders.forEach(b => b.render()); nav && nav.refresh(); } });
const data = () => W.data();
const cols = () => data() ? data().cols : [];
const singles = t => d => cols().filter(c => d[`${t}-single-${c}`]).length;

function pill() {
  const p = $("#datasetPill");
  p.hidden = !W.loaded();
  if (W.loaded()) p.textContent = `📂 ${S.fileName}`;
}

W.mount($("#loader"), { lesson: 2 });

builders.push(CDL.ChartBuilder($("#lineBuilder"), {
  id: "line", store: S.viz.line, getData: data, types: ["line"], custom: false, done: S.done, save,
  tasks: [
    { id: "a", label: "三個欄位各畫一張折線圖", total: 3, count: singles("line") },
    { id: "line-raw2", label: "把兩個欄位畫在同一張圖" },
    { id: "line-norm2", label: "把兩個欄位正規化後畫在一起" },
    { id: "line-norm3", label: "把三個欄位都正規化後畫在一起" },
  ],
  onDraw: () => nav && nav.refresh(),
}));
builders.push(CDL.ChartBuilder($("#scatterBuilder"), {
  id: "scatter", store: S.viz.scatter, getData: data, types: ["scatter"], xcol: true, custom: false, done: S.done, save,
  tasks: [
    { id: "s", label: "三個欄位各畫一張散布圖", total: 3, count: singles("scatter") },
    { id: "scatter-norm3", label: "三個欄位正規化，畫成同一張散布圖" },
  ],
  onDraw: () => nav && nav.refresh(),
}));
builders.push(CDL.ChartBuilder($("#customBuilder"), {
  id: "custom", store: S.viz.custom, getData: data, types: ["line", "scatter"], custom: true, done: S.done, save,
  tasks: [
    { id: "theme", label: "換一種背景" },
    { id: "color", label: "換線條或點的顏色" },
    { id: "labels", label: "加上標題和 Y 軸名稱" },
  ],
  onDraw: () => nav && nav.refresh(),
}));

CDL.Notes($("#notes"), { S, save, onInput: () => nav && nav.refresh(), title: "我的筆記", fileName: "第三課筆記.txt", placeholder: "• 我發現……\n• 我好奇……\n• 我選這個顏色是因為……" });

$("#resetAll").addEventListener("click", () => {
  if (!window.confirm("確定要清除第三課的所有進度嗎？")) return;
  store.clear(); location.reload();
});

const d = S.done;
const isDone = {
  1: () => W.loaded(),
  2: () => singles("line")(d) >= 3 && d["line-raw2"] && d["line-norm2"] && d["line-norm3"],
  3: () => singles("scatter")(d) >= 3 && d["scatter-norm3"],
  4: () => d.theme && d.color && d.labels,
  5: () => !!(S.notes || "").trim(),
};
nav = CDL.steps([
  { stage: "viz", name: "資料視覺化", steps: [{ n: 1, label: "匯入 CSV" }, { n: 2, label: "折線圖" }, { n: 3, label: "散布圖" }, { n: 4, label: "自訂樣式" }, { n: 5, label: "分享發現" }] },
], {
  canGo: n => n === 1 || W.loaded(),
  why: () => "請先上傳第二課存下來的 CSV 檔。",
  isDone: n => !!(isDone[n] && isDone[n]()),
  render: { 2: () => builders[0].render(), 3: () => builders[1].render(), 4: () => builders[2].render() },
  onGo: n => { S.step = n; save(); },
});
pill();
if (!nav.go(S.step || 1, { scroll: false })) nav.go(1, { scroll: false });
})();
