#!/usr/bin/env python3
"""把 build.py 產生的 indicators-zh-taiwan.json 併入網站的 data/indicators-zh.js（整段取代「台灣資料集」區塊）。"""
import json, re
from pathlib import Path
HERE = Path(__file__).resolve().parent
zh = json.load(open(HERE / "indicators-zh-taiwan.json", encoding="utf-8"))
p = HERE.parent.parent / "data" / "indicators-zh.js"; s = p.read_text(encoding="utf-8")
s = re.sub(r"\n  // ── 台灣資料集（tools/taiwan/build.py 產生）──.*?// ── 台灣資料集結束 ──\n", "\n", s, flags=re.S)
block = "\n  // ── 台灣資料集（tools/taiwan/build.py 產生）──\n" + "".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n" for k, v in zh.items()) + "  // ── 台灣資料集結束 ──\n"
i = s.rstrip().rfind("};"); s = s[:i].rstrip().rstrip(",") + ",\n" + block + "};\n"
p.write_text(s, encoding="utf-8"); print(f"併入 {len(zh)} 個中文名")
