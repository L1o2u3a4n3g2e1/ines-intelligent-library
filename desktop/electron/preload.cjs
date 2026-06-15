const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('inesDesktop', {
  platform: process.platform,
  isDesktopApp: true,
});

