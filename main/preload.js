const { ipcRenderer } = require('electron');


if (window.top !== window.self) return;


const onboardingStatusPromise = ipcRenderer.invoke('get-onboarding-status');


const animatePage = () => {
  if (document.documentElement) {
    document.documentElement.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], { duration: 350, easing: 'ease-out', fill: 'forwards' });
  }
};
animatePage();


window.addEventListener('DOMContentLoaded', () => {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'closed' });

  Object.assign(host.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    zIndex: '2147483647', pointerEvents: 'none',
    margin: '0', padding: '0', border: 'none',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  });
  document.documentElement.appendChild(host);

  
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
      position: absolute; top: 0; left: 0; width: calc(100% - 220px); height: 32px;
      pointer-events: auto;
    }
    .game-trigger {
      position: absolute; top: 0; right: 0; width: 220px; height: 32px;
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
    .game-tab {
      position: absolute; top: -80px; right: 20px;
      background: rgba(14,41,55,0.96);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      padding: 10px 20px; border-radius: 0 0 10px 10px;
      display: flex; align-items: center; gap: 6px;
      color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
      transition: top 0.35s cubic-bezier(0.16,1,0.3,1), background 0.15s;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      pointer-events: auto;
      border: 1px solid rgba(255,255,255,0.08); border-top: none;
      z-index: 2147483646;
    }
    .game-tab.visible { top: 0; }
    .game-tab:hover { background: rgba(211, 84, 0, 0.95); }

    /* Onboarding & Update Modal Backdrop */
    .modal-backdrop {
      position: absolute; inset: 0;
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0;
      transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                  background 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                  backdrop-filter 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                  -webkit-backdrop-filter 0.6s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: none; z-index: 2147483640;
    }
    .modal-backdrop.visible {
      opacity: 1; pointer-events: auto;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    }
    .modal-backdrop.fade-out {
      opacity: 0; pointer-events: none;
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
      transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    
    /* Onboarding & Update Modal Box */
    .modal-content {
      position: relative;
      background: linear-gradient(145deg, #0e2937 0%, #153c50 100%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.3),
                  inset 0 1px 2px rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      width: 580px; max-width: 90vw;
      padding: 36px; color: #fff;
      display: flex; flex-direction: column; gap: 22px;
      box-sizing: border-box;
      pointer-events: auto;
      transform: translateY(30px) scale(0.96);
      opacity: 0;
      transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                  opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .modal-backdrop.visible .modal-content {
      transform: translateY(0) scale(1);
      opacity: 1;
      transition-delay: 0.12s;
    }
    .modal-backdrop.fade-out .modal-content {
      transform: translateY(-16px) scale(0.97);
      opacity: 0;
      transition-delay: 0s;
    }
    
    .modal-close-btn {
      position: absolute; top: 16px; right: 16px;
      background: transparent; border: none; color: rgba(255, 255, 255, 0.4);
      font-size: 24px; font-weight: 300; cursor: pointer;
      transition: color 0.15s, transform 0.15s, background-color 0.15s;
      line-height: 1; padding: 4px 8px; border-radius: 4px;
      pointer-events: auto;
    }
    .modal-close-btn:hover {
      color: #ff6b6b; transform: scale(1.1);
      background: rgba(255, 255, 255, 0.05);
    }
    
    .modal-header {
      display: flex; align-items: center; gap: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 18px;
    }
    .modal-logo {
      width: 44px; height: 44px; object-fit: contain;
    }
    .modal-title {
      margin: 0; font-size: 22px; font-weight: 800;
      background: linear-gradient(90deg, #ffffff, #187ABF);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      letter-spacing: 0.5px;
    }
    .modal-body {
      font-size: 14px; line-height: 1.6; color: #e2e8f0;
      min-height: 200px; position: relative;
    }
    
    /* Slides with crossfade animation */
    .onboard-slide {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; gap: 14px; justify-content: center;
      opacity: 0;
      transform: translateX(20px);
      transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                  transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: none;
    }
    .onboard-slide.active {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
      position: relative;
    }
    .onboard-slide.exit-left {
      opacity: 0;
      transform: translateX(-20px);
    }
    .onboard-slide p {
      margin: 0 0 6px 0; color: #a0aec0; font-size: 13.5px;
    }
    .feature-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px; padding: 12px 16px;
      display: flex; align-items: center; gap: 14px;
      transition: background 0.2s, border-color 0.2s, transform 0.2s;
    }
    .feature-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateX(3px);
    }
    .feature-icon {
      font-size: 24px; min-width: 32px; text-align: center;
    }
    .feature-details {
      display: flex; flex-direction: column; gap: 2px;
    }
    .feature-details h4 {
      margin: 0; font-size: 14.5px; font-weight: 700; color: #187ABF;
    }
    .feature-details p {
      margin: 0; font-size: 12.5px; color: #cbd5e0;
    }
    
    /* Keyboard keys styling */
    .kbd {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 5px; padding: 3px 7px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700; font-size: 11.5px; color: #fff;
      box-shadow: 0 2px 0 rgba(0,0,0,0.3);
      display: inline-block; margin: 0 2px;
    }
    
    .modal-footer {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 18px;
    }
    
    /* Navigation dots */
    .dots {
      display: flex; gap: 7px;
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      cursor: pointer;
    }
    .dot:hover {
      background: rgba(255, 255, 255, 0.4);
    }
    .dot.active {
      background: #187ABF; width: 22px; border-radius: 4px;
    }
    
    .footer-btns {
      display: flex; gap: 10px;
    }
    
    /* Progress bar for downloads */
    .progress-container {
      width: 100%; height: 12px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 6px; overflow: hidden;
      margin-top: 15px; border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .progress-bar {
      width: 0%; height: 100%;
      background: linear-gradient(90deg, #187ABF, #0db88f);
      transition: width 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      border-radius: 6px;
    }
    .progress-status {
      font-size: 12px; color: #a0aec0; margin-top: 6px;
      text-align: right;
    }
    
    .release-notes {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px; padding: 12px;
      max-height: 120px; overflow-y: auto;
      font-size: 12px; color: #cbd5e0; margin-top: 10px;
      font-family: inherit; line-height: 1.5;
    }
    .release-notes::-webkit-scrollbar {
      width: 6px;
    }
    .release-notes::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }
    .release-notes::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }
  `;
  shadow.appendChild(css);

  
  const url = window.location.href.toLowerCase();
  const isOnboardingPage = url.startsWith('file:');
  const isLogin = url.includes('login') || url.includes('auth') || url.includes('signin') || url.includes('oauth') || url.includes('b2c');
  const isBootPage = url.includes('ninjahub.codeninjas.com') && !url.includes('/dashboard');

  let overlay = null;
  const showLoadingOverlay = !isLogin && !isBootPage && !isOnboardingPage;

  if (showLoadingOverlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.background = 'linear-gradient(135deg,#0e2937,#187ABF)';
    const txt = document.createElement('span');
    txt.textContent = 'Loading…';
    overlay.appendChild(txt);
    shadow.appendChild(overlay);
  }

  const hideOverlay = () => {
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(() => overlay.remove(), 450);
    }
  };

  if (showLoadingOverlay) {
    if (document.readyState === 'complete') {
      hideOverlay();
    } else {
      window.addEventListener('load', hideOverlay, { once: true });
      
      setTimeout(hideOverlay, 6000);
    }
  }

  
  const gameTrigger = document.createElement('div');
  gameTrigger.className = 'game-trigger';

  const gameTab = document.createElement('div');
  gameTab.className = 'game-tab';
  gameTab.textContent = '🛠️ GameBuilding Session';
  gameTab.addEventListener('click', () => {
    window.location.href = 'https://forms.codeninjas.com/gamebuilding';
  });

  let gameHideTimer;
  const showGame = () => { clearTimeout(gameHideTimer); gameTab.classList.add('visible'); };
  const hideGame = () => { gameHideTimer = setTimeout(() => gameTab.classList.remove('visible'), 350); };
  gameTrigger.addEventListener('mouseenter', showGame);
  gameTab.addEventListener('mouseenter', showGame);
  gameTrigger.addEventListener('mouseleave', hideGame);
  gameTab.addEventListener('mouseleave', hideGame);

  if (!isOnboardingPage) {
    shadow.append(gameTrigger, gameTab);
  }

  
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
  const closeBtn  = mkBtn('❌ Exit App',  '#c0392b', () => ipcRenderer.send('close-app'));

  if (!isOnboardingPage) {
    toolbar.append(backBtn, homeBtn, logoutBtn, closeBtn);
    shadow.append(trigger, toolbar);
  }

  
  let lastUrl = '';
  const updateButtons = () => {
    const cur = window.location.href.toLowerCase();
    if (cur === lastUrl) return; 
    lastUrl = cur;

    const onLogin = cur.includes('login') || cur.includes('auth') ||
                    cur.includes('signin') || cur.includes('oauth') || cur.includes('b2c');
    const onDash  = cur.includes('ninjahub.codeninjas.com/dashboard');
    const onNinjaHubLogin = cur.includes('ninjahub.codeninjas.com') && !cur.includes('/dashboard');
    const isHome  = onDash || onNinjaHubLogin || cur === 'https://ninjahub.codeninjas.com' || cur === 'https://ninjahub.codeninjas.com/';
    const isNinjaHubPortal = cur.includes('ninjahub.codeninjas.com') || cur.includes('codeninjas.com');
    const isMakeCodeProject = cur.includes('makecode') || cur.includes('arcade');

    homeBtn.style.display   = (onLogin || isHome) ? 'none' : '';
    logoutBtn.style.display = (onLogin || onDash) ? 'none' : '';
    gameTrigger.style.display = onNinjaHubLogin ? 'block' : 'none';
    gameTab.style.display     = onNinjaHubLogin ? 'flex' : 'none';

    backBtn.style.display = (onLogin || isHome || (isNinjaHubPortal && !isMakeCodeProject)) ? 'none' : '';
  };

  
  const logoSVG = `
    <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#0E2937" stroke="#187ABF" stroke-width="2"/>
      <path d="M16 28C16 25 24 18 32 18C40 18 48 25 48 28C48 34 32 46 32 46C32 46 16 34 16 28Z" fill="#187ABF"/>
      <circle cx="32" cy="28" r="6" fill="#0db88f"/>
      <path d="M22 28H42" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  
  const showModal = (backdrop) => {
    shadow.appendChild(backdrop);
    
    backdrop.offsetHeight;
    requestAnimationFrame(() => {
      backdrop.classList.add('visible');
    });
  };

  const dismissModal = (backdrop) => {
    backdrop.classList.remove('visible');
    backdrop.classList.add('fade-out');
    setTimeout(() => {
      if (backdrop.parentNode) backdrop.remove();
    }, 500);
  };

  
  
  
  const initOnboarding = (status) => {
    
    if (sessionStorage.getItem('__nhd_onboarding_shown')) return Promise.resolve();

    return new Promise((resolve) => {
      if (!status || !status.shouldShow) {
        sessionStorage.setItem('__nhd_onboarding_shown', '1');
        return resolve();
      }

      
      sessionStorage.setItem('__nhd_onboarding_shown', '1');
      ipcRenderer.send('onboarding-shown-session');

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';

      const content = document.createElement('div');
      content.className = 'modal-content';

      
      const header = document.createElement('div');
      header.className = 'modal-header';
      const logoWrap = document.createElement('div');
      logoWrap.innerHTML = logoSVG;
      const logo = logoWrap.firstElementChild;
      logo.className = 'modal-logo';
      const title = document.createElement('h3');
      title.className = 'modal-title';
      title.textContent = 'Welcome, Sensei';
      header.append(logo, title);

      
      const body = document.createElement('div');
      body.className = 'modal-body';

      const slidesData = [
        {
          title: 'Welcome to Ninja Hub Desktop',
          html: `
            <p>This secure kiosk application is built exclusively for Code Ninjas labs. Here's what makes it special:</p>
            <div class="feature-card">
              <div class="feature-icon">🔒</div>
              <div class="feature-details">
                <h4>Secure Kiosk Lockdown</h4>
                <p>Students cannot access browser controls, URL bars, or navigate outside approved learning domains.</p>
              </div>
            </div>
            <div class="feature-card" style="margin-top: 10px;">
              <div class="feature-icon">🚀</div>
              <div class="feature-details">
                <h4>High-Performance Rendering</h4>
                <p>GPU acceleration and optimized SSO handling ensure lightning-fast portal transitions.</p>
              </div>
            </div>
          `
        },
        {
          title: 'Navigation & Session Drawers',
          html: `
            <p>Hover at the top edge of the screen to reveal hidden Sensei drawers and controls:</p>
            <div class="feature-card">
              <div class="feature-icon">🏠</div>
              <div class="feature-details">
                <h4>Main Toolbar</h4>
                <p>Hover the center-top of the screen. Access Back, Home, and Log Out controls.</p>
              </div>
            </div>
            <div class="feature-card" style="margin-top: 10px;">
              <div class="feature-icon">🛠️</div>
              <div class="feature-details">
                <h4>GameBuilding Session</h4>
                <p>Hover the top-right corner on the login screen to access the GameBuilding form.</p>
              </div>
            </div>
          `
        },
        {
          title: 'Keyboard Shortcuts',
          html: `
            <p>Use these keyboard shortcuts to manage the kiosk:</p>
            <div class="feature-card">
              <div class="feature-icon">🔍</div>
              <div class="feature-details">
                <h4>Zoom Controls</h4>
                <p><span class="kbd">Ctrl</span> + <span class="kbd">+</span> zoom in · <span class="kbd">Ctrl</span> + <span class="kbd">-</span> zoom out · <span class="kbd">Ctrl</span> + <span class="kbd">0</span> reset</p>
              </div>
            </div>
            <div class="feature-card" style="margin-top: 10px;">
              <div class="feature-icon">🚪</div>
              <div class="feature-details">
                <h4>Close Application</h4>
                <p>Press <span class="kbd">Ctrl</span> + <span class="kbd">J</span> to exit the kiosk. Keep this shortcut from students.</p>
              </div>
            </div>
          `
        }
      ];

      
      const slideEls = [];
      slidesData.forEach((s, i) => {
        const el = document.createElement('div');
        el.className = 'onboard-slide' + (i === 0 ? ' active' : '');

        const h = document.createElement('h4');
        h.style.cssText = 'margin:0 0 10px 0; font-size:16px; color:#187ABF;';
        h.textContent = s.title;

        const c = document.createElement('div');
        c.innerHTML = s.html;

        el.append(h, c);
        body.appendChild(el);
        slideEls.push(el);
      });

      
      const footer = document.createElement('div');
      footer.className = 'modal-footer';

      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'dots';
      const dotEls = [];
      slidesData.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 'dot' + (i === 0 ? ' active' : '');
        dotsWrap.appendChild(d);
        dotEls.push(d);
      });

      const btns = document.createElement('div');
      btns.className = 'footer-btns';

      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn';
      skipBtn.style.cssText = 'background:transparent; border:1px solid rgba(255,255,255,0.2);';
      skipBtn.textContent = 'Skip';

      const backBtn = document.createElement('button');
      backBtn.className = 'btn';
      backBtn.style.cssText = 'background:rgba(255,255,255,0.1); display:none;';
      backBtn.textContent = 'Back';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn';
      nextBtn.style.background = '#187ABF';
      nextBtn.textContent = 'Next';

      btns.append(skipBtn, backBtn, nextBtn);
      footer.append(dotsWrap, btns);
      content.append(header, body, footer);
      backdrop.appendChild(content);

      
      let cur = 0;
      const goTo = (next, direction) => {
        if (next === cur || next < 0 || next >= slidesData.length) return;

        
        slideEls[cur].classList.remove('active');
        slideEls[cur].classList.add(direction === 'forward' ? 'exit-left' : '');
        slideEls[cur].style.transform = direction === 'forward' ? 'translateX(-20px)' : 'translateX(20px)';
        dotEls[cur].classList.remove('active');

        
        slideEls[next].style.transform = direction === 'forward' ? 'translateX(20px)' : 'translateX(-20px)';
        slideEls[next].offsetHeight; 
        slideEls[next].classList.add('active');
        slideEls[next].classList.remove('exit-left');
        slideEls[next].style.transform = '';
        dotEls[next].classList.add('active');

        cur = next;
        backBtn.style.display = cur === 0 ? 'none' : 'block';
        nextBtn.textContent = cur === slidesData.length - 1 ? 'Finish' : 'Next';
        nextBtn.style.background = cur === slidesData.length - 1 ? '#0db88f' : '#187ABF';
      };

      const finish = (status) => {
        ipcRenderer.send('set-onboarding-status', status);
        dismissModal(backdrop);
        setTimeout(resolve, 550);
      };

      nextBtn.addEventListener('click', () => {
        if (cur < slidesData.length - 1) goTo(cur + 1, 'forward');
        else finish('completed');
      });
      backBtn.addEventListener('click', () => {
        if (cur > 0) goTo(cur - 1, 'backward');
      });
      skipBtn.addEventListener('click', () => finish('skipped'));

      
      dotEls.forEach((d, i) => {
        d.addEventListener('click', () => {
          if (i !== cur) goTo(i, i > cur ? 'forward' : 'backward');
        });
      });

      showModal(backdrop);
    });
  };

  
  
  
  const initUpdateModal = () => {
    
    if (sessionStorage.getItem('__nhd_update_shown')) return;

    ipcRenderer.on('update-available', (event, info) => {
      
      if (sessionStorage.getItem('__nhd_update_shown')) return;
      sessionStorage.setItem('__nhd_update_shown', '1');
      ipcRenderer.send('update-shown-session');

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';

      const content = document.createElement('div');
      content.className = 'modal-content';

      
      const header = document.createElement('div');
      header.className = 'modal-header';
      const logoWrap = document.createElement('div');
      logoWrap.innerHTML = logoSVG;
      const logo = logoWrap.firstElementChild;
      logo.className = 'modal-logo';
      const title = document.createElement('h3');
      title.className = 'modal-title';
      title.textContent = 'Update Available';
      header.append(logo, title);

      
      const body = document.createElement('div');
      body.className = 'modal-body';
      body.style.minHeight = 'auto';

      const msg = document.createElement('p');
      msg.innerHTML = `A new version of <strong>Ninja Hub Desktop</strong> is available.`;

      const ver = document.createElement('div');
      ver.style.cssText = 'margin:10px 0; display:flex; gap:16px; font-size:13.5px;';
      ver.innerHTML = `
        <div>Latest: <span style="color:#0db88f; font-weight:bold;">v${info.latestVersion}</span></div>
        <div>Current: <span style="color:#cbd5e0;">v${info.currentVersion}</span></div>
      `;

      const notesLabel = document.createElement('div');
      notesLabel.style.cssText = 'font-size:12px; color:#a0aec0; margin-top:10px;';
      notesLabel.textContent = 'Release Notes:';

      const notes = document.createElement('div');
      notes.className = 'release-notes';
      notes.textContent = info.releaseNotes || 'No release notes provided.';

      const progressWrap = document.createElement('div');
      progressWrap.style.cssText = 'display:none; flex-direction:column;';
      const progressBarWrap = document.createElement('div');
      progressBarWrap.className = 'progress-container';
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      const progressStatus = document.createElement('div');
      progressStatus.className = 'progress-status';
      progressStatus.textContent = 'Preparing download…';
      progressBarWrap.appendChild(progressBar);
      progressWrap.append(progressBarWrap, progressStatus);

      body.append(msg, ver, notesLabel, notes, progressWrap);

      
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.style.justifyContent = 'flex-end';

      const btns = document.createElement('div');
      btns.className = 'footer-btns';

      const laterBtn = document.createElement('button');
      laterBtn.className = 'btn';
      laterBtn.style.cssText = 'background:transparent; border:1px solid rgba(255,255,255,0.2);';
      laterBtn.textContent = 'Later';

      const updateBtn = document.createElement('button');
      updateBtn.className = 'btn';
      updateBtn.style.background = 'linear-gradient(90deg, #187ABF, #0db88f)';
      updateBtn.textContent = 'Update Now';

      btns.append(laterBtn, updateBtn);
      footer.appendChild(btns);
      content.append(header, body, footer);
      backdrop.appendChild(content);

      
      const onProgress = (_, pct) => {
        progressBar.style.width = `${pct}%`;
        progressStatus.textContent = `Downloading update… ${pct}%`;
      };
      const onComplete = () => {
        progressBar.style.width = '100%';
        progressBar.style.background = '#0db88f';
        progressStatus.style.color = '#0db88f';
        progressStatus.textContent = 'Download complete. Launching installer…';
      };
      const onError = (_, errMsg) => {
        progressStatus.style.color = '#ff6b6b';
        progressStatus.textContent = `Error: ${errMsg}`;
        updateBtn.disabled = false;
        updateBtn.textContent = 'Retry';
        laterBtn.style.display = 'block';
      };

      laterBtn.addEventListener('click', () => {
        ipcRenderer.off('update-download-progress', onProgress);
        ipcRenderer.off('update-download-complete', onComplete);
        ipcRenderer.off('update-error', onError);
        dismissModal(backdrop);
      });

      updateBtn.addEventListener('click', () => {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Updating…';
        laterBtn.style.display = 'none';
        progressWrap.style.display = 'flex';

        ipcRenderer.on('update-download-progress', onProgress);
        ipcRenderer.on('update-download-complete', onComplete);
        ipcRenderer.on('update-error', onError);
        ipcRenderer.send('start-update-download');
      });

      showModal(backdrop);
    });

    ipcRenderer.send('check-for-update');
  };

  
  
  const startModals = async () => {
    try {
      const status = await onboardingStatusPromise;
      if (isOnboardingPage) {
        if (!status || !status.shouldShow) {
          ipcRenderer.send('go-home');
          return;
        }
        await initOnboarding(status);
      } else {
        const shouldShow = status && status.shouldShow && !sessionStorage.getItem('__nhd_onboarding_shown');
        if (shouldShow) {
          hideOverlay();
        }
        await initOnboarding(status);
        
        await new Promise(r => setTimeout(r, 600));
        initUpdateModal();
      }
    } catch (e) {
      console.error('[MODALS] Error starting modals:', e);
    }
  };

  if (!isBootPage) {
    startModals();
  }

  updateButtons();
  setInterval(updateButtons, 600);

  
  const pin = () => {
    const r = host.getBoundingClientRect();
    if (Math.abs(r.top) > 1) {
      host.style.top = (parseFloat(host.style.top || 0) - r.top) + 'px';
    }
  };
  window.addEventListener('scroll', pin, { passive: true });
  setInterval(pin, 2000);
});
