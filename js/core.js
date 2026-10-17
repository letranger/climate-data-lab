/* 氣候資料實驗室：共用核心（CSV 解析、樞紐、統計與模型、圖表、拖曳、步驟導覽、進度儲存）。
   每一課的頁面都會載入這個檔案，再載入自己需要的元件。全部運算都在瀏覽器中進行。 */
window.CDL = (() => {
"use strict";

// ───────────────────────── 小工具 ─────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const zh = col => (window.INDICATOR_ZH && window.INDICATOR_ZH[col]) || col;
const hasZh = col => !!(window.INDICATOR_ZH && window.INDICATOR_ZH[col]);
const nameHTML = col => hasZh(col) ? `${esc(zh(col))}<small>${esc(col)}</small>` : esc(col);
const isNum = v => typeof v === "number" && isFinite(v);

function fmt(v) {
  if (!isNum(v)) return '<span class="nan">—</span>';
  return fmtPlain(v);
}
function fmtPlain(v) {
  if (!isNum(v)) return "—";
  const a = Math.abs(v);
  return v.toLocaleString("zh-TW", { maximumFractionDigits: a >= 1000 ? 0 : a >= 10 ? 2 : 3 });
}

function toast(msg, ms = 2600) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), ms);
}

function download(name, content, type = "text/csv") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type + ";charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ───────────────────────── 儲存進度（只存在這個瀏覽器） ─────────────────────────
function makeStore(key) {
  return {
    load() { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } },
    save(obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* 無痕模式或儲存空間被封鎖時，略過即可 */ } },
    clear() { try { localStorage.removeItem(key); } catch (e) { } },
  };
}
const NAME_KEY = "cdl-student-name";
const getName = () => { try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; } };
const setName = v => {
  try { localStorage.setItem(NAME_KEY, v); } catch (e) { }
  renderNamePill();
  $$("#nameInput").forEach(i => { if (document.activeElement !== i) i.value = v; });
};

/* 右上角的名字：點一下就能改（Enter 或點別處儲存，Esc 取消）。還沒填名字時顯示「點這裡輸入名字」。 */
function renderNamePill() {
  const nm = $("#studentName");
  if (!nm || nm.querySelector("input")) return;
  const v = getName();
  nm.textContent = v ? `👤 ${v}` : "👤 點這裡輸入名字";
  nm.classList.toggle("empty", !v);
  nm.title = "點一下改名字";
}
function editNamePill() {
  const nm = $("#studentName");
  if (nm.querySelector("input")) return;
  nm.innerHTML = `👤 <input type="text" maxlength="20" placeholder="你的名字">`;
  const i = nm.querySelector("input");
  i.value = getName();
  i.focus(); i.select();
  let done = false;
  const finish = ok => {
    if (done) return; done = true;
    const v = i.value.trim();
    nm.textContent = "";
    if (ok) setName(v); else renderNamePill();
  };
  i.addEventListener("keydown", e => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); });
  i.addEventListener("blur", () => finish(true));
}

// ───────────────────────── CSV 解析 ─────────────────────────
function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}

const toNum = s => {
  if (s === undefined || s === null) return NaN;
  const t = String(s).trim().replace(/,/g, "");
  return t === "" ? NaN : Number(t);
};

const REDUNDANT = ["Country Name", "Country ISO3", "Indicator Code"];

/* 時間鍵：年資料用西元年（2024）；逐月資料用「年×100＋月」（202407）。
   兩種都是整數，排序、當物件的 key 都一樣；畫圖與迴歸時用 tX() 換成「年＋(月−1)/12」的數值，顯示時用 tLabel()。
   資料框（ds）有 freq 欄位："year" 或 "month"，整個流程只在顯示文字和時間軸刻度上有差別。 */
