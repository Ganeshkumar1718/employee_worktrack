const { app, BrowserWindow, powerMonitor, dialog } = require('electron');
const path = require('path');

let mainWindow;

// The URL of your live Vercel application (or local during dev)
const APP_URL = 'https://employee-worktrack.vercel.app';
const IDLE_TIMEOUT_SECONDS = 600; // 10 minutes (10 * 60)
const IDLE_CHECK_INTERVAL = 5000; // Check every 5 seconds

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'), // Add an icon.png later if needed
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // We allow the webapp to run normally
    }
  });

  // Remove the default electron menu to make it look like a pure app
  mainWindow.setMenuBarVisibility(false);

  // Load the web application
  mainWindow.loadURL(APP_URL);

  // Set up the global system activity monitor
  setupGlobalActivityTracker();
}

function setupGlobalActivityTracker() {
  let wasIdle = false;

  setInterval(() => {
    // powerMonitor.getSystemIdleTime() returns idle time in seconds!
    // This tracks GLOBAL mouse/keyboard activity, even when the app is minimized.
    const idleTime = powerMonitor.getSystemIdleTime();

    if (idleTime >= IDLE_TIMEOUT_SECONDS) {
      if (!wasIdle) {
        wasIdle = true;
        console.log(`System has been idle for ${idleTime} seconds. Triggering auto-logout...`);
        
        // Inject JavaScript into the webpage to force it to click the logout button 
        // or clear the localStorage and redirect to login
        forceLogoutInWebapp();
      }
    } else {
      // If the user moved their mouse, reset the idle flag
      wasIdle = false;
    }
  }, IDLE_CHECK_INTERVAL);
}

function forceLogoutInWebapp() {
  if (!mainWindow) return;

  const script = `window.dispatchEvent(new Event('electron-idle-timeout'));`;

  mainWindow.webContents.executeJavaScript(script).catch(err => {
    console.error('Failed to execute logout script:', err);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
