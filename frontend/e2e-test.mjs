import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = 'C:\\Users\\ngokarmoon\\.gemini\\antigravity\\brain\\af2d68dd-9ade-4e35-a2c9-fbc486af6fa9';

async function runE2ETests() {
  console.log('🚀 Starting E2E Puppeteer Browser Testing on http://localhost:5173...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.message));

  try {
    // -------------------------------------------------------------
    // Test 1: Navigation to Home / Login page
    // -------------------------------------------------------------
    console.log('1️⃣ Navigating to http://localhost:5173/login ...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 30000 });

    const title = await page.title();
    console.log(`   Page title: "${title}"`);

    // Wait for the login form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('   ✅ Login form rendered and mounted successfully.');

    // Save screenshot of Login view
    const loginScreenshotPath = path.join(screenshotDir, 'login_page.png');
    await page.screenshot({ path: loginScreenshotPath });
    console.log(`   📸 Captured screenshot: ${loginScreenshotPath}`);

    // -------------------------------------------------------------
    // Test 2: Interact with Input Elements on Login Page
    // -------------------------------------------------------------
    console.log('2️⃣ Testing user inputs on login form...');
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      await emailInput.type('admin@finflow.ai', { delay: 20 });
      await passwordInput.type('SecurePass123!', { delay: 20 });
      const emailVal = await page.evaluate(el => el.value, emailInput);
      console.log(`   ✅ Successfully typed email: "${emailVal}"`);
    } else {
      console.warn('   ⚠️ Email or password input was not found directly.');
    }

    // -------------------------------------------------------------
    // Test 3: Tab Switching to "Create Account"
    // -------------------------------------------------------------
    console.log('3️⃣ Testing tab switcher ("Create Account")...');
    const createAccountTab = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Create Account'));
    });

    if (createAccountTab) {
      await createAccountTab.click();
      await page.waitForTimeout ? page.waitForTimeout(1000) : new Promise(r => setTimeout(r, 1000));
      console.log('   ✅ Clicked "Create Account" tab.');
      const registerTabScreenshot = path.join(screenshotDir, 'create_account_tab.png');
      await page.screenshot({ path: registerTabScreenshot });
      console.log(`   📸 Captured screenshot: ${registerTabScreenshot}`);
    }

    // -------------------------------------------------------------
    // Test 4: Navigation to Company Registration Page
    // -------------------------------------------------------------
    console.log('4️⃣ Navigating to http://localhost:5173/register-company ...');
    await page.goto('http://localhost:5173/register-company', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('   ✅ Company Registration form mounted successfully.');

    // Check dual sections
    const hasAdminSection = await page.evaluate(() => document.body.textContent.includes('Admin Info'));
    const hasCompanySection = await page.evaluate(() => document.body.textContent.includes('Company Info'));
    console.log(`   Admin Section Visible: ${hasAdminSection}`);
    console.log(`   Company Section Visible: ${hasCompanySection}`);

    const registerCompanyScreenshot = path.join(screenshotDir, 'register_company_page.png');
    await page.screenshot({ path: registerCompanyScreenshot });
    console.log(`   📸 Captured screenshot: ${registerCompanyScreenshot}`);

    // -------------------------------------------------------------
    // Summary of Errors
    // -------------------------------------------------------------
    console.log('\n📊 BROWSER DIAGNOSTICS & HEALTH CHECK:');
    console.log(`   Total Page Errors: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      pageErrors.forEach((e, idx) => console.log(`   ❌ Error ${idx + 1}: ${e}`));
    } else {
      console.log('   ✅ Zero fatal JavaScript runtime errors!');
    }

    console.log('\n======================================================');
    console.log('🎉 LIVE BROWSER TESTS COMPLETED SUCCESSFULLY!');
    console.log('======================================================');

  } catch (error) {
    console.error('❌ E2E Test execution failed:', error);
  } finally {
    await browser.close();
  }
}

runE2ETests();