const isMonthKey = k => k > 100000;
const monthly = ds => !!ds && ds.freq === "month";
const tLabel = k => isMonthKey(k) ? `${Math.floor(k / 100)}-${String(k % 100).padStart(2, "0")}` : String(k);
const tX = k => isMonthKey(k) ? Math.floor(k / 100) + (k % 100 - 1) / 12 : k;
const tKey = (x, isMonth) => {                         // 數值 → 鍵（月：四捨五入到最近的月）
  if (!isMonth) return Math.round(x);
  let y = Math.floor(x + 1e-9), m = Math.round((x - y) * 12) + 1;
  if (m > 12) { y += 1; m = 1; }
  return y * 100 + m;
};
const tNext = (k, n = 1) => {                          // 往後 n 個單位（年或月）
  if (!isMonthKey(k)) return k + n;
  const y = Math.floor(k / 100), m0 = k % 100 - 1 + n;
  return (y + Math.floor(m0 / 12)) * 100 + (((m0 % 12) + 12) % 12) + 1;
};
const tUnit = ds => monthly(ds) ? "月" : "年";       // 「46 年」「552 個月」的單位
const tName = ds => monthly(ds) ? "年月" : "年份";    // 欄位標題
const tCount = (ds, n) => monthly(ds) ? `${n} 個月` : `${n} 年`;
const tSpan = (ds, a, b) => `${tLabel(a)}–${tLabel(b)}`;
const parseYM = (ystr, mstr) => {                      // 讀 CSV：Year（可能是 "2024-07"）＋可有可無的 Month 欄
  const y = String(ystr || "").trim(), m = String(mstr || "").trim();
  let mm = /^(\d{4})[-/.](\d{1,2})$/.exec(y);
  if (mm) return Number(mm[1]) * 100 + Number(mm[2]);
  const yy = toNum(y);
  if (!Number.isInteger(yy)) return NaN;
  if (m !== "") { const mo = toNum(m); return Number.isInteger(mo) && mo >= 1 && mo <= 12 ? yy * 100 + mo : NaN; }
  return yy;
};

/* 讀入 CSV，判斷是 HDX 原始的「長格式」（一列一筆數字），還是已經整理好的「寬格式」（一年一列）。
   長格式會保留原始的每一列，讓第二、五課可以一步一步做 iloc[1:]、drop、pivot。 */
function ingest(text, fileName) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("這個檔案好像是空的。");
  const header = rows[0].map(h => h.trim());
  const yi = header.findIndex(h => /^(year|yearmonth)$/i.test(h));
  const mi = header.findIndex(h => /^month$/i.test(h));
  const ii = header.indexOf("Indicator Name");
  const vi = header.indexOf("Value");
  const ci = header.indexOf("Country Name");
  const iso = header.indexOf("Country ISO3");
  const out = { fileName, header, rows, totalRows: rows.length - 1 };
  if (yi >= 0 && ii >= 0 && vi >= 0) {
    out.format = "long";
    out.hasHxl = rows.length > 1 && rows[1].some(x => x.trim().startsWith("#"));
    const recs = [];
    for (const r of rows.slice(1)) {
      const y = parseYM(r[yi], mi >= 0 ? r[mi] : "");
      if (!Number.isInteger(y)) continue;
      if (ci >= 0 && !out.country && r[ci]) out.country = r[ci];
      if (iso >= 0 && !out.iso && r[iso]) out.iso = r[iso];
      recs.push({ year: y, name: r[ii], value: toNum(r[vi]) });
    }
    if (!recs.length) throw new Error("找不到任何年份資料。");
    out.freq = recs.some(r => isMonthKey(r.year)) ? "month" : "year";
    out.long = recs;
  } else if (yi >= 0) {
    out.format = "wide";
    const skip = new Set([yi, mi].filter(j => j >= 0));
    const cols = header.filter((h, j) => !skip.has(j) && h !== "" && !/^(year|month)$/i.test(h));
    const data = {}; cols.forEach(c => data[c] = {});
    const years = [];
    for (const r of rows.slice(1)) {
      const y = parseYM(r[yi], mi >= 0 ? r[mi] : "");
      if (!Number.isInteger(y)) continue;
      years.push(y);
      header.forEach((h, j) => { if (!skip.has(j) && cols.includes(h)) { const v = toNum(r[j]); if (isNum(v)) data[h][y] = v; } });
    }
    out.freq = years.some(isMonthKey) ? "month" : "year";
    out.wide = { years: [...new Set(years)].sort((a, b) => a - b), cols, data, freq: out.freq };
    const m = fileName.match(/^my_(.+?)_climate_data/i) || fileName.match(/^ex_(.+?)_climate_data/i);
    if (m) out.country = m[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  } else {
    throw new Error("看不懂這個 CSV：需要有「Year」欄位。");
  }
  return out;
}

