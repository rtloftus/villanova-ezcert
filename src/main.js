const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
// Updated to require parser.js
const { processDirectory } = require('./parser'); 

function createWindow() {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), 
            nodeIntegration: false, 
            contextIsolation: true  
        }
    });

    // Use Electron-Forge's magic Vite variables
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        win.webContents.openDevTools(); // Opens the console automatically for debugging
    } else {
        win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
}

app.whenReady().then(() => {
    // 1. Let the user select a folder
    ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
        
        if (canceled) return null;
        return filePaths[0]; 
    });

    // 2. Run the parser on the selected folder
    ipcMain.handle('parser:run', async (event, folderPath) => {
        try {
            const results = await processDirectory(folderPath);
            return { success: true, data: results };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});