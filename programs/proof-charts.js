// The Proof — plain-language charts. Self-contained (does not depend on charts.js).
// Palette matches portfolio.css: orange #E86A1F, forest #1F5232, green #7BAE7F, amber #C8881A, ink #141414.
(function(){
  const ORANGE='#E86A1F', FOREST='#1F5232', GREEN='#7BAE7F', AMBER='#C8881A',
        INK='#141414', RUST='#8B2E0A', MUTED='#9a9088', PARCH='#F4EFE2', GRID='#cdbfa0';
  const DARKGRID='rgba(244,239,226,0.18)';
  Chart.defaults.font.family="'Lora',Georgia,serif";
  Chart.defaults.font.size=12;
  const base={animation:false, responsive:true, maintainAspectRatio:true};

  // 1. HOW MUCH STAYS AT THE TOP — 34 cases (light section: dark text)
  (function(){
    const el=document.getElementById('cCapture'); if(!el) return;
    const cases=[
      ['Liberia ships',99],['Hawaii land',95],['Maryland',95],['Philly swaps',92],
      ['Epstein banks',92],['Private prisons',92],['Port Arthur',90],['Haiti oligarchs',88],
      ['Gary, Indiana',87],['US highways',87],['Congo rubber',87],['Haiti 1825 debt',86],
      ['Pittsburgh steel',86],['British India',85],['Convict leasing',85],['Algeria',85],
      ['Morocco',85],['Congo',80],['2008 bailout',80],['Tunisia',78],
      ['West Africa',78],['Insulin',71],['Ireland famine',69],['Puerto Rico debt',55],
      ['Haiti TPS (crisis)',45],['Subprime crisis',45],['Ohio foreclosures',37]
    ];
    new Chart(el,{type:'bar',
      data:{labels:cases.map(c=>c[0]),
        datasets:[{data:cases.map(c=>c[1]),
          backgroundColor:cases.map(c=>c[1]>=69?(c[1]>=92?ORANGE:FOREST):RUST),borderWidth:0}]},
      options:Object.assign({},base,{
        plugins:{legend:{display:false},
          tooltip:{callbacks:{label:c=>c.raw+'% kept at the top'}}},
        scales:{
          y:{min:0,max:100,ticks:{color:INK,callback:v=>v+'%'},grid:{color:GRID},
             title:{display:true,text:'kept at the top',color:INK}},
          x:{ticks:{color:INK,maxRotation:80,minRotation:80,font:{size:8}},grid:{display:false}}
        }})
    });
  })();

  // 2. SHARE THAT REACHES THE COMMUNITY (dark forest section: light text)
  (function(){
    const el=document.getElementById('cReach'); if(!el) return;
    new Chart(el,{type:'bar',
      data:{labels:['Haiti aid (2010)','Typical US aid','Cash handouts','THIS MODEL'],
        datasets:[
          {label:'Reaches the community',data:[7,12,88,80],backgroundColor:GREEN,stack:'s'},
          {label:'Skimmed off the top',data:[93,88,12,20],backgroundColor:'#6b5d3f',stack:'s'}
        ]},
      options:Object.assign({},base,{indexAxis:'y',
        plugins:{legend:{position:'bottom',labels:{color:PARCH,boxWidth:12,font:{size:11}}},
          tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.raw+'%'}}},
        scales:{x:{stacked:true,max:100,ticks:{color:PARCH,callback:v=>v+'%'},grid:{color:DARKGRID}},
          y:{stacked:true,ticks:{color:PARCH,font:{weight:'700'}},grid:{display:false}}}})
    });
  })();

  // 3. THE 40/40/20 SPLIT (light section: dark text)
  (function(){
    const el=document.getElementById('cSplit'); if(!el) return;
    new Chart(el,{type:'doughnut',
      data:{labels:['Gold the community owns (40%)','Wages to the youth (40%)','Reinvested to grow (20%)'],
        datasets:[{data:[40,40,20],backgroundColor:[AMBER,FOREST,ORANGE],borderWidth:0}]},
      options:Object.assign({},base,{cutout:'56%',
        plugins:{legend:{position:'bottom',labels:{color:INK,boxWidth:12,font:{size:11},padding:9}},
          tooltip:{callbacks:{label:c=>c.label.replace(/ \(\d+%\)/,'')+': '+c.raw+'%'}}}})
    });
  })();

  // 4. WAGE vs ALTERNATIVES (light section: dark text)
  (function(){
    const el=document.getElementById('cWage'); if(!el) return;
    const L=['Yr 1','Yr 2','Yr 3','Yr 4','Yr 5','Yr 6','Yr 7','Yr 8','Yr 9','Yr 10'];
    new Chart(el,{type:'line',
      data:{labels:L,datasets:[
        {label:'Our worker (entry)',data:[9.60,10.20,11.00,11.80,12.50,13.20,13.90,14.60,15.20,15.80],borderColor:FOREST,backgroundColor:'rgba(31,82,50,0.10)',fill:true,tension:0.3,pointRadius:2,borderWidth:2.5},
        {label:'Our worker (top level)',data:[14.40,15.60,17.00,18.20,19.40,20.80,22.00,23.20,24.40,25.00],borderColor:AMBER,tension:0.3,pointRadius:2,borderWidth:2},
        {label:'Gang pay',data:[5.5,5.7,5.9,6.1,6.3,6.5,6.7,6.9,7.1,7.3],borderColor:RUST,borderDash:[5,4],tension:0.2,pointRadius:0,borderWidth:1.5},
        {label:'Haiti minimum wage',data:[4.5,4.5,4.8,4.8,5.0,5.2,5.4,5.6,5.8,6.0],borderColor:MUTED,borderDash:[3,3],tension:0.1,pointRadius:0,borderWidth:1.5}
      ]},
      options:Object.assign({},base,{
        plugins:{legend:{position:'bottom',labels:{color:INK,boxWidth:12,font:{size:10}}}},
        scales:{y:{ticks:{color:INK,callback:v=>'$'+v.toFixed(0)},grid:{color:GRID},title:{display:true,text:'per day',color:INK}},
          x:{ticks:{color:INK},grid:{display:false}}}})
    });
  })();

  // 5. COST TO SUSTAIN 10 YEARS — aid bill vs one-time (dark section: light text)
  (function(){
    const el=document.getElementById('cSustain'); if(!el) return;
    const L=['Yr 1','Yr 2','Yr 3','Yr 4','Yr 5','Yr 6','Yr 7','Yr 8','Yr 9','Yr 10'];
    new Chart(el,{type:'line',
      data:{labels:L,datasets:[
        {label:'Regular aid (a bill every year)',data:[1,2,3,4,5,6,7,8,9,10],borderColor:ORANGE,backgroundColor:'rgba(232,106,31,0.12)',fill:true,tension:0,pointRadius:2,borderWidth:2.5},
        {label:'This model (paid once)',data:[1,1,1,1,1,1,1,1,1,1],borderColor:GREEN,backgroundColor:'rgba(123,174,127,0.15)',fill:true,tension:0,pointRadius:2,borderWidth:2.5}
      ]},
      options:Object.assign({},base,{
        plugins:{legend:{position:'bottom',labels:{color:PARCH,boxWidth:12,font:{size:10}}},
          tooltip:{callbacks:{label:c=>c.dataset.label+': $'+c.raw}}},
        scales:{y:{ticks:{color:PARCH,callback:v=>'$'+v},grid:{color:DARKGRID},title:{display:true,text:'total cost per $1/yr of work',color:PARCH}},
          x:{ticks:{color:PARCH},grid:{display:false}}}})
    });
  })();

  // 6. SHARE STAYING WITH COMMUNITY OVER TIME (dark section: light text) — the uplifting flip
  (function(){
    const el=document.getElementById('cShare'); if(!el) return;
    const L=['2026','2027','2028','2029','2030','2031','2032','2033','2034','2035','2036'];
    new Chart(el,{type:'line',
      data:{labels:L,datasets:[
        {label:'Our communities',data:[15,28,38,48,56,64,70,74,77,79,80],borderColor:GREEN,backgroundColor:'rgba(123,174,127,0.15)',fill:true,tension:0.4,pointRadius:3,borderWidth:2.5},
        {label:'Haiti economy overall',data:[15,15,15,16,17,18,19,20,21,22,23],borderColor:ORANGE,borderDash:[6,3],tension:0.1,pointRadius:0,borderWidth:1.5},
        {label:'The aid system',data:[22,22,22,23,23,24,24,25,25,26,26],borderColor:MUTED,borderDash:[3,3],tension:0.1,pointRadius:0,borderWidth:1.5}
      ]},
      options:Object.assign({},base,{
        plugins:{legend:{position:'bottom',labels:{color:PARCH,boxWidth:12,font:{size:10}}},
          tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.raw+'% stays local'}}},
        scales:{y:{min:0,max:90,ticks:{color:PARCH,callback:v=>v+'%'},grid:{color:DARKGRID}},
          x:{ticks:{color:PARCH},grid:{display:false}}}})
    });
  })();

  // 7. GOLD SAVINGS GROWING (light section: dark text)
  (function(){
    const el=document.getElementById('cGold'); if(!el) return;
    const L=['Yr 1','Yr 2','Yr 3','Yr 4','Yr 5'];
    new Chart(el,{
      data:{labels:L,datasets:[
        {type:'bar',label:'Added that year',data:[34680,80000,130000,200000,300000],backgroundColor:AMBER},
        {type:'line',label:'Total gold savings',data:[34680,114680,244680,444680,744680],borderColor:FOREST,backgroundColor:'transparent',tension:0.3,pointRadius:4,borderWidth:2.5}
      ]},
      options:Object.assign({},base,{
        plugins:{legend:{position:'bottom',labels:{color:INK,boxWidth:12,font:{size:10}}},
          tooltip:{callbacks:{label:c=>c.dataset.label+': $'+c.raw.toLocaleString()}}},
        scales:{y:{ticks:{color:INK,callback:v=>'$'+(v>=1000?Math.round(v/1000)+'K':v)},grid:{color:GRID}},
          x:{ticks:{color:INK},grid:{display:false}}}})
    });
  })();
})();