// 長格式 → 「一年一列、一個指標一欄」（等同 pandas 的 df.pivot(index='Year', columns='Indicator Name', values='Value')）
function pivot(long, freq = "year") {
  const years = [...new Set(long.map(r => r.year))].sort((a, b) => a - b);
  const cols = [...new Set(long.map(r => r.name))].sort();
  const data = {}; cols.forEach(c => data[c] = {});
  for (const r of long) if (isNum(r.value)) data[r.name][r.year] = r.value;
  return { years, cols, data, freq };
}

const missingPct = (ds, col) => 100 * (1 - ds.years.filter(y => isNum(ds.data[col][y])).length / ds.years.length);

function subset(ds, cols, { dropna = false } = {}) {
  const years = dropna ? ds.years.filter(y => cols.every(c => isNum(ds.data[c][y]))) : ds.years.slice();
  const data = {}; cols.forEach(c => { data[c] = {}; years.forEach(y => { if (isNum(ds.data[c][y])) data[c][y] = ds.data[c][y]; }); });
  return { years, cols: cols.slice(), data, freq: ds.freq || "year" };
}

function wideCSV(ds) {
  const q = s => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return [(monthly(ds) ? "YearMonth," : "Year,") + ds.cols.map(q).join(","), ...ds.years.map(y => [tLabel(y), ...ds.cols.map(k => isNum(ds.data[k][y]) ? ds.data[k][y] : "")].join(","))].join("\n") + "\n";
}

const COUNTRY_ZH = {
  TWN: "台灣", BRA: "巴西", USA: "美國", JPN: "日本", KOR: "韓國", PHL: "菲律賓", VNM: "越南", IDN: "印尼", THA: "泰國",
  IND: "印度", CHN: "中國", AUS: "澳洲", CAN: "加拿大", GBR: "英國", DEU: "德國", FRA: "法國", MYS: "馬來西亞", SGP: "新加坡",
};
const countryLabel = (country, iso) => (iso && COUNTRY_ZH[iso]) || country || "";
function myFileName(country, isMonth = false) {
  const slug = (country || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return (slug ? `my_${slug}_climate_data` : "my_climate_data") + (isMonth ? "_monthly" : "") + ".csv";
}

// ───────────────────────── 統計與模型 ─────────────────────────
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))) || 1; };

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return NaN;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}
// 兩欄都有資料的年份才拿來算（等同 pandas .corr() 的成對計算）
function corrPair(ds, a, b) {
  const xs = [], ys = [];
  for (const y of ds.years) { const u = ds.data[a][y], v = ds.data[b][y]; if (isNum(u) && isNum(v)) { xs.push(u); ys.push(v); } }
  return { r: xs.length >= 5 ? pearson(xs, ys) : NaN, n: xs.length };
}

// 等同 scikit-learn 的 LinearRegression
function linFit(xs, ys) {
  const n = xs.length, mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const a = sxx ? sxy / sxx : 0, b = my - a * mx;
  return { a, b, predict: x => a * x + b };
}

// 等同 scikit-learn 的 StandardScaler：平均 0、標準差 1
function scaler(vals) {
  const m = mean(vals), s = std(vals);
  return { mean: m, scale: s, transform: v => (v - m) / s, inverse: z => z * s + m };
}

/* 支援向量迴歸（RBF 核）。和第四課的 Notebook 一樣，先用 StandardScaler 把 X、Y 標準化，
   預設參數同 scikit-learn 的 SVR()：γ=1（標準化後的 'scale'）、C=1、ε=0.1。
   用座標下降法解對偶問題，截距用「核函數 + 1」併入；幾十筆資料時與 libsvm 的結果相差不到 1%。 */
