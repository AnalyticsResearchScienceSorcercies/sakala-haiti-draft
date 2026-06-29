/* BARSS site-dossier charts. Self-contained (injects its own CSS).
   Each chart = a render fn that reads data-* attributes off a container.
   Auto-renders any [data-chart] on DOMContentLoaded.
   V11 erosion dial first; more graph slots plug in the same way. */
(function(){
  "use strict";
  var ORANGE="#FF6A1F", GREEN="#1AAB4D", RED="#DC143C", AMBER="#e0a838",
      BONE="#F4EFE2", BLUE="#8fbcd9", MUTE="rgba(244,239,226,.5)";

  /* ---- one-time CSS ---- */
  if(!document.getElementById("barss-charts-css")){
    var css=document.createElement("style"); css.id="barss-charts-css";
    css.textContent=[
      ".bchart{font-family:'Lora',serif}",
      ".ed{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:30px;align-items:center;background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:24px}",
      ".ed-gauge{text-align:center}",
      ".ed-gauge svg{width:100%;max-width:340px;height:auto}",
      ".ed-cap{font-family:'Courier Prime',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:rgba(244,239,226,.45);margin-top:4px}",
      ".ed-formula{font-family:'Courier Prime',monospace;font-size:11.5px;letter-spacing:.3px;color:rgba(244,239,226,.7);background:rgba(0,0,0,.25);border-left:2px solid "+ORANGE+";padding:9px 12px;border-radius:0 3px 3px 0;margin-bottom:18px;line-height:1.5}",
      ".ed-formula b{color:"+BONE+"}",
      ".ed-fac{margin-bottom:13px}",
      ".ed-fl{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}",
      ".ed-fname{font-family:'Courier Prime',monospace;font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;color:rgba(244,239,226,.75)}",
      ".ed-fname .drv{color:"+ORANGE+";font-weight:700;margin-left:7px}",
      ".ed-fval{font-family:'Roboto Slab',serif;font-weight:800;font-size:14px;color:"+BONE+"}",
      ".ed-track{height:8px;background:rgba(244,239,226,.08);border-radius:5px;overflow:hidden}",
      ".ed-track>span{display:block;height:100%;border-radius:5px}",
      ".ed-verdict{font-family:'Lora',serif;font-style:italic;font-size:14px;line-height:1.55;color:rgba(244,239,226,.82);border-top:1px solid rgba(244,239,226,.1);margin-top:18px;padding-top:14px}",
      ".ed-verdict b{font-style:normal;color:"+ORANGE+"}",
      "@media(max-width:680px){.ed{grid-template-columns:1fr;gap:22px}}",
      ".cg{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:18px 20px}",
      ".cg svg{width:100%;height:auto;display:block}",
      ".cg-foot{display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin-top:10px;font-family:'Courier Prime',monospace;font-size:11px;letter-spacing:.3px;color:rgba(244,239,226,.6)}",
      ".cg-foot b{color:"+BONE+"}",
      ".cg-key{display:flex;align-items:center;gap:6px;margin-left:auto}",
      ".cg-key i{width:11px;height:11px;border-radius:2px;display:inline-block;margin-left:8px}",
      /* V4 texture triangle */
      ".tri{display:grid;grid-template-columns:300px 1fr;gap:26px;align-items:center;background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:20px}",
      ".tri svg{width:300px;max-width:100%;height:auto}",
      ".tri-side .tt{font-family:'Roboto Slab',serif;font-weight:800;font-size:21px;color:"+BONE+";margin-bottom:8px;text-transform:capitalize}",
      ".tri-side p{font-family:'Lora',serif;font-size:13.5px;line-height:1.55;color:rgba(244,239,226,.72);margin:0}",
      ".tri-side .chips{margin-top:13px;display:flex;gap:6px;flex-wrap:wrap}",
      ".tri-side .chips span{font-family:'Courier Prime',monospace;font-size:10px;color:"+BONE+";background:rgba(244,239,226,.08);padding:5px 9px;border-radius:3px}",
      "@media(max-width:680px){.tri{grid-template-columns:1fr;justify-items:center}}",
      /* V7 soil card */
      ".soilcard{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:22px}",
      ".meter-row{margin-bottom:16px}",
      ".m-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}",
      ".m-label{font-family:'Courier Prime',monospace;font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:rgba(244,239,226,.72)}",
      ".m-val{font-family:'Roboto Slab',serif;font-weight:800;font-size:15px}",
      ".m-track{position:relative;height:11px;background:rgba(244,239,226,.08);border-radius:6px}",
      ".m-band{position:absolute;top:0;bottom:0;background:rgba(26,171,77,.28);border-radius:3px}",
      ".m-mark{position:absolute;top:-3px;bottom:-3px;width:3px;border-radius:2px}",
      ".sc-note{font-family:'Lora',serif;font-style:italic;font-size:12.5px;line-height:1.5;color:rgba(244,239,226,.55);margin-top:6px}",
      /* V15 crop fit */
      ".cropfit{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:22px}",
      ".cf-row{display:flex;align-items:center;gap:12px;margin-bottom:9px}",
      ".cf-name{flex:0 0 132px;font-family:'Lora',serif;font-size:13.5px;color:rgba(244,239,226,.85);text-align:right}",
      ".cf-bar{flex:1;height:18px;background:rgba(244,239,226,.06);border-radius:3px;overflow:hidden}",
      ".cf-bar>span{display:block;height:100%;border-radius:3px}",
      ".cf-score{flex:0 0 36px;font-family:'Roboto Slab',serif;font-weight:800;font-size:13px;color:"+BONE+";text-align:right}",
      ".cf-note{font-family:'Lora',serif;font-style:italic;font-size:12.5px;line-height:1.5;color:rgba(244,239,226,.55);margin-top:12px}",
      /* V19 value joint */
      ".vj{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:22px}",
      ".vj-bar{display:flex;height:48px;border-radius:4px;overflow:hidden;margin-bottom:9px}",
      ".vj-farm{background:#1AAB4D;min-width:3px}",
      ".vj-rest{flex:1;background:repeating-linear-gradient(45deg,rgba(220,20,60,.52),rgba(220,20,60,.52) 8px,rgba(220,20,60,.34) 8px,rgba(220,20,60,.34) 16px);display:flex;align-items:center;padding-left:14px;font-family:'Courier Prime',monospace;font-size:11px;letter-spacing:.3px;color:"+BONE+"}",
      ".vj-scale{display:flex;justify-content:space-between;font-family:'Courier Prime',monospace;font-size:11px;color:rgba(244,239,226,.6)}",
      ".vj-scale b{color:#1AAB4D}",
      ".vj-note{font-family:'Lora',serif;font-size:13.5px;line-height:1.55;color:rgba(244,239,226,.82);margin-top:14px}",
      ".vj-note b{color:#1AAB4D;font-weight:600}",
      /* V21 price ladder + V28 cost ramp */
      ".ladder,.cramp{display:flex;align-items:flex-end;gap:12px;background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:22px 20px 16px;min-height:228px}",
      ".lad-step,.cr-step{flex:1;display:flex;flex-direction:column;justify-content:flex-end;text-align:center}",
      ".lad-price,.cr-val{font-family:'Roboto Slab',serif;font-weight:800;font-size:15px;color:"+BONE+";margin-bottom:6px}",
      ".lad-bar,.cr-bar{border-radius:3px 3px 0 0;width:100%}",
      ".lad-name,.cr-name{font-family:'Courier Prime',monospace;font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:rgba(244,239,226,.62);margin-top:9px;line-height:1.3}",
      ".cr-inc{font-family:'Courier Prime',monospace;font-size:9px;color:rgba(244,239,226,.4);margin-top:3px}",
      /* V37 ownership ramp */
      ".own{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:20px}",
      ".own svg{width:100%;height:auto;display:block}",
      ".own-cap{font-family:'Lora',serif;font-style:italic;font-size:13px;color:rgba(244,239,226,.6);margin-top:8px;text-align:center}",
      /* V35 youth strip */
      ".ystrip2{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border-radius:6px;overflow:hidden}",
      ".ystrip2 .yc{background:rgba(0,49,83,.42);padding:18px 14px;text-align:center}",
      ".ystrip2 .yc .v{font-family:'Roboto Slab',serif;font-weight:800;font-size:22px;color:"+BONE+";line-height:1}",
      ".ystrip2 .yc .v small{font-size:13px;color:rgba(244,239,226,.5)}",
      ".ystrip2 .yc .l{font-family:'Courier Prime',monospace;font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:rgba(244,239,226,.5);margin-top:7px}",
      "@media(max-width:560px){.ystrip2{grid-template-columns:repeat(2,1fr)}}",
      /* V36 income flow */
      ".iflow{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:22px}",
      ".if-row{display:flex;align-items:stretch;gap:0;flex-wrap:wrap}",
      ".if-step{flex:1;min-width:110px;text-align:center;padding:6px 8px}",
      ".if-v{font-family:'Roboto Slab',serif;font-weight:800;font-size:19px;color:"+BONE+";line-height:1.1}",
      ".if-l{font-family:'Courier Prime',monospace;font-size:9.5px;letter-spacing:.3px;text-transform:uppercase;color:rgba(244,239,226,.5);margin-top:6px;line-height:1.3}",
      ".if-arrow{display:flex;align-items:center;color:"+GREEN+";font-size:20px;padding:0 2px}",
      ".if-total{font-family:'Lora',serif;font-size:13.5px;line-height:1.55;color:rgba(244,239,226,.82);border-top:1px solid rgba(244,239,226,.1);margin-top:16px;padding-top:14px}",
      ".if-total b{color:"+GREEN+"}",
      /* V33 J-curve, V76 deplete */
      ".jc,.dep{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:20px}",
      ".jc svg{width:100%;height:auto;display:block}",
      ".jc-cap,.dep-note{font-family:'Lora',serif;font-style:italic;font-size:13px;line-height:1.55;color:rgba(244,239,226,.6);margin-top:10px}",
      ".dep-head{display:flex;align-items:baseline;gap:10px;margin-bottom:16px}",
      ".dep-big{font-family:'Roboto Slab',serif;font-weight:800;font-size:38px;color:"+RED+";line-height:1}",
      ".dep-sub{font-family:'Courier Prime',monospace;font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:rgba(244,239,226,.6)}",
      ".dep-row{margin-bottom:13px}",
      ".dep-rl{display:flex;justify-content:space-between;font-family:'Courier Prime',monospace;font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;color:rgba(244,239,226,.7);margin-bottom:5px}",
      ".dep-rl b{color:"+BONE+"}",
      ".dep-track{height:14px;background:rgba(244,239,226,.07);border-radius:3px;overflow:hidden}",
      ".dep-track>span{display:block;height:100%;border-radius:3px}",
      /* V27 vetiver callout */
      ".vcall{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border-radius:6px;overflow:hidden;margin-bottom:2px}",
      ".vc{padding:22px 16px;text-align:center}",
      ".vc.bad{background:rgba(220,20,60,.14)}.vc.mid{background:rgba(224,168,56,.14)}.vc.good{background:rgba(26,171,77,.16)}",
      ".vc .n{font-family:'Roboto Slab',serif;font-weight:800;font-size:32px;line-height:1}",
      ".vc.bad .n{color:"+RED+"}.vc.mid .n{color:"+AMBER+"}.vc.good .n{color:"+GREEN+"}",
      ".vc .t{font-family:'Lora',serif;font-size:12.5px;line-height:1.45;color:rgba(244,239,226,.78);margin-top:9px}",
      "@media(max-width:560px){.vcall{grid-template-columns:1fr}}",
      /* V8 lime fix */
      ".lime{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:22px}",
      ".lime svg{width:100%;height:auto;display:block}",
      ".lime-note{font-family:'Lora',serif;font-size:13.5px;line-height:1.55;color:rgba(244,239,226,.82);margin-top:12px}",
      ".lime-note b{color:"+GREEN+"}",
      /* V42 Haiti map */
      ".hmap{background:rgba(0,49,83,.22);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:18px}",
      ".hmap svg{width:100%;height:auto;display:block;max-height:460px}",
      /* V24 diaspora ranking */
      ".dia{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:20px}",
      ".dia-row{display:flex;align-items:center;gap:10px;margin-bottom:7px}",
      ".dia-name{flex:0 0 118px;font-family:'Lora',serif;font-size:13px;color:rgba(244,239,226,.85);text-align:right}",
      ".dia-name i{color:"+ORANGE+";font-style:normal}",
      ".dia-bar{flex:1;height:15px;background:rgba(244,239,226,.06);border-radius:3px;overflow:hidden}",
      ".dia-bar>span{display:block;height:100%;border-radius:3px}",
      ".dia-val{flex:0 0 42px;font-family:'Roboto Slab',serif;font-weight:800;font-size:12.5px;color:"+BONE+";text-align:right}",
      ".dia-note{font-family:'Lora',serif;font-size:12.5px;line-height:1.55;color:rgba(244,239,226,.6);margin-top:12px;border-top:1px solid rgba(244,239,226,.1);padding-top:12px}",
      ".dia-note i{color:"+ORANGE+";font-style:normal}.dia-note b{color:"+BONE+"}",
      /* V16 EcoCrop fingerprint */
      ".fp{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:22px}",
      ".fp-lead{font-family:'Roboto Slab',serif;font-weight:800;font-size:16px;color:"+BONE+";margin-bottom:16px}",
      ".fp-lead span{color:"+GREEN+"}",
      ".fp-row{margin-bottom:15px}",
      ".fp-hd{display:flex;justify-content:space-between;font-family:'Courier Prime',monospace;font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;color:rgba(244,239,226,.7);margin-bottom:6px}",
      ".fp-hd b{font-family:'Roboto Slab',serif;font-weight:800}",
      ".fp-track{position:relative;height:14px;background:rgba(244,239,226,.04);border-radius:3px}",
      ".fp-abs{position:absolute;top:0;bottom:0;background:rgba(244,239,226,.11);border-radius:2px}",
      ".fp-opt{position:absolute;top:0;bottom:0;background:rgba(26,171,77,.32);border-radius:2px}",
      ".fp-mark{position:absolute;top:-3px;bottom:-3px;width:3px;border-radius:2px}",
      ".fp-note{font-family:'Lora',serif;font-style:italic;font-size:12.5px;line-height:1.5;color:rgba(244,239,226,.6);margin-top:10px}",
      /* V20 Theta inversion */
      ".inv{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:22px}",
      ".inv-row{margin-bottom:14px}",
      ".inv-lab{font-family:'Courier Prime',monospace;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:rgba(244,239,226,.7);margin-bottom:6px}",
      ".inv-bar{display:flex;height:36px;border-radius:4px;overflow:hidden}",
      ".inv-seg{display:flex;align-items:center;justify-content:center;font-family:'Courier Prime',monospace;font-size:10.5px;letter-spacing:.3px;color:"+BONE+";white-space:nowrap;overflow:hidden;padding:0 4px}",
      ".inv-note{font-family:'Lora',serif;font-size:13.5px;line-height:1.55;color:rgba(244,239,226,.82);margin-top:14px}",
      ".inv-note b{color:"+GREEN+";font-weight:600}",
      /* V29 itemized cost table */
      ".ctab{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:14px 16px}",
      ".ctab table{width:100%;border-collapse:collapse}",
      ".ctab td{font-family:'Lora',serif;font-size:13.5px;color:rgba(244,239,226,.85);padding:9px 8px;border-bottom:1px solid rgba(244,239,226,.07);vertical-align:middle}",
      ".ctab td.amt{text-align:right;font-family:'Roboto Slab',serif;font-weight:800;color:"+BONE+";white-space:nowrap}",
      ".ctab .tag{font-family:'Courier Prime',monospace;font-size:8.5px;letter-spacing:.5px;text-transform:uppercase;padding:3px 7px;border-radius:3px;white-space:nowrap}",
      ".ctab tr.tot td{border-top:2px solid rgba(244,239,226,.22);border-bottom:none;font-family:'Courier Prime',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:"+BONE+";padding-top:11px}",
      ".ct-key{font-family:'Courier Prime',monospace;font-size:9px;letter-spacing:.3px;color:rgba(244,239,226,.4);margin-top:10px;line-height:1.5}",
      /* V51 crop calendar */
      ".cal{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:18px 16px;overflow-x:auto}",
      ".cal table{width:100%;border-collapse:collapse;min-width:440px}",
      ".cal th{font-family:'Courier Prime',monospace;font-size:9px;font-weight:400;color:rgba(244,239,226,.5);padding:2px;text-align:center}",
      ".cal td.crop{font-family:'Lora',serif;font-size:12.5px;color:rgba(244,239,226,.85);white-space:nowrap;padding-right:10px;text-align:right}",
      ".cal td.cell{padding:2px 1px}",
      ".cal .blk{height:15px;border-radius:2px;background:rgba(244,239,226,.05)}",
      ".cal .blk.grow{background:rgba(244,239,226,.13)}",
      ".cal .blk.harv{background:"+GREEN+"}",
      ".cal .blk.plant{background:"+AMBER+"}",
      ".cal-key{font-family:'Courier Prime',monospace;font-size:9px;color:rgba(244,239,226,.45);margin-top:10px}",
      ".cal-key i{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 4px 0 12px;vertical-align:middle}",
      /* V52 fast-cash */
      ".fc{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:20px}",
      ".fc-row{display:flex;align-items:center;gap:10px;margin-bottom:9px}",
      ".fc-name{flex:0 0 120px;font-family:'Lora',serif;font-size:13px;color:rgba(244,239,226,.85);text-align:right}",
      ".fc-bar{flex:1;height:16px;background:rgba(244,239,226,.06);border-radius:3px;overflow:hidden}",
      ".fc-bar>span{display:block;height:100%;border-radius:3px}",
      ".fc-val{flex:0 0 64px;font-family:'Courier Prime',monospace;font-size:11px;color:"+BONE+"}",
      ".fc-note{font-family:'Lora',serif;font-style:italic;font-size:12.5px;line-height:1.5;color:rgba(244,239,226,.6);margin-top:10px}",
      /* stacked bar (V22 COGS, V30 funding) */
      ".sbox{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:20px}",
      ".sbar{display:flex;height:40px;border-radius:4px;overflow:hidden;margin-bottom:13px}",
      ".sbar .seg{display:flex;align-items:center;justify-content:center;font-family:'Courier Prime',monospace;font-size:10px;color:"+BONE+";overflow:hidden;padding:0 3px;white-space:nowrap}",
      ".sleg{display:flex;flex-wrap:wrap;gap:6px 16px}",
      ".sleg span{font-family:'Courier Prime',monospace;font-size:10.5px;color:rgba(244,239,226,.72)}",
      ".sleg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:middle}",
      /* V32 break-even */
      ".be{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:20px}",
      ".be svg{width:100%;height:auto;display:block}",
      ".be-cap{font-family:'Lora',serif;font-style:italic;font-size:13px;line-height:1.55;color:rgba(244,239,226,.6);margin-top:10px}",
      /* V63 cost confidence */
      ".conf{background:rgba(244,239,226,.03);border:1px solid rgba(244,239,226,.08);border-radius:6px;padding:20px}",
      ".cf2-row{margin-bottom:14px}",
      ".cf2-hd{display:flex;justify-content:space-between;align-items:baseline;font-family:'Courier Prime',monospace;font-size:10.5px;letter-spacing:.3px;text-transform:uppercase;color:rgba(244,239,226,.74);margin-bottom:6px}",
      ".cf2-hd .q{color:"+AMBER+";font-size:9px}",
      ".cf2-hd b{font-family:'Roboto Slab',serif;font-weight:800;color:"+BONE+";text-transform:none}",
      ".cf2-track{position:relative;height:12px;background:rgba(244,239,226,.06);border-radius:3px}",
      ".cf2-rng{position:absolute;top:0;bottom:0;border-radius:3px}",
      ".conf-note{font-family:'Lora',serif;font-style:italic;font-size:12.5px;line-height:1.5;color:rgba(244,239,226,.6);margin-top:8px}",
      /* V50 remedy = lawsuit */
      ".rem{display:grid;grid-template-columns:1fr 1fr;gap:2px}",
      ".rem-h{font-family:'Courier Prime',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:11px 12px;text-align:center;line-height:1.3}",
      ".rem-h.bad{background:rgba(220,20,60,.16);color:#ec9aa3}",
      ".rem-h.good{background:rgba(26,171,77,.16);color:#8fe0ad}",
      ".rem-cell{font-family:'Lora',serif;font-size:13px;line-height:1.45;padding:12px;background:rgba(244,239,226,.03);color:rgba(244,239,226,.85)}",
      ".rem-cell.bad{border-left:2px solid "+RED+"}",
      ".rem-cell.good{border-left:2px solid "+GREEN+"}",
      ".rem-note{font-family:'Lora',serif;font-style:italic;font-size:12.5px;line-height:1.5;color:rgba(244,239,226,.6);margin-top:12px}",
      /* V56 receipt */
      ".rcpt{background:rgba(244,239,226,.04);border:1px solid rgba(244,239,226,.1);border-radius:6px;padding:22px 24px;max-width:400px;margin:0 auto}",
      ".rcpt-h{font-family:'Courier Prime',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:"+ORANGE+";text-align:center;border-bottom:1px dashed rgba(244,239,226,.25);padding-bottom:12px;margin-bottom:14px}",
      ".rcpt-row{display:flex;justify-content:space-between;align-items:baseline;font-family:'Courier Prime',monospace;font-size:12.5px;color:rgba(244,239,226,.82);padding:6px 0;border-bottom:1px dotted rgba(244,239,226,.12)}",
      ".rcpt-row b{font-family:'Roboto Slab',serif;font-weight:800;color:"+BONE+"}",
      ".rcpt-tot{display:flex;justify-content:space-between;font-family:'Roboto Slab',serif;font-weight:800;font-size:16px;color:"+BONE+";padding-top:12px;margin-top:6px}",
      ".rcpt-out{border-top:1px dashed rgba(244,239,226,.25);margin-top:14px;padding-top:14px}",
      ".rcpt-o{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}",
      ".rcpt-o .ov{font-family:'Roboto Slab',serif;font-weight:800;font-size:17px;color:"+GREEN+";flex:0 0 auto}",
      ".rcpt-o .ol{font-family:'Lora',serif;font-size:13px;color:rgba(244,239,226,.78)}",
      ".rcpt-note{font-family:'Lora',serif;font-style:italic;font-size:12.5px;line-height:1.5;color:rgba(244,239,226,.6);margin-top:14px;text-align:center}"
    ].join("");
    document.head.appendChild(css);
  }

  function polar(cx,cy,r,deg){var a=deg*Math.PI/180;return [cx+r*Math.cos(a), cy-r*Math.sin(a)];}
  // arc on the top semicircle: value v -> angle 180*(1-v/vmax) (0=left,180=left? see below)
  function arc(cx,cy,r,v0,v1,vmax){
    var t0=180*(1-Math.min(v0,vmax)/vmax), t1=180*(1-Math.min(v1,vmax)/vmax);
    var steps=Math.max(2,Math.round(Math.abs(t0-t1)/2)), d="";
    for(var i=0;i<=steps;i++){var t=t0+(t1-t0)*i/steps;var p=polar(cx,cy,r,t);d+=(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)+" ";}
    return d;
  }
  function sevColor(A){return A<11?GREEN:A<25?AMBER:A<50?ORANGE:RED;}
  function sevLabel(A){return A<11?"Sustainable":A<25?"High":A<50?"Severe":"Extreme";}

  function renderErosionDial(el){
    var A=+el.dataset.a, R=+el.dataset.r, K=+el.dataset.k, LS=+el.dataset.ls, C=+el.dataset.c;
    var site=el.dataset.site||"";
    var vmax=90, thr=11, cx=160, cy=170, r=128;
    var col=sevColor(A), ratio=(A/thr);

    // gauge
    var trackD=arc(cx,cy,r,0,vmax,vmax);
    var valD=arc(cx,cy,r,0,A,vmax);
    var tp1=polar(cx,cy,r-13,180*(1-thr/vmax)), tp2=polar(cx,cy,r+13,180*(1-thr/vmax));
    var svg=''
      +'<svg viewBox="0 0 320 210" role="img" aria-label="Erosion gauge, '+A+' tonnes per hectare per year">'
      +'<path d="'+trackD+'" fill="none" stroke="rgba(244,239,226,.1)" stroke-width="20" stroke-linecap="round"/>'
      +'<path d="'+valD+'" fill="none" stroke="'+col+'" stroke-width="20" stroke-linecap="round"/>'
      +'<line x1="'+tp1[0].toFixed(1)+'" y1="'+tp1[1].toFixed(1)+'" x2="'+tp2[0].toFixed(1)+'" y2="'+tp2[1].toFixed(1)+'" stroke="'+BONE+'" stroke-width="2.5"/>'
      +'<text x="'+(polar(cx,cy,r+24,180*(1-thr/vmax))[0])+'" y="'+(polar(cx,cy,r+24,180*(1-thr/vmax))[1]+3)+'" text-anchor="middle" font-family="Courier Prime,monospace" font-size="8.5" fill="'+MUTE+'">11</text>'
      +'<text x="'+cx+'" y="135" text-anchor="middle" font-family="Roboto Slab,serif" font-weight="800" font-size="46" fill="'+col+'">'+A+'</text>'
      +'<text x="'+cx+'" y="156" text-anchor="middle" font-family="Courier Prime,monospace" font-size="11" letter-spacing="1" fill="'+MUTE+'">t / ha / yr</text>'
      +'<text x="'+cx+'" y="184" text-anchor="middle" font-family="Courier Prime,monospace" font-size="12" font-weight="700" letter-spacing="1.5" fill="'+col+'">'+sevLabel(A).toUpperCase()+' &#183; '+ratio.toFixed(1)+'&#215; OVER</text>'
      +'</svg>'
      +'<div class="ed-cap">Soil loss vs the ~11 t/ha a slope can rebuild (white tick)</div>';

    // factors
    var facs=[
      {k:"R",  name:"Rain erosivity",            val:R,  disp:R.toLocaleString(), ref:9000,  benign:2000},
      {k:"K",  name:"Soil erodibility",          val:K,  disp:K.toFixed(3),       ref:0.07,  benign:0.02},
      {k:"LS", name:"Slope length &amp; steepness", val:LS, disp:LS.toFixed(2),    ref:5,     benign:0.3},
      {k:"C",  name:"Bare-ground exposure",      val:C,  disp:C.toFixed(2),       ref:1,     benign:0.1}
    ];
    var driver=facs[0]; facs.forEach(function(f){ if(f.val/f.benign > driver.val/driver.benign) driver=f; });
    function bandColor(f){
      if(f.k==="R")  return f.val<3000?GREEN:f.val<6000?AMBER:RED;
      if(f.k==="K")  return f.val<0.025?GREEN:f.val<0.04?AMBER:RED;
      if(f.k==="LS") return f.val<1?GREEN:f.val<2.5?AMBER:RED;
      return f.val<0.2?GREEN:f.val<0.35?AMBER:RED; // C: low = protected = good
    }
    var barsHtml=facs.map(function(f){
      var w=Math.max(3,Math.min(100, f.val/f.ref*100));
      return '<div class="ed-fac"><div class="ed-fl"><span class="ed-fname">'+f.name+' ('+f.k+')'
        +(f===driver?'<span class="drv">&#9654; driver</span>':'')+'</span><span class="ed-fval">'+f.disp+'</span></div>'
        +'<div class="ed-track"><span style="width:'+w.toFixed(0)+'%;background:'+bandColor(f)+'"></span></div></div>';
    }).join("");

    var verdicts={
      LS:"<b>Slope is the driver.</b> The rain and soil here are ordinary... the land is simply too steep, and only the plant cover keeps the loss from running away. Hold the hill first: contour structures and vetiver hedges, before anything else.",
      C:"<b>Bare ground is the driver.</b> The slope is gentle, so erosion stays modest, but exposed cropland between harvests lets the rain carry soil off. Cover-cropping and mulch are the lever.",
      R:"<b>Rainfall is the driver.</b> Heavy, erosive storms fall on otherwise workable ground. Contour the beds and keep them covered and the number drops fast.",
      K:"<b>The soil erodes easily on its own.</b> Organic matter and mulch are what hold it together here."
    };

    el.innerHTML='<div class="ed"><div class="ed-gauge">'+svg+'</div><div class="ed-factors">'
      +'<div class="ed-formula">RUSLE &#160; A = R &#215; K &#215; LS &#215; C<br><b>'+R.toLocaleString()+'</b> &#215; <b>'+K.toFixed(3)+'</b> &#215; <b>'+LS.toFixed(2)+'</b> &#215; <b>'+C.toFixed(2)+'</b> = <b>'+A+' t/ha/yr</b></div>'
      +barsHtml
      +'<div class="ed-verdict">'+(verdicts[driver.k]||"")+'</div>'
      +'</div></div>';
  }

  /* ---- V9 climograph: 12-month rainfall vs crop water need ---- */
  function renderClimograph(el){
    var months=(el.dataset.months||"").split(",").map(Number);
    var need=+(el.dataset.need||100), annual=+(el.dataset.annual||0);
    var labels=["J","F","M","A","M","J","J","A","S","O","N","D"];
    var maxV=Math.max.apply(null, months.concat([need])) * 1.12;
    var W=640, H=230, padL=34, padR=14, padT=14, padB=30;
    var plotW=W-padL-padR, plotH=H-padT-padB;
    var bw=plotW/12, gap=bw*0.22;
    var needY=padT+plotH*(1-need/maxV);
    var bars="", lbls="";
    var deficit=0;
    for(var i=0;i<12;i++){
      var v=months[i], h=plotH*(v/maxV), x=padL+i*bw+gap/2, y=padT+plotH-h;
      var dry=v<need; if(dry) deficit++;
      bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(bw-gap).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" fill="'+(dry?AMBER:BLUE)+'" opacity="'+(dry?0.95:0.8)+'"/>';
      bars+='<text x="'+(x+(bw-gap)/2).toFixed(1)+'" y="'+(y-4).toFixed(1)+'" text-anchor="middle" font-family="Courier Prime,monospace" font-size="8.5" fill="rgba(244,239,226,.55)">'+v+'</text>';
      lbls+='<text x="'+(padL+i*bw+bw/2).toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle" font-family="Courier Prime,monospace" font-size="10" fill="rgba(244,239,226,.5)">'+labels[i]+'</text>';
    }
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Monthly rainfall">'
      +bars
      +'<line x1="'+padL+'" y1="'+needY.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+needY.toFixed(1)+'" stroke="'+BONE+'" stroke-width="1.2" stroke-dasharray="5 4" opacity=".7"/>'
      +'<text x="'+(W-padR)+'" y="'+(needY-5).toFixed(1)+'" text-anchor="end" font-family="Courier Prime,monospace" font-size="9" fill="rgba(244,239,226,.6)">crop need ~'+need+'mm</text>'
      +'</svg>';
    el.innerHTML='<div class="cg">'+svg
      +'<div class="cg-foot"><span><b>'+annual.toLocaleString()+' mm</b> / yr</span>'
      +'<span><b style="color:'+AMBER+'">'+deficit+'</b> month'+(deficit===1?'':'s')+' below crop need</span>'
      +'<span class="cg-key"><i style="background:'+BLUE+'"></i>surplus <i style="background:'+AMBER+'"></i>deficit</span></div></div>';
  }

  /* ---- V4 USDA soil texture triangle ---- */
  function renderTexture(el){
    var sand=+el.dataset.sand, silt=+el.dataset.silt, clay=+el.dataset.clay, cls=el.dataset.texture||"";
    var W=300,H=272,m=34;
    var A=[m,H-m], B=[W-m,H-m], Cp=[W/2,m]; // sand(BL), silt(BR), clay(top)
    function P(s,si,c){ return [c*Cp[0]+s*A[0]+si*B[0], c*Cp[1]+s*A[1]+si*B[1]]; }
    function ln(p,q,o){ return '<line x1="'+p[0].toFixed(1)+'" y1="'+p[1].toFixed(1)+'" x2="'+q[0].toFixed(1)+'" y2="'+q[1].toFixed(1)+'" stroke="rgba(244,239,226,'+(o||.1)+')" stroke-width="1"/>'; }
    var grid="";
    for(var g=20; g<100; g+=20){ var f=g/100;
      grid+=ln(P(1-f,0,f),P(0,1-f,f));   // const clay
      grid+=ln(P(f,1-f,0),P(f,0,1-f));   // const sand
      grid+=ln(P(1-f,f,0),P(0,f,1-f));   // const silt
    }
    var tri=ln(A,B,.35)+ln(B,Cp,.35)+ln(Cp,A,.35);
    var pt=P(sand/100,silt/100,clay/100);
    var dot='<circle cx="'+pt[0].toFixed(1)+'" cy="'+pt[1].toFixed(1)+'" r="7" fill="'+ORANGE+'" stroke="#0c0c0c" stroke-width="2"/>';
    var lab='<text x="'+Cp[0]+'" y="'+(m-12)+'" text-anchor="middle" font-family="Courier Prime,monospace" font-size="11" fill="rgba(244,239,226,.7)">CLAY %</text>'
      +'<text x="'+(A[0]-6)+'" y="'+(H-m+20)+'" text-anchor="start" font-family="Courier Prime,monospace" font-size="11" fill="rgba(244,239,226,.7)">SAND</text>'
      +'<text x="'+(B[0]+6)+'" y="'+(H-m+20)+'" text-anchor="end" font-family="Courier Prime,monospace" font-size="11" fill="rgba(244,239,226,.7)">SILT</text>';
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Soil texture triangle">'+grid+tri+lab+dot+'</svg>';
    el.innerHTML='<div class="tri">'+svg+'<div class="tri-side"><div class="tt">'+cls+'</div>'
      +'<p>The topsoil plots here on the USDA triangle. A balanced '+cls+' holds water and nutrients well while still draining... the workhorse texture for almost everything in the catalog.</p>'
      +'<div class="chips"><span>Sand '+sand+'%</span><span>Silt '+silt+'%</span><span>Clay '+clay+'%</span></div></div></div>';
  }

  /* ---- V7 soil report card ---- */
  function meter(label,val,min,max,band,disp,status){
    function pct(v){return Math.max(0,Math.min(100,(v-min)/(max-min)*100));}
    var col=status==="good"?GREEN:status==="fair"?AMBER:RED;
    return '<div class="meter-row"><div class="m-head"><span class="m-label">'+label+'</span><span class="m-val" style="color:'+col+'">'+disp+'</span></div>'
      +'<div class="m-track"><span class="m-band" style="left:'+pct(band[0])+'%;width:'+(pct(band[1])-pct(band[0]))+'%"></span>'
      +'<span class="m-mark" style="left:calc('+pct(val)+'% - 1.5px);background:'+col+'"></span></div></div>';
  }
  function renderSoilCard(el){
    var ph=+el.dataset.ph, soc=+el.dataset.soc, cec=+el.dataset.cec, slope=+el.dataset.slope;
    el.innerHTML='<div class="soilcard">'
      +meter("pH (water)",ph,4,8,[6,7],ph.toFixed(1),ph<5.5?"low":ph<6?"fair":"good")
      +meter("Organic carbon",soc,0,8,[3,8],soc.toFixed(1)+"%",soc<2?"low":soc<4?"fair":"good")
      +meter("CEC &#183; nutrient holding",cec,0,40,[18,40],cec.toFixed(0),cec<12?"low":cec<20?"fair":"good")
      +meter("Slope",slope,0,15,[0,5],slope.toFixed(1)+"&#176;",slope<5?"good":slope<10?"fair":"low")
      +'<div class="sc-note">Green band = the agronomic sweet spot. A marker left of the band reads low... pH below 6 wants lime, organic carbon above 3% is rich.</div></div>';
  }

  /* ---- V15 crop-fit scorecard ---- */
  function renderCropFit(el){
    var crops=JSON.parse(el.dataset.crops||"[]"), note=el.dataset.note||"";
    var rows=crops.map(function(c){
      var s=c[1], col=s>=90?GREEN:s>=75?AMBER:"#b9892f";
      return '<div class="cf-row"><span class="cf-name">'+c[0]+'</span>'
        +'<span class="cf-bar"><span style="width:'+s+'%;background:'+col+'"></span></span>'
        +'<span class="cf-score">'+s+'</span></div>';
    }).join("");
    el.innerHTML='<div class="cropfit">'+rows+(note?'<div class="cf-note">'+note+'</div>':'')+'</div>';
  }

  /* ---- V19 the extraction joint ---- */
  function renderValueJoint(el){
    var farmer=+el.dataset.farmer, final=+el.dataset.final, item=el.dataset.item||"the final product", unit=el.dataset.unit||"$";
    var mult=Math.round(final/farmer), fpct=Math.max(0.7,farmer/final*100);
    function money(v){ return unit+(v<1?v.toFixed(2):v.toLocaleString()); }
    el.innerHTML='<div class="vj">'
      +'<div class="vj-bar"><span class="vj-farm" style="width:'+fpct+'%"></span><span class="vj-rest">captured between the farm gate and the shelf</span></div>'
      +'<div class="vj-scale"><span>grower keeps <b>'+money(farmer)+'</b></span><span>final price <b style="color:'+BONE+'">'+money(final)+'</b></span></div>'
      +'<div class="vj-note">The grower keeps about <b>'+(fpct<1?"1":Math.round(fpct))+'%</b> of '+item+'... the value multiplies roughly <b>'+mult+'&#215;</b> downstream. <b>SAKALA keeps the processing and brand margin inside the cooperative</b>, which is the whole point.</div></div>';
  }

  /* ---- V21 price-tier ladder ---- */
  function renderLadder(el){
    var tiers=JSON.parse(el.dataset.tiers||"[]"), unit=el.dataset.unit||"$/lb";
    var maxv=Math.max.apply(null,tiers.map(function(t){return t[2];}));
    var cols=[BLUE,"#5fa8c9",AMBER,GREEN];
    var steps=tiers.map(function(t,i){
      var h=Math.max(8,t[2]/maxv*150);
      var price=t[1]===t[2]?(unit.charAt(0)+t[1]):(unit.charAt(0)+t[1]+"-"+t[2]);
      return '<div class="lad-step"><div class="lad-price">'+price+'</div>'
        +'<div class="lad-bar" style="height:'+h+'px;background:'+cols[i%cols.length]+'"></div>'
        +'<div class="lad-name">'+t[0]+'</div></div>';
    }).join("");
    el.innerHTML='<div class="ladder">'+steps+'</div>';
  }

  /* ---- V28 cost ramp ---- */
  function renderCostRamp(el){
    var up=+el.dataset.up, opt=+el.dataset.opt, dream=+el.dataset.dream;
    var steps=[["Today",0,"running"],["Up to speed",up,"get it working"],["Optimized",opt,"value-capture"],["Dream",dream,"full estate"]];
    var cols=["rgba(244,239,226,.2)",GREEN,ORANGE,BLUE];
    var html=steps.map(function(s,i){
      var h=Math.max(6,s[1]/dream*155);
      var inc=i>0?("+$"+(s[1]-steps[i-1][1]).toLocaleString()):"";
      return '<div class="cr-step"><div class="cr-val">'+(s[1]?"$"+s[1].toLocaleString():"$0")+'</div>'
        +'<div class="cr-bar" style="height:'+h+'px;background:'+cols[i]+'"></div>'
        +'<div class="cr-name">'+s[0]+'</div><div class="cr-inc">'+(inc||s[2])+'</div></div>';
    }).join("");
    el.innerHTML='<div class="cramp">'+html+'</div>';
  }

  /* ---- V37 ownership ramp ---- */
  function renderOwnership(el){
    var W=620,H=200,padL=42,padR=20,padT=18,padB=34;
    var pw=W-padL-padR, ph=H-padT-padB, ymin=35, ymax=55;
    function X(mo){return padL+pw*mo/24;}
    function Y(o){return padT+ph*(1-(o-ymin)/(ymax-ymin));}
    var p0=[X(0),Y(40)], p1=[X(24),Y(51)];
    var area='M'+p0[0]+' '+Y(ymin)+' L'+p0[0]+' '+p0[1]+' L'+p1[0]+' '+p1[1]+' L'+p1[0]+' '+Y(ymin)+' Z';
    var gl="";
    [40,45,50].forEach(function(v){ gl+='<line x1="'+padL+'" y1="'+Y(v)+'" x2="'+(W-padR)+'" y2="'+Y(v)+'" stroke="rgba(244,239,226,.08)"/>'
      +'<text x="'+(padL-8)+'" y="'+(Y(v)+3)+'" text-anchor="end" font-family="Courier Prime,monospace" font-size="9" fill="rgba(244,239,226,.4)">'+v+'%</text>'; });
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Ownership ramp">'+gl
      +'<path d="'+area+'" fill="rgba(26,171,77,.18)"/>'
      +'<line x1="'+p0[0]+'" y1="'+p0[1]+'" x2="'+p1[0]+'" y2="'+p1[1]+'" stroke="'+GREEN+'" stroke-width="3"/>'
      +'<circle cx="'+p0[0]+'" cy="'+p0[1]+'" r="5" fill="'+GREEN+'"/><circle cx="'+p1[0]+'" cy="'+p1[1]+'" r="5" fill="'+GREEN+'"/>'
      +'<text x="'+p0[0]+'" y="'+(p0[1]-12)+'" text-anchor="start" font-family="Roboto Slab,serif" font-weight="800" font-size="15" fill="'+BONE+'">40%</text>'
      +'<text x="'+p1[0]+'" y="'+(p1[1]-12)+'" text-anchor="end" font-family="Roboto Slab,serif" font-weight="800" font-size="15" fill="'+GREEN+'">51%</text>'
      +'<text x="'+p0[0]+'" y="'+(H-12)+'" text-anchor="start" font-family="Courier Prime,monospace" font-size="10" fill="rgba(244,239,226,.5)">DAY ONE</text>'
      +'<text x="'+p1[0]+'" y="'+(H-12)+'" text-anchor="end" font-family="Courier Prime,monospace" font-size="10" fill="rgba(244,239,226,.5)">MONTH 24</text>'
      +'</svg>';
    el.innerHTML='<div class="own">'+svg+'<div class="own-cap">Every apprentice starts as a 40% co-owner of the cooperative and crosses into the majority by month 24.</div></div>';
  }

  /* ---- V35 youth strip ---- */
  function renderYouthStrip(el){
    var now=+el.dataset.now, cap=+el.dataset.cap, inc=+(el.dataset.inc||708), HH=4.5, MULT=2.3;
    var incNow=now*inc, reached=Math.round(now*HH), local=Math.round(incNow*MULT);
    function d(v){return v?"$"+v.toLocaleString():"&#8212;";}
    var cells=[
      ["<span>"+now+"</span> <small>&#8594; "+cap+"</small>","Youth (16+) now &#8594; capacity"],
      ["$"+inc,"Income / youth / yr"],
      [now?"$"+incNow.toLocaleString():"&#8212;","Youth income / yr"],
      [now?"~"+reached:"&#8212;","People reached &#183; households"],
      [now?"$"+local.toLocaleString():"&#8212;","Local activity &#183; 2.3&#215;"],
      ["40% <small>&#8594; 51%</small>","Youth co-ownership"]
    ];
    el.innerHTML='<div class="ystrip2">'+cells.map(function(c){
      return '<div class="yc"><div class="v">'+c[0]+'</div><div class="l">'+c[1]+'</div></div>';
    }).join("")+'</div>';
  }

  /* ---- V36 income multiplier flow ---- */
  function renderIncomeFlow(el){
    var now=+el.dataset.now, inc=+(el.dataset.inc||708), HH=4.5, MULT=2.3;
    var local=Math.round(inc*MULT);
    var steps=[["$59 / mo","wage, above the floor"],["$"+inc,"a year, per youth"],
      ["~"+HH+" people","a household supported"],["$"+local.toLocaleString(),"local activity &#183; 2.3&#215;"]];
    var row=steps.map(function(s,i){
      return '<div class="if-step"><div class="if-v">'+s[0]+'</div><div class="if-l">'+s[1]+'</div></div>'
        +(i<3?'<div class="if-arrow">&#8594;</div>':'');
    }).join("");
    var total=now
      ? 'With <b>'+now+' youth</b> working today, that is about <b>$'+(now*local).toLocaleString()+'</b> moving through the local economy this year, on top of the wages themselves.'
      : 'Once the cohort is funded, each youth drives about <b>$'+local.toLocaleString()+'</b> of local activity a year.';
    el.innerHTML='<div class="iflow"><div class="if-row">'+row+'</div><div class="if-total">'+total+'</div></div>';
  }

  /* ---- V33 the J-curve (tree-crop establishment cash flow) ---- */
  function renderJCurve(el){
    var bridge=+(el.dataset.bridge||25000);
    // illustrative cumulative cash position, scaled to the trough = -bridge
    var pts=[[0,0],[1,-0.45],[2,-0.82],[3,-1.0],[4,-0.74],[5,-0.2],[6,0.55]]; // fraction of bridge
    var W=640,H=240,padL=52,padR=18,padT=16,padB=34, pw=W-padL-padR, ph=H-padT-padB;
    var ymax=0.7, ymin=-1.08;
    function X(yr){return padL+pw*yr/6;}
    function Y(f){return padT+ph*(1-(f-ymin)/(ymax-ymin));}
    var zeroY=Y(0);
    var line="", area="M"+X(0)+" "+zeroY;
    pts.forEach(function(p,i){ var x=X(p[0]),y=Y(p[1]); line+=(i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1)+" "; area+=" L"+x.toFixed(1)+" "+y.toFixed(1); });
    area+=" L"+X(6)+" "+zeroY+" Z";
    var gl="";
    [0.5,0,-0.5,-1].forEach(function(f){ var v=Math.round(f*bridge); gl+='<line x1="'+padL+'" y1="'+Y(f)+'" x2="'+(W-padR)+'" y2="'+Y(f)+'" stroke="rgba(244,239,226,'+(f===0?.3:.08)+')"'+(f===0?'':'')+'/>'
      +'<text x="'+(padL-8)+'" y="'+(Y(f)+3)+'" text-anchor="end" font-family="Courier Prime,monospace" font-size="9" fill="rgba(244,239,226,.45)">'+(v>=0?'+':'')+'$'+Math.abs(v/1000)+'k</text>'; });
    var xl="";
    for(var yr=0;yr<=6;yr++){ xl+='<text x="'+X(yr)+'" y="'+(H-12)+'" text-anchor="middle" font-family="Courier Prime,monospace" font-size="9" fill="rgba(244,239,226,.5)">Y'+yr+'</text>'; }
    var trough=[X(3),Y(-1.0)], be=[X(5.4),zeroY];
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Tree-crop J-curve">'+gl+xl
      +'<path d="'+area+'" fill="rgba(220,20,60,.12)"/>'
      +'<path d="'+line+'" fill="none" stroke="'+GREEN+'" stroke-width="3"/>'
      +'<circle cx="'+trough[0]+'" cy="'+trough[1]+'" r="5" fill="'+RED+'"/>'
      +'<text x="'+(trough[0]+8)+'" y="'+(trough[1]+4)+'" font-family="Courier Prime,monospace" font-size="10" fill="'+RED+'">trough &#8722;$'+(bridge/1000)+'k &#183; the patient-capital hole</text>'
      +'<circle cx="'+be[0]+'" cy="'+be[1]+'" r="5" fill="'+GREEN+'"/>'
      +'<text x="'+be[0]+'" y="'+(be[1]-10)+'" text-anchor="middle" font-family="Courier Prime,monospace" font-size="10" fill="'+GREEN+'">break-even ~Y5</text>'
      +'</svg>';
    el.innerHTML='<div class="jc">'+svg+'<div class="jc-cap">Tree crops run underwater for three to five years before they pay. That gap... about $'+(bridge/1000)+'k of bridge... is grant and patient capital, not product-purchase money. Moringa and rabbits cover some of it as fast cash. Illustrative cash position.</div></div>';
  }

  /* ---- V76 soil-loss depletion clock ---- */
  function renderDepletion(el){
    var A=+el.dataset.a, bd=+(el.dataset.bd||1.35), depth=+(el.dataset.depth||25), ctlFrac=+(el.dataset.ctl||0.18);
    var tPerCm=bd*100*100*100/1000*100/100; // 1cm over 1ha at bd t/ha: bd(g/cm3)*1e8 cm2 *1cm /1e6 = bd*100 t... recompute
    // 1 cm depth over 1 ha = 1e8 cm2 * 1 cm = 1e8 cm3; mass = bd[g/cm3]*1e8 g = bd*1e8 g = bd*1e5 kg = bd*100 t
    tPerCm=bd*100;
    var cmYr=A/tPerCm, ctlCmYr=A*ctlFrac/tPerCm;
    var yrsNow=Math.round(depth/cmYr), yrsCtl=Math.round(depth/ctlCmYr);
    var scale=Math.max(yrsCtl,300);
    function bar(label,yrs,col){ var w=Math.min(100,yrs/scale*100);
      return '<div class="dep-row"><div class="dep-rl"><span>'+label+'</span><b>~'+yrs+' years</b></div>'
        +'<div class="dep-track"><span style="width:'+w.toFixed(0)+'%;background:'+col+'"></span></div></div>'; }
    el.innerHTML='<div class="dep"><div class="dep-head"><div class="dep-big">'+cmYr.toFixed(1)+' cm</div>'
      +'<div class="dep-sub">of topsoil lost per year at '+A+' t/ha</div></div>'
      +bar("Do nothing &#183; "+depth+"cm topsoil gone in",yrsNow,RED)
      +bar("With contour bunds + vetiver hedges",yrsCtl,GREEN)
      +'<div class="dep-note">At the current rate the productive topsoil is gone within a working lifetime. Contour structures and vetiver hedges cut soil loss by roughly '+Math.round((1-ctlFrac)*100)+'%, buying centuries instead of decades. This is why erosion control is the first build, before planting.</div></div>';
  }

  /* ---- V27 vetiver extraction-laundering callout ---- */
  function renderVetiverCall(el){
    el.innerHTML='<div class="vcall">'
      +'<div class="vc bad"><div class="n">170&#215;</div><div class="t">what vetiver oil sells for, versus what the grower gets for the grass</div></div>'
      +'<div class="vc mid"><div class="n">0.8%</div><div class="t">of Haiti&#39;s ~30,000 vetiver growers reached by the industry&#39;s flagship fair-trade program (250 of them)</div></div>'
      +'<div class="vc good"><div class="n">100%</div><div class="t">of SAKALA growers own a share of the still, so the oil margin stays on the hill</div></div>'
      +'</div><div class="jc-cap">The fragrance houses call it sustainability; the math calls it extraction laundering. Owning the distillation is the difference between a grower and a supplier.</div>';
  }

  /* ---- V8 the lime fix ---- */
  function renderLime(el){
    var ph=+el.dataset.ph, tgt=+(el.dataset.target||6.5);
    var W=620,H=96,padL=20,padR=20, pw=W-padL-padR;
    function X(p){return padL+pw*(p-4)/(8-4);}
    var bandX1=X(6),bandX2=X(7);
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="pH lime fix">'
      +'<rect x="'+bandX1+'" y="34" width="'+(bandX2-bandX1)+'" height="20" fill="rgba(26,171,77,.22)"/>'
      +'<line x1="'+padL+'" y1="44" x2="'+(W-padR)+'" y2="44" stroke="rgba(244,239,226,.2)" stroke-width="2"/>';
    [4,5,6,7,8].forEach(function(t){ svg+='<text x="'+X(t)+'" y="74" text-anchor="middle" font-family="Courier Prime,monospace" font-size="10" fill="rgba(244,239,226,.45)">'+t+'</text>'
      +'<line x1="'+X(t)+'" y1="40" x2="'+X(t)+'" y2="48" stroke="rgba(244,239,226,.25)"/>'; });
    svg+='<circle cx="'+X(ph)+'" cy="44" r="8" fill="'+AMBER+'"/><text x="'+X(ph)+'" y="26" text-anchor="middle" font-family="Roboto Slab,serif" font-weight="800" font-size="13" fill="'+AMBER+'">'+ph+'</text>'
      +'<circle cx="'+X(tgt)+'" cy="44" r="8" fill="'+GREEN+'"/><text x="'+X(tgt)+'" y="26" text-anchor="middle" font-family="Roboto Slab,serif" font-weight="800" font-size="13" fill="'+GREEN+'">'+tgt+'</text>'
      +'<path d="M'+(X(ph)+9)+' 44 L'+(X(tgt)-11)+' 44" stroke="'+GREEN+'" stroke-width="2" marker-end="url(#ah)"/>'
      +'<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="'+GREEN+'"/></marker></defs>'
      +'</svg>';
    el.innerHTML='<div class="lime">'+svg+'<div class="lime-note">The soil sits at pH '+ph+', too acidic for the crops to take up nutrients well. About 2 to 3 tonnes per hectare of agricultural lime lifts it toward the green band... <b>that one cheap input unlocks moringa and raises the yield of everything else on the site.</b></div></div>';
  }

  /* ---- V42 Haiti locator map (CODE/SVG, baked outline) ---- */
  function renderHaitiMap(el){
    var g=window.HAITI_GEO; if(!g){ el.innerHTML='<div class="hmap"><p style="font-family:Lora,serif;color:rgba(244,239,226,.5)">map data not loaded</p></div>'; return; }
    var only=el.dataset.only||""; // "nord" | "pestel" | "" (both)
    var dots=g.dots.map(function(d,i){
      var col=i===3?ORANGE:(i===2?BLUE:GREEN);
      return '<circle cx="'+d[0]+'" cy="'+d[1]+'" r="4.5" fill="'+col+'" stroke="#0c0c0c" stroke-width="1.5"/>';
    }).join("");
    function pin(p,col,label,sub,anchor){
      var lx=anchor==="end"?p[0]-12:p[0]+12, ty=anchor==="end"?"end":"start";
      return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="8" fill="'+col+'" stroke="#0c0c0c" stroke-width="2"/>'
        +'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="15" fill="none" stroke="'+col+'" stroke-width="1.5" opacity=".5"/>'
        +'<text x="'+lx+'" y="'+(p[1]-2)+'" text-anchor="'+ty+'" font-family="Roboto Slab,serif" font-weight="800" font-size="16" fill="'+BONE+'">'+label+'</text>'
        +'<text x="'+lx+'" y="'+(p[1]+14)+'" text-anchor="'+ty+'" font-family="Courier Prime,monospace" font-size="10.5" letter-spacing=".5" fill="rgba(244,239,226,.6)">'+sub+'</text>';
    }
    var markers="";
    if(only!=="pestel") markers+=pin(g.nord,GREEN,"Nord","3 sites &#183; cassava + aromatics","end");
    if(only!=="nord")  markers+=pin(g.pestel,ORANGE,"Pestel","Grand&#39;Anse &#183; agroforestry","start");
    var svg='<svg viewBox="0 0 '+g.W+' '+g.H+'" role="img" aria-label="Map of the SAKALA sites in Haiti">'
      +'<path d="'+g.path+'" fill="rgba(244,239,226,.07)" stroke="rgba(244,239,226,.35)" stroke-width="1" stroke-linejoin="round"/>'
      +dots+markers+'</svg>';
    el.innerHTML='<div class="hmap">'+svg+'</div>';
  }

  /* ---- V24 diaspora ranking (CODE bar; the demand geography) ---- */
  function renderDiaspora(el){
    var rows=JSON.parse(el.dataset.rows||"[]"); // [[state, n, hub?],...]
    var max=Math.max.apply(null,rows.map(function(r){return r[1];}));
    var total=rows.reduce(function(a,r){return a+r[1];},0);
    var bars=rows.map(function(r){
      var w=Math.max(2,r[1]/max*100), hub=r[2];
      return '<div class="dia-row"><span class="dia-name">'+r[0]+(hub?' <i>&#9733;</i>':'')+'</span>'
        +'<span class="dia-bar"><span style="width:'+w.toFixed(1)+'%;background:'+(hub?ORANGE:"#7a5a3a")+'"></span></span>'
        +'<span class="dia-val">'+(r[1]>=1000?Math.round(r[1]/1000)+'k':r[1])+'</span></div>';
    }).join("");
    el.innerHTML='<div class="dia">'+bars
      +'<div class="dia-note"><i>&#9733;</i> the three hub states for the Harvest Box. About <b>'+(total/1e6).toFixed(1)+' million</b> people of Haitian ancestry across the US... the demand side of the chain. <span style="opacity:.6">U.S. Census ACS.</span></div></div>';
  }

  /* ---- V16 EcoCrop suitability fingerprint ---- */
  function renderFingerprint(el){
    var lead=el.dataset.lead||"", note=el.dataset.note||"";
    var axes=JSON.parse(el.dataset.axes||"[]"); // {label,unit,sMin,sMax,absMin,absMax,optMin,optMax,val}
    function pct(v,a){return Math.max(0,Math.min(100,(v-a.sMin)/(a.sMax-a.sMin)*100));}
    var rows=axes.map(function(a){
      var inOpt=a.val>=a.optMin&&a.val<=a.optMax, inAbs=a.val>=a.absMin&&a.val<=a.absMax;
      var col=inOpt?GREEN:inAbs?AMBER:RED;
      var aL=pct(a.absMin,a), aW=pct(a.absMax,a)-aL, oL=pct(a.optMin,a), oW=pct(a.optMax,a)-oL;
      return '<div class="fp-row"><div class="fp-hd"><span>'+a.label+'</span><span>site <b style="color:'+col+'">'+a.val+a.unit+'</b></span></div>'
        +'<div class="fp-track"><span class="fp-abs" style="left:'+aL+'%;width:'+aW+'%"></span>'
        +'<span class="fp-opt" style="left:'+oL+'%;width:'+oW+'%"></span>'
        +'<span class="fp-mark" style="left:calc('+pct(a.val,a)+'% - 1.5px);background:'+col+'"></span></div></div>';
    }).join("");
    el.innerHTML='<div class="fp"><div class="fp-lead">Best-fit crop: <span>'+lead+'</span></div>'+rows
      +'<div class="fp-note">Grey band = where '+lead+' grows at all; green = its sweet spot; the marker is this site. '+note+'</div></div>';
  }

  /* ---- V20 Theta inversion (conventional vs SAKALA) ---- */
  function renderInversion(el){
    var conv=+el.dataset.conv, coop=+el.dataset.coop, item=el.dataset.item||"the final price";
    function seg(w,bg,txt){return '<div class="inv-seg" style="width:'+w+'%;background:'+bg+'">'+(w>13?txt:'')+'</div>';}
    el.innerHTML='<div class="inv">'
      +'<div class="inv-row"><div class="inv-lab">Conventional chain</div><div class="inv-bar">'
        +seg(Math.max(3,conv),RED,'farmer '+conv+'%')
        +seg(100-Math.max(3,conv),'rgba(220,20,60,.28)','captured downstream')+'</div></div>'
      +'<div class="inv-row"><div class="inv-lab">The SAKALA model</div><div class="inv-bar">'
        +seg(coop,GREEN,'cooperative '+coop+'%')
        +seg(100-coop,'rgba(244,239,226,.12)','US freight + retail')+'</div></div>'
      +'<div class="inv-note">Conventionally the grower keeps about '+conv+'% of '+item+'. By owning the growing, processing, and brand, the cooperative keeps roughly <b>'+coop+'%</b> on the Haiti side... the rest is genuine US distribution. <span style="opacity:.55">A model of the design, not a measured split.</span></div></div>';
  }

  /* ---- V29 itemized cost table (the procurement list) ---- */
  function renderCostTable(el){
    var rows=JSON.parse(el.dataset.rows||"[]"); // [[label, amount, tag]]
    var label=el.dataset.label||"Up to speed";
    var TAG={SUPPLY:["#23416f","#9bbce0"],FAB:["#15803d","#8fe0ad"],IMPORT:["#7e6018","#e6cd86"],SERVICE:["#3f3f46","#b6b6c0"],PATIENT:["#7a1420","#ec9aa3"]};
    var tot=rows.reduce(function(a,r){return a+r[1];},0);
    var trs=rows.map(function(r){
      var t=TAG[r[2]]||TAG.SERVICE;
      return '<tr><td>'+r[0]+'</td><td><span class="tag" style="background:'+t[0]+';color:'+t[1]+'">'+r[2]+'</span></td><td class="amt">$'+r[1].toLocaleString()+'</td></tr>';
    }).join("");
    el.innerHTML='<div class="ctab"><table>'+trs
      +'<tr class="tot"><td>'+label+'</td><td></td><td class="amt">$'+tot.toLocaleString()+'</td></tr></table>'
      +'<div class="ct-key"><b style="color:#9bbce0">SUPPLY</b> consumables &#183; <b style="color:#8fe0ad">FAB</b> build locally &#183; <b style="color:#e6cd86">IMPORT</b> procure / write-off donation &#183; <b style="color:#b6b6c0">SERVICE</b> operating &#183; <b style="color:#ec9aa3">PATIENT</b> grant capital</div></div>';
  }

  /* ---- V51 crop / harvest calendar ---- */
  function renderCalendar(el){
    var rows=JSON.parse(el.dataset.rows||"[]"); // [{crop, plant:[], harv:[], grow:[]}]
    var M=["J","F","M","A","M","J","J","A","S","O","N","D"];
    var head='<tr><th></th>'+M.map(function(m){return '<th>'+m+'</th>';}).join("")+'</tr>';
    var body=rows.map(function(r){
      var cells="";
      for(var i=1;i<=12;i++){
        var c=(r.harv&&r.harv.indexOf(i)>=0)?'harv':(r.plant&&r.plant.indexOf(i)>=0)?'plant':(r.grow&&r.grow.indexOf(i)>=0)?'grow':'';
        cells+='<td class="cell"><div class="blk '+c+'"></div></td>';
      }
      return '<tr><td class="crop">'+r.crop+'</td>'+cells+'</tr>';
    }).join("");
    el.innerHTML='<div class="cal"><table>'+head+body+'</table>'
      +'<div class="cal-key"><i style="background:'+AMBER+'"></i>plant<i style="background:rgba(244,239,226,.13)"></i>grow<i style="background:'+GREEN+'"></i>harvest'
      +(el.dataset.note?' &#183; '+el.dataset.note:'')+'</div></div>';
  }

  /* ---- V52 fast-cash ladder ---- */
  function renderFastCash(el){
    var rows=JSON.parse(el.dataset.rows||"[]"); // [[crop, months]]
    var cap=+(el.dataset.cap||24);
    var bars=rows.map(function(r){
      var m=r[1], over=m>cap, col=m<=9?GREEN:m<=15?AMBER:RED;
      var disp=over?(Math.round(m/12)+"+ yrs"):(m+" mo");
      return '<div class="fc-row"><span class="fc-name">'+r[0]+'</span>'
        +'<span class="fc-bar"><span style="width:'+Math.min(100,m/cap*100)+'%;background:'+col+'"></span></span>'
        +'<span class="fc-val">'+disp+'</span></div>';
    }).join("");
    el.innerHTML='<div class="fc">'+bars+(el.dataset.note?'<div class="fc-note">'+el.dataset.note+'</div>':'')+'</div>';
  }

  /* ---- generic stacked bar (V22 COGS, V30 funding split) ---- */
  function renderStackBar(el){
    var segs=JSON.parse(el.dataset.segs||"[]"); // [[label, value, color, disp]]
    var total=segs.reduce(function(a,s){return a+s[1];},0);
    var bar=segs.map(function(s){var w=s[1]/total*100;return '<div class="seg" style="width:'+w+'%;background:'+s[2]+'">'+(w>12?s[0]:'')+'</div>';}).join("");
    var leg=segs.map(function(s){return '<span><i style="background:'+s[2]+'"></i>'+s[0]+(s[3]?' '+s[3]:'')+'</span>';}).join("");
    el.innerHTML='<div class="sbox"><div class="sbar">'+bar+'</div><div class="sleg">'+leg+'</div>'
      +(el.dataset.note?'<div class="fc-note">'+el.dataset.note+'</div>':'')+'</div>';
  }

  /* ---- V32 break-even ---- */
  function renderBreakeven(el){
    var be=+(el.dataset.be||44), unit=el.dataset.unit||"units";
    var xmax=Math.round(be*2.2);
    var W=620,H=210,padL=20,padR=18,padT=18,padB=34,pw=W-padL-padR,ph=H-padT-padB;
    var ymin=-be, ymax=xmax-be;
    function X(n){return padL+pw*n/xmax;}
    function Y(v){return padT+ph*(1-(v-ymin)/(ymax-ymin));}
    var zeroY=Y(0), p0=[X(0),Y(-be)], p1=[X(xmax),Y(xmax-be)], bp=[X(be),zeroY];
    var areaLoss='M'+p0[0]+' '+zeroY+' L'+p0[0]+' '+p0[1]+' L'+bp[0]+' '+zeroY+' Z';
    var areaProf='M'+bp[0]+' '+zeroY+' L'+p1[0]+' '+p1[1]+' L'+p1[0]+' '+zeroY+' Z';
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Break-even">'
      +'<path d="'+areaLoss+'" fill="rgba(220,20,60,.12)"/>'
      +'<path d="'+areaProf+'" fill="rgba(26,171,77,.14)"/>'
      +'<line x1="'+padL+'" y1="'+zeroY+'" x2="'+(W-padR)+'" y2="'+zeroY+'" stroke="rgba(244,239,226,.3)"/>'
      +'<line x1="'+p0[0]+'" y1="'+p0[1]+'" x2="'+p1[0]+'" y2="'+p1[1]+'" stroke="'+GREEN+'" stroke-width="3"/>'
      +'<circle cx="'+bp[0]+'" cy="'+zeroY+'" r="6" fill="'+ORANGE+'" stroke="#0c0c0c" stroke-width="2"/>'
      +'<text x="'+bp[0]+'" y="'+(zeroY-12)+'" text-anchor="middle" font-family="Roboto Slab,serif" font-weight="800" font-size="14" fill="'+ORANGE+'">~'+be+'</text>'
      +'<text x="'+bp[0]+'" y="'+(H-12)+'" text-anchor="middle" font-family="Courier Prime,monospace" font-size="10" fill="rgba(244,239,226,.6)">break-even</text>'
      +'<text x="'+(padL+4)+'" y="'+(p0[1]+4)+'" font-family="Courier Prime,monospace" font-size="10" fill="#e08a8a">loss</text>'
      +'<text x="'+(W-padR-4)+'" y="'+(p1[1]+12)+'" text-anchor="end" font-family="Courier Prime,monospace" font-size="10" fill="#8fe0ad">profit</text>'
      +'</svg>';
    el.innerHTML='<div class="be">'+svg+'<div class="be-cap">'+(el.dataset.note||('About '+be+' '+unit+' and the line pays for itself, then compounds.'))+'</div></div>';
  }

  /* ---- V63 cost-confidence ranges ---- */
  function renderConfidence(el){
    var rows=JSON.parse(el.dataset.rows||"[]"); // [[item, low, high, quote]]
    var max=Math.max.apply(null,rows.map(function(r){return r[2];}))*1.05;
    var bars=rows.map(function(r){
      var q=r[3], col=q?ORANGE:"#5fa8c9";
      var L=r[1]/max*100, W2=Math.max(2,(r[2]-r[1])/max*100);
      var disp=r[1]===r[2]?("$"+r[1].toLocaleString()):("$"+r[1].toLocaleString()+"-"+r[2].toLocaleString());
      return '<div class="cf2-row"><div class="cf2-hd"><span>'+r[0]+(q?' <span class="q">&#9888; needs quote</span>':'')+'</span><b>'+disp+'</b></div>'
        +'<div class="cf2-track"><span class="cf2-rng" style="left:'+L+'%;width:'+W2+'%;background:'+col+(q?';background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.18),rgba(255,255,255,.18) 4px,transparent 4px,transparent 8px)':'')+'"></span></div></div>';
    }).join("");
    el.innerHTML='<div class="conf">'+bars+(el.dataset.note?'<div class="conf-note">'+el.dataset.note+'</div>':'')+'</div>';
  }

  /* ---- V50 the remedy is the lawsuit ---- */
  function renderRemedy(el){
    var pairs=JSON.parse(el.dataset.pairs||"[]"); // [[extraction, remedy]]
    var cells='<div class="rem-h bad">The extraction the lawsuit targets</div><div class="rem-h good">The remedy this operation is</div>';
    pairs.forEach(function(p){ cells+='<div class="rem-cell bad">'+p[0]+'</div><div class="rem-cell good">'+p[1]+'</div>'; });
    el.innerHTML='<div class="rem">'+cells+'</div>'+(el.dataset.note?'<div class="rem-note">'+el.dataset.note+'</div>':'');
  }

  /* ---- V56 "what your $X buys" receipt ---- */
  function renderReceipt(el){
    var total=+(el.dataset.total||120);
    var items=JSON.parse(el.dataset.items||"[]"), outs=JSON.parse(el.dataset.outs||"[]");
    var rows=items.map(function(it){return '<div class="rcpt-row"><span>'+it[0]+'</span><b>$'+it[1]+'</b></div>';}).join("");
    var os=outs.map(function(o){return '<div class="rcpt-o"><span class="ov">'+o[0]+'</span><span class="ol">'+o[1]+'</span></div>';}).join("");
    el.innerHTML='<div class="rcpt"><div class="rcpt-h">Your $'+total+' box &#183; where it goes</div>'+rows
      +'<div class="rcpt-tot"><span>Total</span><span>$'+total+'</span></div>'
      +'<div class="rcpt-out">'+os+'</div>'
      +(el.dataset.note?'<div class="rcpt-note">'+el.dataset.note+'</div>':'')+'</div>';
  }

  var REGISTRY={
    "erosion-dial":renderErosionDial, "climograph":renderClimograph,
    "texture":renderTexture, "soil-card":renderSoilCard, "crop-fit":renderCropFit,
    "value-joint":renderValueJoint, "price-ladder":renderLadder,
    "cost-ramp":renderCostRamp, "ownership":renderOwnership, "youth-strip":renderYouthStrip,
    "income-flow":renderIncomeFlow, "jcurve":renderJCurve, "depletion":renderDepletion,
    "vetiver-call":renderVetiverCall, "lime-fix":renderLime,
    "haiti-map":renderHaitiMap, "diaspora":renderDiaspora,
    "fingerprint":renderFingerprint, "inversion":renderInversion, "cost-table":renderCostTable,
    "calendar":renderCalendar, "fast-cash":renderFastCash, "stack-bar":renderStackBar,
    "breakeven":renderBreakeven, "confidence":renderConfidence, "remedy":renderRemedy,
    "receipt":renderReceipt
  };

  function renderAll(root){
    (root||document).querySelectorAll("[data-chart]").forEach(function(el){
      if(el.dataset.rendered) return;
      var fn=REGISTRY[el.dataset.chart];
      if(fn){ try{ fn(el); el.dataset.rendered="1"; }catch(e){ console.error("chart",el.dataset.chart,e); } }
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){renderAll();});
  else renderAll();
  window.BARSScharts={render:renderAll, REGISTRY:REGISTRY};
})();
