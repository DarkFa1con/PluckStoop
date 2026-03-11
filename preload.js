const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pluck', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readMetadata: (filePath) => ipcRenderer.invoke('read-metadata', filePath),
  scrubMetadata: (filePaths) => ipcRenderer.invoke('scrub-metadata', filePaths),
  exportReport: (data) => ipcRenderer.invoke('export-report', data),
  getPreview: (filePath) => ipcRenderer.invoke('get-preview', filePath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
});
