const path = require('path');
const { app, BrowserWindow, ipcMain, Notification } = require('electron');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    title: 'Factory Monitor Desktop',
    icon: path.join(__dirname, 'ico.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('desktop-notify', (_event, payload) => {
  const title = (payload && payload.title) || 'Factory Monitor';
  const body = (payload && payload.body) || '';
  const notification = new Notification({ title, body });
  notification.show();
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
