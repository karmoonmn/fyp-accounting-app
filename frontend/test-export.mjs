import assert from 'node:assert';
import { exportToCsv, printReport } from './src/utils/exportReport.js';

console.log('--- STARTING TESTS FOR EXPORT & PRINT MODULE (FR-60) ---');

// 1. Setup DOM mocks for Node.js environment
let clickedDownload = false;
let downloadHref = '';
let downloadFilename = '';
let revokedUrl = '';
let printed = false;

globalThis.window = {
  print: () => {
    printed = true;
  }
};

globalThis.URL = {
  createObjectURL: (blob) => {
    return 'blob:mock-url-123';
  },
  revokeObjectURL: (url) => {
    revokedUrl = url;
  }
};

const appendedChildren = [];
globalThis.document = {
  body: {
    appendChild: (elem) => appendedChildren.push(elem),
    removeChild: (elem) => {
      const idx = appendedChildren.indexOf(elem);
      if (idx !== -1) appendedChildren.splice(idx, 1);
    }
  },
  createElement: (tag) => {
    if (tag === 'a') {
      return {
        setAttribute: (attr, val) => {
          if (attr === 'href') downloadHref = val;
          if (attr === 'download') downloadFilename = val;
        },
        click: () => {
          clickedDownload = true;
        }
      };
    }
    return {};
  }
};

// ----------------------------------------------------------------------------
// TEST 1: printReport calls window.print()
// ----------------------------------------------------------------------------
printed = false;
printReport();
assert.strictEqual(printed, true, 'TEST 1 FAILED: printReport should invoke window.print()');
console.log('✅ TEST 1 PASSED: printReport successfully triggers native window.print()');

// ----------------------------------------------------------------------------
// TEST 2: exportToCsv creates valid CSV with UTF-8 BOM and triggers download
// ----------------------------------------------------------------------------
clickedDownload = false;
downloadHref = '';
downloadFilename = '';
revokedUrl = '';

const headers = ['Account Code', 'Account Name', 'Category', 'Balance (USD)'];
const rows = [
  ['1001', 'Bank, Operating Account', 'Assets', '15000.50'],
  ['4001', 'Sales "Special"', 'Revenue', '25000.00'],
  ['5001', 'Office Expense\nRent', 'Expenses', '3500.00']
];

exportToCsv('test_financial_report', headers, rows);

assert.strictEqual(clickedDownload, true, 'TEST 2 FAILED: link.click() was not called');
assert.strictEqual(downloadFilename, 'test_financial_report.csv', 'TEST 2 FAILED: download filename mismatch');
assert.strictEqual(downloadHref, 'blob:mock-url-123', 'TEST 2 FAILED: download href mismatch');
assert.strictEqual(revokedUrl, 'blob:mock-url-123', 'TEST 2 FAILED: URL.revokeObjectURL was not called');
assert.strictEqual(appendedChildren.length, 0, 'TEST 2 FAILED: link was not removed from document.body');
console.log('✅ TEST 2 PASSED: exportToCsv properly constructed download link and handled DOM lifecycle');

// ----------------------------------------------------------------------------
// TEST 3: Verification of CSV formatting rules (RFC 4180 & UTF-8 BOM)
// ----------------------------------------------------------------------------
let capturedBlob = null;
globalThis.Blob = class MockBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
    capturedBlob = this;
  }
};

exportToCsv('test_format.csv', ['Header 1', 'Header 2'], [['Hello, World', 'Normal'], ['With "Quotes"', 'Line\nBreak']]);

assert.ok(capturedBlob, 'TEST 3 FAILED: Blob was not instantiated');
assert.strictEqual(capturedBlob.options.type, 'text/csv;charset=utf-8;', 'TEST 3 FAILED: Blob MIME type mismatch');

const fullContent = capturedBlob.parts.join('');
// Check UTF-8 BOM
assert.ok(fullContent.startsWith('\uFEFF'), 'TEST 3 FAILED: CSV must start with UTF-8 BOM for Excel compatibility');

// Check escaping of commas: "Hello, World"
assert.ok(fullContent.includes('"Hello, World"'), 'TEST 3 FAILED: Commas must be enclosed in double quotes');

// Check escaping of quotes: "With ""Quotes"""
assert.ok(fullContent.includes('"With ""Quotes"""'), 'TEST 3 FAILED: Quotes must be escaped as double-quotes');

// Check line breaks enclosed in quotes: "Line\nBreak"
assert.ok(fullContent.includes('"Line\nBreak"'), 'TEST 3 FAILED: Strings with line breaks must be enclosed in double quotes');

console.log('✅ TEST 3 PASSED: CSV content satisfies RFC 4180 escaping and UTF-8 Excel BOM encoding');

// ----------------------------------------------------------------------------
// TEST 4: Verify JSX Component Syntax & Imports
// ----------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const reportFiles = [
  path.join(__dirname, 'src/components/reports/ProfitLossReport.jsx'),
  path.join(__dirname, 'src/components/reports/BalanceSheetReport.jsx'),
  path.join(__dirname, 'src/components/reports/AgingReport.jsx'),
  path.join(__dirname, 'src/components/reports/ExpenseDashboard.jsx'),
  path.join(__dirname, 'src/components/reports/ForecastingDashboard.jsx'),
];

for (const file of reportFiles) {
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('exportToCsv'), `TEST 4 FAILED: ${file} does not import exportToCsv`);
  assert.ok(content.includes('printReport'), `TEST 4 FAILED: ${file} does not import printReport`);
  assert.ok(content.includes('onClick={printReport}'), `TEST 4 FAILED: ${file} does not hook onClick to printReport`);
  assert.ok(content.includes('onClick={handleExportCsv}'), `TEST 4 FAILED: ${file} does not hook onClick to handleExportCsv`);
  console.log(`✅ TEST 4 PASSED: Verified ${path.basename(file)} cleanly imports and hooks exportToCsv and printReport`);
}

// ----------------------------------------------------------------------------
// TEST 5: Verify @media print rules in index.css
// ----------------------------------------------------------------------------
const cssContent = fs.readFileSync(path.join(__dirname, 'src/index.css'), 'utf8');
assert.ok(cssContent.includes('@media print'), 'TEST 5 FAILED: @media print is missing from index.css');
assert.ok(cssContent.includes('.no-print'), 'TEST 5 FAILED: .no-print class missing from @media print');
assert.ok(cssContent.includes('display: none !important;'), 'TEST 5 FAILED: display: none !important rule missing');
console.log('✅ TEST 5 PASSED: Verified index.css contains print styles hiding UI navigation & elements');

console.log('\n=======================================================');
console.log('🎉 ALL EXPORT & PRINT (FR-60) TESTS PASSED SUCCESSFULLY!');
console.log('=======================================================');
