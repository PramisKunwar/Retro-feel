(function() {
  'use strict';

  let currentSettings = null;
  let crtOverlay = null;
  let commandPaletteEl = null;
  let commandOpen = false;

  function getDomain() {
    return window.location.hostname.replace(/^www\./, '');
  }

  function isEnabledForSite(settings) {
    if (!settings.enabled) return false;
    const domain = getDomain();
    if (settings.perSite && settings.perSite[domain] === false) return false;
    return true;
  }

  function createCRTOverlay() {
    if (crtOverlay) return;
    crtOverlay = document.createElement('div');
    crtOverlay.id = 'retrofy-crt-overlay';
    document.body.appendChild(crtOverlay);
  }

  function removeCRTOverlay() {
    if (crtOverlay) {
      crtOverlay.remove();
      crtOverlay = null;
    }
  }

  function showBootSequence(callback) {
    const overlay = document.createElement('div');
    overlay.id = 'retrofy-boot-overlay';

    const textEl = document.createElement('div');
    textEl.className = 'boot-text';
    overlay.appendChild(textEl);
    document.body.appendChild(overlay);

    const lines = [
      'RETROFY WEB v1.0.0',
      '(C) 2026 RETROFY SYSTEMS INC.',
      '',
      'Initializing retro interface...',
      'Loading display modules.......... OK',
      'Applying CRT filter.............. OK',
      'Font subsystem ready............. OK',
      'Terminal palette loaded........... OK',
      '',
      'System ready.',
      ''
    ];

    let lineIndex = 0;
    let charIndex = 0;
    let currentText = '';

    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '';

    function typeNext() {
      if (lineIndex >= lines.length) {
        setTimeout(() => {
          overlay.classList.add('fade-out');
          setTimeout(() => {
            overlay.remove();
            if (callback) callback();
          }, 400);
        }, 300);
        return;
      }

      const line = lines[lineIndex];
      if (charIndex <= line.length) {
        currentText = lines.slice(0, lineIndex).join('\n') + '\n' + line.substring(0, charIndex);
        textEl.textContent = currentText;
        textEl.appendChild(cursor);
        charIndex++;
        const delay = line[charIndex - 1] === '.' ? 15 : 25;
        setTimeout(typeNext, delay);
      } else {
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNext, 80);
      }
    }

    typeNext();
  }

  function applyTheme(settings) {
    const body = document.body;

    body.classList.remove('retrofy-theme-amber', 'retrofy-theme-green', 'retrofy-theme-white');

    if (settings.theme === 'green') {
      body.classList.add('retrofy-theme-green');
    } else if (settings.theme === 'white') {
      body.classList.add('retrofy-theme-white');
    }
  }
  function enableRetro(settings, withBoot = false) {
    const body = document.body;

    const doEnable = () => {
      body.classList.add('retrofy-active');
      if (settings.flicker) {
        body.classList.add('retrofy-flicker');
      } else {
        body.classList.remove('retrofy-flicker');
      }
      applyTheme(settings);
      createCRTOverlay();
    };

    if (withBoot && settings.bootSequence) {
      showBootSequence(doEnable);
    } else {
      doEnable();
    }
  }

  function disableRetro() {
    const body = document.body;
    body.classList.remove('retrofy-active', 'retrofy-flicker',
      'retrofy-theme-amber', 'retrofy-theme-green', 'retrofy-theme-white');
    removeCRTOverlay();
    closeCommandPalette();
  }

  function openCommandPalette() {
    if (commandPaletteEl) return;
    commandOpen = true;

    commandPaletteEl = document.createElement('div');
    commandPaletteEl.id = 'retrofy-command-palette';

    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = 'retrofy@web:~$';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type a command...';
    input.spellcheck = false;
    input.autocomplete = 'off';

    commandPaletteEl.appendChild(prompt);
    commandPaletteEl.appendChild(input);
    document.body.appendChild(commandPaletteEl);

    commandPaletteEl.style.pointerEvents = 'auto';

    setTimeout(() => input.focus(), 50);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim().toLowerCase();
        executeCommand(cmd);
        input.value = '';
      }
      if (e.key === 'Escape') {
        closeCommandPalette();
      }
    });
  }

  function closeCommandPalette() {
    if (commandPaletteEl) {
      commandPaletteEl.remove();
      commandPaletteEl = null;
    }
    commandOpen = false;
  }

  function showCommandOutput(text) {
    if (!commandPaletteEl) return;
    let output = commandPaletteEl.querySelector('.output');
    if (!output) {
      output = document.createElement('div');
      output.className = 'output';
      commandPaletteEl.appendChild(output);
    }
    output.textContent = text;
    setTimeout(() => {
      if (output) output.remove();
    }, 3000);
  }

  function executeCommand(cmd) {
    if (!cmd) return;

    if (cmd.startsWith('search ')) {
      const query = cmd.substring(7);
      window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(query);
      return;
    }

    if (cmd.startsWith('go ')) {
      let url = cmd.substring(3);
      if (!url.startsWith('http')) url = 'https://' + url;
      window.location.href = url;
      return;
    }

    if (cmd.startsWith('theme ')) {
      const theme = cmd.substring(6);
      if (['amber', 'green', 'white'].includes(theme)) {
        chrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          settings: { theme }
        });
        showCommandOutput('Theme set to ' + theme.toUpperCase());
      } else {
        showCommandOutput('Unknown theme. Available: amber, green, white');
      }
      return;
    }

    if (cmd === 'disable' || cmd === 'off') {
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { enabled: false }
      });
      closeCommandPalette();
      return;
    }

    if (cmd === 'enable' || cmd === 'on') {
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { enabled: true }
      });
      return;
    }

    if (cmd === 'help') {
      showCommandOutput(
        'Commands: search <query> | go <url> | theme <amber|green|white> | disable | enable | clear | help'
      );
      return;
    }

    if (cmd === 'clear') {
      closeCommandPalette();
      return;
    }

    showCommandOutput('Unknown command. Type "help" for available commands.');
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      if (!currentSettings || !isEnabledForSite(currentSettings)) return;
      if (commandOpen) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_CHANGED') {
      const oldEnabled = currentSettings ? isEnabledForSite(currentSettings) : false;
      currentSettings = message.settings;
      const newEnabled = isEnabledForSite(currentSettings);

      if (newEnabled && !oldEnabled) {
        enableRetro(currentSettings, false);
      } else if (!newEnabled && oldEnabled) {
        disableRetro();
      } else if (newEnabled) {
        applyTheme(currentSettings);
        if (currentSettings.flicker) {
          document.body.classList.add('retrofy-flicker');
        } else {
          document.body.classList.remove('retrofy-flicker');
        }
      }
    }
  });

  function init() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      if (chrome.runtime.lastError) return;
      currentSettings = settings;
      if (isEnabledForSite(settings)) {
        enableRetro(settings, true);
      }
    });
  }
  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
