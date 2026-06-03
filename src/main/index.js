const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  Notification,
  nativeImage,
  dialog,
  shell
} = require('electron')
const path = require('path')
const fs = require('fs')
const { electronApp, optimizer } = require('@electron-toolkit/utils')
const TelegramBot = require('node-telegram-bot-api')

// ==================== STORE ====================

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json')
const HISTORY_FILE = path.join(app.getPath('userData'), 'history.json')
const THUMB_DIR = path.join(app.getPath('userData'), 'thumbnails')

const DEFAULT_CONFIG = {
  token: '',
  allowed_user_id: '',
  download_folder: path.join(app.getPath('documents'), 'telegram_downloads'),
  language: 'en',
  auto_start: false,
  notifications: true,
  minimize_to_tray: true
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) }
    }
  } catch (e) {
    console.error('Failed to load config:', e.message)
  }
  return { ...DEFAULT_CONFIG }
}

function saveConfig(config) {
  ensureDir(path.dirname(CONFIG_FILE))
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'))
  } catch (e) { /* ignore */ }
  return []
}

function addHistoryEntry(entry) {
  const history = loadHistory()
  history.unshift(entry)
  if (history.length > 200) history.length = 200
  ensureDir(path.dirname(HISTORY_FILE))
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8')
}

function clearHistory() {
  ensureDir(path.dirname(HISTORY_FILE))
  fs.writeFileSync(HISTORY_FILE, '[]', 'utf-8')
  if (fs.existsSync(THUMB_DIR)) fs.rmSync(THUMB_DIR, { recursive: true, force: true })
}

function getThumbDir() {
  ensureDir(THUMB_DIR)
  return THUMB_DIR
}

// ==================== BOT ====================

class BotManager {
  constructor() {
    this.bot = null
    this.running = false
    this.onLog = null
    this.onStatus = null
    this.onDownload = null
    this.onError = null
  }

  start(token, allowedUserId, downloadFolder) {
    if (this.running) return
    this.bot = new TelegramBot(token, { polling: true })
    this.running = true
    this._setupHandlers(allowedUserId, downloadFolder)
    this._emitStatus('running')
    this._emitLog('Bot started successfully')
  }

  stop() {
    if (this.bot) {
      try { this.bot.stopPolling() } catch (e) { /* ignore */ }
      this.bot = null
    }
    this.running = false
    this._emitStatus('stopped')
    this._emitLog('Bot stopped')
  }

  isRunning() { return this.running }

  _getFileExt(mimeType, fallback) {
    const map = {
      'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
      'image/webp': '.webp', 'image/bmp': '.bmp', 'image/svg+xml': '.svg',
      'video/mp4': '.mp4', 'video/x-matroska': '.mkv', 'video/webm': '.webm',
      'video/quicktime': '.mov', 'video/x-msvideo': '.avi',
      'audio/mpeg': '.mp3', 'audio/ogg': '.ogg', 'audio/wav': '.wav',
      'audio/flac': '.flac', 'audio/aac': '.aac',
      'application/pdf': '.pdf', 'application/zip': '.zip',
      'application/x-rar-compressed': '.rar', 'application/x-7z-compressed': '.7z',
      'application/x-tar': '.tar', 'application/gzip': '.gz',
      'application/json': '.json', 'text/plain': '.txt',
      'text/html': '.html', 'text/css': '.css', 'text/javascript': '.js',
      'application/xml': '.xml',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
    }
    return map[mimeType] || fallback || '.bin'
  }

  async _downloadFile(fileId, downloadFolder, desiredName, label, entryType) {
    const targetPath = path.join(downloadFolder, desiredName)
    if (fs.existsSync(targetPath)) {
      this._emitLog(`[${label}] Already exists: ${targetPath}`)
      return null
    }
    const tempPath = await this.bot.downloadFile(fileId, downloadFolder)
    fs.renameSync(tempPath, targetPath)
    const stat = fs.statSync(targetPath)
    const entry = { type: entryType, path: targetPath, fileName: desiredName, fileSize: stat.size, date: new Date().toISOString() }
    this._emitLog(`[${label}] Saved: ${targetPath}`)
    return entry
  }

  _uniqueName(downloadFolder, fileName) {
    const targetPath = path.join(downloadFolder, fileName)
    if (!fs.existsSync(targetPath)) return fileName
    const ext = path.extname(fileName)
    const base = path.basename(fileName, ext)
    let counter = 1
    while (true) {
      const name = `${base}_${counter}${ext}`
      if (!fs.existsSync(path.join(downloadFolder, name))) return name
      counter++
    }
  }

