"""Add Aprantisaj + Equipment links to every ENGLISH page's nav (desktop + mobile).
Anchored right after the 'About' item. Handles ../ prefix for subpages. Skips -fr
and the two target pages. Idempotent (skips pages already carrying the links)."""
import re, glob, os

ROOT = r"C:\Users\wesle\sakala-haiti-build"
APPLY = True

files = (glob.glob(os.path.join(ROOT, "*.html"))
         + glob.glob(os.path.join(ROOT, "programs", "*.html"))
         + glob.glob(os.path.join(ROOT, "apply", "*.html")))

changed, skipped, manual = [], [], []
for f in sorted(files):
    base = os.path.relpath(f, ROOT)
    name = os.path.basename(f)
    if name in ("aprantisaj.html", "ekipman.html"):
        skipped.append((base, "self")); continue
    if base.endswith("-fr.html"):
        skipped.append((base, "french")); continue
    s = open(f, encoding="utf-8").read()
    if 'aprantisaj.html' in s:
        skipped.append((base, "already done")); continue
    if 'href="../a-propos.html"' in s:   p = "../"
    elif 'href="a-propos.html"' in s:    p = ""
    else:
        manual.append((base, "no About nav")); continue
    orig = s

    # desktop nav: two <li> right after the About item
    s = s.replace(
        f'<li><a href="{p}a-propos.html">About</a></li>',
        f'<li><a href="{p}a-propos.html">About</a></li>'
        f'\n      <li><a href="{p}aprantisaj.html">Aprantisaj</a></li>'
        f'\n      <li><a href="{p}ekipman.html">Equipment</a></li>')

    # mobile nav: only inside the kn-mobile div
    m = re.search(r'<div class="kn-mobile".*?</div>', s, re.S)
    if m:
        mob = m.group(0)
        nm = mob.replace(
            f'<a href="{p}a-propos.html">About</a>',
            f'<a href="{p}a-propos.html">About</a>'
            f'\n  <a href="{p}aprantisaj.html">Aprantisaj</a>'
            f'\n  <a href="{p}ekipman.html">Equipment</a>')
        s = s.replace(mob, nm)

    if s == orig:
        manual.append((base, "no patterns matched")); continue
    if APPLY:
        open(f, "w", encoding="utf-8").write(s)
    changed.append((base, p or "root"))

print(f"=== NAV SWEEP ({'APPLIED' if APPLY else 'DRY RUN'}) ===")
print(f"CHANGED ({len(changed)}): " + ", ".join(b for b, _ in changed))
print(f"SKIPPED ({len(skipped)}): " + ", ".join(f"{b}[{r}]" for b, r in skipped))
print(f"MANUAL/CHECK ({len(manual)}): " + ", ".join(f"{b}[{r}]" for b, r in manual))
