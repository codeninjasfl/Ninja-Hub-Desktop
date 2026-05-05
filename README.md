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

This application is built natively for **Windows** and **Linux** utilizing `electron-builder` for minimal payload sizes and broad deployment flexibility.

Check the GitHub Releases tab for pre-compiled binaries:
- **Windows**: `.exe` (NSIS Installer) and Portable `.exe`
- **Linux**: `.AppImage` (Universal executable) and `.tar.gz`.

## 🚫 macOS Support Status

macOS is currently **unsupported** due to strict Microsoft Azure Intune and Conditional Access MDM policies that aggressively block Electron-based web wrappers on Apple devices. For macOS usage, it is strictly recommended to use Google Chrome with the Windows 10 Accounts extension, or Safari with the Microsoft Enterprise SSO plug-in.

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

# Compile for all platforms (Windows and Linux)
npm run build:linux && npm run build:win
```

## 📄 License & Attribution

This project was built to interface with Ninja Hub. All associated branding, logos (`mainlogo.png`), and trademarks belong to **Code Ninjas**.

**Created and maintained by Brennan Shea (Code Ninjas FL).**