  _setupHandlers(allowedUserId, downloadFolder) {
    fs.mkdirSync(downloadFolder, { recursive: true })

    this.bot.on('photo', async (msg) => {
      if (String(msg.from.id) !== String(allowedUserId)) return
      try {
        const photo = msg.photo[msg.photo.length - 1]
        const entry = await this._downloadFile(photo.file_id, downloadFolder, `${photo.file_unique_id}.jpg`, 'PHOTO', 'photo')
        if (entry) this._emitDownload(entry)
      } catch (e) {
        this._emitLog(`[PHOTO] Error: ${e.message}`)
        this._emitError(e.message)
      }
    })

    this.bot.on('document', async (msg) => {
      if (String(msg.from.id) !== String(allowedUserId)) return
      try {
        const doc = msg.document
        if (!doc) return
        let fileName = doc.file_name || `file_${doc.file_unique_id}${this._getFileExt(doc.mime_type, '')}`
        fileName = this._uniqueName(downloadFolder, fileName.replace(/[<>:"/\\|?*]/g, '_'))
        const entry = await this._downloadFile(doc.file_id, downloadFolder, fileName, 'DOC', 'document')
        if (entry) this._emitDownload(entry)
      } catch (e) {
        this._emitLog(`[DOC] Error: ${e.message}`)
        this._emitError(e.message)
      }
    })

    this.bot.on('audio', async (msg) => {
      if (String(msg.from.id) !== String(allowedUserId)) return
      try {
        const audio = msg.audio
        if (!audio) return
        let fileName = audio.file_name || `${audio.performer || 'unknown'}_${audio.title || audio.file_unique_id}${this._getFileExt(audio.mime_type, '.mp3')}`
        fileName = this._uniqueName(downloadFolder, fileName.replace(/[<>:"/\\|?*]/g, '_'))
        const entry = await this._downloadFile(audio.file_id, downloadFolder, fileName, 'AUDIO', 'audio')
        if (entry) this._emitDownload(entry)
      } catch (e) {
        this._emitLog(`[AUDIO] Error: ${e.message}`)
        this._emitError(e.message)
      }
    })

    this.bot.on('video', async (msg) => {
      if (String(msg.from.id) !== String(allowedUserId)) return
      try {
        const video = msg.video
        if (!video) return
        let fileName = `video_${video.file_unique_id}${this._getFileExt(video.mime_type, '.mp4')}`
        fileName = this._uniqueName(downloadFolder, fileName)
        const entry = await this._downloadFile(video.file_id, downloadFolder, fileName, 'VIDEO', 'video')
        if (entry) this._emitDownload(entry)
      } catch (e) {
        this._emitLog(`[VIDEO] Error: ${e.message}`)
        this._emitError(e.message)
      }
    })

    this.bot.on('voice', async (msg) => {
      if (String(msg.from.id) !== String(allowedUserId)) return
      try {
        const voice = msg.voice
        if (!voice) return
        let fileName = `voice_${voice.file_unique_id}.ogg`
        fileName = this._uniqueName(downloadFolder, fileName)
        const entry = await this._downloadFile(voice.file_id, downloadFolder, fileName, 'VOICE', 'voice')
        if (entry) this._emitDownload(entry)
      } catch (e) {
        this._emitLog(`[VOICE] Error: ${e.message}`)
        this._emitError(e.message)
      }
    })

    this.bot.on('animation', async (msg) => {
      if (String(msg.from.id) !== String(allowedUserId)) return
      try {
        const anim = msg.animation
        if (!anim) return
        let fileName = `anim_${anim.file_unique_id}.gif`
        fileName = this._uniqueName(downloadFolder, fileName)
        const entry = await this._downloadFile(anim.file_id, downloadFolder, fileName, 'ANIMATION', 'animation')
        if (entry) this._emitDownload(entry)
      } catch (e) {
        this._emitLog(`[ANIMATION] Error: ${e.message}`)
        this._emitError(e.message)
      }
    })

    this.bot.on('polling_error', (err) => {
      if (err.message && err.message.includes('ECONNRESET')) return
      this._emitLog(`[BOT] Polling error: ${err.message}`)
      this._emitError(err.message)
    })
  }

  _emitLog(text) { if (this.onLog) this.onLog(text) }
  _emitStatus(status) { if (this.onStatus) this.onStatus(status) }
  _emitDownload(entry) { if (this.onDownload) this.onDownload(entry) }
  _emitError(error) { if (this.onError) this.onError(error) }
}

// ==================== APP ====================

let mainWindow
let tray
let trayGreen
let trayGray
const botManager = new BotManager()

function createTrayIcons() {
  const size = 16
  const makeIcon = (r, g, b) => {
    const buf = Buffer.alloc(size * size * 4)
    const cx = size / 2, cy = size / 2, radius = size / 2 - 1
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const dx = x - cx + 0.5, dy = y - cy + 0.5
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= radius) {
          const aa = Math.min(1, Math.max(0, radius - dist + 0.5))
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = Math.round(aa * 255)
        } else {
          buf[i + 3] = 0
        }
      }
    }
    return nativeImage.createFromBuffer(buf, { width: size, height: size })
  }
  trayGreen = makeIcon(34, 197, 94)
  trayGray = makeIcon(107, 114, 128)
}

function createTray() {
  createTrayIcons()
  tray = new Tray(trayGray)
  tray.setToolTip('Telegram Downloader')
  updateTrayMenu()
  tray.on('click', () => { if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() })
}

function updateTrayMenu() {
  const botRunning = botManager.isRunning()
  tray.setImage(botRunning ? trayGreen : trayGray)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow && mainWindow.show() },
    { type: 'separator' },
    {
      label: botRunning ? 'Stop Bot' : 'Start Bot',
      click: () => { botRunning ? handleStopBot() : mainWindow && mainWindow.webContents.send('bot:request-start') }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { botManager.stop(); app.quit() } }
  ]))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 750, minWidth: 900, minHeight: 600,
    show: false, title: 'Telegram Downloader', backgroundColor: '#0f0a1a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  })
  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.on('close', (event) => {
    const config = loadConfig()
    if (config.minimize_to_tray && !app.isQuitting) { event.preventDefault(); mainWindow.hide() }
  })
  if (process.env.ELECTRON_RENDERER_URL) mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  else mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
}

