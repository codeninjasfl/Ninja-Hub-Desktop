const { ipcRenderer } = require('electron');

// Only inject UI into the top-level frame
if (window.top !== window.self) return;

// ─── Smooth page entrance animation ─────────────────────────────────────────
const animatePage = () => {
  if (document.documentElement) {
    document.documentElement.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], { duration: 350, easing: 'ease-out', fill: 'forwards' });
  }
};
animatePage();

// ─── Kiosk UI Injection ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Host container — fixed to viewport, above everything
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'closed' });

  Object.assign(host.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    zIndex: '2147483647', pointerEvents: 'none',
    margin: '0', padding: '0', border: 'none',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  });
  document.documentElement.appendChild(host);

  // ─── Styles ───────────────────────────────────────────────────────────────
  const css = document.createElement('style');
  css.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50%      { opacity: 1; }
    }
    .overlay {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;
      transition: opacity 0.4s ease-out;
      pointer-events: auto;
    }
    .overlay span { animation: pulse 1.4s ease-in-out infinite; }
    .trigger {
      position: absolute; top: 0; left: 0; width: 100%; height: 18px;
      pointer-events: auto;
    }
    .toolbar {
      position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
      background: rgba(14,41,55,0.96);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      padding: 10px 22px; border-radius: 0 0 14px 14px;
      display: flex; gap: 14px;
      transition: top 0.35s cubic-bezier(0.16,1,0.3,1);
      box-shadow: 0 8px 28px rgba(0,0,0,0.45);
      pointer-events: auto;
      border: 1px solid rgba(255,255,255,0.08); border-top: none;
    }
    .toolbar.visible { top: 0; }
    .btn {
      border: none; color: #fff; padding: 9px 18px; border-radius: 7px;
      font-weight: 700; font-size: 13px; cursor: pointer;
      transition: background 0.15s, transform 0.15s;
      box-shadow: 0 3px 10px rgba(0,0,0,0.12);
      font-family: inherit; white-space: nowrap;
    }
    .btn:hover  { transform: translateY(-2px); filter: brightness(1.15); }
    .btn:active { transform: translateY(0); }
  `;
  shadow.appendChild(css);

  // ─── Loading Overlay ──────────────────────────────────────────────────────
  const url = window.location.href.toLowerCase();
  const isLogin = url.includes('login') || url.includes('auth') || url.includes('signin') || url.includes('oauth') || url.includes('b2c');
  const isBootPage = url.includes('ninjahub.codeninjas.com') && !url.includes('/dashboard');

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.style.background = isBootPage ? '#000' : 'linear-gradient(135deg,#0e2937,#187ABF)';

  if (!isBootPage) {
    const txt = document.createElement('span');
    txt.textContent = 'Loading…';
    overlay.appendChild(txt);
  }
  shadow.appendChild(overlay);

  const hideOverlay = () => {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => overlay.remove(), 450);
  };

  if (isLogin) {
    hideOverlay();
  } else if (document.readyState === 'complete') {
    hideOverlay();
  } else {
    window.addEventListener('load', hideOverlay, { once: true });
    // Fallback: hide after 6s even if 'load' never fires (IMPACT iframes can block it)
    setTimeout(hideOverlay, 6000);
  }

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  const trigger = document.createElement('div');
  trigger.className = 'trigger';

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  let hideTimer;
  const show = () => { clearTimeout(hideTimer); toolbar.classList.add('visible'); };
  const hide = () => { hideTimer = setTimeout(() => toolbar.classList.remove('visible'), 350); };
  trigger.addEventListener('mouseenter', show);
  toolbar.addEventListener('mouseenter', show);
  trigger.addEventListener('mouseleave', hide);
  toolbar.addEventListener('mouseleave', hide);

  const mkBtn = (label, bg, action) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = label;
    b.style.background = bg;
    b.addEventListener('click', action);
    return b;
  };

  const backBtn   = mkBtn('← Back',      '#8e44ad', () => ipcRenderer.send('go-back'));
  const homeBtn   = mkBtn('🏠 Home',     '#0db88f', () => ipcRenderer.send('go-home'));
  const logoutBtn = mkBtn('⟳ Log Out',   '#187ABF', () => ipcRenderer.send('clear-cache-home'));
  const closeBtn  = mkBtn('✕ Close App', '#e74c3c', () => ipcRenderer.send('close-app'));

  toolbar.append(backBtn, homeBtn, logoutBtn, closeBtn);
  shadow.append(trigger, toolbar);

  // ─── Context-aware button visibility ──────────────────────────────────────
  let lastUrl = '';
  const updateButtons = () => {
    const cur = window.location.href.toLowerCase();
    if (cur === lastUrl) return; // skip DOM work if URL hasn't changed
    lastUrl = cur;

    const onLogin = cur.includes('login') || cur.includes('auth') ||
                    cur.includes('signin') || cur.includes('oauth') || cur.includes('b2c');
    const onDash  = cur.includes('ninjahub.codeninjas.com/dashboard');

    homeBtn.style.display   = onLogin ? 'none' : '';
    logoutBtn.style.display = (onLogin || onDash) ? 'none' : '';

    const onAcademies     = cur.includes('academies.codeninjas.com');
    const onAcademiesRoot = cur === 'https://academies.codeninjas.com/' ||
                            cur === 'https://academies.codeninjas.com';
    backBtn.style.display = (onAcademies && !onAcademiesRoot) ? '' : 'none';
  };

  updateButtons();
  setInterval(updateButtons, 600);

  // ─── Keep host pinned to viewport top even if page transforms ─────────────
  const pin = () => {
    const r = host.getBoundingClientRect();
    if (Math.abs(r.top) > 1) {
      host.style.top = (parseFloat(host.style.top || 0) - r.top) + 'px';
    }
  };
  window.addEventListener('scroll', pin, { passive: true });
  setInterval(pin, 2000);
});