function svrFit(xsRaw, ysRaw, { C = 1, eps = 0.1, gamma = 1 } = {}) {
  const sx = scaler(xsRaw), sy = scaler(ysRaw);
  const xs = xsRaw.map(sx.transform), ys = ysRaw.map(sy.transform);
  const n = xs.length;
  const K = xs.map(xi => xs.map(xj => Math.exp(-gamma * (xi - xj) ** 2) + 1));
  const beta = new Array(n).fill(0), f = new Array(n).fill(0);
  for (let sweep = 0; sweep < 5000; sweep++) {
    let maxD = 0;
    for (let i = 0; i < n; i++) {
      const kii = K[i][i];
      const r = ys[i] - (f[i] - kii * beta[i]);
      let nb = r > eps ? (r - eps) / kii : r < -eps ? (r + eps) / kii : 0;
      nb = Math.max(-C, Math.min(C, nb));
      const d = nb - beta[i];
      if (d !== 0) {
        beta[i] = nb;
        for (let j = 0; j < n; j++) f[j] += K[j][i] * d;
        maxD = Math.max(maxD, Math.abs(d));
      }
    }
    if (maxD < 1e-8) break;
  }
  return {
    sx, sy,
    support: beta.filter(b => Math.abs(b) > 1e-9).length,
    predict: x => {
      const z = sx.transform(x);
      let s = 0;
      for (let j = 0; j < n; j++) s += beta[j] * (Math.exp(-gamma * (z - xs[j]) ** 2) + 1);
      return sy.inverse(s);
    },
  };
}

// ───────────────────────── 表格 ─────────────────────────
function tableHTML(ds, cols, { years = ds.years, showMiss = false, removedYears = null, yearLabel = tName(ds) } = {}) {
  let h = `<table class="data"><thead><tr><th>${esc(yearLabel)}</th>`;
  for (const c of cols) {
    h += `<th>${hasZh(c) ? esc(zh(c)) + `<span class="en">${esc(c)}</span>` : esc(c)}`;
    if (showMiss) h += `<span class="miss">缺 ${missingPct(ds, c).toFixed(1)}%</span>`;
    h += "</th>";
  }
  h += "</tr></thead><tbody>";
  for (const y of years) {
    const cls = removedYears && removedYears.has(y) ? ' class="removed"' : "";
    h += `<tr${cls}><td>${tLabel(y)}</td>` + cols.map(c => `<td>${fmt(ds.data[c][y])}</td>`).join("") + "</tr>";
  }
  return h + "</tbody></table>";
}
function rawTableHTML(rows, { max = 13, strikeRow = -1, strikeCols = [] } = {}) {
  const header = rows[0];
  const sc = new Set(strikeCols.map(c => header.indexOf(c)).filter(i => i >= 0));
  let h = '<table class="data raw"><thead><tr><th></th>' + header.map((c, j) => `<th class="${sc.has(j) ? "struck" : ""}">${esc(c)}</th>`).join("") + "</tr></thead><tbody>";
  rows.slice(1, max).forEach((r, i) => {
    h += `<tr class="${i === strikeRow ? "removed" : ""}"><td>${i}</td>` + r.map((c, j) => `<td class="left${sc.has(j) ? " struck" : ""}">${esc(c)}</td>`).join("") + "</tr>";
  });
  return h + "</tbody></table>";
}


// ───────────────────────── 拖曳 ─────────────────────────
/* 用 Pointer Events 自己實作拖曳，滑鼠、觸控筆、平板手指都能用
  （瀏覽器內建的 HTML5 drag-and-drop 在 iPad 等觸控裝置上不能用）。
   觸控時只有按住左邊的 ⋮⋮ 把手才會開始拖曳，避免和捲動清單衝突。 */
const dropHandlers = new Map();
let drag = null;
function makeChip(col, { addLabel = "加入", onAdd, onClick, used = false, extra = "", label, drag: canDrag = true } = {}) {
  const el = document.createElement("div");
  el.className = "chip" + (used ? " used" : "");
  el.innerHTML = `${canDrag ? '<span class="grip" title="按住拖曳">⋮⋮</span>' : ""}<span class="txt">${label ? esc(label) : hasZh(col) ? esc(zh(col)) + `<small>${esc(col)}</small>` : esc(col)}</span>${extra}` +
    (onAdd ? `<button class="add" type="button">${esc(addLabel)}</button>` : "");
  if (canDrag) el.addEventListener("pointerdown", e => {
    if (e.button !== 0 || e.target.closest(".add")) return;
    if (e.pointerType === "touch" && !e.target.closest(".grip")) return;
    drag = { col, el, x0: e.clientX, y0: e.clientY, started: false, ghost: null, over: null, id: e.pointerId };
  });
  if (onAdd) $(".add", el).addEventListener("click", e => { e.stopPropagation(); onAdd(col); });
  el.addEventListener("click", () => { if (el._justDragged) { el._justDragged = false; return; } onClick && onClick(col, el); });
  return el;
}
function dropTarget(el, onDrop) {
  el.dataset.droptarget = "1";
  dropHandlers.set(el, onDrop);
}
function setupPointerDrag() {
  document.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.started = true;
      drag.el.classList.add("dragging");
      document.body.classList.add("is-dragging");
      const g = drag.el.cloneNode(true);
      g.className = "chip drag-ghost";
      g.style.width = drag.el.offsetWidth + "px";
      document.body.appendChild(g);
      drag.ghost = g;
    }
    e.preventDefault();
    drag.ghost.style.transform = `translate(${e.clientX + 8}px, ${e.clientY + 8}px)`;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const t = under && under.closest("[data-droptarget]");
    if (t !== drag.over) { drag.over && drag.over.classList.remove("over"); t && t.classList.add("over"); drag.over = t; }
  }, { passive: false });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.started) return;
    d.el.classList.remove("dragging");
    document.body.classList.remove("is-dragging");
    d.ghost.remove();
    d.el._justDragged = true;
    setTimeout(() => { d.el._justDragged = false; }, 0);
    if (d.over) { d.over.classList.remove("over"); if (e.type === "pointerup") dropHandlers.get(d.over)?.(d.col); }
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
}

