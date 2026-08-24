const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sbsDesktop', {
  platform: process.platform,
  version: '0.3.0',
  serialWriteEnabled: false,
  listSerialPorts: () => ipcRenderer.invoke('serial:list'),
  connectFlightController: path => ipcRenderer.invoke('serial:connect', path),
  disconnectFlightController: () => ipcRenderer.invoke('serial:disconnect'),
  runSelfTest: () => ipcRenderer.invoke('msp:self-test')
});
