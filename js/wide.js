/* 上傳「上一課存下來的 my_xxx_climate_data.csv」（第三課、第四課共用）。
   檔案不見的同學，可以先下載原課程附的範例檔 ex_brazil_climate_data.csv 再上傳。 */
CDL.WideLoader = function ({ S, save, onChange = () => {} }) {
const { $, esc, zh, toast } = CDL;
Object.assign(S, Object.assign({ fileName: "", csvText: "" }, S));
let DS = null;

function load(text, name, { silent = false } = {}) {
  let r;
  try { r = CDL.ingest(text, name); } catch (e) { toast(e.message, 5000); return false; }
  if (r.format !== "wide") { toast("這是從 HDX 下載的原始檔。這一課要上傳的是上一課整理好、存下來的 my_xxx_climate_data.csv。", 6500); return false; }
  if (!r.wide.cols.length) { toast("這個檔案裡沒有資料欄位。", 4000); return false; }
  DS = r.wide; DS.country = r.country || "";
  if (!silent) { S.fileName = name; S.csvText = text; toast(`已上傳 ${name}`); }
  return true;
}
if (S.csvText && !load(S.csvText, S.fileName, { silent: true })) Object.assign(S, { csvText: "", fileName: "" });

function mount(el, { lesson = 2 } = {}) {
  el.innerHTML = `<div class="dropzone">
      <div class="dz-icon">📄</div>
      <div class="dz-text"><b>把第 ${lesson} 課存下來的 <code>my_brazil_climate_data.csv</code> 拖曳到這裡</b><br>或 <label class="link">點這裡選擇檔案<input type="file" accept=".csv,text/csv" hidden></label></div>
      <div class="dz-or">檔案不見了？先 <button class="btn small exdl" type="button">下載原課程的範例檔 ex_brazil_climate_data.csv</button>，再把它上傳到上面。</div>
    </div>
    <div class="wide-view"></div>`;
  CDL.bindFileDrop($(".dropzone", el), $("input", el), (text, name) => { if (load(text, name)) { save(); onChange(); render(); } });
  $(".exdl", el).addEventListener("click", () => CDL.download("ex_brazil_climate_data.csv", window.EX_BRAZIL_CSV));
  function render() {
    const v = $(".wide-view", el);
    if (!DS) { v.innerHTML = ""; return; }
    v.innerHTML = `<div class="ok-box">✅ 已上傳 <code>${esc(S.fileName)}</code>：${DS.years.length} 年（${DS.years[0]}–${DS.years.at(-1)}）× ${DS.cols.length} 個欄位</div>
      <h3>你的資料表</h3>
      <div class="table-wrap small">${CDL.tableHTML(DS, DS.cols)}</div>
      <h3>你的三個欄位</h3>
      <ol class="picked">${DS.cols.map((c, i) => `<li><b>欄位 ${i + 1}</b>　${CDL.nameHTML(c)}</li>`).join("")}</ol>`;
  }
  render();
}

return { mount, data: () => DS, loaded: () => !!DS, colLabel: (c, i) => `欄位 ${i + 1}` };
};

// 筆記框：存在瀏覽器，可以下載成文字檔
CDL.Notes = function (el, { S, save, title = "我的筆記", fileName = "我的筆記.txt", placeholder = "", onInput = () => {} }) {
  const { $ } = CDL;
  el.innerHTML = `<div class="card"><h3>📝 ${CDL.esc(title)}</h3>
    <textarea rows="7" placeholder="${CDL.esc(placeholder)}"></textarea>
    <button class="btn small dln">下載筆記</button> <span class="muted tiny">筆記只存在這台電腦的瀏覽器裡。</span></div>`;
  const ta = $("textarea", el);
  ta.value = S.notes || "";
  ta.addEventListener("input", () => { S.notes = ta.value; save(); onInput(); });
  $(".dln", el).addEventListener("click", () => {
    const head = [CDL.getName() ? `姓名：${CDL.getName()}` : "", `日期：${new Date().toLocaleDateString("zh-TW")}`].filter(Boolean).join("\n");
    CDL.download(fileName, head + "\n\n" + (S.notes || ""), "text/plain");
  });
};
