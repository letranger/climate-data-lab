/* 資料探索元件（第二課、第五課共用）：上傳 HDX 原始 CSV → 刪標籤列、刪重複欄位、重新排列 → 刪除缺失 ≥60% 的欄位
   → 列出欄位、看單一欄位、選三個欄位、相關係數 → 只留三欄、刪掉有空白的年份 → 存成 my_xxx_climate_data.csv。
   S 是該課的進度物件（會存進 localStorage），save() 存檔，onChange() 讓頁面更新步驟導覽。 */
CDL.Explore = function ({ S, save, onChange = () => {} }) {
const { $, $$, esc, zh, nameHTML, isNum, fmtPlain, toast } = CDL;

Object.assign(S, Object.assign({ fileName: "", csvText: "", reform: 0, threshold: 60, dropped: [], selected: [null, null, null], narrowed: false, cleaned: false }, S));
let IN = null, PIV = null;            // 讀入結果、樞紐後的資料框（不存檔，載入時重算）
const mounts = [];
const changed = () => { save(); onChange(); refresh(); };

// ───────── 資料 ─────────
function load(text, name, { silent = false } = {}) {
  let r;
  try { r = CDL.ingest(text, name); } catch (e) { toast(e.message, 5000); return false; }
  if (r.format !== "long") { toast("這個檔案已經整理過了。這裡要上傳從 HDX 下載的原始檔（檔名像 climate-change_xxx.csv）。", 6000); return false; }
  IN = r; PIV = CDL.pivot(r.long);
  if (!silent) {
    Object.assign(S, { fileName: name, csvText: text, reform: 0, dropped: [], selected: [null, null, null], narrowed: false, cleaned: false });
    toast(`已上傳 ${name}`);
  }
  return true;
}
if (S.csvText && !load(S.csvText, S.fileName, { silent: true })) Object.assign(S, { csvText: "", fileName: "" });

const loaded = () => !!IN;
const pivoted = () => !!IN && S.reform >= 3;
const keptCols = () => PIV ? PIV.cols.filter(c => !S.dropped.includes(c)) : [];
const selectedCols = () => S.selected.filter(Boolean);
const wide = () => pivoted() ? CDL.subset(PIV, keptCols()) : null;
const clean = () => S.cleaned && selectedCols().length ? CDL.subset(PIV, selectedCols(), { dropna: true }) : null;
const country = () => IN ? IN.country || "" : "";
const iso = () => IN ? IN.iso || "" : "";
const saveName = () => CDL.myFileName(country());

function refresh() { mounts.forEach(m => m.el.isConnected && m.render()); }
function mount(el, render) { const m = { el, render }; mounts.push(m); render(); return m; }

// ───────── 上傳 ─────────
function mountUpload(el, { expectIso = "", fileHint = "climate-change_xxx.csv" } = {}) {
  el.innerHTML = `<div class="dropzone">
      <div class="dz-icon">📄</div>
      <div class="dz-text"><b>把下載好的 <code>${esc(fileHint)}</code> 拖曳到這裡</b><br>或 <label class="link">點這裡選擇檔案<input type="file" accept=".csv,text/csv" hidden></label></div>
    </div><div class="upload-status"></div>`;
  CDL.bindFileDrop($(".dropzone", el), $("input", el), (text, name) => {
    if (!load(text, name)) return;
    if (expectIso && iso() && iso() !== expectIso) toast(`注意：你上傳的是 ${CDL.countryLabel(country(), iso())} 的資料，這一課用的是 ${CDL.COUNTRY_ZH[expectIso] || expectIso}。`, 6000);
    changed();
  });
  return mount(el, () => {
    const st = $(".upload-status", el);
    st.innerHTML = IN ? `<div class="ok-box">✅ 已上傳 <code>${esc(S.fileName)}</code>：${esc(CDL.countryLabel(country(), iso()))}${iso() ? `（${esc(iso())}）` : ""}，共 ${IN.totalRows.toLocaleString()} 列。</div>` : "";
  });
}

// ───────── 整理成「一年一列」：刪標籤列 → 刪重複欄位 → 重新排列 ─────────
function mountReformat(el) {
  return mount(el, () => {
    if (!IN) { el.innerHTML = '<div class="card muted">請先上傳 CSV 檔。</div>'; return; }
    const r = S.reform;
    const hx = IN.hasHxl;
    // 依目前進度顯示 df：刪掉第一列之後就不再顯示標籤列；刪掉三欄之後只剩 Year、Indicator Name、Value
    let rows = r >= 1 && hx ? [IN.rows[0], ...IN.rows.slice(2)] : IN.rows;
    if (r >= 2) {
      const keepIdx = IN.header.map((c, j) => CDL.REDUNDANT.includes(c) ? -1 : j).filter(j => j >= 0);
      rows = rows.slice(0, 14).map(row => keepIdx.map(j => row[j]));
    }
    const stage = r === 0 ? "整理前" : r === 1 ? "刪掉標籤列之後" : r === 2 ? "刪掉用不到的欄位之後" : "整理完成";
    let h = `<p class="muted">這就是你上傳的那份檔案（共 ${IN.totalRows.toLocaleString()} 列，一列只記錄「某一年、某一個指標」的一個數字）。接下來依序按下面的按鈕，表格會跟著改變。</p>
      ${r >= 3 ? "" : `<h3>① 目前的表格（${stage}，只顯示前 6 列）</h3>
      <div class="table-wrap small">${CDL.rawTableHTML(rows, { max: 7, strikeRow: r === 0 && hx ? 0 : -1, strikeCols: r === 1 ? CDL.REDUNDANT : [] })}</div>`}`;
    // 第一步：刪掉第一列
    h += `<div class="substep ${r >= 1 ? "done" : ""}"><h3>② 刪掉第一列的標籤 <span class="tbd" title="待小組討論後決定">待討論</span></h3>`;
    h += hx
      ? `<p>第一列（編號 0）是 <code>#country+name</code> 這類「標籤」，不是資料。</p>`
      : `<p class="callout">你下載的這份檔案<b>沒有</b> <code>#country+name</code> 這種標籤列（HDX 新版的檔案拿掉了），第一列就是真正的資料，這一步可以跳過。</p>`;
    h += r >= 1 ? `<p class="ok-line">✓ 完成</p>` : `<button class="btn primary" data-re="1">${hx ? "刪掉第一列" : "知道了，下一步"} ▶</button>`;
    h += `</div>`;
    if (r >= 1) {
      h += `<div class="substep ${r >= 2 ? "done" : ""}"><h3>③ 刪掉用不到的欄位</h3>
        <p>每一列的國家名稱、國家代碼都一樣，指標代碼和指標名稱也重複，留著沒用。（上面表格中劃線的就是這三欄）</p>
        ${r >= 2 ? `<p class="ok-line">✓ 完成，剩下 Year、Indicator Name、Value 三欄</p>` : `<button class="btn primary" data-re="2">刪掉這三欄 ▶</button>`}</div>`;
    }
    if (r >= 2) {
      h += `<div class="substep ${r >= 3 ? "done" : ""}"><h3>④ 重新排成「一年一列、一個指標一欄」</h3>
        <p>把「指標名稱」變成欄、「年份」變成列。這種表格叫做<b>資料框</b>，在 Excel 裡叫做<b>樞紐分析</b>。</p>
        ${r >= 3 ? "" : `<button class="btn primary" data-re="3">重新排列 ▶</button>`}</div>`;
    }
    if (r >= 3) {
      h += `<h3>⑤ 整理好的資料表</h3>
        <p>現在是 <b>${PIV.years.length}</b> 年（${PIV.years[0]}–${PIV.years.at(-1)}）× <b>${PIV.cols.length}</b> 個指標。每一欄最上方的 <span class="miss-inline">缺 %</span> 是這一欄有多少年沒有資料。</p>
        <div class="table-wrap">${CDL.tableHTML(PIV, PIV.cols, { showMiss: true })}</div>
        <div class="hint">表格裡灰色的 <span class="nan">—</span> 代表那一年沒有這個指標的資料。這不是你做錯了什麼。</div>`;
    }
    el.innerHTML = h;
    $$("[data-re]", el).forEach(b => b.addEventListener("click", () => {
      S.reform = Number(b.dataset.re);
      if (S.reform >= 3) toast("整理好了！");
      changed();
    }));
  });
}

// ───────── 刪除缺失 ≥ 60% 的欄位 ─────────
function mountMissing(el, { slider = true } = {}) {
  // 原課程固定刪掉缺失 ≥ 60% 的欄位；換門檻放在「延伸」裡，預設收起來
  el.innerHTML = `<div class="miss-head"><span class="tbd" title="待小組討論後決定">待討論</span></div>
    <div class="toolbar">
      <span>刪除缺失比例 ≥ <b class="thrv"></b> 的欄位<span class="muted tiny thrnote"></span></span>
      <button class="btn primary do"></button><button class="btn ghost undo">復原</button>
    </div>
    ${slider ? `<details class="howto ext-thr"><summary>🧪 延伸：換個門檻看看（原課程用 60%）</summary>
      <div class="toolbar"><label>門檻 <input type="range" min="40" max="90" step="5" class="thr"> <b class="thrv2"></b></label>
      <button class="btn small ghost thr60" type="button">回到 60%</button></div>
      <p class="muted tiny">拉拉看：門檻變了，下面那行「刪掉之後」的數字怎麼變？哪些欄位會被留下或刪掉？</p></details>` : ""}
    <div class="miss-summary card"></div>
    <div class="legend-row"><span class="sw keep"></span>保留　<span class="sw drop"></span>將被刪除　（長條＝缺失比例；右邊是這一欄有資料的年份）</div>
    <div class="missing-list"></div>`;
  const thr = $(".thr", el);
  if (thr) thr.addEventListener("input", e => { S.threshold = Number(e.target.value); save(); render(); });
  $(".thr60", el)?.addEventListener("click", () => { S.threshold = 60; save(); render(); });
  $(".do", el).addEventListener("click", () => {
    const add = PIV.cols.filter(c => !S.dropped.includes(c) && CDL.missingPct(PIV, c) >= S.threshold);
    S.dropped.push(...add);
    S.selected = S.selected.map(c => c && S.dropped.includes(c) ? null : c);
    S.narrowed = false; S.cleaned = false;
    toast(`已刪除 ${add.length} 個欄位，剩下 ${keptCols().length} 個。`);
    changed();
  });
  $(".undo", el).addEventListener("click", () => { S.dropped = []; changed(); });

  // 這一欄有資料的年份：最早～最晚，以及中間斷掉幾年
  function coverage(c) {
    const ys = PIV.years.filter(y => isNum(PIV.data[c][y]));
    if (!ys.length) return { text: "沒有資料", tag: "" };
    const a = ys[0], b = ys.at(-1), gaps = b - a + 1 - ys.length;
    const early = a > PIV.years[0], late = b < PIV.years.at(-1);
    const tag = ys.length <= 5 ? `只有 ${ys.length} 年有資料` : gaps > 0 ? `中間斷 ${gaps} 年` : early ? "早年沒資料" : late ? "最近幾年沒資料" : "每年都有";
    return { text: a === b ? `${a}` : `${a}–${b}`, tag };
  }
  function render() {
    if (!pivoted()) {
      $(".missing-list", el).innerHTML = '<div class="muted">請先完成上面的整理。</div>'; $(".miss-summary", el).hidden = true;
      $(".do", el).textContent = "先完成上面的整理"; $(".do", el).disabled = true; $(".undo", el).hidden = true;
      return;
    }
    if (!slider) S.threshold = 60;
    const t = S.threshold;
    if (thr) { thr.value = t; $(".thrv2", el).textContent = t + "%"; }
    $(".thrv", el).textContent = t + "%";
    $(".thrnote", el).textContent = t === 60 ? "" : "（你在延伸裡改過門檻，原課程用 60%）";
    const list = PIV.cols.map(c => ({ c, p: CDL.missingPct(PIV, c) })).sort((a, b) => b.p - a.p);
    $(".missing-list", el).innerHTML = list.map(({ c, p }) => {
      const dropped = S.dropped.includes(c), will = !dropped && p >= t, cv = coverage(c);
      return `<div class="miss-row${dropped ? " dropped" : ""}${will ? " will-drop" : ""}"><div class="name">${nameHTML(c)}</div>
        <div class="miss-bar"><span style="width:${p}%"></span></div><div class="pct">${p.toFixed(1)}%</div>
        <div class="cov">${cv.text}<small>${cv.tag}</small></div></div>`;
    }).join("");
    // 刪掉之後還剩多少：保留幾欄、最多還缺多少、整張表還有多少空格、全部保留欄位都有資料的年份
    const keep = list.filter(x => x.p < t), drop = list.length - keep.length;
    const sum = $(".miss-summary", el); sum.hidden = false;
    if (keep.length) {
      const maxMiss = Math.max(...keep.map(x => x.p));
      const blank = keep.reduce((s, x) => s + x.p, 0) / keep.length;
      const full = PIV.years.filter(y => keep.every(x => isNum(PIV.data[x.c][y])));
      sum.innerHTML = `<b>依 ${t}% 刪掉之後：</b>保留 <b>${keep.length}</b> 欄、刪掉 <b>${drop}</b> 欄｜保留的欄位最多還缺 <b>${maxMiss.toFixed(1)}%</b>｜整張表還有 <b>${blank.toFixed(0)}%</b> 是空格｜保留的欄位全都有資料的年份：<b>${full.length ? `${full[0]}–${full.at(-1)}（${full.length} 年）` : "沒有"}</b>
        <div class="muted tiny" style="margin-top:.3rem">缺失比例高，不一定代表資料很爛：很多指標是 1990 年後才開始統計，「早年沒資料」的欄位，從 1990 年起其實每年都有。</div>`;
    } else sum.innerHTML = `<b>依 ${t}% 刪掉之後：</b>所有欄位都會被刪掉。`;
    const n = list.filter(x => x.p >= t && !S.dropped.includes(x.c)).length;
    $(".do", el).textContent = n ? `刪除這 ${n} 個欄位` : S.dropped.length ? `已刪除 ${S.dropped.length} 個欄位` : "沒有要刪除的欄位";
    $(".do", el).disabled = !n;
    $(".undo", el).hidden = !S.dropped.length;
  }
  return mount(el, render);
}

// ───────── 選欄位：列出全部、看單一欄位、放進欄位 1～3、相關係數 ─────────
const SLOT_LABEL = ["欄位 1（你最有興趣的）", "欄位 2", "欄位 3"];
function setSlot(i, col) {
  const j = S.selected.indexOf(col);
  if (j >= 0) S.selected[j] = S.selected[i];
  S.selected[i] = col;
  S.narrowed = false; S.cleaned = false;
  changed();
}

function mountPicker(el, { slots = [0, 1, 2], corr = false, example = false, years = false } = {}) {
  const st = { preview: null, q: "", mode: "list", y0: null, y1: null };
  el.innerHTML = `<div class="pick-howto"></div>
    <div class="pick-layout">
      <div class="pick-left">
        <div class="mini-title">${slots.length === 1 ? "所有欄位（點一下就選它，右邊會畫出它的資料）" : "所有欄位（點一下就放進空的格子）"}</div>
        <input type="search" placeholder="🔍 搜尋欄位（中文或英文）">
        <div class="chip-list cols"></div>
      </div>
      <div class="pick-right">
        <div class="slots" style="grid-template-columns:repeat(${slots.length},1fr)">${slots.map(i => `<div class="slot" data-slot="${i}"><span class="slot-label">${SLOT_LABEL[i]}</span><div class="slot-body"></div></div>`).join("")}</div>
        <div class="preview card"></div>
      </div>
    </div>
    ${corr ? `<div class="corr-wrap"></div>` : ""}`;
  $("input[type=search]", el).addEventListener("input", e => { st.q = e.target.value.trim().toLowerCase(); render(); });

  /* 點左邊的欄位＝選它，右邊同時畫出它的資料（右邊只會顯示已選的欄位，不會和格子對不上）
     只有一個格子時：點別的欄位就換成它。多個格子時：依序放進空的格子；再點一次已選的欄位就拿掉。 */
  const mine = () => slots.map(i => S.selected[i]).filter(Boolean);
  function clickCol(col) {
    const i = S.selected.indexOf(col);
    if (i >= 0 && !slots.includes(i)) { st.preview = col; render(); return; }   // 別的步驟選的（例如第 8 步看欄位 1）：只顯示
    if (i >= 0) {
      if (slots.length === 1) { st.preview = col; render(); return; }
      S.selected[i] = null; S.narrowed = false; S.cleaned = false;
      st.preview = mine().at(-1) || null;
      changed(); return;
    }
    const empty = slots.find(k => !S.selected[k]);
    if (empty === undefined && slots.length > 1) { toast("格子都滿了。先點一下已選的欄位（或按格子右上角的 ×）把它拿掉，再選別的。", 4000); return; }
    st.preview = col;
    setSlot(empty === undefined ? slots[0] : empty, col);
  }

  function render() {
    if (!pivoted()) { $(".cols", el).innerHTML = '<div class="muted">請先完成前面的整理。</div>'; return; }
    const ds = PIV, cols = keptCols();
    const box = $(".cols", el); box.innerHTML = "";
    cols.filter(c => !st.q || c.toLowerCase().includes(st.q) || zh(c).toLowerCase().includes(st.q)).forEach(c => {
      const k = S.selected.indexOf(c);
      const chip = CDL.makeChip(c, {
        drag: false,
        extra: `${k >= 0 ? `<span class="slot-badge">欄位 ${k + 1}</span>` : ""}<span class="miss-tag">缺 ${CDL.missingPct(ds, c).toFixed(0)}%</span>`,
        onClick: clickCol,
      });
      if (k >= 0) chip.classList.add("selected");
      if (c === st.preview) chip.classList.add("current");
      box.appendChild(chip);
    });
    $$(".slot", el).forEach(slot => {
      const i = Number(slot.dataset.slot), col = S.selected[i];
      slot.classList.toggle("filled", !!col);
      $(".slot-body", slot).innerHTML = col ? nameHTML(col) : "點左邊的欄位";
      slot.onclick = e => { if (col && !e.target.closest(".x")) { st.preview = col; render(); } };
      $(".x", slot)?.remove();
      if (col) {
        const x = document.createElement("button");
        x.className = "x"; x.type = "button"; x.title = "移除"; x.textContent = "×";
        x.onclick = () => { S.selected[i] = null; S.narrowed = false; S.cleaned = false; if (st.preview === col) st.preview = mine().filter(c => c !== col).at(-1) || null; changed(); };
        slot.appendChild(x);
      }
    });
    // 這一步要選幾個、怎麼選
    const need = slots.filter(i => !S.selected[i]), names = need.map(i => `欄位 ${i + 1}`).join("、");
    $(".pick-howto", el).innerHTML = slots.length === 1
      ? (need.length ? `<b>這一步要選 1 個欄位（欄位 1）。</b>點左邊的欄位，它就會放進「欄位 1」，右邊同時畫出它每一年的資料。想換就點另一個欄位，可以多點幾個比較看看。`
                     : `<b>✓ 欄位 1 選好了。</b>想換就直接點左邊另一個欄位。`)
      : (need.length ? `<b>這一步要選 ${need.length} 個欄位（${names}）。</b>點左邊的欄位，會依序放進空的格子，右邊畫出你剛點的那一欄。點錯了，再點一次那個欄位（或按格子右上角的 ×）就會拿掉。`
                     : `<b>✓ 三個欄位都選好了。</b>想換的話，先點一下已選的欄位把它拿掉，再點別的欄位。點右邊的格子可以再看一次那一欄的資料。`);
    $(".pick-howto", el).classList.toggle("ok", !need.length);
    renderPreview();
    if (corr) renderCorr();
  }

  function renderPreview() {
    const box = $(".preview", el);
    if (!st.preview || !S.selected.includes(st.preview)) st.preview = mine().at(-1) || null;
    const col = st.preview;
    if (!col || !PIV.data[col]) { box.innerHTML = `<div class="muted">點左邊任一個欄位，這裡會畫出這一欄每一年的資料。記得往下捲看完所有年份。</div>`; return; }
    const ds = PIV;
    let yrs = ds.years;
    if (years) {
      if (st.y0 === null) { st.y0 = ds.years[0]; st.y1 = ds.years.at(-1); }
      yrs = yrs.filter(y => y >= st.y0 && y <= st.y1);
    }
    const has = yrs.filter(y => isNum(ds.data[col][y])), vals = has.map(y => ds.data[col][y]);
    box.innerHTML = `<h3>${nameHTML(col)}</h3>
      <div class="muted tiny">有資料 ${has.length} 年${has.length ? `（${has[0]}–${has.at(-1)}）` : ""}，缺失 ${CDL.missingPct(ds, col).toFixed(1)}%${vals.length ? `｜最小 ${fmtPlain(Math.min(...vals))}｜最大 ${fmtPlain(Math.max(...vals))}` : ""}</div>
      ${years ? `<div class="toolbar">只看 <select class="y0">${ds.years.map(y => `<option${y === st.y0 ? " selected" : ""}>${y}</option>`).join("")}</select> 到 <select class="y1">${ds.years.map(y => `<option${y === st.y1 ? " selected" : ""}>${y}</option>`).join("")}</select> 年</div>` : ""}
      <div class="preview-grid"><div class="table-wrap small"><table class="data"><thead><tr><th>年份</th><th>數值</th></tr></thead><tbody>${has.map(y => `<tr><td>${y}</td><td>${CDL.fmt(ds.data[col][y])}</td></tr>`).join("")}</tbody></table></div><div class="chart-box"><canvas id="prev_${el.id}"></canvas></div></div>`;
    $(".y0", box)?.addEventListener("change", e => { st.y0 = Number(e.target.value); renderPreview(); });
    $(".y1", box)?.addEventListener("change", e => { st.y1 = Number(e.target.value); renderPreview(); });
    CDL.drawChart(`prev_${el.id}`, {
      type: "line",
      data: { datasets: [{ label: zh(col), data: has.map((y, i) => ({ x: y, y: vals[i] })), borderColor: CDL.SNS[0], backgroundColor: CDL.SNS[0], pointRadius: 2, tension: 0 }] },
      options: CDL.baseOpts({ legend: false, xTitle: "年份" }),
    });
  }

  function corrColor(r) {
    if (!isNum(r)) return "#F1F4F5";
    const a = Math.abs(r);
    return r >= 0 ? `rgba(239,69,35,${0.12 + a * 0.85})` : `rgba(42,143,201,${0.12 + a * 0.85})`;
  }
  function constant(col) {
    const v = PIV.years.map(y => PIV.data[col][y]).filter(isNum);
    return v.length > 1 && v.every(x => x === v[0]);
  }
  function corrList(base, { top = 0 } = {}) {
    const cols = keptCols();
    let rows = cols.filter(c => c !== base).map(c => ({ c, ...CDL.corrPair(PIV, base, c) })).filter(x => isNum(x.r)).sort((a, b) => b.r - a.r);
    if (top) rows = rows.slice(0, top);
    return `<div class="corr-list">${rows.map(({ c, r, n }) => {
      const w = Math.abs(r) * 50, left = r >= 0 ? 50 : 50 - w;
      return `<div class="corr-row"><div class="name">${nameHTML(c)}</div>
        <div class="corr-bar"><span style="left:${left}%;width:${w}%;background:${corrColor(r)}"></span></div>
        <div class="r">${r.toFixed(2)}</div>
        <div class="n">${n} 年 ${S.selected.includes(c) ? "✓" : slots.length > 1 && slots.some(k => !S.selected[k]) ? `<button class="btn small add" data-add="${esc(c)}">選它</button>` : ""}</div></div>`;
    }).join("") || `<div class="muted">${constant(base) ? "這個欄位每一年的數字都一樣（例如每年都是 100%），沒有變化，就算不出相關係數。可以換一個會變化的欄位當欄位 1。" : "沒有足夠的共同年份可以計算。"}</div>`}</div>`;
  }
  function renderCorr() {
    const area = $(".corr-wrap", el), base = S.selected[0];
    const EX = "Forest area (sq. km)";
    let h = "";
    if (example && keptCols().includes(EX)) {
      h += `<h2>範例：和「森林面積（平方公里）」最相關的欄位</h2>
        <p class="muted">相關係數介於 −1 到 1：接近 1＝一個變大另一個也變大；接近 −1＝一個變大另一個變小；接近 0＝看不出直線關係。</p>
        <div class="card">${corrList(EX, { top: 6 })}</div>
        <p class="callout">排第一的「森林面積（占國土 %）」相關係數接近 1，因為兩欄量的是<b>同一件事</b>（森林面積），只是單位不同。把它們畫在一起不會有新發現。高度相關的兩欄，要想想：是兩種不同的資料剛好有關？還是根本在量同一件事？</p>`;
    }
    h += `<h2>哪些欄位和你的欄位 1 一起變化？</h2>`;
    if (!base) h += `<div class="card muted">先選好欄位 1，這裡會列出其他欄位和它的相關係數。</div>`;
    else {
      h += `<div class="corr-tabs"><button class="btn small toggle ${st.mode === "list" ? "on" : ""}" data-m="list">相關係數排行</button><button class="btn small toggle ${st.mode === "matrix" ? "on" : ""}" data-m="matrix">相關矩陣熱圖</button></div>`;
      if (st.mode === "list") h += `<div class="card"><div class="mini-title">和「${esc(zh(base))}」的相關係數（由高到低）</div>${corrList(base)}</div>`;
      else {
        const cols = keptCols();
        const top = cols.filter(c => c !== base && !S.selected.includes(c)).map(c => ({ c, ...CDL.corrPair(PIV, base, c) }))
          .filter(x => isNum(x.r)).sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, Math.max(0, 8 - selectedCols().length)).map(x => x.c);
        const show = [...new Set([base, ...selectedCols(), ...top])];
        h += `<div class="card"><div class="mini-title">你選的欄位，加上和「${esc(zh(base))}」關係最強的幾個欄位。橘色＝正相關，藍色＝負相關，顏色越深關係越強。</div><div style="overflow:auto"><table class="heat"><tr><th></th>` +
          show.map(c => `<th class="top">${esc(zh(c))}</th>`).join("") + "</tr>" +
          show.map(a => `<tr><th>${esc(zh(a))}</th>` + show.map(b => {
            const { r, n } = a === b ? { r: 1, n: 0 } : CDL.corrPair(PIV, a, b);
            return `<td style="background:${corrColor(r)};color:${Math.abs(r) > .6 ? "#fff" : "inherit"}" title="${esc(zh(a))} × ${esc(zh(b))}：${isNum(r) ? r.toFixed(2) : "資料不足"}${n ? `（${n} 年）` : ""}">${isNum(r) ? r.toFixed(2) : "—"}</td>`;
          }).join("") + "</tr>").join("") + "</table></div></div>";
      }
    }
    area.innerHTML = h;
    $$("[data-add]", area).forEach(b => b.addEventListener("click", () => clickCol(b.dataset.add)));
    $$("[data-m]", area).forEach(b => b.addEventListener("click", () => { st.mode = b.dataset.m; renderCorr(); }));
  }
  return mount(el, render);
}

