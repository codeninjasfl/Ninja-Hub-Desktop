<div align="center">
  <img src="assets/mainlogo.png" alt="Ninja Hub Desktop" width="200" />
  <h1>Ninja Hub Desktop</h1>
  <p><strong>A highly optimized, fullscreen kiosk desktop application exclusively for Ninja Hub.</strong></p>
</div>

---

## 🚀 Overview

**Ninja Hub Desktop** is a lightning-fast, secure, and fully customized desktop client designed to wrap the Ninja Hub portal. Built using [Electron](https://www.electronjs.org/), this application strips away standard web browser clutter, preventing navigation outside of the approved ecosystem and delivering a true native desktop experience for students and staff.

## ✨ Features

- 🖥️ **True Fullscreen Experience**: Borderless, immersive fullscreen window optimized for kiosks and lab environments.
- 🎨 **Fluid Page Animations**: Automatically injects native-feeling "Fade & Scale" animations via the Web Animations API on every page load to eliminate harsh white flashes and clunky web transitions.
- 🔒 **Secure Navigation**: No URL bar, no arbitrary popups. External links are intercepted and kept safely within the window.
- 🧰 **Hidden Control Toolbar**: Move your mouse to the top edge of the screen to reveal a dynamic, blurred drop-down toolbar featuring:
  - **🏠 Home**: Instantly returns to the Ninja Hub dashboard without dropping your active session.
  - **⟳ Log Out**: Instantly clears the local cache, active cookies, and session data, securely returning the user to the login screen.
  - **✕ Close App**: Gracefully terminates the application.
- 🧠 **Context-Aware Controls**: The toolbar intelligently monitors authentication states—automatically hiding the *Home* and *Log Out* buttons while the user is on login screens to prevent navigation confusion.
- 🌍 **Cross-Platform Native Integration**: Deeply integrated into the host OS, rendering the official Code Ninjas logo natively into Windows taskbars, Linux app trays, and the macOS Dock.

## 📦 Releases & Architecture

This application is built natively for **Windows**, **Linux**, and **macOS** utilizing `electron-builder` for minimal payload sizes, broad deployment flexibility, and absolute kiosk environment lockdown.

Check the GitHub Releases tab for pre-compiled binaries:
- **Windows**: `.exe` (NSIS Installer) and Portable `.exe` (x64)
- **Linux**: `.AppImage` (Universal executable), `.deb`, and `.tar.gz` (x64)
- **macOS**: `.dmg` Installer (supporting both Intel `x64` and Apple Silicon `arm64`)

### 🔑 Microsoft Azure Intune & Conditional Access Bypass
On macOS, strict Azure/Intune MDM and Conditional Access policies often block custom Electron web wrappers because of mismatched OS reporting or custom agent signatures. This release implements custom **User-Agent spoofing** that mirrors standard macOS Google Chrome. By aligning browser OS headers with Apple device profiles and completely stripping all "Electron" markers from requests, single sign-on (SSO) login screens pass authentication checks without MDM blockages.

## 🛠️ Development & Building

To compile the application yourself, ensure you have [Node.js](https://nodejs.org/) (v18+) installed, then run the following commands:

```bash
# Clone the repository
git clone https://github.com/codeninjasfl/Ninja-Hub-Desktop.git

# Navigate into the directory
cd Ninja-Hub-Desktop

# Install dependencies
npm install

# Start the application in development mode
npm start

# Compile for a specific platform
npm run build:win      # Compile Windows x64 NSIS/Portable
npm run build:linux    # Compile Linux x64 deb/AppImage/tar.gz
npm run build:mac      # Compile macOS DMG (Universal x64/arm64)

# Compile for all platforms at once
npm run build
```

## 🚀 Release v2.1.0 Updates & Features

The v2.1.0 release brings discrete multi-tab support for Academies and Impact, session persistence, automatic process cleanup for updates, and developer debugging tools:

### 🗂️ Discrete Multi-Tab Management (Academies & Impact)
- **Discrete Chrome Tabs**: Clean, dark-themed tabs for managing multiple activities and past projects simultaneously.
- **Seamless Viewport Aspect Ratio Shift**: Translates the page layout down by 32px when tabs are active, keeping all web page controls and headers fully accessible without scaling distortion or black borders.
- **Automatic 1-Tab Lockdown**: The tab bar automatically hides completely (`display: none`) when only a single tab is open, giving students 100% of the screen.
- **Session & Auth Duplication**: Opening a new tab on Impact or Academies automatically clones `sessionStorage` and `localStorage` tokens, maintaining active Azure B2C login states across tabs without re-logging in.
- **External Activity Tab Opening**: External activity links (MakeCode, Scratch, Codio, etc.) automatically open as separate tab windows.
- **Zero-Refresh Tab Closing**: Closing a tab seamlessly closes the window and updates remaining tabs without reloading the app or restarting `mainWindow`.

### 🔄 Pre-Login Autoupdate & Process Cleanup
- **Early Update Alerts**: Update checks run prior to user authentication.
- **Conflicting Process Termination**: Automatically terminates competing background instances during updates to ensure 100% update completion.

## 🚀 Release v2.0.0 & v2.0.1 Updates & Features

The v2.0 releases bring major platform updates, startup flow optimizations, and extended platform compatibility:

### 🚀 Launch Onboarding (v2.0.0)
- **Startup Onboarding**: Re-routed the first-launch Sensei onboarding tutorial to render immediately on startup using a local offline-safe `onboarding.html` rather than waiting for remote portal login pages to load.
- **Auto-Redirect**: Once onboarding is skipped or completed, the application writes a persistence status file and automatically transitions the window to the main Ninja Hub login portal.
- **Kiosk Close Options**: Added a Close App button directly onto the onboarding modal, enabling kiosk exit support on first-launch.

### 🔒 Clean Task Manager Process Exits (v2.0.0)
- **Force Exit Implementation**: Replaced all instances of `app.quit()` with `app.exit(0)` across key events (like the `Ctrl+J` shortcut, the toolbar's Close App drawer button, onboarding's Close button, and the autoupdater process spawn). This force-kills all active GPU processes, Chromium helper threads, and renderer nodes, preventing lingering zombie processes in Task Manager.

### 🍎 Full macOS MDM Conditional Access Support (v2.0.1)
- **Intune Bypass**: Added runtime session headers that override default User-Agent strings on macOS, masquerading the browser context as standard macOS Chrome and eliminating "Electron" string flags.
- **Universal dmg Build**: Re-added macOS target configurations to support native universal compilation on Apple Silicon and Intel hardware.
- **OS Lifecycle Handlers**: Restored macOS-specific menu and Dock `activate` listeners.

## 🚀 Release v1.2.0 Updates & Features

The v1.2.0 release brings layout refinements, navigation optimizations, and features for Code Ninjas Senseis:

### 🛠️ GameBuilding Session Integration
- **Contextual Sliding Tab**: A hidden drawer (`🛠️ GameBuilding Session`) is located at the top-right of the window. Hovering your mouse in the top-right corner reveals the tab. Clicking it redirects directly to the GameBuilding session form (`https://forms.codeninjas.com/gamebuilding`).
- **Conditional Visibility**: The tab is context-aware; it only displays on the main Ninja Hub login screen and is automatically hidden when navigating elsewhere (e.g. the student dashboard).

### ⚡ Performance & Layout Refinements
- **Isolated Viewport Triggers**: The top hover boundary is split into two regions (`width: calc(100% - 220px)` on the left for the main app navigation drawer, and `width: 220px` on the right for the GameBuilding session drawer). This prevents both drawers from triggering simultaneously and eliminates overlapping hover listeners.
- **Hardware & External Site Compatibility**: Retained permissive permission handlers, certificate validation bypasses, and standard browser CORS flags. This ensures external educational platforms (e.g., Codio, Scratch Link, and other resources nested within Academies) and local robotics/hardware kits connect and load assets without issues.

### 🐛 Bug Fixes
- **Editor Auto-Refresh Loop Fixed**: Resolved a bug where background window/iframe requests (e.g., MakeCode Arcade simulators) were hijacked by the main window, causing the editor to auto-refresh every 10 seconds. Hijacking is now strictly restricted to Code Ninjas portal domains.
## 📄 License & Attribution

This project was built to interface with Ninja Hub. All associated branding, logos (`mainlogo.png`), and trademarks belong to **Code Ninjas**.

**Created and maintained by Brennan Shea (Code Ninjas FL).**

