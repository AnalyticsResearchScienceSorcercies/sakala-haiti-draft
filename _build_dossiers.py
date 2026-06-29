# -*- coding: utf-8 -*-
"""Generate the four Layer-3 TapTap dossier scaffolds (taptaps/<key>.html).
Scroll-snap chapters, hero over satellite, sticky chapter nav, pinned sponsor,
and labelled GRAPH SLOTS keyed to the viz catalog (V-IDs) ready to fill."""
import os, io, json

REPO = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(REPO, "taptaps")
os.makedirs(OUT, exist_ok=True)

# per-TapTap curated content (mirrors the SITES object in taptaps.html)
SITES = {
 "quartier_morin": {
   "name":"Quartier-Morin","dept":"Nord","sub":"Kayimit",
   "coords":"19.6825, -72.18488","status":"Active · live product","cls":"live",
   "verdict":"Haiti's cassava capital, on the richest soil in the set. The one TapTap shipping a product today.",
   "live":True,"gated":False,
   "hero_stats":[("5.2%","soil organic carbon"),("1.3°","flat ground"),("20 → 30","youth"),("$8,100","to get running")],
   "hero_graph":"V4 texture triangle + V19 extraction-joint",
   "erosion":{"R":4508,"K":0.0308,"LS":0.34,"C":0.40,"A":18.9},
   "rain":{"months":"80,67,78,96,121,70,69,90,105,122,156,97","annual":1152},
   "land_intro":"Flat, deep, carbon-rich clay loam, the best growing ground we surveyed. pH 5.6, soil organic carbon 5.2%, CEC 27. The one catch is slow drainage on flat land, so beds get contoured to shed standing water. Erosion is real but modest at 18.9 t/ha.",
   "land_slots":["V4 soil texture triangle (sand 31 / silt 36 / clay 34 → clay loam)","V5 soil profile column (pH / SOC / CEC across 3 depths)","V7 soil report-card gauges","V9 climograph (1,152 mm/yr, driest Feb)","V11 erosion dial (18.9 t/ha vs 11 sustainable)","V1 annotated satellite (cassava field S/SW)"],
   "match_intro":"Cassava grades a perfect 1.0 here, alongside pigeon pea, lemongrass and citronella. The match is unambiguous: cassava to flour to the Harvest Box, with aromatic grass feeding the shared Nord distillery.",
   "match_slots":["V15 crop-fit scorecard","V16 EcoCrop suitability fingerprint (cassava)"],
   "market_intro":"The grower sells raw root for about $0.24 worth per pound of flour; the same crop becomes an $18.75 branded product downstream, roughly 78× over. SAKALA keeps the milling, the brand, and the margin in the cooperative.",
   "market_slots":["V19 the extraction joint (farmer $0.24 of $18.75)","V20 Theta inversion (conventional vs SAKALA)","V21 price-tier ladder","V22 conversion / COGS build (3:1 root→flour)"],
   "cost":{"up":8100,"opt":40600,"dream":47600},
   "cost_intro":"$8,100 buys the atom kit, cuttings, contoured beds and a first season of wages. The jump to $46,600 is the flour line and the food-grade shed, the value-capture step that turns root into branded flour.",
   "cost_slots":["V28 cost ramp bars","V29 itemized table with SUPPLY/FAB/IMPORT tags","V56 'what your $120 buys' receipt"],
   "youth":{"now":20,"cap":30},
   "youth_slots":["V36 income multiplier Sankey"],
   "soil":{"ph":5.6,"soc":5.24,"cec":27.1,"slope":1.3,"sand":30.7,"silt":35.5,"clay":33.8,"texture":"clay loam"},
   "fp_lead":"cassava","fp_note":"pH and slope sit in cassava's sweet spot and the rainfall is comfortably inside its range... an unusually clean match.",
   "fp_axes":[{"label":"pH","unit":"","sMin":4,"sMax":8.5,"absMin":4.5,"absMax":8.0,"optMin":5.5,"optMax":7.0,"val":5.6},{"label":"Rainfall","unit":"mm","sMin":0,"sMax":3000,"absMin":500,"absMax":2500,"optMin":800,"optMax":1500,"val":1152},{"label":"Slope","unit":"°","sMin":0,"sMax":26,"absMin":0,"absMax":20,"optMin":0,"optMax":20,"val":1.3}],
   "inv":{"conv":2,"coop":55,"item":"a branded pound of kasav"},
   "cost_items":[["Agriculture atom kit (tools, the cohort)",3600,"IMPORT"],["Cassava cuttings + pigeon pea seed",400,"SUPPLY"],["Contoured beds + drainage (the flood fix)",1500,"FAB"],["Starter hand processing (grater, press, racks)",600,"IMPORT"],["TapTap manager + first-season working capital",2000,"SERVICE"]],
   "crops":[["Cassava",100],["Pigeon pea",100],["Vetiver",100],["Lemongrass",100],["Citronella",94],["Castor",92],["Moringa",89],["Avocado",86]],
   "cropnote":"Cassava grades a perfect 1.0, alongside the aromatic grasses that feed the Nord distillery. An unusually deep bench for one field.",
   "value":{"farmer":0.24,"final":18.75,"item":"a branded pound of single-origin kasav","unit":"$"},
   "tiers":{"unit":"$/lb","rows":[["Farmgate root",0.08,0.08],["US ethnic staple",3,5],["US health shelf",8,13],["Premium branded",18.75,18.75]]},
   "constraint":"Shelf-stable milling, so the harvest ships before it spoils.",
 },
 "milot_fedanoir": {
   "name":"Milot","dept":"Nord · Acul-du-Nord","sub":"Institution Mixte Joseph Fedanoir",
   "coords":"19.65151, -72.19516","status":"Active · school-anchored","cls":"live",
   "verdict":"Ten youth on a school TapTap with the best road access in the set. A clean anchor, once it beats the dry season.",
   "live":True,"gated":False,
   "hero_stats":[("1,392mm","rain / year"),("Feb","dry-season low"),("pH 5.4","wants lime"),("10 → 15","youth")],
   "hero_graph":"V9 climograph (the dry-season gap)",
   "erosion":{"R":7739,"K":0.0298,"LS":0.98,"C":0.234,"A":52.9},
   "rain":{"months":"53,41,74,114,180,137,121,145,169,162,126,72","annual":1392},
   "land_intro":"Good clay-loam on a paved highway, the best logistics in the set. Two real fixes: the soil is acidic at pH 5.4 and wants lime, and a sharp December-to-March dry season means dry-season output needs irrigation. Steady rainfall drives a high erosion read at 52.9 t/ha, so cover-cropping is built in.",
   "land_slots":["V9 climograph + dry-season band (HERO: Dec-Mar gap)","V54 water-balance calendar (rain vs crop need)","V8 the lime fix (pH 5.4 → 6.5)","V7 soil gauges","V11 erosion dial (52.9 t/ha)","V4 texture triangle"],
   "match_intro":"Cassava again grades perfectly, joined by fast-cash aromatic grasses (lemongrass, citronella) and castor. Moringa is marginal here, held back by the acidic soil until the lime goes in.",
   "match_slots":["V15 crop-fit scorecard","V16 fingerprint (why moringa is marginal at pH 5.4)"],
   "market_intro":"Same cassava-flour economics as Quartier-Morin, plus lemongrass and citronella that feed the shared Nord aromatic still... short distillation runs that pay in months, not the years vetiver takes, so cash flows from a cheap field still while the slower crops mature.",
   "market_slots":["V19 the extraction joint","V21 price-tier ladder","V52 fast-cash → slow-cash ladder"],
   "cost":{"up":6500,"opt":17000,"dream":21000},
   "cost_intro":"Cheapest TapTap to get running at $6,500 (atom kit, lime, seed, cover crop, wages). The optimized $20,000 adds solar irrigation and a cistern, the direct answer to the dry season. Cross-checks the independent Milot build at $23,700.",
   "cost_slots":["V28 cost ramp bars","V29 itemized table","V32 break-even curve"],
   "youth":{"now":10,"cap":15},
   "youth_slots":["V36 income multiplier Sankey"],
   "soil":{"ph":5.4,"soc":3.62,"cec":21.2,"slope":3.5,"sand":34.7,"silt":34.1,"clay":31.2,"texture":"clay loam"},
   "fp_lead":"cassava","fp_note":"Cassava is unfussy here; the only nudge is lime to lift the acidic pH toward the green band.",
   "fp_axes":[{"label":"pH","unit":"","sMin":4,"sMax":8.5,"absMin":4.5,"absMax":8.0,"optMin":5.5,"optMax":7.0,"val":5.4},{"label":"Rainfall","unit":"mm","sMin":0,"sMax":3000,"absMin":500,"absMax":2500,"optMin":800,"optMax":1500,"val":1392},{"label":"Slope","unit":"°","sMin":0,"sMax":26,"absMin":0,"absMax":20,"optMin":0,"optMax":20,"val":3.5}],
   "inv":{"conv":2,"coop":55,"item":"a branded pound of kasav"},
   "cost_items":[["Agriculture atom kit",3600,"IMPORT"],["Lime (pH 5.4 to 6.5)",600,"SUPPLY"],["Cassava + aromatic seed / cuttings",400,"SUPPLY"],["Cover-crop / mulch (the erosion flag)",400,"SUPPLY"],["Working capital",1500,"SERVICE"]],
   "crops":[["Cassava",98],["Vetiver",98],["Lemongrass",96],["Citronella",96],["Pigeon pea",96],["Cinnamon",91]],
   "cropnote":"Moringa, the current nursery crop, is held back by the acidic soil until lime goes in... cassava and the aromatic grasses grade highest here.",
   "value":{"farmer":0.24,"final":18.75,"item":"a branded pound of single-origin kasav","unit":"$"},
   "tiers":{"unit":"$/lb","rows":[["Farmgate root",0.08,0.08],["US ethnic staple",3,5],["US health shelf",8,13],["Premium branded",18.75,18.75]]},
   "constraint":"Dry-season irrigation, and lime to lift the acidic soil.",
 },
 "quartier_morin_pin2": {
   "name":"QM · 2nd pin","dept":"Nord","sub":"Fourrier / Carrefour Lalande (unconfirmed)",
   "coords":"19.65624, -72.16852","status":"Gated · unconfirmed","cls":"gated",
   "verdict":"Flat clay-loam 728 m from the Grande Rivière du Nord, the network's one shot at year-round water. The parcel is unconfirmed and a quarry sits next door.",
   "live":False,"gated":True,
   "hero_stats":[("728 m","to the river"),("1.4°","flat ground"),("2-3","crops / yr possible"),("GATED","awaiting Dan")],
   "hero_graph":"V13 water-access map + GATED overlay",
   "erosion":{"R":7739,"K":0.0303,"LS":0.37,"C":0.301,"A":26.1},
   "rain":{"months":"53,41,74,114,180,137,121,145,169,162,126,72","annual":1392},
   "land_intro":"Flat clay-loam with the network's one real advantage: a major river only 728 m away, close enough to make year-round irrigation cheap. That could mean two to three crops a year instead of one. But this pin is unconfirmed (about 3.5 km from the main Quartier-Morin TapTap, next to an industrial quarry) and nothing is funded until Dan verifies the parcel.",
   "land_slots":["V13 water-access map (728 m to Grande Rivière du Nord — HERO)","V1 annotated satellite (the quarry next door)","V11 erosion dial (26.1 t/ha)","V4 texture triangle","GATED OVERLAY — verification banner over the whole page"],
   "match_intro":"Same cassava match as the main Quartier-Morin pin, but the river lifts it: year-round irrigation could roughly double output per dollar.",
   "match_slots":["V15 crop-fit scorecard"],
   "market_intro":"Same cassava economics, but the river could roughly double output per dollar by lifting the TapTap to two or three harvests a year.",
   "market_slots":["V19 the extraction joint","V21 price-tier ladder"],
   "cost":{"up":5500,"opt":13000,"dream":30000},
   "cost_intro":"Numbers assume the parcel clears. The $5,500 runs it as a rain-fed cassava plot. The river is an optional upgrade, not the premise: full year-round irrigation realistically runs $12,000 to $22,000 once the lift-head and the 700 m pipe run are priced, so fund it only if the parcel confirms and the two-to-three-crop economics justify it.",
   "cost_slots":["V28 cost ramp bars","V63 cost-confidence bars (everything here is provisional)"],
   "youth":{"now":0,"cap":10},
   "youth_slots":["V36 income multiplier Sankey (fills in once confirmed)"],
   "soil":{"ph":5.4,"soc":3.93,"cec":20.6,"slope":1.4,"sand":33.1,"silt":34.8,"clay":32.1,"texture":"clay loam"},
   "fp_lead":"cassava","fp_note":"Same clean cassava fit as the main pin; the river is what would lift it to two or three crops a year.",
   "fp_axes":[{"label":"pH","unit":"","sMin":4,"sMax":8.5,"absMin":4.5,"absMax":8.0,"optMin":5.5,"optMax":7.0,"val":5.4},{"label":"Rainfall","unit":"mm","sMin":0,"sMax":3000,"absMin":500,"absMax":2500,"optMin":800,"optMax":1500,"val":1392},{"label":"Slope","unit":"°","sMin":0,"sMax":26,"absMin":0,"absMax":20,"optMin":0,"optMax":20,"val":1.4}],
   "inv":{"conv":2,"coop":55,"item":"a branded pound of kasav"},
   "cost_items":[["Confirm parcel + Agriculture atom kit",3600,"IMPORT"],["Seed / cuttings",400,"SUPPLY"],["Working capital",1500,"SERVICE"]],
   "crops":[["Cassava",98],["Vetiver",98],["Pigeon pea",96],["Lemongrass",96],["Citronella",96],["Cinnamon",91]],
   "cropnote":"Same strong cassava-and-aromatics profile as the main Quartier-Morin pin... the river is what would set it apart.",
   "value":{"farmer":0.24,"final":18.75,"item":"a branded pound of single-origin kasav","unit":"$"},
   "tiers":{"unit":"$/lb","rows":[["Farmgate root",0.08,0.08],["US ethnic staple",3,5],["US health shelf",8,13],["Premium branded",18.75,18.75]]},
   "constraint":"Dan to confirm the parcel, the flood fringe, and what the quarry is.",
 },
 "pestel": {
   "name":"Pestel","dept":"Grand'Anse · Corail","sub":"Lekòl Kominotè de Pestel",
   "coords":"18.54093, -73.79561","status":"Active · the estate","cls":"",
   "verdict":"The richest topsoil and the steepest ground. A Grand'Anse hillside that wants tree crops, vetiver for erosion-and-cash, and patient money.",
   "live":True,"gated":False,
   "hero_stats":[("77 t/ha","erosion · extreme"),("6.2%","soil organic carbon"),("9.9°","steep slope"),("10 → 20","youth")],
   "hero_graph":"V11 erosion dial + factor waterfall",
   "erosion":{"R":3555,"K":0.0325,"LS":3.89,"C":0.172,"A":77.3},
   "rain":{"months":"59,59,85,103,110,70,64,82,90,140,93,73","annual":1029},
   "land_intro":"The richest topsoil and the highest nutrient-holding capacity we measured (SOC 6.2%, CEC 34), and the best pH at 5.9. But it sits on a 10-degree slope in a hurricane corridor, with a 287 mm single-day rainfall on record. Erosion is extreme at 77 t/ha. The land is excellent; the whole game is holding the soil on the hill with contour structures and vetiver hedges before anything else.",
   "land_slots":["V11 erosion dial + factor waterfall (77 t/ha — HERO, LS-driven)","V76 soil-loss depletion clock","V12 slope + flood gauges (9.9°, 287mm/day peak)","V7 soil gauges (richest in the set)","V4 texture triangle (clay)","V79 hurricane / extreme-rain return periods"],
   "match_intro":"Vetiver leads here. It grades a perfect fit and does double duty... erosion control on the slope, and the highest-value crop in the whole network. Cacao, coffee and breadfruit follow as secondary tree crops, genuinely viable on Grand'Anse's cheap-to-ferment, blueprint-next-door model (CAUD and FECCANO prove it a few miles away) but rain-limited at 1,029 mm, so they ride behind vetiver, not ahead of it.",
   "match_slots":["V15 crop-fit scorecard (cacao/coffee/breadfruit/vetiver)","V16 fingerprint (cacao)","V51 crop / harvest calendar (perennials + vetiver 18-24mo)"],
   "market_intro":"The high-value crops, but the high-extraction ones too: vetiver oil sells for roughly 170× what the grower gets for the grass, and raw cacao returns the farmer a third of what the same bean earns as local chocolate. Pestel owns the processing, or it stays poor. The still is phased... fast aromatics distil cheaply up north now, and Pestel's own stainless vetiver skid comes online when the roots mature at month 18 to 24.",
   "market_slots":["V19 the extraction joint (vetiver 170×)","V27 vetiver 'extraction laundering' callout","V50 the remedy is the lawsuit","V21 price-tier ladder (cacao raw vs local chocolate)"],
   "cost":{"up":14900,"opt":58900,"dream":85900},
   "cost_intro":"The most expensive TapTap, and the most patient. The $14,900 stabilizes the slope and plants. The big number is a tree-crop establishment and 3-to-5-year income bridge (~$25,000) that is grant capital, not product-purchase money.",
   "cost_slots":["V28 cost ramp bars","V33 the J-curve (tree-crop income dip)","V30 funding-type split (product vs patient/grant)"],
   "youth":{"now":10,"cap":20},
   "youth_slots":["V36 income multiplier Sankey"],
   "soil":{"ph":5.9,"soc":6.19,"cec":33.7,"slope":9.9,"sand":22.1,"silt":37.2,"clay":40.7,"texture":"clay"},
   "fp_lead":"vetiver","fp_note":"Vetiver tolerates the steepest slope of any crop in the set and sits right in its rainfall and pH band... the erosion-and-cash answer for this hillside.",
   "fp_axes":[{"label":"pH","unit":"","sMin":4,"sMax":9.5,"absMin":4.5,"absMax":9.0,"optMin":5.5,"optMax":7.5,"val":5.9},{"label":"Rainfall","unit":"mm","sMin":0,"sMax":3200,"absMin":700,"absMax":3000,"optMin":1000,"optMax":2000,"val":1029},{"label":"Slope","unit":"°","sMin":0,"sMax":45,"absMin":0,"absMax":35,"optMin":0,"optMax":35,"val":9.9}],
   "inv":{"conv":11,"coop":50,"item":"a kilo of cacao"},
   "cost_items":[["Agriculture atom kit",3600,"IMPORT"],["Contour structures + vetiver hedges",2500,"FAB"],["Moringa + tree seedlings, ~2 ha",4000,"SUPPLY"],["On-TapTap composting setup",800,"FAB"],["Rabbit starter + hutchery + feed",2500,"FAB"],["Working capital",1500,"SERVICE"]],
   "crops":[["Vetiver",100],["Pigeon pea",100],["Cassava",91],["Castor",89],["Mango",87],["Moringa",85],["Cacao",66],["Breadfruit",64],["Coffee",56]],
   "cropnote":"The suitability model is rainfall-conservative, so it scores the tree crops moderate (cacao 66, coffee 56). The Grand'Anse play trades raw suitability for downstream value... and vetiver, the erosion-and-cash crop, grades a perfect 1.0.",
   "value":{"farmer":6.74,"final":60,"item":"a kilo of cacao made into local chocolate","unit":"$"},
   "tiers":{"unit":"$/kg","rows":[["Farmgate bean",6.74,6.74],["Fermented +45%",9.8,9.8],["Raw export (NY)",18,25],["Local bean-to-bar",40,80]]},
   "constraint":"Erosion control first, then patient capital for the tree-crop years.",
 },
}

