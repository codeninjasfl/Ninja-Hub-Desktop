const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');


let mainWindow = null;
let isAppQuitting = false;
let reopenTimer = null;
let latestReleaseInfo = null;
let onboardingShownThisSession = false;
let updateShownThisSession = false;
const HOME_URL = 'https://ninjahub.codeninjas.com';
const iconPath = path.join(__dirname, '../assets/mainlogo.png');


Menu.setApplicationMenu(null);


app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-video-decode');


app.commandLine.appendSwitch('enable-quic');


app.commandLine.appendSwitch('disable-features', 'ThirdPartyStoragePartitioning,PartitionedCookies');


const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const LINUX_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

app.userAgentFallback = process.platform === 'win32'
  ? WIN_UA
  : process.platform === 'darwin'
    ? MAC_UA
    : LINUX_UA;


function forceCloseApp() {
  console.log('[EXIT] Force closing application and cleaning up all processes...');
  isAppQuitting = true;
  if (reopenTimer) {
    clearTimeout(reopenTimer);
    reopenTimer = null;
  }
  BrowserWindow.getAllWindows().forEach(win => {
    try {
      if (!win.isDestroyed()) {
        win.removeAllListeners('close');
        win.removeAllListeners('closed');
        win.destroy();
      }
    } catch (e) {}
  });
  app.exit(0);
  process.exit(0);
}

function updateAllTabBars() {
  const windows = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed());
  if (windows.length === 0) return;

  const tabState = windows.map((w, idx) => ({
    id: w.id,
    title: w.webContents.getTitle() || `Tab ${idx + 1}`,
    url: w.webContents.getURL(),
    isMain: w === mainWindow
  }));

  // The "active" tab is whichever window is currently visible/focused
  const focused = BrowserWindow.getFocusedWindow();
  const visible = windows.find(w => w.isVisible() && w.isFocused())
               || windows.find(w => w.isVisible())
               || windows[windows.length - 1];
  const activeId = (focused && !focused.isDestroyed()) ? focused.id : visible.id;

  windows.forEach(w => {
    if (!w.isDestroyed()) {
      w.webContents.send('tabs-updated', {
        tabs: tabState,
        activeId,
        count: windows.length
      });
    }
  });
}

const pendingStorageForWindow = new Map();

function createTabWindow(targetUrl, initialStorage = null) {
  console.log(`[TAB] Creating new tab window for: ${targetUrl}`);
  const tabWin = new BrowserWindow({
    show: false,
    fullscreen: true,
    alwaysOnTop: true,
    kiosk: true,
    icon: iconPath,
    backgroundColor: '#1a1b1e',
    webPreferences: {
      session: session.defaultSession,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
      spellcheck: false
    }
  });

  if (initialStorage) {
    pendingStorageForWindow.set(tabWin.id, initialStorage);
  }

  registerKeyboardShortcuts(tabWin.webContents);
  tabWin.webContents.setWindowOpenHandler(handleWindowOpen);

  tabWin.loadURL(targetUrl || HOME_URL);

  tabWin.once('ready-to-show', () => {
    BrowserWindow.getAllWindows().forEach(w => {
      if (w.id !== tabWin.id && !w.isDestroyed()) {
        w.setAlwaysOnTop(false);
        w.hide();
      }
    });
    tabWin.setAlwaysOnTop(true);
    tabWin.show();
    tabWin.focus();
    updateAllTabBars();
  });

  tabWin.webContents.on('page-title-updated', () => updateAllTabBars());
  tabWin.on('closed', () => {
    pendingStorageForWindow.delete(tabWin.id);
    setTimeout(() => {
      const remaining = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed());
      if (remaining.length > 0) {
        const toShow = remaining[remaining.length - 1];
        toShow.setAlwaysOnTop(true);
        toShow.show();
        toShow.focus();
      }
      updateAllTabBars();
    }, 100);
  });

  return tabWin;
}

app.on('certificate-error', (event, _wc, url, error, _cert, callback) => {
  console.log(`[CERT] Allowing certificate error (required for local robotics hardware/kits): ${url} (${error})`);
  event.preventDefault();
  callback(true);
});





