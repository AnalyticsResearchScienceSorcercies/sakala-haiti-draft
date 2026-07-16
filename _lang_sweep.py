"""
Sitewide language-switch injection: add <script src="{p}js/lang.js"></script> before
</body> on every ENGLISH page so the EN|FR machine-translate button (nav desktop +
mobile) renders everywhere. lang.js does the DOM work; this sweep only ensures the
include is present, handling the ../ prefix for subpages. The -fr.html mirrors are
skipped (they stay as the no-JS fallback / hand-written French). Idempotent.

Dry-run by default. Set env APPLY=1 to write.
"""
import glob, os

ROOT = r"C:\Users\wesle\sakala-haiti-build"
APPLY = os.environ.get("APPLY", "0") == "1"

files = (glob.glob(os.path.join(ROOT, "*.html"))
         + glob.glob(os.path.join(ROOT, "programs", "*.html"))
         + glob.glob(os.path.join(ROOT, "apply", "*.html"))
         + glob.glob(os.path.join(ROOT, "taptaps", "*.html"))
         + glob.glob(os.path.join(ROOT, "campuses", "*.html")))

changed, skipped, manual = [], [], []

for f in sorted(files):
    base = os.path.relpath(f, ROOT)
    if base.endswith("-fr.html"):
        skipped.append((base, "french mirror (fallback, left alone)")); continue
    s = open(f, encoding="utf-8").read()
    if "js/lang.js" in s:
        skipped.append((base, "already has lang.js")); continue
    if "</body>" not in s:
        manual.append((base, "no </body> tag")); continue
    p = "" if os.path.dirname(f) == ROOT else "../"
    tag = '<script src="%sjs/lang.js"></script>\n</body>' % p
    ns = s.replace("</body>", tag, 1)
    if ns == s:
        manual.append((base, "replace failed")); continue
    if APPLY:
        open(f, "w", encoding="utf-8").write(ns)
    changed.append((base, p or "root"))

print("=== LANG SWEEP (%s) ===" % ("APPLIED" if APPLY else "DRY RUN"))
print("\nCHANGED (%d):" % len(changed))
for b, pp in changed: print("  %-42s [%s]" % (b, pp))
print("\nSKIPPED (%d):" % len(skipped))
for b, r in skipped: print("  %-42s %s" % (b, r))
print("\nMANUAL / CHECK (%d):" % len(manual))
for b, r in manual: print("  %-42s %s" % (b, r))
