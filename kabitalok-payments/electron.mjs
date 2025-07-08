import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const filePath = path.join(__dirname, 'dist', 'index.html');
  win.loadFile(filePath);

  // Optional: open devtools
  // win.webContents.openDevTools();

  win.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('❌ Failed to load:', code, desc);
  });

  win.webContents.on('console-message', (_, level, msg) => {
    console.log(`📢 Renderer: [${level}] ${msg}`);
  });
}

app.whenReady().then(createWindow);
