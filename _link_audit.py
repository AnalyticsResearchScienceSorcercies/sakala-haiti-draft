"""
Static link + asset integrity audit for the SAKALA / KONKRET site.
No browser. Parses every .html, resolves every href/src/action, and checks
that internal page links and local assets (css/js/img) exist on disk.
Also flags tagline/branding inconsistencies and a placeholder inventory.

Run:  python _link_audit.py
"""
import os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
ATTR = re.compile(r'(?:href|src|action)\s*=\s*["\']([^"\']+)["\']', re.I)
SKIP_PREFIX = ('http://', 'https://', '//', 'mailto:', 'tel:', '#', 'javascript:', 'data:')

def html_files():
    out = []
    for dirpath, _, names in os.walk(ROOT):
        for n in names:
            if n.endswith('.html'):
                out.append(os.path.join(dirpath, n))
    return sorted(out)

def rel(p):
    return os.path.relpath(p, ROOT).replace('\\', '/')

broken = defaultdict(list)      # file -> [(target, resolved)]
ext_links = set()
referenced = set()              # resolved internal .html targets (for orphan check)
all_pages = set()
tagline_bad = []
placeholders = defaultdict(list)

PLACEHOLDER_RE = re.compile(r'coming soon|en construction|à venir|a venir|model in development|TODO|profile coming soon', re.I)

for f in html_files():
    all_pages.add(rel(f))
    base = os.path.dirname(f)
    try:
        txt = open(f, encoding='utf-8').read()
    except UnicodeDecodeError:
        txt = open(f, encoding='latin-1').read()

    # tagline / branding consistency
    if 'Konbit Kreye Travay' in txt:
        tagline_bad.append(rel(f))

    # placeholder inventory (visible text only-ish; we just scan raw)
    for ln, line in enumerate(txt.splitlines(), 1):
        if PLACEHOLDER_RE.search(line) and 'placeholder=' not in line.lower():
            m = PLACEHOLDER_RE.search(line)
            placeholders[rel(f)].append((ln, m.group(0)))

    for raw in ATTR.findall(txt):
        t = raw.strip()
        if t.startswith(SKIP_PREFIX) or not t:
            if t.startswith(('http://', 'https://')):
                ext_links.add(t)
            continue
        clean = t.split('#', 1)[0].split('?', 1)[0]
        if not clean:
            continue
        resolved = os.path.normpath(os.path.join(base, clean))
        if clean.endswith('.html'):
            referenced.add(rel(resolved))
        if not os.path.exists(resolved):
            broken[rel(f)].append((t, rel(resolved)))

# ---- report ----
print("=" * 70)
print("SAKALA / KONKRET  ...  STATIC LINK + ASSET AUDIT")
print("=" * 70)
print(f"Scanned {len(all_pages)} HTML files\n")

print(f"[1] BROKEN internal links / missing assets: {sum(len(v) for v in broken.values())} across {len(broken)} files")
if broken:
    for f in sorted(broken):
        print(f"\n  {f}")
        for target, resolved in broken[f]:
            print(f"      -> {target}   (missing: {resolved})")
else:
    print("    none. every internal link and local asset resolves.")

print(f"\n[2] TAGLINE inconsistency ('Konbit Kreye Travay' should be 'Konekte Kreye Travay'): {len(tagline_bad)}")
for f in tagline_bad:
    print(f"      {f}")

# orphan English pages (no inbound .html link), excluding -fr and known entry points
print("\n[3] ORPHAN pages (English, not linked from any other page):")
entry = {'index.html'}
orphans = []
for p in sorted(all_pages):
    if p.endswith('.html') and '-fr' not in p and p not in entry and not p.startswith('_'):
        if p not in referenced:
            orphans.append(p)
if orphans:
    for p in orphans:
        print(f"      {p}")
else:
    print("      none")

print(f"\n[4] PLACEHOLDER / 'coming soon' inventory (English pages):")
for f in sorted(placeholders):
    if '-fr' in f:
        continue
    items = placeholders[f]
    print(f"      {f}: {', '.join(sorted(set(x[1].lower() for x in items)))}  ({len(items)})")

print(f"\n[5] External links referenced: {len(ext_links)}")
for u in sorted(ext_links):
    print(f"      {u}")
print("\n(External links are listed, not fetched. Spot-check manually.)")
