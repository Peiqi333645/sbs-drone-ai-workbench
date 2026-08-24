const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { MSPConnection } = require('./msp.cjs');

const isDev = !app.isPackaged;
const msp = new MSPConnection();

ipcMain.handle('serial:list', () => msp.list());
ipcMain.handle('serial:connect', (_, path) => msp.connect(path));
ipcMain.handle('serial:disconnect', () => msp.disconnect());
ipcMain.handle('msp:self-test', () => msp.selfTest());

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 930,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f5f5f7',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) win.loadURL('http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
