const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { processDirectory } = require('./parser');
const { getStudentClasses } = require('./database'); // Adjust path if needed

const {
    saveStudents,
    getStudents,
    updateReview,
    updateStudent,
    clearDatabase
} = require('./database');


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
        const students = await processDirectory(folderPath);

        saveStudents(students);

        const results = getStudents();

        return {
            success: true,
            data: results
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle("database:updateStudent", (_, student) => {
    updateStudent(student);
    return { success: true };
});

ipcMain.handle("clear-database", async () => {
  return await clearDatabase();
});

// Add this alongside your other ipcMain handlers
ipcMain.handle('get-student-classes', async (event, unique_id) => {
    return getStudentClasses(unique_id);
});

ipcMain.handle(
    "database:updateReview",
    (event, uniqueId, reviewStatus, status, notes) => {

        updateReview(
            uniqueId,
            reviewStatus,
            status,
            notes
        );

        return { success: true };

    }
);

ipcMain.handle("database:getStudents", () => {
    return getStudents();
});

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

const { closeDatabase } = require("./database");

app.on("window-all-closed", () => {

    closeDatabase();

    if (process.platform !== "darwin") {
        app.quit();
    }

});