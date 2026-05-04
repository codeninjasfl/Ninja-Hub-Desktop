const { ipcRenderer } = require('electron');

if (window.top !== window.self) return;

const animatePage = () => {
  if (document.documentElement) {
    document.documentElement.animate([
      { opacity: 0, transform: 'scale(0.98) translateY(10px)' },
      { opacity: 1, transform: 'scale(1) translateY(0)' }
    ], { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });
  }
};

animatePage();

window.addEventListener('DOMContentLoaded', () => {
  if (!document.documentElement.getAnimations().length) animatePage();

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'closed' });

  const setHostStyles = () => {
    Object.assign(host.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '2147483647',
      pointerEvents: 'none', display: 'block', margin: '0', padding: '0', border: 'none',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });
  };
  setHostStyles();
  document.body.appendChild(host);

  const url = window.location.href.toLowerCase();
  const isLoginScreen = url.includes('login') || url.includes('auth') || url.includes('signin') || url.includes('oauth') || url.includes('b2c');
  const isBootPage = url.includes('ninjahub.codeninjas.com') && !url.includes('dashboard');

  const loadingOverlay = document.createElement('div');
  Object.assign(loadingOverlay.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
    background: isBootPage ? '#000000' : 'linear-gradient(135deg, #0e2937 0%, #187ABF 100%)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    color: 'white', transition: 'opacity 0.5s ease-out', opacity: '1', pointerEvents: 'auto'
  });

  const loadingText = document.createElement('div');
  loadingText.textContent = 'Loading...';
  Object.assign(loadingText.style, {
    fontSize: '24px', fontWeight: 'bold', animation: 'pulse 1.5s infinite',
    display: isBootPage ? 'none' : 'block'
  });

  const style = document.createElement('style');
  style.textContent = `@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`;
  shadow.appendChild(style);
  loadingOverlay.appendChild(loadingText);
  shadow.appendChild(loadingOverlay);

  const trigger = document.createElement('div');
  Object.assign(trigger.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '15px', pointerEvents: 'auto' });

  const toolbar = document.createElement('div');
  Object.assign(toolbar.style, {
    position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(14, 41, 55, 0.95)', backdropFilter: 'blur(10px)', padding: '12px 24px',
    borderRadius: '0 0 16px 16px', display: 'flex', gap: '16px',
    transition: 'top 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.4)', pointerEvents: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none'
  });

  let hideTimeout;
  const showToolbar = () => { clearTimeout(hideTimeout); toolbar.style.top = '0'; };
  const hideToolbar = () => { hideTimeout = setTimeout(() => { toolbar.style.top = '-100px'; }, 400); };
  trigger.onmouseenter = showToolbar; toolbar.onmouseenter = showToolbar; trigger.onmouseleave = hideToolbar; toolbar.onmouseleave = hideToolbar;

  const createBtn = (text, bg, hoverBg, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      background: bg, border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px',
      fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    });
    btn.onmouseenter = () => { btn.style.background = hoverBg; btn.style.transform = 'translateY(-2px)'; };
    btn.onmouseleave = () => { btn.style.background = bg; btn.style.transform = 'translateY(0)'; };
    btn.onclick = onClick;
    return btn;
  };

  const backBtn = createBtn('← Back', '#8e44ad', '#732d91', () => ipcRenderer.send('go-back'));
  const homeBtn = createBtn('🏠 Home', '#0db88f', '#0a9b78', () => ipcRenderer.send('go-home'));
  const logoutBtn = createBtn('⟳ Log Out', '#187ABF', '#0067BE', () => ipcRenderer.send('clear-cache-home'));
  const closeBtn = createBtn('✕ Close App', '#ff6b6b', '#ff5252', () => ipcRenderer.send('close-app'));

  toolbar.appendChild(backBtn); toolbar.appendChild(homeBtn); toolbar.appendChild(logoutBtn); toolbar.appendChild(closeBtn);
  shadow.appendChild(trigger); shadow.appendChild(toolbar);

  const updateUI = () => {
    const currentUrl = window.location.href.toLowerCase();
    const isLogin = currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('signin') || currentUrl.includes('oauth') || currentUrl.includes('b2c');
    const isDash = currentUrl.includes('ninjahub.codeninjas.com/dashboard');
    
    homeBtn.style.display = isLogin ? 'none' : 'block';
    logoutBtn.style.display = (isLogin || isDash) ? 'none' : 'block';

    const isAcademies = currentUrl.includes('academies.codeninjas.com');
    const isAcademiesRoot = currentUrl === 'https://academies.codeninjas.com/' || currentUrl === 'https://academies.codeninjas.com';
    backBtn.style.display = (isAcademies && !isAcademiesRoot) ? 'block' : 'none';
  };

  const hideLoading = () => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
  };
  
  if (isLoginScreen) hideLoading();
  else if (document.readyState === 'complete') hideLoading(); 
  else window.addEventListener('load', hideLoading);

  const ensurePosition = () => {
    const rect = host.getBoundingClientRect();
    if (rect.top !== 0) host.style.top = (parseFloat(host.style.top || 0) - rect.top) + 'px';
  };
  window.addEventListener('scroll', ensurePosition); setInterval(ensurePosition, 1000);
  setInterval(updateUI, 500); updateUI();
});
