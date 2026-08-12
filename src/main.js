const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { processDirectory } = require('./parser');
const { getStudentClasses } = require('./database'); // Adjust path if needed
const fs = require('fs');
const {
    saveStudents,
    getStudents,
    updateReview,
    updateStudent,
    addStudent,
    deleteStudent,
    clearDatabase
} = require('./database');
const { closeDatabase } = require("./database");
const crypto = require('crypto');

const CLEAR_DATABASE_PASSWORD = 'rloftus';


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
    // Let the user select a folder
    ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
        
        if (canceled) return null;
        return filePaths[0]; 
    });

    // Run the parser on the selected folder
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

ipcMain.handle("database:addStudent", (_, student) => {
    return addStudent(student);
});

ipcMain.handle("database:deleteStudent", (_, unique_id) => {
    return deleteStudent(unique_id);
});

ipcMain.handle("database:updateStudent", (_, student) => {
    updateStudent(student);
    return { success: true };
});

ipcMain.handle("clear-database", async (_, password) => {
  if (password !== CLEAR_DATABASE_PASSWORD) {
    return {
        success: false,
        error: "Incorrect password."
    };
  }
  
  await clearDatabase();

  return {
    success: true
  };
});

// Add this alongside your other ipcMain handlers
ipcMain.handle('get-student-classes', async (event, unique_id) => {
    return getStudentClasses(unique_id);
});

ipcMain.handle('read-audit-file', async (event, filename) => {
    try {
        const auditDir = path.join(app.getPath("userData"), "audits");
        const filePath = path.join(auditDir, filename);
        
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            return { success: true, data: JSON.parse(rawData) };
        } else {
            return { success: false, error: "File not found" };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
});


ipcMain.on('open-json-viewer', (event, jsonData, filename) => {
    // Create a new window
    const viewerWin = new BrowserWindow({
        width: 800,
        height: 600,
        title: `Audit Data - ${filename}`,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Create a simple HTML page to display the JSON
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${filename}</title>
            <style>
                body { 
                    font-family: Consolas, monospace; 
                    background: #1e1e1e; 
                    color: #dcdcdc; 
                    padding: 20px; 
                    margin: 0;
                }
                h2 { color: #569cd6; border-bottom: 1px solid #333; padding-bottom: 10px; }
                pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
        </head>
        <body>
            <h2>📄 ${filename}</h2>
            <pre>${JSON.stringify(jsonData, null, 2)}</pre>
        </body>
        </html>
    `;

    // Load the HTML string directly into the window
    viewerWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
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


app.on("window-all-closed", () => {

    closeDatabase();

    if (process.platform !== "darwin") {
        app.quit();
    }

});