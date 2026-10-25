import json, glob, os, sys

files = sorted(glob.glob(r"EVIDENCE\probe\probe_*.json"))
for f in files:
    d = json.load(open(f, encoding="utf-8"))
    p = d["probe"]
    if "evalError" in p:
        print(f, "EVAL ERROR", p["evalError"]); continue
    print("=" * 90)
    print(f"{os.path.basename(f)}  viewport={d['layout'] if False else d['viewport']}  final={d.get('finalUrl')}")
    print("TITLE:", p["title"][:140])
    print("H1:", p["h1"][:3])
    print("META:", json.dumps(p["meta"], ensure_ascii=False)[:700])
    print("NAVGROUPS:", len(p["navs"]))
    for n in p["navs"][:4]:
        print("  NAV", n["sel"], "->", [l["text"] for l in n["links"]][:22])
    print("HEADINGS:", [(h["t"], h["text"][:40], h["size"]) for h in p["headings"]][:14])
    print("COUNTS:", json.dumps(p["counts"]))
    print("WIDGETS:", json.dumps(p["widgetMarkers"], ensure_ascii=False))
    print("STICKY:", p["sticky"], "SEARCHFORMS:", p["searchForms"])
    print("BODY:", p["bodyFont"], p["bodyFontSize"], p["bodyBg"])
    print("PALETTE-Text:", [(x["k"], x["v"]) for x in p["palette"]["text"]])
    print("PALETTE-Bg:", [(x["k"], x["v"]) for x in p["palette"]["background"]])
    print("FONTS:", [(x["k"], x["v"]) for x in p["palette"]["fontFamily"]][:6])
    print("FONTSIZES:", [(x["k"], x["v"]) for x in p["palette"]["fontSize"]][:8])
    print("CSSVARS:", json.dumps(p["cssVars"], ensure_ascii=False)[:400] if p["cssVars"] else None)
    print("MEDIA:", p["css"]["mediaBreakpoints"])
    print("TOPPCLASSES:", [(x["k"], x["v"]) for x in p["css"]["topClasses"]][:12])
    print("FONTFACES:", p["css"]["fontFaces"])
    print("TECH:", json.dumps(p["tech"]))
    print("RES:", json.dumps(p["resources"]))
    print("PERF:", json.dumps(p["perf"]), "LAYOUT:", json.dumps(p["layout"]))
    print("A11Y:", json.dumps(p["a11y"], ensure_ascii=False))
    print("COOKIES:", p["cookies"])
    print()
