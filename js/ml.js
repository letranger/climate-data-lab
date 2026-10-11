/* 預測元件（第四課、第五課共用）：線性迴歸、支援向量迴歸（先標準化），預測未來 5 年畫成虛線。
   配色照原課程：實際資料藍點、模型紅線、未來預測綠色虛線。
   原課程沒有的玩法（調 SVR 參數、考試模式、預測更遠）放在「延伸挑戰」裡。 */
CDL.ModelBuilder = function (el, { id, store, getData, models = ["lin", "svr"], extension = false, tasks = [], done = {}, save = () => {}, onDraw = () => {}, colLabel = (c, i) => `欄位 ${i + 1}` }) {
const { $, $$, esc, zh, isNum, fmtPlain, toast } = CDL;
Object.assign(store, Object.assign({ model: models[0], col: null, future: false, tryYear: null, showScaled: false, gamma: 0, C: 0, eps: 0.1, exam: false, k: 5, horizon: 5 }, store));
if (!models.includes(store.model)) store.model = models[0];
const cv = `cv_${id}`;
const NAME = { lin: "線性迴歸（最佳擬合直線）", svr: "支援向量迴歸 SVR（最佳擬合曲線）" };
const BLUE = "#1f3fff", RED = "#E0262B", GREEN = "#1a9e3a";

el.innerHTML = `<div class="builder">
  <div class="builder-side">
    <div class="mini-title">要預測哪一欄？</div>
    <div class="chip-list cols"></div>
    <div class="task-box"></div>
  </div>
  <div class="builder-main">
    ${models.length > 1 ? `<div class="viz-tabs">${models.map(m => `<button class="btn toggle" data-model="${m}">${NAME[m]}</button>`).join("")}</div>` : `<div class="model-title">${NAME[models[0]]}</div>`}
    <div class="axis-zone single yzone"><span class="slot-label">Y：要預測的欄位　（X 固定是年份）</span><div class="zone-body"></div></div>
    <div class="toolbar">
      <label class="future-lab"><input type="checkbox" class="future"> 預測未來 <b class="hz">5</b> 年（畫成綠色虛線）</label>
    </div>
    <div class="chart-box tall"><canvas id="${cv}"></canvas></div>
    <div class="chart-actions"><button class="btn small dlimg">⬇ 存成圖片</button></div>
    <div class="model-info"></div>
    <div class="tryit card"></div>
    ${extension ? `<details class="howto ext"><summary>🧪 延伸挑戰（原課程沒有，學有餘力再玩）<span class="tbd" title="待小組討論後決定">待討論</span></summary>
      <div class="ext-body">
        <p class="tbd-note"><span class="tbd" title="待小組討論後決定">待討論</span>原課程只用 <b>SVR() 的預設值</b>（γ=1、C=1、ε=0.1），Notebook、教師指南、投影片都沒有讓學生調參數；投影片 P71–P73 只用文字說明「貼太緊會過度擬合」和「泛化能力」。這一區的調參數滑桿、考試模式、預測超過 5 年，都是網頁版自己加的，用意是讓學生親手看到過度擬合。要不要保留，待小組決定。</p>
        <div class="svr-only">
          <div class="slider-row"><span title="gamma：曲線可以彎得多細">彎曲程度 γ</span><input type="range" class="g" min="-2" max="2" step="0.1"><b class="gv"></b></div>
          <div class="slider-row"><span title="C：多努力去貼近每一個點">貼合力道 C</span><input type="range" class="c" min="-1" max="3" step="0.1"><b class="cv"></b></div>
          <div class="slider-row"><span title="epsilon：管子內的誤差不計較">容忍管寬度 ε</span><input type="range" class="e" min="0" max="0.5" step="0.01"><b class="ev"></b></div>
          <div class="muted tiny">預設值就是原課程用的設定：γ=1、C=1、ε=0.1。</div>
        </div>
        <div class="toolbar">
          <label class="exam"><input type="checkbox" class="exm"> 考試模式：把最後 <input type="number" class="k" min="2" max="10"> 年藏起來當「考題」</label>
          <label>預測未來 <input type="number" class="hzin" min="5" max="40"> 年</label>
        </div>
        <div class="ext-result"></div>
      </div></details>` : ""}
  </div>
</div>`;

CDL.dropTarget($(".yzone", el), col => { store.col = col; save(); render(); });
$$("[data-model]", el).forEach(b => b.addEventListener("click", () => { store.model = b.dataset.model; save(); render(); }));
$(".future", el).addEventListener("input", e => { store.future = e.target.checked; save(); draw(); });
$(".dlimg", el).addEventListener("click", () => CDL.downloadChart(cv, store.model === "lin" ? "線性迴歸預測" : "SVR 預測"));
if (extension) {
  const bind = (sel, key, num = true) => $(sel, el).addEventListener("input", e => { store[key] = e.target.type === "checkbox" ? e.target.checked : num ? Number(e.target.value) : e.target.value; save(); draw(); });
  bind(".g", "gamma"); bind(".c", "C"); bind(".e", "eps"); bind(".exm", "exam"); bind(".k", "k"); bind(".hzin", "horizon");
}

const gamma = () => 10 ** store.gamma, Cval = () => 10 ** store.C;
const nice = v => v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);