function sendNotification(title, body) {
  const config = loadConfig()
  if (config.notifications) new Notification({ title, body }).show()
}

function handleStartBot(token, allowedUserId, downloadFolder) {
  if (!token) { mainWindow && mainWindow.webContents.send('bot:error', 'No token provided'); return }
  if (!allowedUserId) { mainWindow && mainWindow.webContents.send('bot:error', 'No user ID provided'); return }
  botManager.onLog = (text) => { mainWindow && mainWindow.webContents.send('bot:log', text) }
  botManager.onStatus = (status) => { mainWindow && mainWindow.webContents.send('bot:status', status); updateTrayMenu() }
  botManager.onDownload = (entry) => {
    addHistoryEntry(entry)
    mainWindow && mainWindow.webContents.send('bot:download', entry)
    const labels = { photo: 'Photo', document: 'Document', audio: 'Audio', video: 'Video', voice: 'Voice', animation: 'Animation' }
    sendNotification('Download Complete', `${labels[entry.type] || 'File'} saved: ${entry.fileName}`)
  }
  botManager.onError = (err) => { mainWindow && mainWindow.webContents.send('bot:error', err) }
  botManager.start(token, allowedUserId, downloadFolder)
  updateTrayMenu()
}

function handleStopBot() { botManager.stop(); updateTrayMenu() }

function handleSelectFolder() {
  return dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], title: 'Select Download Folder' })
    .then((r) => r.canceled ? null : r.filePaths[0])
}

function handleGetImageData(filePath) {
  try {
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp' }
    return `data:${mimeTypes[ext] || 'image/jpeg'};base64,${data.toString('base64')}`
  } catch (e) { return null }
}

function handleGetThumbnail(filePath) {
  try {
    const thumbDir = getThumbDir()
    const thumbPath = path.join(thumbDir, `${path.basename(filePath)}_thumb.png`)
    if (fs.existsSync(thumbPath)) return `data:image/png;base64,${fs.readFileSync(thumbPath).toString('base64')}`
    const img = nativeImage.createFromPath(filePath)
    if (img.isEmpty()) return null
    const pngData = img.resize({ width: 200, height: 200, quality: 'good' }).toPNG()
    fs.writeFileSync(thumbPath, pngData)
    return `data:image/png;base64,${pngData.toString('base64')}`
  } catch (e) { return null }
}

app.isQuitting = false
app.on('before-quit', () => { app.isQuitting = true })

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.telegram.downloader')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  ipcMain.handle('get-config', () => loadConfig())
  ipcMain.handle('save-config', (_, config) => { saveConfig(config); return true })
  ipcMain.handle('start-bot', (_, { token, allowedUserId, downloadFolder }) => handleStartBot(token, allowedUserId, downloadFolder))
  ipcMain.handle('stop-bot', () => handleStopBot())
  ipcMain.handle('get-bot-status', () => botManager.isRunning())
  ipcMain.handle('get-history', () => loadHistory())
  ipcMain.handle('clear-history', () => { clearHistory(); return true })
  ipcMain.handle('select-folder', () => handleSelectFolder())
  ipcMain.handle('open-folder', (_, p) => shell.openPath(p))
  ipcMain.handle('open-file', (_, p) => shell.openPath(p))
  ipcMain.handle('get-image-data', (_, p) => handleGetImageData(p))
  ipcMain.handle('get-thumbnail', (_, p) => handleGetThumbnail(p))
  ipcMain.handle('delete-file', (_, p) => { try { if (fs.existsSync(p)) fs.unlinkSync(p); return true } catch (e) { return false } })

  createWindow()
  createTray()

  const config = loadConfig()
  if (config.auto_start && config.token && config.allowed_user_id) {
    setTimeout(() => handleStartBot(config.token, config.allowed_user_id, config.download_folder), 1000)
  }
})

app.on('window-all-closed', () => { botManager.stop(); app.quit() })
