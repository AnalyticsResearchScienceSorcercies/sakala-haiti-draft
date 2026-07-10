
// ── CHART DEFAULTS ──
Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.color = '#5A5248';

const ORANGE = '#D4500A';
const AMBER  = '#C8881A';
const FOREST = '#1E4030';
const FOREST2= '#2A5A42';
const CREAM  = '#EDE5D0';
const INK    = '#1A1A1A';
const RUST   = '#8B2E0A';
const MID    = '#9A9088';

// ── CHART 1: HARVEST BOX Y1-Y10 ──
(function(){
  const el = document.getElementById('chartHB'); if(!el) return; const ctx = el.getContext('2d');
  const labels = ['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','Y10'];
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Conservative', data: [502,900,1680,2700,5160,7800,11400,16200,21000,27000], borderColor: MID, backgroundColor: 'transparent', tension: 0.3, pointRadius: 3 },
        { label: 'Base (Scenario B)', data: [835,1500,2800,4500,8600,13000,19000,27000,35000,45000], borderColor: ORANGE, backgroundColor: 'rgba(212,80,10,0.1)', fill: true, tension: 0.3, pointRadius: 4, borderWidth: 2.5 },
        { label: 'Optimistic', data: [1100,2200,4200,7000,12000,19000,28000,40000,54000,70000], borderColor: AMBER, backgroundColor: 'transparent', borderDash: [6,3], tension: 0.3, pointRadius: 3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
      scales: {
        y: { ticks: { callback: v => '$'+(v>=1000?Math.round(v/1000)+'K':v), font: { size: 9 } }, grid: { color: '#DDD3B8' } },
        x: { ticks: { font: { size: 9 } }, grid: { color: '#DDD3B8' } }
      }
    }
  });
})();

// ── CHART 2: CASSAVA WATERFALL ──
(function(){
  const el = document.getElementById('chartCassava'); if(!el) return; const ctx = el.getContext('2d');
  const stages = ['Farm Gate','Processing +\nPackaging','Labels +\nCompliance','Ocean Freight\n(LCL)','US Customs','ShipBob\nLanded','ShipBob\nFulfillment','Total\nCOGS'];
  const vals = [1.50, 3.50, 2.00, 3.00, 1.10, 1.10, 19.00, 31.20];
  const colors = [FOREST, FOREST, FOREST, FOREST, FOREST, FOREST, ORANGE, RUST];
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stages,
      datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '$' + c.raw.toFixed(2) + '/unit' } } },
      scales: {
        x: { ticks: { callback: v => '$'+v.toFixed(2), font: { size: 9 } }, grid: { color: '#DDD3B8' }, max: 33 },
        y: { ticks: { font: { size: 9 } }, grid: { display: false } }
      }
    }
  });
})();

// ── CHART 3: RABBIT REVENUE BY TIER ──
(function(){
  const el = document.getElementById('chartRabbit'); if(!el) return; const ctx = el.getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Year 1','Year 2','Year 3'],
      datasets: [
        { label: 'Local Commodity ($4-8/lb)', data: [11382, 16800, 21600], backgroundColor: MID },
        { label: 'TapTap Diaspora Jerky ($10-12/bag)', data: [3240, 9600, 19200], backgroundColor: FOREST },
        { label: 'Label Lakou Fine Dining ($30-60/lb)', data: [1638, 8400, 24000], backgroundColor: AMBER }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 9 } }, grid: { display: false } },
        y: { stacked: true, ticks: { callback: v => '$'+(v>=1000?Math.round(v/1000)+'K':v), font: { size: 9 } }, grid: { color: '#DDD3B8' } }
      }
    }
  });
})();

// ── CHART 4: TRASH REVENUE STREAMS Y1-Y3 ──
(function(){
  const el = document.getElementById('chartTrash'); if(!el) return; const ctx = el.getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Year 1','Year 2','Year 3'],
      datasets: [
        { label: 'Tipping Fees (Municipal)', data: [28800, 52000, 84000], backgroundColor: FOREST },
        { label: 'Household Subscriptions', data: [21600, 38400, 60000], backgroundColor: ORANGE },
        { label: 'Biochar Feedstock', data: [10800, 18000, 28800], backgroundColor: AMBER }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 9 } }, grid: { display: false } },
        y: { stacked: true, ticks: { callback: v => '$'+(v>=1000?Math.round(v/1000)+'K':v), font: { size: 9 } }, grid: { color: '#DDD3B8' } }
      }
    }
  });
})();

