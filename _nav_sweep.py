"""
One-off nav/footer sweep: propagate the pivot nav to all ENGLISH pages.
- Adds a "Ground Partners" link to desktop + mobile nav
- Changes the ghost CTA "Join the Movement" -> "Sponsor a Partner" (-> ground-partners.html)
- Footer Take Action: adds "Sponsor a Partner", renames "Join the Movement" -> "Register as a Partner"
Idempotent (skips pages already carrying "Ground Partners"). Skips -fr pages.
Handles the ../ path prefix for programs/ and apply/ subpages.
Run with APPLY=False first to dry-run.
"""
import re, glob, os

ROOT = r"C:\Users\wesle\sakala-haiti-build"
APPLY = True

files = (glob.glob(os.path.join(ROOT, "*.html"))
         + glob.glob(os.path.join(ROOT, "programs", "*.html"))
         + glob.glob(os.path.join(ROOT, "apply", "*.html")))

changed, skipped, manual = [], [], []

for f in sorted(files):
    base = os.path.relpath(f, ROOT)
    if base.endswith("-fr.html"):
        skipped.append((base, "french")); continue
    s = open(f, encoding="utf-8").read()
    if ">Ground Partners<" in s:
        skipped.append((base, "already done")); continue
    if 'href="../a-propos.html"' in s:   p = "../"
    elif 'href="a-propos.html"' in s:    p = ""
    else:
        manual.append((base, "no About nav link")); continue
    orig = s

    # 1) desktop nav: insert Ground Partners <li> before the Programs <li>
    s = s.replace(
        f'<li><a href="{p}nos-actions.html">Programs</a></li>',
        f'<li><a href="{p}ground-partners.html">Ground Partners</a></li>\n      <li><a href="{p}nos-actions.html">Programs</a></li>')
    # 2) desktop ghost CTA -> Sponsor a Partner
    s = s.replace(
        f'<a href="{p}devenir-partenaire.html" class="kn-cta kn-cta-ghost">Join the Movement</a>',
        f'<a href="{p}ground-partners.html" class="kn-cta kn-cta-ghost">Sponsor a Partner</a>')
    # 3) mobile nav only (operate inside the kn-mobile div)
    m = re.search(r'<div class="kn-mobile".*?</div>', s, re.S)
    if m:
        mob = m.group(0)
        nm = mob.replace(
            f'<a href="{p}a-propos.html">About</a>',
            f'<a href="{p}a-propos.html">About</a>\n  <a href="{p}ground-partners.html">Ground Partners</a>')
        nm = nm.replace(
            f'<a href="{p}devenir-partenaire.html">Join the Movement</a>',
            f'<a href="{p}ground-partners.html">Sponsor a Partner</a>')
        s = s.replace(mob, nm)
    # 4) footer Take Action
    s = s.replace(
        '<div class="kn-footer-col-title">Take Action</div>',
        f'<div class="kn-footer-col-title">Take Action</div>\n        <a href="{p}ground-partners.html">Sponsor a Partner</a>')
    s = s.replace(
        f'<a href="{p}devenir-partenaire.html">Join the Movement</a>',
        f'<a href="{p}devenir-partenaire.html">Register as a Partner</a>')

    if s == orig:
        manual.append((base, "matched no patterns")); continue
    flags = []
    if ">Ground Partners<" not in s: flags.append("NO-GP-LINK")
    if 'kn-cta-ghost">Join the Movement' in s: flags.append("CTA-MISS")
    if APPLY:
        open(f, "w", encoding="utf-8").write(s)
    changed.append((base, p or "root", ",".join(flags) or "ok"))

print(f"=== NAV SWEEP ({'APPLIED' if APPLY else 'DRY RUN'}) ===")
print(f"\nCHANGED ({len(changed)}):")
for b, p, fl in changed: print(f"  {b:<34} [{p:<4}] {fl}")
print(f"\nSKIPPED ({len(skipped)}):")
for b, r in skipped: print(f"  {b:<34} {r}")
print(f"\nMANUAL / CHECK ({len(manual)}):")
for b, r in manual: print(f"  {b:<34} {r}")
