// Popup.js
const toggleEnabled = document.getElementById('toggleEnabled');
const toggleFlicker = document.getElementById('toggleFlicker');
const toggleBoot = document.getElementById('toggleBoot');
const toggleSite = document.getElementById('toggleSite');
const siteLabel = document.getElementById('siteLabel');
const themeButtons = document.querySelectorAll('.theme-btn');

let currentDomain = '';

function loadSettings() {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
    if (!settings) return;

    toggleEnabled.checked = settings.enabled;
    toggleFlicker.checked = settings.flicker !== false;
    toggleBoot.checked = settings.bootSequence !== false;

    themeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === settings.theme);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          currentDomain = url.hostname.replace(/^www\./, '');
          siteLabel.textContent = currentDomain;
          
          const siteEnabled = settings.perSite?.[currentDomain] !== false;
          toggleSite.checked = siteEnabled;
        } catch (e) {
          siteLabel.textContent = 'This site';
          toggleSite.checked = true;
        }
      }
    });
  });
}

function updateSettings(partial) {
  chrome.runtime.sendMessage({
    type: 'UPDATE_SETTINGS',
    settings: partial
  });
}

toggleEnabled.addEventListener('change', () => {
  updateSettings({ enabled: toggleEnabled.checked });
});

toggleFlicker.addEventListener('change', () => {
  updateSettings({ flicker: toggleFlicker.checked });
});

toggleBoot.addEventListener('change', () => {
  updateSettings({ bootSequence: toggleBoot.checked });
});

toggleSite.addEventListener('change', () => {
  if (currentDomain) {
    chrome.runtime.sendMessage({
      type: 'TOGGLE_SITE',
      domain: currentDomain,
      enabled: toggleSite.checked
    });
  }
});

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    updateSettings({ theme });
    themeButtons.forEach(b => b.classList.toggle('active', b === btn));
  });
});

loadSettings();
