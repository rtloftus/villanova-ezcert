// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
    processAudits: (folderPath) => ipcRenderer.invoke('parser:run', folderPath),
    getStudents: () => ipcRenderer.invoke('database:getStudents'),
    updateStudent: (student) => ipcRenderer.invoke('database:updateStudent', student),
    clearDatabase: () => ipcRenderer.invoke("clear-database"),
});