// ── CHART 5: PLAKET LO ACCUMULATION ──
(function(){
  const ctx = document.getElementById('chartPlaket'); if(!ctx) return;
  if(!ctx) return;
  const labels = ['Y1','Y2','Y3','Y4','Y5'];
  new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Annual Lò Allocation ($)', data: [34680, 80000, 130000, 200000, 300000], backgroundColor: AMBER, yAxisID: 'y' },
        { label: 'Cumulative Gold Reserve ($)', data: [34680, 114680, 244680, 444680, 744680], type: 'line', borderColor: ORANGE, backgroundColor: 'transparent', yAxisID: 'y2', tension: 0.3, pointRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
      scales: {
        y: { position: 'left', ticks: { callback: v => '$'+(v>=1000?Math.round(v/1000)+'K':v), font: { size: 9 } }, grid: { color: '#2A2A2A' } },
        y2: { position: 'right', ticks: { callback: v => '$'+(v>=1000?Math.round(v/1000)+'K':v), font: { size: 9 } }, grid: { display: false } },
        x: { ticks: { font: { size: 9 } }, grid: { display: false } }
      }
    }
  });
})();

// ── CHART 6: KONBIT PRESS PHASES ──
(function(){
  const ctx = document.getElementById('chartPress'); if(!ctx) return;
  if(!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Phase 1 (Y1)\n3 workers','Phase 2 (Y2)\n7 workers','Phase 3 (Y3)\n10 workers','Full Mill (Y4)\n12 workers'],
      datasets: [
        { label: 'Annual Revenue ($)', data: [14800, 21120, 45600, 91200], backgroundColor: FOREST, yAxisID: 'y' },
        { label: 'Per-Worker Income ($/yr)', data: [1433, 1500, 2500, 5750], type: 'line', borderColor: AMBER, backgroundColor: 'transparent', yAxisID: 'y2', tension: 0.2, pointRadius: 5, borderWidth: 2.5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
      scales: {
        y: { position: 'left', ticks: { callback: v => '$'+(v>=1000?Math.round(v/1000)+'K':v), font: { size: 9 } }, grid: { color: '#DDD3B8' } },
        y2: { position: 'right', ticks: { callback: v => '$'+v.toLocaleString(), font: { size: 9 } }, grid: { display: false } },
        x: { ticks: { font: { size: 9 } }, grid: { display: false } }
      }
    }
  });
})();

// ── CHART 7: KONBIT DATA REVENUE ──
(function(){
  const ctx = document.getElementById('chartData'); if(!ctx) return;
  if(!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Year 1','Year 2','Year 3'],
      datasets: [
        { label: 'Rapid Polls ($3,500)', data: [14000, 21000, 35000], backgroundColor: FOREST2 },
        { label: 'Standard Surveys ($8,500)', data: [25500, 42500, 68000], backgroundColor: FOREST },
        { label: 'Census Modules ($22,000)', data: [11000, 44000, 66000], backgroundColor: ORANGE },
        { label: 'Longitudinal Panels ($35,000)', data: [0, 35000, 105000], backgroundColor: AMBER }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 9 } }, grid: { display: false } },
        y: { stacked: true, ticks: { callback: v => '$'+(v>=1000?Math.round(v/1000)+'K':v), font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
})();

// ── CHART 8: WATERFALL (40/40/20) ──
(function(){
  const ctx = document.getElementById('chartWaterfall'); if(!ctx) return;
  if(!ctx) return;
  new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Gold Reserve (Fon Kominote)', 'Worker Wages + Tier Dividends', 'Operational Reinvestment'],
      datasets: [{ data: [40, 40, 20], backgroundColor: [AMBER, FOREST, ORANGE], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 14, font: { size: 10 }, padding: 16 } },
        tooltip: { callbacks: { label: c => c.label + ': ' + c.raw + '%' } }
      },
      cutout: '60%'
    }
  });
})();

