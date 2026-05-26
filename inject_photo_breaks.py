"""
inject_photo_breaks.py

1. Strip kn-gallery-section blocks from all pages (removes the batch gallery dumps)
2. Fix placeholder photo filenames -> real filenames from our photo collection
3. Add single editorial photo breaks between content sections (custom pages only)
"""
import os, re

BASE = r"C:\Users\wesle\Desktop\konkret-mirror"

# ---------------------------------------------------------------------------
# Placeholder filenames -> real photos
# ---------------------------------------------------------------------------
PLACEHOLDER_MAP = {
    # index.html hero photo
    "photos/hero-jeune-champ.jpg":      "photos/2025-aout/IMG-20250730-WA0360.jpg",
    # index.html + notre-histoire split layout
    "photos/field-labour-equipe.jpg":   "photos/2025-juillet/IMG-20250711-WA0196.jpg",
    "photos/jour-plantation-mars.jpg":  "photos/2025-mars/IMG-20250319-WA0393.jpg",
    # employer.html field photo
    "photos/supervision-terrain.jpg":   "photos/2025-aout/IMG-20250801-WA0131.jpg",
    # je-veux-un-emploi.html
    "photos/nursery-arrosage.jpg":      "photos/2025-mars/IMG-20250323-WA0033.jpg",
    # temoignages.html field photo band
    "photos/formation-groupe.jpg":      "photos/2025-juillet/IMG-20250711-WA0193.jpg",
    # summer-2026.html parcelle
    r"photos\parcelle-oreg.jpg":        "photos/sakala/IMG-20250822-WA0003.jpg",
    "photos/parcelle-oreg.jpg":         "photos/sakala/IMG-20250822-WA0003.jpg",
}


def photo_break(src, position="center 40%"):
    """Single full-width editorial photo break between sections."""
    return (
        f'\n<div class="kn-img-frame" style="max-height:400px;">\n'
        f'  <img src="{src}" alt="KONKRET -- terrain, Haiti 2025" loading="lazy"'
        f' style="width:100%;object-position:{position};">\n'
        f'</div>\n'
    )


# ---------------------------------------------------------------------------
# Per-page: insert photo break BEFORE the given HTML comment
# (comment must be exact -- whitespace matters)
# ---------------------------------------------------------------------------
PAGE_BREAKS = {
    "index.html": [
        ("<!-- 6. TESTIMONIALS -->",  "photos/2025-juillet/IMG-20250711-WA0199.jpg"),
    ],
    "notre-histoire.html": [
        ("<!-- TIMELINE -->",         "photos/2025-mars/IMG-20250323-WA0036.jpg"),
        ("<!-- VISION -->",           "photos/2025-juillet/IMG-20250712-WA0147.jpg"),
    ],
    "nos-actions.html": [
        ("<!-- REGIONS -->",          "photos/2025-aout/IMG-20250731-WA0001.jpg"),
        ("<!-- SAKALA SPOTLIGHT -->", "photos/sakala/IMG-20250822-WA0005.jpg"),
    ],
    "leadership.html": [
        ("<!-- TEAM SECTION -->",     "photos/2025-juillet/IMG-20250711-WA0195.jpg"),
        ("<!-- CNN HERO CALLOUT -->", "photos/2025-aout/IMG-20250801-WA0143.jpg"),
    ],
    "temoignages.html": [
        ("<!-- SHARE YOUR STORY -->", "photos/2025-aout/IMG-20250801-WA0162.jpg"),
    ],
    "devenir-partenaire.html": [
        ("<!-- TESTIMONIAL -->",      "photos/2025-mars/IMG-20250325-WA0116.jpg"),
    ],
    "employer.html": [
        ("<!-- YOUTH PROFILES -->",   "photos/2025-juillet/IMG-20250710-WA0125.jpg"),
    ],
    "a-propos.html": [
        ("<!-- VALUES -->",           "photos/2025-mars/IMG-20250325-WA0121.jpg"),
    ],
}


def process(filename):
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        print(f"SKIP (not found): {filename}")
        return

    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    original = html

    # 1. Strip kn-gallery-section blocks
    before = html.count("kn-gallery-section")
    html = re.sub(
        r'\n?<section class="kn-gallery-section">.*?</section>\n?',
        '',
        html,
        flags=re.DOTALL,
    )
    stripped = before - html.count("kn-gallery-section")

    # 2. Fix placeholder filenames
    for old, new in PLACEHOLDER_MAP.items():
        html = html.replace(old, new)

    # 3. Add editorial photo breaks
    breaks_added = 0
    for comment, src in PAGE_BREAKS.get(filename, []):
        if comment in html and src not in html:
            html = html.replace(comment, photo_break(src) + comment, 1)
            breaks_added += 1

    if html != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        parts = []
        if stripped:
            parts.append(f"stripped {stripped} gallery block(s)")
        if breaks_added:
            parts.append(f"added {breaks_added} photo break(s)")
        ph = sum(1 for old in PLACEHOLDER_MAP if old.replace('\\', '/') in original.replace('\\', '/'))
        if ph:
            parts.append(f"fixed {ph} placeholder src(s)")
        print(f"OK [{filename}]: {', '.join(parts) if parts else 'updated'}")
    else:
        print(f"NO CHANGE: {filename}")


# All pages
ALL_PAGES = [
    "index.html", "a-propos.html", "nos-actions.html", "notre-histoire.html",
    "temoignages.html", "leadership.html", "contact.html", "summer-2026.html",
    "konkret.html", "blog.html", "employer.html", "je-veux-un-emploi.html",
    "je-veux-investir.html", "devenir-partenaire.html",
    "formulaire-devenir-partenaire.html", "formulaire-je-veux-employer-des-jeunes.html",
    "formulaire-je-veux-travailler.html", "nous-rejoindre.html",
    "travailler-avec-nous.html", "shop.html", "achat-davance.html",
    "documents-publics.html", "faq.html", "customer-cabinet.html",
    "conseil-dadministration.html",
]

for page in ALL_PAGES:
    process(page)

print("\nDone.")
