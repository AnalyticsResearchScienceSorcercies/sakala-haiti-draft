"""Ensure every page loads js/nav.js immediately BEFORE js/donate.js (so the
dropdown nav is built before donate.js/lang.js inject their buttons). Handles
../ prefixes for subpages. Idempotent (skips pages that already include nav.js)."""
import glob, os

ROOT = r"C:\Users\wesle\sakala-haiti-build"
files = (glob.glob(ROOT + "/*.html")
         + glob.glob(ROOT + "/programs/*.html")
         + glob.glob(ROOT + "/apply/*.html")
         + glob.glob(ROOT + "/enskri/*.html")
         + glob.glob(ROOT + "/campuses/*.html")
         + glob.glob(ROOT + "/taptaps/*.html"))

changed, skipped, manual = [], [], []
for f in sorted(files):
    rel = os.path.relpath(f, ROOT).replace("\\", "/")
    s = open(f, encoding="utf-8").read()
    pref = "../" * rel.count("/")           # depth-based prefix
    if pref + "js/nav.js" in s:
        skipped.append(rel); continue
    nav_tag = '<script src="%sjs/nav.js"></script>' % pref
    marker = pref + "js/donate.js"
    idx = s.find(marker)
    if idx != -1:
        start = s.rfind("<script", 0, idx)
        s = s[:start] + nav_tag + s[start:]
    elif "</body>" in s:
        s = s.replace("</body>", nav_tag + "\n</body>", 1)
    else:
        manual.append(rel); continue
    open(f, "w", encoding="utf-8").write(s)
    changed.append(rel)

print("CHANGED (%d):" % len(changed))
for c in changed: print("  +", c)
print("SKIPPED already-had (%d)" % len(skipped))
if manual: print("MANUAL (no donate.js / no </body>):", manual)