function render() {
  const d = getData();
  $$("[data-model]", el).forEach(b => b.classList.toggle("on", b.dataset.model === store.model));
  const box = $(".cols", el); box.innerHTML = "";
  if (!d) { box.innerHTML = '<div class="muted">還沒有資料。</div>'; draw(); return; }
  if (!d.cols.includes(store.col)) store.col = d.cols[0] || null;
  d.cols.forEach((c, i) => box.appendChild(CDL.makeChip(c, { used: store.col === c, addLabel: "預測它", onAdd: col => { store.col = col; save(); render(); },
    label: `${colLabel(c, i)}：${zh(c)}` })));
  const body = $(".zone-body", $(".yzone", el));
  body.innerHTML = store.col ? `<span class="tag">${esc(zh(store.col))}</span>` : "";
  $(".future", el).checked = store.future;
  if (extension) {
    $(".g", el).value = store.gamma; $(".c", el).value = store.C; $(".e", el).value = store.eps;
    $(".exm", el).checked = store.exam; $(".k", el).value = store.k; $(".hzin", el).value = store.horizon;
    $(".svr-only", el).hidden = store.model !== "svr";
  }
  draw();
}

function fit(xs, ys) {
  return store.model === "lin" ? CDL.linFit(xs, ys) : CDL.svrFit(xs, ys, extension ? { C: Cval(), eps: store.eps, gamma: gamma() } : {});
}

