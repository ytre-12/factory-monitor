const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopBridge', {
  notify: (title, body) => ipcRenderer.invoke('desktop-notify', { title, body })
});