NAV = """<nav class="kn-nav"><div class="container">
<a href="../index.html" class="kn-brand"><span class="kn-brand-logo">KONKRET</span><span class="kn-brand-parent">BARSS Haiti · Konekte Kreye Travay</span></a>
<ul class="kn-links">
<li><a href="../a-propos.html">About</a></li>
<li><a href="../taptaps.html">TapTaps</a></li>
<li><a href="../fatraka.html">FatraKa</a></li>
<li><a href="../partners.html">Partners</a></li>
<li><a href="../contact.html">Contact</a></li>
</ul>
<a href="../taptaps.html" class="kn-cta kn-cta-ghost">All TapTaps</a>
<a href="../je-veux-un-emploi.html" class="kn-cta">Get a Job</a>
</div></nav>"""

def fmt(n): return "${:,}".format(n)

def slot(vid_desc):
    return ('<div class="slot"><span class="slot-tag">graph slot</span>'
            '<span class="slot-desc">%s</span></div>' % vid_desc)

def chapter(cid, num, kicker, title, intro, slots, extra=""):
    slot_html = "".join(slot(s) for s in slots)
    return f"""
<section class="chapter" id="{cid}">
  <div class="chap-inner">
    <div class="chap-head"><span class="chap-num">{num}</span><span class="chap-kicker">{kicker}</span></div>
    <h2>{title}</h2>
    <p class="chap-intro">{intro}</p>
    {extra}
    <div class="slots">{slot_html}</div>
  </div>
</section>"""