// ── CHART 9: INTEGRATED REVENUE Y1-Y10 ──
(function(){
  const ctx = document.getElementById('chartIntegrated'); if(!ctx) return;
  if(!ctx) return;
  const labels = ['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','Y10'];
  new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Harvest Box', data: [835,1500,2800,4500,8600,13000,19000,27000,35000,45000], backgroundColor: ORANGE },
        { label: 'Rabbits', data: [16,28,58,120,250,380,450,480,490,500], backgroundColor: FOREST2 },
        { label: 'Trash Collection', data: [62,110,192,280,380,480,560,620,660,700], backgroundColor: FOREST },
        { label: 'Konbit Press', data: [15,21,46,91,140,185,220,250,270,290], backgroundColor: '#8B6914' },
        { label: 'Konbit Data', data: [47,105,180,260,350,430,500,560,600,640], backgroundColor: AMBER },
        { label: 'Plaket + Other', data: [0,40,120,220,380,550,700,820,900,960], backgroundColor: MID }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 9 } }, grid: { display: false } },
        y: { stacked: true, ticks: { callback: v => '$'+(v>=1000?Math.round(v/1000)+'K':v), font: { size: 9 } }, grid: { color: '#DDD3B8' } }
      }
    }
  });
})();

// ── CHART 10: WAGE COMPARISON ──
(function(){
  const ctx = document.getElementById('chartWage'); if(!ctx) return;
  if(!ctx) return;
  const labels = ['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','Y10'];
  new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Gang Baseline (avg, incl. lump sums)', data: [5.5,5.7,5.9,6.1,6.3,6.5,6.7,6.9,7.1,7.3], borderColor: RUST, backgroundColor: 'transparent', borderDash: [5,4], tension: 0.2, pointRadius: 2 },
        { label: 'Haiti Minimum Wage', data: [4.5,4.5,4.8,4.8,5.0,5.2,5.4,5.6,5.8,6.0], borderColor: MID, backgroundColor: 'transparent', borderDash: [3,3], tension: 0.1, pointRadius: 2 },
        { label: 'SAKALA worker (rises as they train up)', data: [1,3,5,6.5,8,8,8,8,8,8], borderColor: ORANGE, backgroundColor: 'rgba(212,80,10,0.08)', fill: true, tension: 0.3, pointRadius: 4, borderWidth: 2.5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 9 } } } },
      scales: {
        y: { ticks: { callback: v => '$'+v.toFixed(2)+'/day', font: { size: 9 } }, grid: { color: '#DDD3B8' } },
        x: { ticks: { font: { size: 9 } }, grid: { color: '#DDD3B8' } }
      }
    }
  });
})();

// ── CHART 11: THETA TRAJECTORY ──
(function(){
  const ctx = document.getElementById('chartTheta'); if(!ctx) return;
  if(!ctx) return;
  const labels = ['2026\n(now)','2027','2028','2029','2030','2031','2032','2033','2034','2035','2036\n(target)'];
  new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Haiti Economy-Wide Theta', data: [0.85,0.85,0.85,0.84,0.83,0.82,0.81,0.80,0.79,0.78,0.77], borderColor: RUST, backgroundColor: 'transparent', borderDash: [6,3], tension: 0.1, pointRadius: 2 },
        { label: 'Aid System Theta', data: [0.78,0.78,0.78,0.77,0.77,0.76,0.76,0.75,0.75,0.74,0.74], borderColor: MID, backgroundColor: 'transparent', borderDash: [3,3], tension: 0.1, pointRadius: 2 },
        { label: 'SAKALA+BARSS Program Community Theta', data: [0.85,0.72,0.62,0.52,0.44,0.36,0.30,0.26,0.23,0.21,0.20], borderColor: ORANGE, backgroundColor: 'rgba(212,80,10,0.1)', fill: true, tension: 0.4, pointRadius: 5, borderWidth: 2.5 },
        { label: 'Target (Theta = 0.20)', data: [0.20,0.20,0.20,0.20,0.20,0.20,0.20,0.20,0.20,0.20,0.20], borderColor: AMBER, backgroundColor: 'transparent', borderDash: [8,4], tension: 0, pointRadius: 0, borderWidth: 1.5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 9 } } } },
      scales: {
        y: { min: 0.10, max: 0.95, ticks: { callback: v => 'Θ='+v.toFixed(2), font: { size: 9 } }, grid: { color: '#DDD3B8' } },
        x: { ticks: { font: { size: 9 } }, grid: { color: '#DDD3B8' } }
      }
    }
  });
})();