// 你選的三個欄位
function interestPrint() {
  return `<ol class="picked">${S.selected.map((c, i) => `<li><b>欄位 ${i + 1}</b>　${c ? nameHTML(c) : '<span class="muted">（還沒選）</span>'}</li>`).join("")}</ol>`;
}

// ───────── 篩選三欄、dropna、存檔 ─────────
function mountClean(el, { download = true } = {}) {
  return mount(el, () => {
    const cols = selectedCols();
    if (cols.length < 3) { el.innerHTML = `<div class="card muted">請先選好三個欄位。</div>`; return; }
    const ds = PIV, all = ds.years;
    const keep = all.filter(y => cols.every(c => isNum(ds.data[c][y])));
    const removed = new Set(all.filter(y => !keep.includes(y)));
    let h = `<div class="card"><h3>① 只留下你的三個欄位</h3>
      <p class="muted">原本有 ${keptCols().length} 個欄位，縮小成 3 個。</p>
      ${S.narrowed ? `<p class="ok-line">✓ 完成</p>` : '<button class="btn primary nar">只留下這三欄 ▶</button>'}</div>`;
    if (S.narrowed) {
      h += `<div class="table-wrap" style="margin:.8rem 0">${CDL.tableHTML(ds, cols, { removedYears: S.cleaned ? removed : null })}</div>`;
      h += `<div class="card"><h3>② 刪掉有空白的年份</h3>
        <p class="muted">三個欄位中只要有一個是空白，那一年就整列刪掉。${S.cleaned ? "" : `將會刪掉 <b>${removed.size}</b> 年，留下 <b>${keep.length}</b> 年。`}</p>
        ${S.cleaned ? `<p class="ok-line">✓ 完成（上面表格中劃掉的是被刪掉的年份）</p>` : '<button class="btn primary dna">刪掉有空白的年份 ▶</button>'}</div>`;
    }
    if (S.cleaned) {
      h += `<div class="card done-card"><h3>✅ 資料整理完成</h3>
        <p>從 <b>${all.length}</b> 年（${all[0]}–${all.at(-1)}）變成 <b>${keep.length}</b> 年${keep.length ? `（${keep[0]}–${keep.at(-1)}）` : ""}。</p>
        ${keep.length < 8 ? '<p class="callout">⚠️ 剩下的年份太少了，後面畫圖和預測會很難做。建議回去換一個缺失比較少的欄位。</p>' : ""}
        ${download ? `<button class="btn primary dl">⬇ 下載 ${esc(saveName())}</button>` : ""}</div>`;
    }
    el.innerHTML = h;
    $(".nar", el)?.addEventListener("click", () => { S.narrowed = true; changed(); });
    $(".dna", el)?.addEventListener("click", () => { S.cleaned = true; changed(); toast("資料整理完成！"); });
    $(".dl", el)?.addEventListener("click", () => CDL.download(saveName(), CDL.wideCSV(clean())));
  });
}

// 清掉某一步的進度（按「◀ 上一步」離開時用），讓學生回來可以重做；建立在它上面的「只留三欄、刪空白年份」也一起清掉
function undo(step) {
  if (step === "reform") S.reform = 0;
  if (step === "missing") S.dropped = [];
  if (step === "pick1") S.selected[0] = null;
  if (step === "pick23") { S.selected[1] = null; S.selected[2] = null; }
  if (step === "pickall") S.selected = [null, null, null];
  S.narrowed = false; S.cleaned = false;
  changed();
}

function reset() {
  Object.assign(S, { fileName: "", csvText: "", reform: 0, threshold: 60, dropped: [], selected: [null, null, null], narrowed: false, cleaned: false });
  IN = null; PIV = null;
}

// 原始檔的內容（第二課「怎麼看資料表」用）：去掉標籤列後的每一列
function raw() {
  if (!IN) return null;
  const rows = IN.rows.slice(1).filter(r => !r.some(x => x.trim().startsWith("#")));
  return { header: IN.header, rows };
}

return { undo, raw, load, loaded, pivoted, keptCols, selectedCols, wide, clean, country, iso, saveName, refresh, interestPrint,
  mountUpload, mountReformat, mountMissing, mountPicker, mountClean, reset };
};