function handleWindowOpen(details) {
  const url = (details.url || '').toLowerCase();

  // Allow SSO Auth popups (Azure AD B2C / Microsoft)
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
        backgroundColor: '#1a1b1e',
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

  // Open external links (from Academies, Impact, or external sites) in a new tab window!
  const isSafeUrl = !url.includes('about:blank') && !url.startsWith('blob:') && !url.startsWith('data:');
  if (isSafeUrl) {
    console.log(`[NAV-TAB] Opening link in new tab: ${details.url}`);
    createTabWindow(details.url);
    return { action: 'deny' };
  }

  return { action: 'deny' };
}



function registerKeyboardShortcuts(contents) {
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const isControl = input.control || input.meta;

    if (isControl) {
      const key = input.key.toLowerCase();

      
      if (key === '=' || key === '+') {
        event.preventDefault();
        try {
          const currentZoom = contents.getZoomFactor();
          const nextZoom = Math.min(currentZoom + 0.1, 3.0);
          contents.setZoomFactor(nextZoom);
          console.log(`[ZOOM] Zoom in factor: ${nextZoom}`);
        } catch (e) {
          console.error('[ZOOM] Error Zoom In:', e);
        }
      }

      
      if (key === '-') {
        event.preventDefault();
        try {
          const currentZoom = contents.getZoomFactor();
          const nextZoom = Math.max(currentZoom - 0.1, 0.5);
          contents.setZoomFactor(nextZoom);
          console.log(`[ZOOM] Zoom out factor: ${nextZoom}`);
        } catch (e) {
          console.error('[ZOOM] Error Zoom Out:', e);
        }
      }

      
      if (key === '0') {
        event.preventDefault();
        try {
          contents.setZoomFactor(1.0);
          console.log('[ZOOM] Zoom factor reset to 1.0');
        } catch (e) {
          console.error('[ZOOM] Error Zoom Reset:', e);
        }
      }

      // Close app on Ctrl+J (or Cmd+J) - ONLY when Shift is NOT pressed, so Ctrl+Shift+J (DevTools) is unaffected!
      if (key === 'j' && !input.shift && !input.alt) {
        event.preventDefault();
        console.log('[HOTKEY] Close application shortcut (Ctrl+J) triggered.');
        forceCloseApp();
      }
    }
  });
}


function shouldShowOnboarding() {
  if (process.argv.includes('--skip-onboarding') || process.env.SKIP_ONBOARDING === 'true') {
    return false;
  }
  if (onboardingShownThisSession) {
    return false;
  }
  const fs = require('fs');
  const fsPath = path.join(app.getPath('home'), '.ninja-hub-onboarding.json');
  if (fs.existsSync(fsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fsPath, 'utf8'));
      if (data.completed || data.skipped) {
        onboardingShownThisSession = true;
        return false;
      }
    } catch (e) {
      console.error('[ONBOARDING] Error reading onboarding status file:', e);
    }
  }
  return true;
}


function createWindow() {
  mainWindow = new BrowserWindow({
    show: false,           
    fullscreen: true,
    alwaysOnTop: true,
    kiosk: true,
    icon: iconPath,
    backgroundColor: '#1a1b1e',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,   
      spellcheck: false              
    },
  });

  registerKeyboardShortcuts(mainWindow.webContents);

  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  
  mainWindow.webContents.setWindowOpenHandler(handleWindowOpen);

  
  mainWindow.webContents.on('will-navigate', (_e, url) => console.log(`[NAV] ${url}`));
  mainWindow.webContents.on('did-navigate', (_e, url, code) => console.log(`[NAV-DONE] ${url} (${code})`));
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url, isMain) => {
    console.log(`[LOAD-FAIL] ${url} — ${desc} (${code}, main=${isMain})`);
  });

  
  mainWindow.on('minimize', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.restore();
        mainWindow.focus();
      }
    }, 150);
  });
  // Note: hide listener removed to allow seamless multi-window tab switching

  
  mainWindow.on('close', (event) => {
    if (!isAppQuitting && reopenTimer) {
      clearTimeout(reopenTimer);
      reopenTimer = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;

    if (!isAppQuitting) {
      reopenTimer = setTimeout(() => {
        reopenTimer = null;
        if (!mainWindow && !isAppQuitting) createWindow();
      }, 1000);
    }
  });

  
  if (shouldShowOnboarding()) {
    console.log('[ONBOARDING] Onboarding is required. Loading onboarding.html');
    mainWindow.loadFile(path.join(__dirname, 'onboarding.html'));
  } else {
    console.log('[ONBOARDING] Onboarding not required. Loading HOME_URL');
    mainWindow.loadURL(HOME_URL);
  }
}