// ───────────────────────── 檔案上傳 ─────────────────────────
function bindFileDrop(zone, input, onText) {
  const read = f => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type && !/csv|text/.test(f.type)) { toast("請選擇 .csv 檔"); return; }
    const r = new FileReader();
    r.onload = () => onText(String(r.result), f.name);
    r.readAsText(f, "utf-8");
  };
  zone.addEventListener("dragover", e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); zone.classList.add("over"); } });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", e => { if (e.dataTransfer.files.length) { e.preventDefault(); zone.classList.remove("over"); read(e.dataTransfer.files[0]); } });
  input.addEventListener("change", () => { read(input.files[0]); input.value = ""; });
}

// ───────────────────────── 圖表 ─────────────────────────
const charts = {};
// seaborn 預設配色（deep）：藍、橘、綠
const SNS = ["#4C72B0", "#DD8452", "#55A868", "#C44E52", "#8172B3", "#937860"];

/* 模擬 seaborn 的五種背景主題：darkgrid（預設）、whitegrid、dark、white、ticks */
const THEMES = {
  darkgrid: { area: "#EAEAF2", grid: "#FFFFFF", gridOn: true, ticks: false, border: false },
  whitegrid: { area: "#FFFFFF", grid: "#DDDDDD", gridOn: true, ticks: false, border: true },
  dark: { area: "#EAEAF2", grid: "#FFFFFF", gridOn: false, ticks: false, border: false },
  white: { area: "#FFFFFF", grid: "#DDDDDD", gridOn: false, ticks: false, border: true },
  ticks: { area: "#FFFFFF", grid: "#DDDDDD", gridOn: false, ticks: true, border: true },
};
const bgPlugin = {
  id: "cdlBg",
  beforeDraw(c) {
    const { ctx, width, height, chartArea: a } = c;
    ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
    const th = THEMES[c.options.plugins.cdlTheme] || THEMES.white;
    if (a) { ctx.fillStyle = th.area; ctx.fillRect(a.left, a.top, a.right - a.left, a.bottom - a.top); }
    ctx.restore();
  },
};
function applyTheme(opts, theme = "white") {
  const th = THEMES[theme] || THEMES.white;
  opts.plugins.cdlTheme = theme;
  for (const k of Object.keys(opts.scales)) {
    const s = opts.scales[k];
    s.grid = Object.assign({}, s.grid, { display: th.gridOn || th.ticks || th.border, drawOnChartArea: th.gridOn, color: th.grid, drawTicks: th.ticks, tickLength: th.ticks ? 6 : 0, tickColor: "#3D464A" });
    s.border = { display: th.border, color: "#3D464A" };
  }
  return opts;
}
/* X 軸是時間時的刻度文字：年資料照常顯示整數年；逐月資料的 x 是「年＋(月−1)/12」，刻度換成「2024-07」 */
const timeTicks = isMonth => isMonth ? (v => (Math.abs(v * 12 - Math.round(v * 12)) < 1e-6 ? tLabel(tKey(v, true)) : "")) : (v => Number.isInteger(v) ? String(v) : "");
function baseOpts({ legend = true, xTitle = "", yTitle = "", title = "", theme = "white", timeX = null } = {}) {
  const o = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: { display: legend, position: window.innerWidth < 700 ? "bottom" : "right", labels: { usePointStyle: true, boxWidth: 8 } },
      title: { display: !!title, text: title, font: { size: 16, weight: "bold" }, color: "#3D464A" },
      tooltip: { callbacks: {} },
    },
    scales: {
      x: { type: "linear", title: { display: !!xTitle, text: xTitle }, ticks: { callback: timeX === null ? (v => String(v)) : timeTicks(timeX) } },
      y: { title: { display: !!yTitle, text: yTitle }, ticks: { callback: v => fmtPlain(v) } },
    },
  };
  return applyTheme(o, theme);
}
function drawChart(id, cfg) {
  if (charts[id]) charts[id].destroy();
  const cv = document.getElementById(id);
  if (!cv) return null;
  cfg.plugins = [...(cfg.plugins || []), bgPlugin];
  charts[id] = new Chart(cv, cfg);
  return charts[id];
}
function downloadChart(id, fallback = "圖表") {
  const c = charts[id];
  if (!c) return;
  const title = (c.options.plugins.title && c.options.plugins.title.text) || fallback;
  const a = document.createElement("a");
  a.href = c.toBase64Image("image/png", 1);
  a.download = `${title}.png`;
  a.click();
}

