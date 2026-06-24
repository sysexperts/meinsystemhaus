import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import { initDatabase } from "./db";
import { registerIpcHandlers } from "./ipc";

const isDev = !!process.env.VITE_DEV_SERVER_URL;

// "Alles in einem Ordner": Bei der portablen Variante werden alle Daten
// neben der ausfuehrbaren Datei abgelegt. Sonst im Standard-Benutzerordner.
function configureDataDirectory() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    const dataDir = path.join(portableDir, "daten");
    fs.mkdirSync(dataDir, { recursive: true });
    app.setPath("userData", dataDir);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#0b1120",
    autoHideMenuBar: true,
    title: "MeinSystemhaus",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Externe Links im Standardbrowser oeffnen
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  configureDataDirectory();
  initDatabase(path.join(app.getPath("userData"), "meinsystemhaus.db"));
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

void isDev;
