const DEFAULT_SETTINGS = {
  enabled: true,
  theme: 'amber',
  flicker: true,
  bootSequence: true,
  perSite: {}, 
  sound: false
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get('retrofy');
  if (!existing.retrofy) {
    await chrome.storage.sync.set({ retrofy: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('retrofy', (data) => {
      sendResponse(data.retrofy || DEFAULT_SETTINGS);
    });
    return true; 
  }

  if (message.type === 'UPDATE_SETTINGS') {
    chrome.storage.sync.get('retrofy', (data) => {
      const updated = { ...data.retrofy, ...message.settings };
      chrome.storage.sync.set({ retrofy: updated }, () => {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'SETTINGS_CHANGED',
                settings: updated
              }).catch(() => {}); 
            }
          });
        });
        sendResponse(updated);
      });
    });
    return true;
  }

  if (message.type === 'TOGGLE_SITE') {
    chrome.storage.sync.get('retrofy', (data) => {
      const settings = data.retrofy || DEFAULT_SETTINGS;
      const perSite = { ...settings.perSite };
      perSite[message.domain] = message.enabled;
      const updated = { ...settings, perSite };
      chrome.storage.sync.set({ retrofy: updated }, () => {
        sendResponse(updated);
      });
    });
    return true;
  }
});
