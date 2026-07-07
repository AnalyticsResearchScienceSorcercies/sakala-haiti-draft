"""
Brand sweep: inject the Job Power / KONKRET favicon + nav stamp mark into every page.
- Adds <link rel="icon"> + apple-touch-icon (img/favicon.png) to <head> before konkret.css
- Wraps the text-only .kn-brand with [stamp mark] + a .kn-brand-text stack
- Path-prefix aware (root vs subpages, detected via ../css/konkret.css)
- Idempotent: skips pages already carrying "kn-brand-mark"
- Handles EN + FR pages identically (brand text is captured, not hardcoded)
Run: python _brand_sweep.py   (APPLY=True below applies; set False to dry-run)
Shared CSS (.kn-brand flex, .kn-brand-mark, .kn-brand-text) already lives in css/konkret.css.
"""
import re, glob, os

ROOT = r"C:\Users\wesle\sakala-haiti-build"
APPLY = True

files = [f for f in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)
         if (os.sep + "_components" + os.sep) not in f]

# capture the whole logo span (preserves any inline style), swap parent -> slogan
BRAND_RE = re.compile(
    r'(<span class="kn-brand-logo"[^>]*>.*?</span>)\s*<span class="kn-brand-parent"[^>]*>.*?</span>', re.S)
CSS_RE = re.compile(r'href="((?:\.\./)?)css/konkret\.css')

changed, skipped, manual = [], [], []
for f in sorted(files):
    base = os.path.relpath(f, ROOT)
    s = open(f, encoding="utf-8").read()
    if "kn-brand-mark" in s:
        skipped.append((base, "already done")); continue
    m = CSS_RE.search(s)
    if not m:
        manual.append((base, "no konkret.css link")); continue
    prefix = m.group(1)  # '' or '../'
    orig = s

    # 1) favicon before the konkret.css stylesheet link
    css_link = f'<link rel="stylesheet" href="{prefix}css/konkret.css'
    idx = s.find(css_link)
    if idx != -1 and 'rel="icon"' not in s:
        fav = (f'<link rel="icon" type="image/png" href="{prefix}img/favicon.png">\n'
               f'  <link rel="apple-touch-icon" href="{prefix}img/favicon.png">\n  ')
        s = s[:idx] + fav + s[idx:]

    # 2) nav mark + text wrap (all occurrences: desktop + any mobile brand)
    def repl(mm):
        return (f'<img src="{prefix}img/konkret-mark.png" alt="" class="kn-brand-mark">'
                f'<span class="kn-brand-text">{mm.group(1)}'
                f'<span class="kn-brand-parent">Not Aid. Ownership.</span></span>')
    s, n = BRAND_RE.subn(repl, s)

    if s != orig:
        if APPLY:
            open(f, "w", encoding="utf-8").write(s)
        changed.append((base, f"prefix='{prefix}', {n} brand block(s)"))
    else:
        skipped.append((base, "no brand pattern"))

print(f"CHANGED: {len(changed)}")
for b, d in changed:
    print("  +", b, "-", d)
print(f"SKIPPED: {len(skipped)}")
for b, d in skipped:
    print("  .", b, "-", d)
if manual:
    print(f"MANUAL: {len(manual)}")
    for b, d in manual:
        print("  !", b, "-", d)
