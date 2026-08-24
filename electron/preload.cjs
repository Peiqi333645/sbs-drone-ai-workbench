const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('sbsDesktop', {
  platform: process.platform,
  version: '0.2.0',
  serialWriteEnabled: false
});