function draw() {
  const d = getData();
  const info = $(".model-info", el), tryit = $(".tryit", el);
  const horizon = extension ? Math.max(5, Math.min(40, store.horizon || 5)) : 5;
  $(".hz", el).textContent = horizon;
  if (extension) { $(".gv", el).textContent = nice(gamma()); $(".cv", el).textContent = nice(Cval()); $(".ev", el).textContent = store.eps.toFixed(2); }
  if (!d || !store.col) {
    CDL.drawChart(cv, { type: "scatter", data: { datasets: [] }, options: CDL.baseOpts({ theme: "darkgrid" }) });
    info.innerHTML = '<div class="muted">選一個欄位，開始預測。</div>'; tryit.innerHTML = ""; renderTaskBox(); return;
  }
  const col = store.col;
  const yrs = d.years.filter(y => isNum(d.data[col][y])), vals = yrs.map(y => d.data[col][y]);
  if (yrs.length < 3) { info.innerHTML = '<div class="callout">這一欄的資料太少，沒辦法訓練模型。</div>'; return; }
  let k = extension && store.exam ? Math.max(2, Math.min(10, store.k || 5)) : 0;
  if (k && yrs.length - k < 5) k = Math.max(0, yrs.length - 5);
  const nTr = yrs.length - k;
  const trX = yrs.slice(0, nTr), trY = vals.slice(0, nTr), teX = yrs.slice(nTr), teY = vals.slice(nTr);
  const m = fit(trX, trY);
  const last = yrs.at(-1);
  const future = Array.from({ length: horizon }, (_, i) => last + 1 + i);

  const label = store.model === "lin" ? "最佳擬合線" : "最佳擬合曲線（SVR）";
  const ds = [{ type: "scatter", label: k ? "實際資料（訓練用）" : "實際資料", data: trX.map((x, i) => ({ x, y: trY[i] })), backgroundColor: BLUE, pointRadius: 4, order: 1 }];
  if (k) ds.push({ type: "scatter", label: "考題（模型看不到）", data: teX.map((x, i) => ({ x, y: teY[i] })), backgroundColor: "#fff", borderColor: "#EF4523", borderWidth: 2.5, pointRadius: 6, pointStyle: "rectRot", order: 0 });
  // 模型在資料年份上的預測
  const fine = [];
  for (let x = yrs[0]; x <= last + 1e-9; x += store.model === "lin" ? (last - yrs[0]) || 1 : 0.25) fine.push({ x, y: m.predict(x) });
  ds.push({ type: "line", label, data: fine, borderColor: RED, borderWidth: 2.5, pointRadius: 0, tension: 0, order: 2 });
  if (store.future) ds.push({ type: "line", label: `未來 ${horizon} 年的預測`, data: future.map(x => ({ x, y: m.predict(x) })), borderColor: GREEN, backgroundColor: GREEN, borderDash: [2, 4], borderWidth: 2.5, pointRadius: 3, order: 2 });
  if (isNum(store.tryYear) && (store.tryYear < yrs[0] || store.tryYear > last + 10)) store.tryYear = null;
  const tryYear = store.tryYear;
  if (isNum(tryYear)) ds.push({ type: "scatter", label: `${tryYear} 年的預測`, data: [{ x: tryYear, y: m.predict(tryYear) }], backgroundColor: "#F5D616", borderColor: "#3D464A", borderWidth: 2, pointRadius: 8, order: -1 });

  const opts = CDL.baseOpts({ theme: "darkgrid", title: (store.model === "lin" ? "線性迴歸" : "支援向量迴歸") + (store.future ? `：預測未來 ${horizon} 年` : ""), xTitle: "年份", yTitle: zh(col) });
  opts.interaction = { mode: "nearest", intersect: true };
  opts.plugins.tooltip.callbacks.label = c => `${c.dataset.label}｜${Math.round(c.raw.x * 4) / 4} 年：${fmtPlain(c.raw.y)}`;
  const x1 = Math.max(last, store.future ? future.at(-1) : last, isNum(tryYear) ? tryYear : last);
  const x0 = Math.min(yrs[0], isNum(tryYear) ? tryYear : yrs[0]);
  opts.scales.x.min = x0 - 1; opts.scales.x.max = x1 + 1;
  CDL.drawChart(cv, { type: "scatter", data: { datasets: ds }, options: opts });

  // 說明
  let h = "";
  if (store.model === "lin") {
    h += `<div class="card"><b>最佳擬合線：</b> y ＝ ${fmtPlain(m.a)} × 年份 ${m.b >= 0 ? "＋" : "−"} ${fmtPlain(Math.abs(m.b))}<br>
      白話：平均每過一年，「${esc(zh(col))}」大約 <b>${m.a >= 0 ? "增加" : "減少"} ${fmtPlain(Math.abs(m.a))}</b>。</div>`;
  } else {
    h += `<div class="card"><b>最佳擬合曲線</b>用到了 ${m.support} 個「支援向量」。曲線不必通過每一個點，留一點誤差空間，反而比較能預測新的資料（泛化）。
      <div style="margin-top:.4rem"><button class="btn small scl">${store.showScaled ? "收起" : "看看"}標準化做了什麼</button></div>
      ${store.showScaled ? scaledTable(yrs, vals, m) : ""}</div>`;
  }
  if (store.future) {
    h += `<div class="card"><div class="mini-title">未來 ${horizon} 年的預測</div><table class="mini"><tr><th>年份</th>${future.map(y => `<th>${y}</th>`).join("")}</tr>
      <tr><th>預測值</th>${future.map(y => `<td>${fmtPlain(m.predict(y))}</td>`).join("")}</tr></table></div>`;
  }
  info.innerHTML = h;
  $(".scl", info)?.addEventListener("click", () => { store.showScaled = !store.showScaled; save(); draw(); });

  // 投影片 P66「試試看」：在 x 軸找年份，讀出線上的 y
  // 年份選單：從這一欄有資料的第一年，到最後一年再往後 10 年（未來的年份標「未來」）
  const tyOpts = Array.from({ length: last + 10 - yrs[0] + 1 }, (_, i) => yrs[0] + i);
  tryit.innerHTML = `<b>試試看：</b>在 x 軸上找一個年份，看看${store.model === "lin" ? "最佳擬合線" : "最佳擬合曲線"}在那一年對應的 y 是多少。
    <div class="toolbar"><label>年份 <select class="ty"><option value="">選一個年份</option>${tyOpts.map(y => `<option value="${y}"${y === tryYear ? " selected" : ""}>${y}${y > last ? "（未來）" : ""}</option>`).join("")}</select></label>
    ${isNum(tryYear) ? `<span>→ ${tryYear} 年的預測值約為 <b>${fmtPlain(m.predict(tryYear))}</b>${yrs.includes(tryYear) ? `（實際值 ${fmtPlain(d.data[col][tryYear])}）` : tryYear > last ? "（這一年還沒有資料，是往未來推的）" : ""}</span>` : ""}</div>`;
  $(".ty", tryit).addEventListener("change", e => {
    const v = Number(e.target.value);
    store.tryYear = e.target.value === "" ? null : v;
    if (store.tryYear !== null) done.tryit = 1;
    save(); draw();
  });

  // 延伸：考試結果
  if (extension) {
    const mae = (xs, ys) => xs.length ? CDL.mean(xs.map((x, i) => Math.abs(m.predict(x) - ys[i]))) : NaN;
    let e = `<table class="mini"><tr><th>訓練資料平均誤差</th><td>${fmtPlain(mae(trX, trY))}</td></tr>${k ? `<tr><th>考題平均誤差</th><td><b>${fmtPlain(mae(teX, teY))}</b></td></tr>` : ""}</table>`;
    if (k && store.model === "svr" && gamma() >= 10 && Cval() >= 30) e += `<p class="callout">γ、C 調很大時，曲線會拚命貼近訓練資料。看看考題的誤差有沒有變大？這就是<b>過度擬合</b>：把練習題背起來，新題目反而不會。</p>`;
    $(".ext-result", el).innerHTML = e;
  }

  // 記錄做過的事
  done[`${store.model}-${col}`] = 1;
  if (store.future) done[`${store.model}-future-${col}`] = 1;
  save();
  renderTaskBox(); onDraw();
}

function scaledTable(yrs, vals, m) {
  const rows = yrs.slice(0, 6);
  return `<p class="muted tiny" style="margin:.5rem 0 .3rem">年份從 ${yrs[0]} 到 ${yrs.at(-1)}，每一年只差 1；數值可能是幾十萬。標準化把兩者都換成「離平均差幾個標準差」，平均變 0、標準差變 1。畫圖前再換回原本的單位。</p>
    <table class="mini"><tr><th>年份</th><th>標準化後的年份</th><th>${esc(zh(store.col))}</th><th>標準化後的值</th></tr>
    ${rows.map((y, i) => `<tr><td>${y}</td><td>${m.sx.transform(y).toFixed(3)}</td><td>${fmtPlain(vals[i])}</td><td>${m.sy.transform(vals[i]).toFixed(3)}</td></tr>`).join("")}
    <tr><td colspan="4" class="muted">……（共 ${yrs.length} 年）</td></tr></table>`;
}

function renderTaskBox() { CDL.renderTasks($(".task-box", el), tasks, done); }


render();
return { render, store };
};
