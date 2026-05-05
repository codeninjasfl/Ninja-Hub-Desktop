const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');

// ─── Globals ────────────────────────────────────────────────────────────────
let mainWindow = null;
let isAppQuitting = false;
const HOME_URL = 'https://ninjahub.codeninjas.com';
const iconPath = path.join(__dirname, '../assets/mainlogo.png');

// ─── Performance: Chromium flags (applied before app is ready) ──────────────
Menu.setApplicationMenu(null);

// GPU & rendering performance
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-video-decode');

// Network performance
app.commandLine.appendSwitch('enable-quic');

// SSO compatibility: prevent cookie partitioning breaking Azure auth
app.commandLine.appendSwitch('disable-features', 'ThirdPartyStoragePartitioning,PartitionedCookies');

// Standard Chrome user-agent so sites don't serve degraded Electron content
app.userAgentFallback = process.platform === 'win32'
  ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// ─── Certificate & Permission handlers (registered ONCE, outside createWindow) ─
app.on('certificate-error', (event, _wc, url, error, _cert, callback) => {
  console.log(`[CERT] Allowing: ${url} (${error})`);
  event.preventDefault();
  callback(true);
});

// ─── Window Open Handler ────────────────────────────────────────────────────
// Determines whether a link should open in-place or in a popup.
// SSO auth flows (Microsoft B2C, OAuth) MUST open as popups to avoid 429 loops.
// Everything else navigates in the current window for speed.
function handleWindowOpen(details) {
  const url = (details.url || '').toLowerCase();

  // SSO / OAuth popups — must open as separate windows
  const isSSOPopup =
    url.includes('login.microsoftonline.com') ||
    url.includes('login.live.com') ||
    url.includes('.b2clogin.com') ||
    url.includes('oauth') ||
    url.includes('/authorize');

  if (isSSOPopup) {
    console.log(`[POPUP] SSO window: ${details.url}`);
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        fullscreen: true,
        kiosk: true,
        alwaysOnTop: true,
        show: true,
        backgroundColor: '#000000',
        icon: iconPath,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          preload: path.join(__dirname, 'preload.js'),
          webSecurity: false,
          allowRunningInsecureContent: true
        }
      }
    };
  }

  // Everything else: navigate the main window in-place (no new tab)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(details.url);
  }
  return { action: 'deny' };
}

// ─── Create Window ──────────────────────────────────────────────────────────
function createWindow() {
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);
  }

  mainWindow = new BrowserWindow({
    show: false,           // Don't show until content is ready
    fullscreen: true,
    alwaysOnTop: true,
    kiosk: true,
    icon: iconPath,
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,   // Keep timers running when not focused
      spellcheck: false              // Disable spellcheck for performance
    },
  });

  // Show window as soon as the renderer has painted its first frame
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Popup / link handling
  mainWindow.webContents.setWindowOpenHandler(handleWindowOpen);

  // ─── Debug logging ──────────────────────────────────────────────────────
  mainWindow.webContents.on('will-navigate', (_e, url) => console.log(`[NAV] ${url}`));
  mainWindow.webContents.on('did-navigate', (_e, url, code) => console.log(`[NAV-DONE] ${url} (${code})`));
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url, isMain) => {
    console.log(`[LOAD-FAIL] ${url} — ${desc} (${code}, main=${isMain})`);
  });

  // ─── Kiosk lockdown: prevent OS-level close ──────────────────────────────
  mainWindow.on('close', (event) => {
    if (!isAppQuitting) event.preventDefault();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // ─── Load the app ─────────────────────────────────────────────────────────
  mainWindow.loadURL(HOME_URL);
}

// ─── App Ready ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Permission handler
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));

  // Pre-warm DNS for known domains
  session.defaultSession.enableNetworkEmulation({ offline: false });

  // Apply popup handler to ALL future webContents (iframes, child windows)
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(handleWindowOpen);
  });

  // ─── IPC Handlers ─────────────────────────────────────────────────────────
  ipcMain.on('close-app', () => {
    isAppQuitting = true;
    app.quit();
  });

  ipcMain.on('clear-cache-home', async () => {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData();
    // Close all popup windows
    BrowserWindow.getAllWindows().forEach(win => {
      if (win !== mainWindow) win.close();
    });
    if (mainWindow) mainWindow.loadURL(HOME_URL);
  });

  ipcMain.on('go-home', (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    if (senderWin === mainWindow) {
      mainWindow.loadURL(HOME_URL);
    } else if (senderWin) {
      senderWin.close();
    }
  });

  ipcMain.on('go-back', (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    if (senderWin && senderWin.webContents.canGoBack()) {
      senderWin.webContents.goBack();
    } else if (senderWin && senderWin !== mainWindow) {
      senderWin.close();
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
