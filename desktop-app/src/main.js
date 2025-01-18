import { app, BrowserWindow } from "electron";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
let isDev = process.env.NODE_ENV !== "production";
isDev = false;
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "My Notes", // Explicitly set window title
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // In production, we need to look for the index.html in the right place
    const indexPath = path.join(
      process.resourcesPath,
      "app.asar",
      "dist",
      "index.html"
    );
    win.loadFile(indexPath).catch((err) => {
      console.error("Failed to load index.html:", err);
      // Fallback path
      win.loadFile(path.join(__dirname, "../dist/index.html")).catch((err) => {
        console.error("Failed to load fallback path:", err);
      });
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