// CSS 顏色名稱（HTML color names），給「用顏色名稱換色」的輸入框提示
const COLOR_NAMES = ["red", "crimson", "tomato", "orange", "darkorange", "gold", "yellowgreen", "green", "seagreen", "forestgreen", "teal", "turquoise",
  "skyblue", "steelblue", "royalblue", "blue", "navy", "purple", "mediumvioletred", "orchid", "hotpink", "brown", "chocolate", "gray", "black", "salmon", "olive", "indigo"];
function colorToHex(c) {
  if (!c) return null;
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toUpperCase();
  if (!CSS.supports("color", c)) return null;
  const cv = document.createElement("canvas").getContext("2d");
  cv.fillStyle = "#000"; cv.fillStyle = c;
  return /^#/.test(cv.fillStyle) ? cv.fillStyle.toUpperCase() : null;
}
function colorDatalist() {
  if ($("#cdlColors")) return;
  const dl = document.createElement("datalist");
  dl.id = "cdlColors";
  dl.innerHTML = COLOR_NAMES.map(n => `<option value="${n}">`).join("");
  document.body.appendChild(dl);
}

// ───────────────────────── STOP 討論卡 ─────────────────────────
function decorateStops() {
  $$(".stop").forEach(s => {
    if (s.dataset.done) return;
    s.dataset.done = 1;
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="stop-meta"><b>停下來討論</b>${s.dataset.slides ? "｜投影片 " + s.dataset.slides : ""}${s.dataset.ws ? "｜學習單" + s.dataset.ws : ""}</div>`;
    while (s.firstChild) wrap.appendChild(s.firstChild);
    s.appendChild(wrap);
  });
}

// ───────────────────────── 任務清單 ─────────────────────────
// tasks: [{ id, label, total?, done(state) → number|boolean }]
function renderTasks(el, tasks, done) {
  if (!el) return;
  el.innerHTML = `<div class="mini-title">這一步要完成的事</div><ol class="tasks">` + tasks.map(t => {
    const v = t.count ? t.count(done) : !!done[t.id];
    const ok = t.total ? v >= t.total : !!v;
    return `<li class="${ok ? "ok" : ""}"><span class="tick">${ok ? "✓" : ""}</span><span>${t.label}${t.total ? `<b class="prog">${Math.min(v, t.total)}/${t.total}</b>` : ""}</span></li>`;
  }).join("") + "</ol>";
}

// ───────────────────────── 步驟導覽 ─────────────────────────
/* stages: [{ stage, name, steps: [{ n, label }] }]
   opts: { canGo(n), why(n), render: { n: fn }, onGo(n) } */
function steps(stages, opts) {
  const nav = $("#pipeline");
  nav.innerHTML = stages.map(st => `<div class="stage" data-stage="${st.stage}"><div class="stage-name"><span class="dot"></span>${esc(st.name)}</div>
    <div class="steps">${st.steps.map(s => `<button class="step" data-step="${s.n}"><b>${s.n}</b>${esc(s.label)}</button>`).join("")}</div></div>`).join("");
  const all = stages.flatMap(s => s.steps.map(x => x.n));
  let cur = all[0];
  const api = {
    get current() { return cur; },
    go(n, { scroll = true } = {}) {
      n = Number(n);
      if (opts.canGo && !opts.canGo(n)) { toast(opts.why ? opts.why(n) : "請先完成前面的步驟。"); return false; }
      cur = n;
      $$(".panel").forEach(p => p.classList.toggle("active", p.dataset.panel == n));
      api.refresh();
      opts.render && opts.render[n] && opts.render[n]();
      if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
      opts.onGo && opts.onGo(n);
      return true;
    },
    refresh() {
      $$(".step", nav).forEach(b => {
        const n = Number(b.dataset.step);
        b.classList.toggle("active", n === cur);
        b.classList.toggle("done", opts.isDone ? opts.isDone(n) : false);
        b.disabled = opts.canGo ? !opts.canGo(n) : false;
      });
    },
  };
  $$(".step", nav).forEach(b => b.addEventListener("click", () => api.go(b.dataset.step)));
  $$("[data-goto]").forEach(b => b.addEventListener("click", () => {
    const to = Number(b.dataset.goto), from = cur;
    if (to < from && opts.onBack) opts.onBack(from);   // 按「◀ 上一步」：讓頁面清掉這一步的進度，回來時可以重做
    api.go(to);
  }));
  return api;
}

// ───────────────────────── 頁面共用初始化 ─────────────────────────
/* 名字跟著網址在頁面之間傳遞。Firefox 直接打開本機檔案（file://）時，每個 .html 是各自獨立的網站，
   localStorage 不互通；所以從本站連到另一頁時，在網址後面加上 ?name=…，新的一頁讀到就存起來。 */
function carryName() {
  const q = new URLSearchParams(location.search);
  if (q.has("name")) {
    const v = q.get("name").trim();
    if (v && v !== getName()) { try { localStorage.setItem(NAME_KEY, v); } catch (e) { } }
    q.delete("name");
    try { history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); } catch (e) { }
  }
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!/^(index|lesson\d)\.html(\?|#|$)/.test(href)) return;
    const n = getName(), base = href.split(/[?#]/)[0];
    a.setAttribute("href", n ? `${base}?name=${encodeURIComponent(n)}` : base);
  }, true);
}

function initPage() {
  carryName();
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = "#3D464A";
  setupPointerDrag();
  colorDatalist();
  // 擋掉「檔案拖到頁面其他地方就被瀏覽器直接打開」
  window.addEventListener("dragover", e => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); });
  window.addEventListener("drop", e => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); });
  decorateStops();
  const ln = $("#lessonNav");
  if (ln) {
    const cur = String(ln.dataset.current || "");
    const pages = [[2, "第 2 課"], [3, "第 3 課"], [4, "第 4 課"], [5, "第 5 課（其他國家）"], ["5tw", "第 5 課（臺灣）"]];
    ln.innerHTML = `<a href="index.html" class="${cur ? "" : "on"}">首頁</a>` + pages.map(([n, t]) => `<a href="lesson${n}.html" class="${String(n) === cur ? "on" : ""}">${t}</a>`).join("");
  }
  const nm = $("#studentName");
  if (nm) { nm.classList.add("editable"); nm.setAttribute("role", "button"); nm.tabIndex = 0; nm.addEventListener("click", editNamePill); nm.addEventListener("keydown", e => { if (e.key === "Enter" && e.target === nm) editNamePill(); }); renderNamePill(); }
  $$("[data-download]").forEach(b => b.addEventListener("click", () => downloadChart(b.dataset.download, b.dataset.name || "圖表")));
}

return {
  $, $$, esc, zh, hasZh, nameHTML, isNum, fmt, fmtPlain, toast, download,
  makeStore, getName, setName,
  parseCSV, ingest, pivot, missingPct, subset, wideCSV, REDUNDANT, COUNTRY_ZH, countryLabel, myFileName,
  isMonthKey, monthly, tLabel, tX, tKey, tNext, tUnit, tName, tCount, tSpan,
  mean, std, pearson, corrPair, linFit, scaler, svrFit,
  tableHTML, rawTableHTML,
  makeChip, dropTarget, bindFileDrop,
  charts, SNS, THEMES, baseOpts, applyTheme, drawChart, downloadChart, colorToHex,
  renderTasks, steps, initPage, decorateStops,
};
})();
