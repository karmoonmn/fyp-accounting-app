import fs from 'fs';
import path from 'path';

// Seeded deterministic pseudo-random number generator
let seed = 42;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

const months = [
  '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
  '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
  '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
];

const data = months.map((month, idx) => {
  const m = (idx % 12) + 1; // 1-12
  const trend = idx * 650; // ~$7.8k annual organic expansion
  // Seasonal boosts: Q4 surge (Oct-Dec), Summer slump (Jul-Aug), Spring pickup (Mar)
  let seasonalMult = 1.0;
  if (m === 3) seasonalMult = 1.05;
  if (m === 7 || m === 8) seasonalMult = 0.94;
  if (m === 10) seasonalMult = 1.08;
  if (m === 11) seasonalMult = 1.15;
  if (m === 12) seasonalMult = 1.22;

  const baseRevenue = 28000 + trend;
  const noise = (random() - 0.5) * 1200;
  const revenue = Math.round((baseRevenue * seasonalMult + noise) * 100) / 100;

  // Expenses
  const salaries = 16000 + Math.floor(idx / 6) * 1500; // Step increases as team hires
  const rent = 3200; // Fixed commercial lease
  const marketing = Math.round((2500 + (m === 11 || m === 12 ? 2000 : 0) + (random() - 0.5) * 400) * 100) / 100;
  const utilitiesAndCloud = Math.round((1400 + idx * 45 + (random() - 0.5) * 200) * 100) / 100;
  const cogs = Math.round((revenue * 0.22 + (random() - 0.5) * 300) * 100) / 100;

  const totalExpenses = Math.round((salaries + rent + marketing + utilitiesAndCloud + cogs) * 100) / 100;
  const netIncome = Math.round((revenue - totalExpenses) * 100) / 100;

  return {
    month,
    revenue,
    cogs,
    expenses: totalExpenses,
    netIncome,
    breakdown: {
      salaries,
      rent,
      marketing,
      utilitiesAndCloud,
      cogs
    }
  };
});

const outDir = path.resolve('c:/Users/ngokarmoon/IdeaProjects/fyp-accounting-app/test-data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. JSON
const jsonPath = path.join(outDir, 'forecasting_24_months_dataset.json');
fs.writeFileSync(jsonPath, JSON.stringify({
  companyId: "TEST_COMPANY_001",
  companyName: "Apex Retail & Tech Solutions Inc.",
  currency: "USD",
  periodCount: data.length,
  records: data
}, null, 2), 'utf8');

// 2. CSV
const csvPath = path.join(outDir, 'forecasting_24_months_dataset.csv');
const csvHeaders = 'Month,Revenue,COGS,Operating_Expenses,Net_Income,Salaries,Rent,Marketing,Utilities_and_Cloud\n';
const csvRows = data.map(d => 
  `${d.month},${d.revenue},${d.cogs},${d.expenses},${d.netIncome},${d.breakdown.salaries},${d.breakdown.rent},${d.breakdown.marketing},${d.breakdown.utilitiesAndCloud}`
).join('\n');
fs.writeFileSync(csvPath, '\uFEFF' + csvHeaders + csvRows, 'utf8');

console.log('Successfully generated 24-month financial dataset at:');
console.log(' - JSON:', jsonPath);
console.log(' - CSV:', csvPath);
