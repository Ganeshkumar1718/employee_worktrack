const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshotDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\65587df4-ee73-423a-8bcb-969dbea2328f';

// Ensure dir exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  await browser.defaultBrowserContext().overridePermissions('http://localhost:3000', ['notifications']);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    console.log('Navigating to http://localhost:3000/login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

    console.log('Taking login page screenshot...');
    await page.screenshot({ path: path.join(screenshotDir, 'login.png') });

    console.log('Logging in as admin...');
    await page.type('input[type="email"]', 'admin@worktrack.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    console.log('Waiting for navigation to dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Wait a brief moment to let content load
    await new Promise(r => setTimeout(r, 2000));

    console.log('Taking overview tab screenshot...');
    await page.screenshot({ path: path.join(screenshotDir, 'overview.png') });

    // Switch to each tab and screenshot
    const tabs = ['employees', 'attendance', 'leaves', 'salary', 'tasks', 'feedback'];
    for (const tab of tabs) {
      console.log(`Clicking tab: ${tab}...`);
      await page.evaluate((tabName) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const target = buttons.find(b => b.textContent.trim().toLowerCase().includes(tabName));
        if (target) {
          target.click();
        } else {
          console.log(`Could not find button for tab: ${tabName}`);
        }
      }, tab);

      await new Promise(r => setTimeout(r, 1500)); // wait for tab load
      console.log(`Taking screenshot for tab: ${tab}...`);
      await page.screenshot({ path: path.join(screenshotDir, `${tab}.png`) });
    }

    console.log('Testing notification dropdown...');
    // Click bell icon
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const bellButton = buttons.find(b => b.querySelector('svg') && b.querySelector('svg').outerHTML.toLowerCase().includes('bell'));
      if (bellButton) bellButton.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotDir, 'notification_open.png') });

    console.log('Clicking outside notification to close it...');
    await page.click('h1');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotDir, 'notification_closed.png') });

    console.log('Testing profile modal...');
    // Click profile button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const profileButton = buttons.find(b => b.textContent.trim().toLowerCase() === 'profile');
      if (profileButton) profileButton.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(screenshotDir, 'profile_modal.png') });

    console.log('Checking scroll inside profile modal...');
    // Scroll down inside the profile modal card
    await page.evaluate(() => {
      const modalContainer = Array.from(document.querySelectorAll('div')).find(d => d.className.includes('max-h-[90vh]') || d.className.includes('max-h-90vh'));
      if (modalContainer) {
        modalContainer.scrollTop = modalContainer.scrollHeight;
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(screenshotDir, 'profile_modal_scrolled.png') });

    console.log('Closing profile modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'close');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Resetting activity timer with a quick mouse move...');
    await page.mouse.move(50, 50);
    await new Promise(r => setTimeout(r, 500));

    console.log('Waiting 32 seconds without moving the cursor to trigger inactivity warning...');
    await new Promise(r => setTimeout(r, 32000));

    console.log('Taking cursor inactivity screenshot...');
    const toastHTML = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Cursor Inactivity Warning'));
      return el ? el.outerHTML : 'NOT FOUND';
    });
    console.log('TOAST HTML:', toastHTML);
    await page.screenshot({ path: path.join(screenshotDir, 'cursor_inactivity.png') });

    console.log('Simulating mouse movement...');
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);

    // Wait a brief moment
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(screenshotDir, 'cursor_active.png') });

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
    console.log('Test completed.');
  }
}

run();