def build(key, s):
    spons = ('<a class="spon-btn gated" style="pointer-events:none">Gated · verifying with Dan</a>'
             if s["gated"] else
             f'<a class="spon-btn {"live" if s["live"] else ""}" href="../acheter-boite.html">Sponsor this TapTap</a>')
    hero_stats = "".join(
        f'<div class="hstat"><div class="hv">{v}</div><div class="hl">{l}</div></div>'
        for v,l in s["hero_stats"])
    e=s["erosion"]; r=s["rain"]; soil=s["soil"]; val=s["value"]; tiers=s["tiers"]; y=s["youth"]
    def bc(label, ctype, attrs):
        a=" ".join('data-{}="{}"'.format(k,v) for k,v in attrs.items())
        return ('<div class="slot-label">{}</div>'.format(label)
                +'<div class="bchart" data-chart="{}" data-site="{}" {} style="margin:6px 0 28px"></div>'.format(ctype,key,a))
    # Land
    erosion_chart=bc("Erosion &#183; RUSLE model","erosion-dial",
        {"a":e["A"],"r":e["R"],"k":e["K"],"ls":e["LS"],"c":e["C"]})
    climo_chart=bc("Rainfall &#183; 15-year monthly normals vs crop water need","climograph",
        {"months":r["months"],"annual":r["annual"],"need":100})
    texture_chart=bc("Soil texture &#183; USDA classification","texture",
        {"sand":soil["sand"],"silt":soil["silt"],"clay":soil["clay"],"texture":soil["texture"]})
    soil_chart=bc("Soil report card &#183; vs the agronomic sweet spot","soil-card",
        {"ph":soil["ph"],"soc":soil["soc"],"cec":soil["cec"],"slope":soil["slope"]})
    # Match (JSON attr → single-quoted)
    crop_chart=('<div class="slot-label">Crop suitability &#183; EcoCrop match (0-100)</div>'
        +'<div class="bchart" data-chart="crop-fit" data-site="'+key+'" '
        +"data-crops='"+json.dumps(s["crops"])+"' "
        +'data-note="'+s.get("cropnote","")+'" style="margin:6px 0 28px"></div>')
    # Market
    vj_chart=bc("Where the value goes &#183; the extraction joint","value-joint",
        {"farmer":val["farmer"],"final":val["final"],"item":val["item"],"unit":val["unit"]})
    ladder_chart=('<div class="slot-label">Price ladder &#183; '+tiers["unit"]+'</div>'
        +'<div class="bchart" data-chart="price-ladder" data-site="'+key+'" '
        +"data-tiers='"+json.dumps(tiers["rows"])+"' "
        +'data-unit="'+tiers["unit"]+'" style="margin:6px 0 28px"></div>')
    DIASPORA='[["Florida",488000,true],["New York",182000,true],["Massachusetts",81000,true],["New Jersey",62000,false],["Georgia",50000,false],["Connecticut",28000,false],["Pennsylvania",28000,false],["Maryland",25000,false],["Texas",20000,false],["Illinois",12000,false]]'
    diaspora_chart=("" if key=="pestel" else
        '<div class="slot-label">The demand side &#183; Haitian diaspora by US state</div>'
        +'<div class="bchart" data-chart="diaspora" data-rows=\''+DIASPORA+'\' style="margin:6px 0 28px"></div>')
    # Match (V16 fingerprint)
    fp_chart=('<div class="slot-label">Why it fits &#183; EcoCrop suitability fingerprint</div>'
        +'<div class="bchart" data-chart="fingerprint" data-lead="'+s["fp_lead"]+'" '
        +"data-axes='"+json.dumps(s["fp_axes"])+"' "
        +'data-note="'+s["fp_note"]+'" style="margin:6px 0 28px"></div>')
    # Market (V20 inversion)
    inv_chart=bc("Inverting the take &#183; conventional vs SAKALA","inversion",
        {"conv":s["inv"]["conv"],"coop":s["inv"]["coop"],"item":s["inv"]["item"]})
    # Cost
    cost_chart=bc("Capital ladder &#183; lean base case, June 2026 capital research","cost-ramp",
        {"up":s["cost"]["up"],"opt":s["cost"]["opt"],"dream":s["cost"]["dream"]})
    # Cost (V29 itemized procurement table)
    costtbl_chart=('<div class="slot-label">The procurement list &#183; up-to-speed line items</div>'
        +'<div class="bchart" data-chart="cost-table" data-label="Up to speed" '
        +"data-rows='"+json.dumps(s["cost_items"])+"' style=\"margin:6px 0 28px\"></div>")
    # V22 COGS (cassava market only)
    _cogs='[["Root x3 lb",0.24,"#1AAB4D","$0.24"],["Milling + labor",0.45,"#5fa8c9","$0.45"],["Drying / energy",0.15,"#8fbcd9","$0.15"],["Packaging",0.30,"#e0a838","$0.30"],["Freight to US",0.40,"#d98c2b","$0.40"],["Compliance",0.20,"#b86b3a","$0.20"]]'
    cogs_chart=("" if key=="pestel" else
        '<div class="slot-label">Unit economics &#183; what a pound of flour costs to make and land</div>'
        +'<div class="bchart" data-chart="stack-bar" data-segs=\''+_cogs+'\' '
        +'data-note="A pound of branded flour costs roughly $1.74 to make and land in the US and sells on the health shelf at $8-13... that spread is the margin the cooperative keeps. Illustrative; 3 lb of root make 1 lb of flour." style="margin:6px 0 28px"></div>')
    # V52 fast-cash (Milot market)
    _fc=json.dumps([["Lemongrass",5],["Citronella",6],["Moringa",8],["Cassava",10],["Vetiver",20]])
    fastcash_chart=("" if key!="milot_fedanoir" else
        '<div class="slot-label">Fast cash to slow cash &#183; months to first income</div>'
        +'<div class="bchart" data-chart="fast-cash" data-rows=\''+_fc+'\' '
        +'data-note="Start the aromatic grasses for cash in months, plant cassava and vetiver alongside; the slow crops pay later. The portfolio keeps wages flowing while it matures." style="margin:6px 0 28px"></div>')
    # V51 harvest calendar (Pestel match)
    _cal=json.dumps([
        {"crop":"Moringa","plant":[1,2],"grow":[],"harv":[3,4,5,6,7,8,9,10,11,12]},
        {"crop":"Cassava","plant":[4,5],"grow":[6,7,8,9,10,11],"harv":[12,1,2,3]},
        {"crop":"Vetiver","plant":[4,5],"grow":[6,7,8,9,10],"harv":[11,12,1]},
        {"crop":"Cacao","plant":[],"grow":[3,4,8,9],"harv":[10,11,12,1,2,5,6,7]},
        {"crop":"Coffee","plant":[],"grow":[3,4,5,6,7,8,9,10],"harv":[11,12,1,2]},
        {"crop":"Breadfruit","plant":[],"grow":[2,3,4,5,6,10,11],"harv":[7,8,9,12,1]}])
    calendar_chart=("" if key!="pestel" else
        '<div class="slot-label">The harvest calendar &#183; what comes in when</div>'
        +'<div class="bchart" data-chart="calendar" data-rows=\''+_cal+'\' '
        +'data-note="vetiver matures over 18-24 months" style="margin:6px 0 28px"></div>')
    # V30 funding-type split (Pestel cost)
    _fund='[["Product-purchasable",16,"#1AAB4D","$16k"],["Patient / grant",44,"#ec9aa3","$44k"],["Gated",24,"rgba(143,188,217,.55)","$24k"]]'
    funding_chart=("" if key!="pestel" else
        '<div class="slot-label">Where the money comes from &#183; funding type</div>'
        +'<div class="bchart" data-chart="stack-bar" data-segs=\''+_fund+'\' '
        +'data-note="Most of Pestel\'s full build is patient or grant capital (the tree-crop bridge, the distillery, certification), not product-purchase money... which is why it is the slow founding play, not a quick sponsorship." style="margin:6px 0 28px"></div>')
    # V56 receipt (QM cost, the flagship)
    _items=json.dumps([["Youth wages",52],["Seeds & cuttings",15],["Equipment fund (the TapTap's asset)",25],["Milling & packing",18],["Freight & handling",10]])
    _outs=json.dumps([["~6 lb","of cassava flour, shipped to you"],["~9 hrs","of paid work for a young person"],["1","season report: who was hired, what grew"]])
    receipt_chart=("" if key!="quartier_morin" else
        '<div class="slot-label">A purchase, not a donation &#183; what your box buys</div>'
        +'<div class="bchart" data-chart="receipt" data-total="120" data-items=\''+_items+'\' data-outs=\''+_outs+'\' '
        +'data-note="Half of what you pay for is the proof of what it did." style="margin:6px 0 28px"></div>')
    # V32 break-even (Milot cost)
    breakeven_chart=("" if key!="milot_fedanoir" else
        '<div class="slot-label">Self-financing &#183; the break-even point</div>'
        +'<div class="bchart" data-chart="breakeven" data-be="44" data-unit="subscriptions" '
        +'data-note="Each $90-a-quarter Harvest Box subscription covers its share of the cost. About 44 of them and the cassava line pays for itself, then every box after is surplus the cooperative keeps." style="margin:6px 0 28px"></div>')
    # V63 cost-confidence (pin2 cost)
    _conf=json.dumps([["River pump + abstraction",2000,4000,1],["Year-round irrigation",4000,7000,1],["Agriculture atom kit",3600,3600,0],["Flour processing share",3000,5000,0]])
    confidence_chart=("" if key!="quartier_morin_pin2" else
        '<div class="slot-label">How firm are these numbers &#183; screening estimates</div>'
        +'<div class="bchart" data-chart="confidence" data-rows=\''+_conf+'\' '
        +'data-note="Everything here is a screening estimate until Dan confirms the parcel. The pump and the year-round irrigation are the two lines we need real quotes for before committing a dollar." style="margin:6px 0 28px"></div>')
    # V50 remedy = lawsuit (Pestel market)
    _rem=json.dumps([
        ["Frager and Givaudan capture almost the entire vetiver chain (Theta 0.9987)","The cooperative owns the still, so the oil margin stays on the hill"],
        ["The flagship fair-trade program reaches 250 of about 30,000 growers","Every grower here owns a share of the distillation"],
        ["Growers are price-takers at roughly $30 a bale","A guaranteed floor price plus a share of the oil revenue"],
        ["Anonymous bulk oil, no origin and no story","Single-origin, traceable, sold direct to the buyer"]])
    remedy_chart=("" if key!="pestel" else
        '<div class="slot-label">The remedy is the lawsuit &#183; operation vs extraction</div>'
        +'<div class="bchart" data-chart="remedy" data-pairs=\''+_rem+'\' '
        +'data-note="The same vetiver chain BARSS documents as extraction in the litigation is the one this TapTap inverts in practice. Operations and the case are one argument." style="margin:6px 0 28px"></div>')
    # Youth
    youth_chart=bc("The work in young hands","youth-strip",{"now":y["now"],"cap":y["cap"],"inc":708})
    own_chart=bc("Ownership ramp &#183; the apprenticeship","ownership",{})
    income_chart=bc("How one wage ripples &#183; the local multiplier","income-flow",{"now":y["now"],"inc":708})
    # TapTap-specific extras
    pestel_land=pestel_market=pestel_cost=milot_land=""
    if key=="pestel":
        pestel_land=bc("Soil-loss clock &#183; with and without erosion control","depletion",{"a":e["A"],"bd":1.35,"depth":25})
        pestel_market=bc("The vetiver economics &#183; extraction, and the fix","vetiver-call",{})
        pestel_cost=bc("The J-curve &#183; tree-crop establishment cash flow","jcurve",{"bridge":25000})
    if key=="milot_fedanoir":
        milot_land=bc("The lime fix &#183; pH 5.4 &#8594; 6.5","lime-fix",{"ph":5.4,"target":6.5})

    drop=lambda slots,pref: [x for x in slots if not any(x.startswith(p) for p in pref)]
    land_slots=drop(s["land_slots"],["V11","V9","V4","V5","V7","V1","V12","V8","V76"])
    match_slots=drop(s["match_slots"],["V15","V16","V51"])
    market_slots=drop(s["market_slots"],["V19","V21","V27","V20","V22","V52","V50"])
    cost_slots=drop(s["cost_slots"],["V28","V33","V29","V30","V32","V63","V56"])
    youth_slots=drop(s["youth_slots"],["V36"])

    chapters="".join([
        chapter("land","01","The land, measured","The ground",s["land_intro"],land_slots,
                extra=erosion_chart+climo_chart+milot_land+texture_chart+soil_chart+pestel_land),
        chapter("match","02","Land &#8594; enterprise","The match",s["match_intro"],match_slots,
                extra=crop_chart+fp_chart+calendar_chart),
        chapter("market","03","The value chain","The market",s["market_intro"],market_slots,
                extra=vj_chart+inv_chart+ladder_chart+cogs_chart+pestel_market+remedy_chart+diaspora_chart+fastcash_chart),
        chapter("cost","04","Real &#8594; dream","The cost",s["cost_intro"],cost_slots,
                extra=f'<div class="costrow"><span>Up to speed <b>{fmt(s["cost"]["up"])}</b></span>'
                      f'<span>Optimized <b>{fmt(s["cost"]["opt"])}</b></span>'
                      f'<span>Dream <b>{fmt(s["cost"]["dream"])}</b></span></div>'+cost_chart+costtbl_chart+receipt_chart+breakeven_chart+confidence_chart+funding_chart+pestel_cost),
        chapter("youth","05","Who it pays","The youth",
                f'{y["now"]} young people work here today, room for {y["cap"]}. '
                'A six-month renewable apprenticeship at $52/month base plus a surplus share, '
                'and a 40%-rising-to-51% ownership stake in the cooperative. '
                f'Binding constraint: {s["constraint"]}', youth_slots,
                extra=youth_chart+own_chart+income_chart),
    ])
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{s['name']} · TapTap Dossier · BARSS Haiti</title>
<meta name="description" content="{s['verdict']}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Lora:ital,wght@0,400;0,600;1,400&family=Roboto+Slab:wght@700;800&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../css/konkret.css?v=6"/>
<style>
  html {{ scroll-behavior:smooth; }}
  .d-hero {{ position:relative; min-height:88vh; display:flex; align-items:flex-end; color:var(--bone); overflow:hidden; }}
  .d-hero .bg {{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }}
  .d-hero .scrim {{ position:absolute; inset:0; background:linear-gradient(to top, rgba(6,6,6,.97) 12%, rgba(6,6,6,.6) 48%, rgba(6,6,6,.15) 80%); }}
  .d-hero .inner {{ position:relative; max-width:1100px; margin:0 auto; padding:0 28px 54px; width:100%; }}
  .d-hero .back {{ font-family:'Courier Prime',monospace; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--sodium-orange); text-decoration:none; }}
  .d-hero .badge {{ display:inline-block; margin:18px 0 12px; font-family:'Courier Prime',monospace; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; padding:6px 11px; border-radius:3px; background:rgba(10,10,10,.5); backdrop-filter:blur(8px); border:1px solid rgba(244,239,226,.2); }}
  .d-hero h1 {{ font-family:'Anton',sans-serif; font-size:clamp(46px,9vw,96px); line-height:.88; text-transform:uppercase; margin:0; }}
  .d-hero .sub {{ font-family:'Lora',serif; font-style:italic; font-size:16px; color:rgba(244,239,226,.7); margin:8px 0 4px; }}
  .d-hero .coords {{ font-family:'Courier Prime',monospace; font-size:12px; color:rgba(244,239,226,.5); }}
  .d-hero .verdict {{ font-family:'Lora',serif; font-size:clamp(16px,2.4vw,20px); line-height:1.5; max-width:720px; margin:18px 0 24px; }}
  .hstats {{ display:flex; flex-wrap:wrap; gap:2px; }}
  .hstat {{ background:rgba(10,10,10,.45); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid rgba(244,239,226,.12); padding:14px 20px; }}
  .hstat .hv {{ font-family:'Roboto Slab',serif; font-weight:800; font-size:22px; color:var(--sodium-orange); line-height:1; }}
  .hstat .hl {{ font-family:'Courier Prime',monospace; font-size:9px; letter-spacing:1px; text-transform:uppercase; color:rgba(244,239,226,.5); margin-top:7px; }}
  .scroll-hint {{ display:block; margin-top:22px; font-family:'Courier Prime',monospace; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:rgba(244,239,226,.4); }}
  /* sticky chapter nav */
  .chap-nav {{ position:sticky; top:0; z-index:50; background:rgba(8,8,8,.92); backdrop-filter:blur(12px); border-bottom:1px solid rgba(244,239,226,.1); }}
  .chap-nav .inner {{ max-width:1100px; margin:0 auto; padding:0 28px; display:flex; gap:26px; overflow-x:auto; }}
  .chap-nav a {{ font-family:'Courier Prime',monospace; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(244,239,226,.55); text-decoration:none; padding:15px 0; white-space:nowrap; border-bottom:2px solid transparent; }}
  .chap-nav a:hover {{ color:var(--sodium-orange); border-bottom-color:var(--sodium-orange); }}
  /* chapters */
  .chapter {{ background:#0b0b0b; color:var(--bone); border-bottom:1px solid rgba(244,239,226,.06); padding:64px 28px; }}
  .chapter:nth-child(even) {{ background:#0e0e0e; }}
  .chap-inner {{ max-width:1100px; margin:0 auto; }}
  .chap-head {{ display:flex; align-items:baseline; gap:14px; margin-bottom:10px; }}
  .chap-num {{ font-family:'Anton',sans-serif; font-size:30px; color:var(--du-bois-red); }}
  .chap-kicker {{ font-family:'Courier Prime',monospace; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--sodium-orange); }}
  .chapter h2 {{ font-family:'Anton',sans-serif; font-size:clamp(30px,5vw,52px); text-transform:uppercase; margin:0 0 16px; line-height:.96; }}
  .chap-intro {{ font-family:'Lora',serif; font-size:clamp(15px,2.2vw,18px); line-height:1.65; color:rgba(244,239,226,.84); max-width:760px; margin:0 0 26px; }}
  .hero-note {{ font-family:'Courier Prime',monospace; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:rgba(244,239,226,.5); border-left:2px solid var(--sodium-orange); padding-left:12px; margin-bottom:24px; }}
  .slot-label {{ font-family:'Courier Prime',monospace; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--sodium-orange); margin-bottom:4px; }}
  .hero-note b {{ color:var(--sodium-orange); }}
  .costrow {{ display:flex; flex-wrap:wrap; gap:2px; margin-bottom:24px; }}
  .costrow span {{ background:rgba(244,239,226,.05); padding:14px 22px; font-family:'Courier Prime',monospace; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:rgba(244,239,226,.6); }}
  .costrow b {{ display:block; font-family:'Roboto Slab',serif; font-size:22px; color:var(--bone); margin-top:6px; }}
  /* graph slots (scaffold placeholders) */
  .slots {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }}
  .slot {{ border:1.5px dashed rgba(255,106,31,.4); border-radius:5px; min-height:150px; padding:18px; display:flex; flex-direction:column; justify-content:center; gap:8px; background:repeating-linear-gradient(45deg,rgba(255,106,31,.03),rgba(255,106,31,.03) 12px,transparent 12px,transparent 24px); }}
  .slot-tag {{ font-family:'Courier Prime',monospace; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--sodium-orange); }}
  .slot-desc {{ font-family:'Roboto Slab',serif; font-weight:700; font-size:15px; color:rgba(244,239,226,.85); line-height:1.3; }}
  /* pinned sponsor bar */
  .spon-bar {{ position:fixed; bottom:0; left:0; right:0; z-index:60; background:rgba(8,8,8,.94); backdrop-filter:blur(14px); border-top:1px solid rgba(255,106,31,.3); padding:12px 24px; display:flex; align-items:center; justify-content:space-between; gap:16px; }}
  .spon-bar .lab {{ font-family:'Lora',serif; font-size:13.5px; color:rgba(244,239,226,.8); }}
  .spon-bar .lab b {{ color:var(--bone); }}
  .spon-btn {{ font-family:'Courier Prime',monospace; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; text-decoration:none; padding:13px 26px; border-radius:3px; background:var(--sodium-orange); color:#111; white-space:nowrap; }}
  .spon-btn.live {{ background:var(--voice-green); color:#fff; }}
  .spon-btn:hover {{ background:#fff; color:#111; }}
  .spon-btn.gated {{ background:rgba(143,188,217,.18); color:#8fbcd9; }}
  body {{ padding-bottom:64px; }}
  @media (max-width:600px){{ .spon-bar .lab {{ display:none; }} .spon-bar {{ justify-content:center; }} }}
</style>
</head>
<body>
{NAV}

<header class="d-hero">
  <img class="bg" src="../img/taptaps/{key}_context.jpg" alt="Satellite view of {s['name']}"/>
  <div class="scrim"></div>
  <div class="inner">
    <a href="../taptaps.html" class="back">← All four TapTaps</a>
    <span class="badge">{s['status']}</span>
    <h1>{s['name']}</h1>
    <div class="sub">{s['dept']} · {s['sub']}</div>
    <div class="coords">{s['coords']}</div>
    <p class="verdict">{s['verdict']}</p>
    <div class="hstats">{hero_stats}</div>
    <span class="scroll-hint">Scroll the dossier ↓</span>
  </div>
</header>

<nav class="chap-nav"><div class="inner">
  <a href="#land">01 · Land</a>
  <a href="#match">02 · Match</a>
  <a href="#market">03 · Market</a>
  <a href="#cost">04 · Cost</a>
  <a href="#youth">05 · Youth</a>
</div></nav>

{chapters}

<section class="chapter" id="sponsor" style="text-align:center;background:var(--bottle-green);">
  <div class="chap-inner">
    <h2>{'This TapTap is gated' if s['gated'] else 'Put your money on this ground'}</h2>
    <p class="chap-intro" style="margin:0 auto 26px;">{'Nothing here is funded until Dan confirms the parcel, the flood fringe, and the quarry next door. Check back, or sponsor one of the live TapTaps in the meantime.' if s['gated'] else 'Your purchase of cassava flour funds this TapTap directly: the wages, the equipment, the assets that stay in the cooperative. The proof of exactly what it did ships back with the harvest.'}</p>
    {spons}
  </div>
</section>

<div class="spon-bar">
  <span class="lab"><b>{s['name']}</b> · {s['status']}</span>
  {spons}
</div>

<script src="../js/nav.js"></script>
<script src="../js/barss-charts.js"></script>
</body>
</html>"""

for key, s in SITES.items():
    html = build(key, s)
    with io.open(os.path.join(OUT, key + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote taptaps/%s.html" % key)
print("done")