app.whenReady().then(() => {
  const userAgent = process.platform === 'win32'
    ? WIN_UA
    : process.platform === 'darwin'
      ? MAC_UA
      : LINUX_UA;
  session.defaultSession.setUserAgent(userAgent);
  
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(true);
  });

  
  session.defaultSession.preconnect({ url: HOME_URL });
  
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(handleWindowOpen);
    registerKeyboardShortcuts(contents);
  });

  
  ipcMain.on('close-app', () => {
    forceCloseApp();
  });

  ipcMain.on('clear-cache-home', async () => {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData();
    
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

  // Multi-tab Management IPC Handlers
  ipcMain.handle('get-tab-initial-storage', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? pendingStorageForWindow.get(win.id) : null;
  });

  ipcMain.on('create-new-tab', async (event, customUrl) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    const curUrl = senderWin ? senderWin.webContents.getURL() : '';
    const isImpact = curUrl.toLowerCase().includes('impact.codeninjas.com');
    const isAcademy = curUrl.toLowerCase().includes('academies.codeninjas.com') || curUrl.toLowerCase().includes('academy.codeninjas.com');

    let targetUrl = customUrl || HOME_URL;
    if (!customUrl) {
      if (isImpact) {
        targetUrl = 'https://impact.codeninjas.com/home/dashboard';
      } else if (isAcademy) {
        targetUrl = curUrl || 'https://academies.codeninjas.com';
      }
    }

    let initialStorage = null;
    if ((isImpact || isAcademy) && senderWin) {
      try {
        const [ssData, lsData] = await Promise.all([
          senderWin.webContents.executeJavaScript('JSON.stringify(Object.fromEntries(Object.entries(sessionStorage)))').catch(() => '{}'),
          senderWin.webContents.executeJavaScript('JSON.stringify(Object.fromEntries(Object.entries(localStorage)))').catch(() => '{}')
        ]);
        initialStorage = { ssData, lsData };
      } catch (e) {
        console.error('[STORAGE-SYNC] Failed to extract source window storage:', e);
      }
    }

    createTabWindow(targetUrl, initialStorage);
  });

  ipcMain.on('switch-tab', (_event, windowId) => {
    const targetWin = BrowserWindow.fromId(windowId);
    if (!targetWin || targetWin.isDestroyed()) return;

    BrowserWindow.getAllWindows().forEach(w => {
      if (!w.isDestroyed()) {
        if (w.id === targetWin.id) {
          w.setAlwaysOnTop(true);
          w.show();
          w.focus();
        } else {
          w.setAlwaysOnTop(false);
          w.hide();
        }
      }
    });
    updateAllTabBars();
  });

  ipcMain.on('close-tab', (_event, windowId) => {
    const targetWin = BrowserWindow.fromId(windowId);
    if (!targetWin || targetWin.isDestroyed()) return;

    const windows = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed());

    // Do not close if only 1 window exists total
    if (windows.length <= 1) return;

    if (targetWin === mainWindow) {
      // If closing mainWindow, transfer URL to mainWindow from secondary tab to prevent app restart
      const otherWin = windows.find(w => w !== mainWindow);
      if (otherWin) {
        const nextUrl = otherWin.webContents.getURL();
        otherWin.destroy();
        mainWindow.loadURL(nextUrl);
        mainWindow.setAlwaysOnTop(true);
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      targetWin.close();
    }

    setTimeout(updateAllTabBars, 50);
  });

  
  
  const getParentUrl = (urlString) => {
    try {
      const url = new URL(urlString);
      
      url.search = '';
      url.hash = '';
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        pathParts.pop();
        url.pathname = '/' + pathParts.join('/');
        return url.toString();
      }
    } catch (e) {
      console.error('[GO-BACK] Error parsing parent URL:', e);
    }
    return null;
  };

  const isRootUrl = (urlString) => {
    try {
      const url = new URL(urlString);
      return url.pathname === '/' || url.pathname === '';
    } catch (e) {
      return true;
    }
  };

  ipcMain.on('go-back', (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    if (senderWin) {
      const canGoBack = senderWin.webContents.canGoBack();
      const url = senderWin.webContents.getURL();
      console.log(`[GO-BACK] Received request. URL: ${url}, canGoBack: ${canGoBack}, isMainWindow: ${senderWin === mainWindow}`);
      
      if (canGoBack) {
        senderWin.webContents.goBack();
        console.log(`[GO-BACK] Executed webContents.goBack()`);
      } else {
        
        const parentUrl = getParentUrl(url);
        const onRoot = isRootUrl(url);
        
        if (parentUrl && parentUrl !== url && !onRoot) {
          console.log(`[GO-BACK] Fallback: navigating to parent URL: ${parentUrl}`);
          senderWin.webContents.loadURL(parentUrl);
        } else if (senderWin !== mainWindow) {
          console.log(`[GO-BACK] Fallback: closing popup window`);
          senderWin.close();
        } else {
          console.log(`[GO-BACK] Fallback: loading HOME_URL in main window`);
          senderWin.webContents.loadURL(HOME_URL);
        }
      }
    } else {
      console.log(`[GO-BACK] Received request but sender window not found.`);
    }
  });

  
  ipcMain.handle('get-onboarding-status', () => {
    return { shouldShow: shouldShowOnboarding() };
  });

  ipcMain.on('onboarding-shown-session', () => {
    onboardingShownThisSession = true;
    console.log('[ONBOARDING] Onboarding marked as shown for this session.');
  });

  ipcMain.on('set-onboarding-status', (event, status) => {
    const fs = require('fs');
    const fsPath = path.join(app.getPath('home'), '.ninja-hub-onboarding.json');
    try {
      fs.writeFileSync(fsPath, JSON.stringify({
        completed: status === 'completed',
        skipped: status === 'skipped',
        timestamp: Date.now()
      }), 'utf8');
      console.log(`[ONBOARDING] Saved status: ${status}`);
    } catch (e) {
      console.error('[ONBOARDING] Error saving onboarding status:', e);
    }
    onboardingShownThisSession = true;

    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentUrl = mainWindow.webContents.getURL();
      if (currentUrl.startsWith('file:') && currentUrl.includes('onboarding.html')) {
        console.log('[ONBOARDING] Transitioning from local onboarding page to HOME_URL');
        mainWindow.loadURL(HOME_URL);
      }
    }
  });

  
  function isNewerVersion(current, latest) {
    const c = current.replace(/^v/, '').split('.').map(Number);
    const l = latest.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((l[i] || 0) > (c[i] || 0)) return true;
      if ((l[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
  }

  function checkForUpdates() {
    console.log('[UPDATE] Checking for updates...');
    const https = require('https');
    const options = {
      hostname: 'api.github.com',
      path: '/repos/codeninjasfl/Ninja-Hub-Desktop/releases/latest',
      headers: {
        'User-Agent': 'Ninja-Hub-Desktop-Updater'
      }
    };

    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        console.error(`[UPDATE] GitHub API returned status code ${res.statusCode}`);
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = release.tag_name;
          const currentVersion = app.getVersion();
          
          console.log(`[UPDATE] Latest version: ${latestVersion}, Current version: ${currentVersion}`);
          
          if (isNewerVersion(currentVersion, latestVersion)) {
            console.log('[UPDATE] A newer version is available!');
            latestReleaseInfo = release;
            updateShownThisSession = true;
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update-available', {
                latestVersion,
                currentVersion,
                releaseNotes: release.body
              });
            }
          } else {
            console.log('[UPDATE] App is up to date.');
          }
        } catch (e) {
          console.error('[UPDATE] Error parsing GitHub release data:', e);
        }
      });
    }).on('error', (err) => {
      console.error('[UPDATE] Error checking updates:', err);
    });
  }

  function downloadFile(fileUrl, outputPath, onProgress, onSuccess, onError) {
    const https = require('https');
    const http = require('http');
    const protocol = fileUrl.startsWith('https') ? https : http;

    protocol.get(fileUrl, { headers: { 'User-Agent': 'Ninja-Hub-Desktop-Updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, outputPath, onProgress, onSuccess, onError);
      }

      if (res.statusCode !== 200) {
        onError(new Error(`Failed to download: Status code ${res.statusCode}`));
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'], 10);
      let downloadedBytes = 0;

      const fs = require('fs');
      const fileStream = fs.createWriteStream(outputPath);
      res.pipe(fileStream);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100);
          onProgress(percent);
        }
      });

      fileStream.on('finish', () => {
        fileStream.close();
        onSuccess();
      });

      fileStream.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        onError(err);
      });
    }).on('error', onError);
  }

  function killOtherInstances() {
    const { execSync } = require('child_process');
    const myPid = process.pid;
    console.log(`[UPDATE] Force terminating any conflicting Ninja Hub Desktop instances (my PID: ${myPid})...`);
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /FI "PID ne ${myPid}" /IM "Ninja Hub Desktop.exe" /IM "ninja-hub-desktop.exe" 2>NUL`, { stdio: 'ignore' });
      } else if (process.platform === 'linux') {
        execSync(`pkill -f -o ninja-hub-desktop 2>/dev/null`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execSync(`pkill -f -o "Ninja Hub Desktop" 2>/dev/null`, { stdio: 'ignore' });
      }
    } catch (e) {
      // Ignore if no other processes found
    }
  }

  function installUpdate(installerPath) {
    killOtherInstances();
    const { spawn } = require('child_process');
    const platform = process.platform;
    console.log(`[UPDATE] Running installer: ${installerPath}`);

    if (platform === 'win32') {
      const child = spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      forceCloseApp();
    } else if (platform === 'linux') {
      const fs = require('fs');
      try {
        fs.chmodSync(installerPath, 0o755);
        const child = spawn(installerPath, [], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        forceCloseApp();
      } catch (err) {
        console.error('[UPDATE] Failed to run AppImage:', err);
      }
    } else {
      const { shell } = require('electron');
      shell.openPath(installerPath).then(() => {
        forceCloseApp();
      });
    }
  }

  
  ipcMain.on('check-for-update', (event) => {
    if (updateShownThisSession) {
      console.log('[UPDATE] Update already shown this session. Skipping check.');
      return;
    }
    if (!latestReleaseInfo) {
      checkForUpdates();
    } else {
      const latestVersion = latestReleaseInfo.tag_name;
      const currentVersion = app.getVersion();
      if (isNewerVersion(currentVersion, latestVersion)) {
        updateShownThisSession = true;
        event.sender.send('update-available', {
          latestVersion,
          currentVersion,
          releaseNotes: latestReleaseInfo.body
        });
      }
    }
  });

  ipcMain.on('update-shown-session', () => {
    updateShownThisSession = true;
    console.log('[UPDATE] Update marked as shown for this session.');
  });

  ipcMain.on('start-update-download', (event) => {
    if (!latestReleaseInfo) {
      event.sender.send('update-error', 'No update information available.');
      return;
    }

    const platform = process.platform;
    let extension = '';
    if (platform === 'win32') {
      extension = '.exe';
    } else if (platform === 'linux') {
      extension = '.appimage';
    } else if (platform === 'darwin') {
      extension = '.dmg';
    }

    const asset = latestReleaseInfo.assets.find(a => a.name.toLowerCase().endsWith(extension));
    if (!asset) {
      console.log(`[UPDATE] No asset matching platform ${platform} and extension ${extension}.`);
      event.sender.send('update-error', `Direct installer not found for ${platform}. Redirecting to download page.`);
      const { shell } = require('electron');
      shell.openExternal(latestReleaseInfo.html_url);
      return;
    }

    const tempDir = app.getPath('temp');
    const destPath = path.join(tempDir, asset.name);

    downloadFile(asset.browser_download_url, destPath,
      (percent) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-progress', percent);
        }
      },
      () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-complete');
        }
        setTimeout(() => {
          installUpdate(destPath);
        }, 1500);
      },
      (err) => {
        console.error('[UPDATE] Download error:', err);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-error', err.message);
        }
      }
    );
  });

  createWindow();

  // Trigger update check on startup before user login
  setTimeout(() => {
    checkForUpdates();
  }, 2000);

});

app.on('window-all-closed', () => {
  if (!isAppQuitting) {
    return;
  }
  app.exit(0);
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
