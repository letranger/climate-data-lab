/* 畫圖元件（第三課、第五課共用）：折線圖、散布圖（X 軸是年份）、min-max 正規化、
   五種背景（同 seaborn 的 darkgrid／whitegrid／dark／white／ticks）、換顏色、標題與軸名稱。
   每畫一張圖，就把「做了哪一種圖」記進 done，讓任務清單自動打勾。 */
CDL.ChartBuilder = function (el, { id, store, getData, types = ["line", "scatter"], xcol = false, custom = true, tasks = [], done = {}, save = () => {}, onDraw = () => {} }) {
const { $, $$, esc, zh, isNum, fmtPlain, toast } = CDL;
Object.assign(store, Object.assign({ type: types[0], ys: [], colors: {}, norm: false, theme: "darkgrid", title: "", xlabel: "年份", ylabel: "", x: "Year", trend: false }, store));
if (!types.includes(store.type)) store.type = types[0];
const cv = `cv_${id}`;
const TYPE_ZH = { line: "折線圖", scatter: "散布圖" };
const THEME_ZH = { darkgrid: "灰底＋白格線（預設）", whitegrid: "白底＋灰格線", dark: "灰底、沒有格線", white: "白底、沒有格線", ticks: "白底＋刻度" };

el.innerHTML = `<div class="builder">
  <div class="builder-side">
    <div class="mini-title">你的欄位（拖到右邊的 Y 軸，或按「畫它」）</div>
    <div class="chip-list cols"></div>
    <div class="task-box"></div>
  </div>
  <div class="builder-main">
    ${types.length > 1 ? `<div class="viz-tabs">${types.map(t => `<button class="btn toggle" data-type="${t}">${TYPE_ZH[t]}</button>`).join("")}</div>` : ""}
    ${xcol ? `<div class="toolbar xrow"><label>X 軸 <select class="xsel"></select></label><span class="muted tiny xnote"></span></div>` : ""}
    <div class="axis-zone yzone"><span class="slot-label">Y 軸（最多 3 個欄位）</span><div class="zone-body"></div></div>
    <div class="toolbar">
      <label class="normlab"><input type="checkbox" class="norm"> 正規化（把每一欄換成 0～1）</label>
      ${custom ? `<label>背景 <select class="theme">${Object.entries(THEME_ZH).map(([t, n]) => `<option value="${t}">${n}</option>`).join("")}</select></label>` : ""}
      <label class="trendlab" hidden><input type="checkbox" class="trend"> 顯示趨勢線</label>
    </div>
    <div class="toolbar">
      <label>標題 <input type="text" class="title" placeholder="例如：巴西的森林越來越少"></label>
      <label>X 軸名稱 <input type="text" class="xlabel" placeholder="例如：年份"></label>
      <label>Y 軸名稱 <input type="text" class="ylabel" placeholder="例如：平方公里"></label>
    </div>
    <div class="chart-box"><canvas id="${cv}"></canvas></div>
    <div class="chart-actions"><button class="btn small dlimg">⬇ 存成圖片（等於在圖上按右鍵「另存圖片」）</button></div>
    <div class="hint"></div>
  </div>
</div>`;

const zone = $(".yzone", el);
CDL.dropTarget(zone, addY);
$$("[data-type]", el).forEach(b => b.addEventListener("click", () => { store.type = b.dataset.type; persist(); render(); }));
$(".norm", el).addEventListener("input", e => { store.norm = e.target.checked; persist(); draw(); });
$(".theme", el)?.addEventListener("input", e => { store.theme = e.target.value; persist(); draw(); });
$(".trend", el).addEventListener("input", e => { store.trend = e.target.checked; persist(); draw(); });
["title", "xlabel", "ylabel"].forEach(k => $("." + k, el).addEventListener("input", e => { store[k] = e.target.value; persist(); draw(); }));
$(".xsel", el)?.addEventListener("input", e => { store.x = e.target.value; if (store.x !== "Year") { store.ys = store.ys.filter(c => c !== store.x).slice(0, 1); store.norm = false; store.xlabel = zh(store.x); } else store.xlabel = "年份"; persist(); render(); });
$(".dlimg", el).addEventListener("click", () => CDL.downloadChart(cv, store.title || TYPE_ZH[store.type]));

function persist() { save(); }
function maxY() { return store.x === "Year" ? 3 : 1; }
function addY(col) {
  if (col === store.x) { toast("這個欄位已經放在 X 軸了"); return; }
  if (store.ys.includes(col)) return;
  if (store.ys.length >= maxY()) { if (maxY() === 1) store.ys = [col]; else { toast("最多放 3 個欄位"); return; } }
  else store.ys.push(col);
  persist(); render();
}
function colorOf(c) {
  if (!store.colors[c]) {
    const used = Object.entries(store.colors).filter(([k]) => !k.includes("#")).map(([, v]) => v);
    store.colors[c] = CDL.SNS.find(x => !used.includes(x)) || CDL.SNS[0];
  }
  return store.colors[c];
}

function render() {
  const d = getData();
  $$("[data-type]", el).forEach(b => b.classList.toggle("on", b.dataset.type === store.type));
  const box = $(".cols", el); box.innerHTML = "";
  if (!d) { box.innerHTML = '<div class="muted">還沒有資料。</div>'; draw(); return; }
  store.ys = store.ys.filter(c => d.cols.includes(c));
  if (store.x !== "Year" && !d.cols.includes(store.x)) store.x = "Year";
  d.cols.forEach(c => box.appendChild(CDL.makeChip(c, { used: store.ys.includes(c), addLabel: "畫它", onAdd: addY })));
  if (xcol) {
    const xs = $(".xsel", el);
    xs.innerHTML = `<option value="Year">年份（原課程的做法）</option>` + d.cols.map(c => `<option value="${esc(c)}">${esc(zh(c))}（延伸）</option>`).join("");
    xs.value = store.x;
    $(".xnote", el).textContent = store.x === "Year" ? "" : "延伸玩法：原課程的散布圖 X 軸都是年份。這裡改成拿一個欄位當 X，看看兩個欄位之間的關係。";
  }
  // 標籤
  const body = $(".zone-body", zone); body.innerHTML = "";
  store.ys.forEach(c => {
    const t = document.createElement("span");
    t.className = "tag";
    const col = colorOf(c);
    t.innerHTML = `<span class="tagname">${esc(zh(c))}</span><input type="color" value="${col}" title="選顏色"><input type="text" class="cname" list="cdlColors" placeholder="或輸入顏色英文名" value="${esc(store.colors[c + "#name"] || "")}" title="輸入 HTML 顏色名稱，例如 crimson、green"><button class="x" type="button" title="移除">×</button>`;
    $("input[type=color]", t).addEventListener("input", e => { store.colors[c] = e.target.value.toUpperCase(); store.colors[c + "#name"] = ""; $(".cname", t).value = ""; done.color = 1; persist(); draw(); });
    $(".cname", t).addEventListener("change", e => {
      const v = e.target.value.trim(), hex = CDL.colorToHex(v);
      if (v && !hex) { toast(`看不懂「${v}」這個顏色名稱`); return; }
      store.colors[c] = hex || colorOf(c); store.colors[c + "#name"] = v; $("input[type=color]", t).value = store.colors[c]; if (v) done.color = 1; persist(); draw();
    });
    $(".x", t).addEventListener("click", () => { store.ys = store.ys.filter(x => x !== c); persist(); render(); });
    body.appendChild(t);
  });
  $(".norm", el).checked = store.norm;
  $(".normlab", el).hidden = store.x !== "Year";
  if ($(".theme", el)) $(".theme", el).value = store.theme;
  $(".trendlab", el).hidden = store.x === "Year";
  $(".trend", el).checked = store.trend;
  ["title", "xlabel", "ylabel"].forEach(k => { const i = $("." + k, el); if (document.activeElement !== i) i.value = store[k] || ""; });
  draw();
}

function norm(d, c) {
  const v = d.years.map(y => d.data[c][y]).filter(isNum), lo = Math.min(...v), hi = Math.max(...v);
  return x => hi === lo ? 0 : (x - lo) / (hi - lo);
}

function draw() {
  const d = getData(), hint = $(".hint", el);
  const theme = custom ? store.theme : "darkgrid";
  const opts = CDL.baseOpts({ title: store.title.trim(), xTitle: store.xlabel.trim(), yTitle: store.ylabel.trim(), theme, legend: store.ys.length > 1 || store.norm });
  if (!d || !store.ys.length) {
    CDL.drawChart(cv, { type: "scatter", data: { datasets: [] }, options: opts });
    hint.innerHTML = "把一個欄位拖到 Y 軸（或按欄位旁的「畫它」），就會畫出圖。";
    renderTaskBox(); return;
  }
  const isLine = store.type === "line";
  let datasets;
  if (store.x === "Year") {
    datasets = store.ys.map((c, i) => {
      const f = store.norm ? norm(d, c) : v => v;
      return {
        type: isLine ? "line" : "scatter",
        label: (store.norm ? "正規化 " : "") + zh(c),
        data: d.years.filter(y => isNum(d.data[c][y])).map(y => ({ x: y, y: f(d.data[c][y]), raw: d.data[c][y] })),
        borderColor: colorOf(c), backgroundColor: colorOf(c), showLine: isLine, borderWidth: isLine ? 2.2 : 0, pointRadius: isLine ? 0 : 5, pointHoverRadius: 6, tension: 0,
      };
    });
  } else {
    const c = store.ys[0];
    const pts = d.years.filter(y => isNum(d.data[store.x][y]) && isNum(d.data[c][y])).map(y => ({ x: d.data[store.x][y], y: d.data[c][y], raw: d.data[c][y], year: y }));
    datasets = [{ type: isLine ? "line" : "scatter", label: zh(c), data: isLine ? pts.slice().sort((a, b) => a.x - b.x) : pts, borderColor: colorOf(c), backgroundColor: colorOf(c), showLine: isLine, pointRadius: isLine ? 0 : 5, borderWidth: isLine ? 2.2 : 0 }];
    if (store.trend && pts.length > 2) {
      const f = CDL.linFit(pts.map(p => p.x), pts.map(p => p.y)), xs = pts.map(p => p.x), lo = Math.min(...xs), hi = Math.max(...xs);
      datasets.push({ type: "line", label: "趨勢線", data: [{ x: lo, y: f.predict(lo) }, { x: hi, y: f.predict(hi) }], borderColor: "#3D464A", borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5 });
    }
    opts.scales.x.ticks.callback = v => fmtPlain(v);
  }
  opts.interaction = isLine ? { mode: "nearest", intersect: false } : { mode: "nearest", intersect: true };
  opts.plugins.tooltip.callbacks.label = ctx => {
    const r = ctx.raw;
    if (r.year) return `${r.year} 年：X＝${fmtPlain(r.x)}，Y＝${fmtPlain(r.y)}`;
    return `${ctx.dataset.label}｜${r.x}：${fmtPlain(r.raw ?? r.y)}${store.norm && isNum(r.raw) ? `（正規化後 ${r.y.toFixed(3)}）` : ""}`;
  };
  if (store.norm) { opts.scales.y.min = -0.05; opts.scales.y.max = 1.05; opts.scales.y.ticks.callback = v => v.toFixed(1); }
  CDL.drawChart(cv, { type: "scatter", data: { datasets }, options: opts });

  // 提示
  const mags = store.ys.map(c => Math.max(...d.years.map(y => Math.abs(d.data[c][y])).filter(isNum)));
  if (store.x === "Year" && !store.norm && store.ys.length > 1 && Math.max(...mags) / Math.max(1e-9, Math.min(...mags)) > 5)
    hint.innerHTML = "💡 這幾個欄位的數字大小差很多，數字小的那條線幾乎被壓成一直線，看不出它的變化。試試勾選<b>正規化</b>。";
  else if (store.norm) hint.innerHTML = "正規化（min-max）：每一欄都換成 (數值 − 最小值) ÷ (最大值 − 最小值)，最小的一年變 0、最大的一年變 1。數字變了，但每一年是升是降的關係沒變。";
  else hint.textContent = "";

  // 記錄做過哪些圖
  const t = store.type, n = store.ys.length;
  if (store.x === "Year") {
    if (n === 1 && !store.norm) done[`${t}-single-${store.ys[0]}`] = 1;
    if (n >= 2 && !store.norm) done[`${t}-raw2`] = 1;
    if (n >= 2 && store.norm) done[`${t}-norm2`] = 1;
    if (n === 3 && store.norm) done[`${t}-norm3`] = 1;
  } else done[`xy`] = 1;
  if (custom && store.theme !== "darkgrid") done.theme = 1;
  if (store.title.trim() && store.ylabel.trim()) done.labels = 1;
  if (store.title.trim()) done.title = 1;
  save(); onDraw();
  renderTaskBox();
}

function renderTaskBox() { CDL.renderTasks($(".task-box", el), tasks, done); }


render();
return { render, store };
};
