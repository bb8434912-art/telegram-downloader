"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  startBot: (params) => ipcRenderer.invoke("start-bot", params),
  stopBot: () => ipcRenderer.invoke("stop-bot"),
  getBotStatus: () => ipcRenderer.invoke("get-bot-status"),
  getHistory: () => ipcRenderer.invoke("get-history"),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  openFolder: (folderPath) => ipcRenderer.invoke("open-folder", folderPath),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),
  getImageData: (filePath) => ipcRenderer.invoke("get-image-data", filePath),
  getThumbnail: (filePath) => ipcRenderer.invoke("get-thumbnail", filePath),
  deleteFile: (filePath) => ipcRenderer.invoke("delete-file", filePath),
  onBotLog: (callback) => {
    ipcRenderer.on("bot:log", (_event, text) => callback(text));
  },
  onBotStatus: (callback) => {
    ipcRenderer.on("bot:status", (_event, status) => callback(status));
  },
  onBotDownload: (callback) => {
    ipcRenderer.on("bot:download", (_event, entry) => callback(entry));
  },
  onBotError: (callback) => {
    ipcRenderer.on("bot:error", (_event, err) => callback(err));
  },
  onBotRequestStart: (callback) => {
    ipcRenderer.on("bot:request-start", () => callback());
  }
});
