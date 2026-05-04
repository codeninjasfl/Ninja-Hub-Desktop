const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');

let mainWindow = null;
let isAppQuitting = false;

// Disable the default menu entirely
Menu.setApplicationMenu(null);

// Disable Chromium's third-party cookie partitioning so SSO and
// cross-domain APIs (Azure WebPubSub, etc.) work correctly.
app.commandLine.appendSwitch('disable-features', 'ThirdPartyStoragePartitioning,PartitionedCookies');
// Use standard native User Agents for Windows and Linux.
let chromeUA;
if (process.platform === 'win32') {
  chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
} else {
  chromeUA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
}
app.userAgentFallback = chromeUA;

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/mainlogo.png');

  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);
  }

  mainWindow = new BrowserWindow({
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
      allowRunningInsecureContent: true
    },
  });



  // ============================================================
  // POPUP HANDLING: Allow as strict kiosk windows to preserve window.opener
  // ============================================================
  // SSO popups (like Codio/Microsoft) must open in a separate window object
  // otherwise they enter an infinite redirect loop and hit 429 Too Many Requests.
  const allowFullscreenPopupHandler = ({ url }) => {
    console.log(`[WINDOW-OPEN] Allowed fullscreen popup. URL: ${url}`);
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        fullscreen: true,
        kiosk: true,
        alwaysOnTop: true,
        backgroundColor: '#111111',
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
  };

  // Apply to main window
  mainWindow.webContents.setWindowOpenHandler(allowFullscreenPopupHandler);

  // Apply to any other WebContents (iframes, etc.) created later
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(allowFullscreenPopupHandler);
  });

  // ============================================================
  // DEBUG: Log navigation and load events
  // ============================================================
  mainWindow.webContents.on('will-navigate', (event, url) => {
    console.log(`[WILL-NAVIGATE] ${url}`);
  });

  mainWindow.webContents.on('did-navigate', (event, url, httpResponseCode) => {
    console.log(`[DID-NAVIGATE] ${url} (HTTP ${httpResponseCode})`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.log(`[LOAD-FAILED] ${validatedURL} — ${errorDescription} (code: ${errorCode}, mainFrame: ${isMainFrame})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log(`[DID-FINISH-LOAD] ${mainWindow.webContents.getURL()}`);
  });

  // Log console messages from the renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warning', 'error'];
    console.log(`[PAGE-CONSOLE] [${levels[level] || level}] ${message}`);
  });

  // ============================================================
  // Allow ALL certificate errors
  // ============================================================
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    console.log(`[CERT-ERROR] Allowing: ${url} (${error})`);
    event.preventDefault();
    callback(true);
  });

  // Allow ALL permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // (User-Agent spoofing is now handled globally via app.userAgentFallback at the top of the file)

  mainWindow.loadURL('https://ninjahub.codeninjas.com');

  // Prevent the window from closing unless 'close-app' IPC is called
  mainWindow.on('close', (event) => {
    if (!isAppQuitting) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ipcMain.on('close-app', () => {
    isAppQuitting = true;
    app.quit();
  });

  ipcMain.on('clear-cache-home', async () => {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData();
    BrowserWindow.getAllWindows().forEach(win => {
      if (win !== mainWindow) win.close();
    });
    if (mainWindow) {
      mainWindow.loadURL('https://ninjahub.codeninjas.com');
    }
  });

  ipcMain.on('go-home', (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    if (senderWin === mainWindow) {
      mainWindow.loadURL('https://ninjahub.codeninjas.com');
    } else {
      if (senderWin) senderWin.close();
    }
  });

  ipcMain.on('go-back', (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    if (senderWin && senderWin.webContents.canGoBack()) {
      senderWin.webContents.goBack();
    } else if (senderWin && senderWin !== mainWindow) {
      // If we can't go back and this is a popup, close the popup to return to main window
      senderWin.close();
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
