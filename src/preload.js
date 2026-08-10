// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// preload.js

console.log("PRELOAD LOADED");
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
    processAudits: (folderPath) => ipcRenderer.invoke('parser:run', folderPath),
    getStudents: () => ipcRenderer.invoke('database:getStudents'),
    updateStudent: (student) => ipcRenderer.invoke('database:updateStudent', student),
    addStudent: (student) => ipcRenderer.invoke('database:addStudent', student),
    deleteStudent: (unique_id) => ipcRenderer.invoke('database:deleteStudent', unique_id),
    clearDatabase: (password) => ipcRenderer.invoke("clear-database", password),
    getStudentClasses: (unique_id) => ipcRenderer.invoke('get-student-classes', unique_id),
    readAuditFile: (filename) => ipcRenderer.invoke('read-audit-file', filename),
    openJsonViewer: (jsonData, filename) => ipcRenderer.send('open-json-viewer', jsonData, filename),

});

