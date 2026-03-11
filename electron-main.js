const { app, BrowserWindow } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For easier IPC if needed (consider security later)
        },
        title: 'ArbCrypto Bot',
        icon: path.join(__dirname, 'assets/logo.png') // If you have an icon
    });

    // Load the web app
    // In DEV, load from localhost (expo web)
    // In PROD, load from built files
    if (process.env.NODE_ENV === 'development') {
        console.log('Loading from localhost:8081');
        mainWindow.loadURL('http://localhost:8081');
        mainWindow.webContents.openDevTools();
    } else {
        // Determine the path to index.html in the dist folder
        // This assumes `expo export:web` puts files in `web-build` or `dist`
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        console.log('Loading from file:', indexPath);
        mainWindow.loadFile(indexPath);
    }

    mainWindow.setMenuBarVisibility(false); // Hide menu bar for cleaner look
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
