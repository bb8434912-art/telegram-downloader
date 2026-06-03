import { t } from './i18n.js'
import { addHistoryItem } from './history.js'

let botRunning = false
let photoCount = 0
let docCount = 0
let lastDownloadTime = null

function initBotController() {
  const startBtn = document.getElementById('startBotBtn')
  const stopBtn = document.getElementById('stopBotBtn')

  startBtn.addEventListener('click', handleStart)
  stopBtn.addEventListener('click', handleStop)

  window.api.onBotLog((text) => {
    addLogEntry(text)
  })

  window.api.onBotStatus((status) => {
    botRunning = status === 'running'
    updateUI()
  })

  window.api.onBotDownload((entry) => {
    if (entry.type === 'photo') photoCount++
    else docCount++
    lastDownloadTime = new Date()
    addHistoryItem(entry)
    updateStats()
  })

  window.api.onBotError((err) => {
    addLogEntry(`[ERROR] ${err}`)
  })

  window.api.onBotRequestStart(() => {
    handleStart()
  })

  window.api.getBotStatus().then((running) => {
    botRunning = running
    updateUI()
  })

  document.getElementById('clearLogBtn')?.addEventListener('click', () => {
    document.getElementById('logEntries').innerHTML = ''
  })

  updateStats()
}

async function handleStart() {
  const config = await window.api.getConfig()
  if (!config.token) {
    showToast(t('errors.noToken'), 'error')
    return
  }
  if (!config.allowed_user_id) {
    showToast(t('errors.noUserId'), 'error')
    return
  }
  addLogEntry('[BOT] Starting...')
  await window.api.startBot({
    token: config.token,
    allowedUserId: config.allowed_user_id,
    downloadFolder: config.download_folder
  })
}

async function handleStop() {
  addLogEntry('[BOT] Stopping...')
  await window.api.stopBot()
}

function updateUI() {
  const badge = document.getElementById('statusBadge')
  const dot = document.getElementById('statusDot')
  const text = document.getElementById('statusText')
  const startBtn = document.getElementById('startBotBtn')
  const stopBtn = document.getElementById('stopBotBtn')

  if (botRunning) {
    badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 running'
    text.textContent = t('dashboard.botStatus.running')
    startBtn.disabled = true
    startBtn.className = 'btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 opacity-50 cursor-not-allowed'
    stopBtn.disabled = false
    stopBtn.className = 'btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200'
  } else {
    badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 stopped'
    text.textContent = t('dashboard.botStatus.stopped')
    startBtn.disabled = false
    startBtn.className = 'btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200'
    stopBtn.disabled = true
    stopBtn.className = 'btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 opacity-50 cursor-not-allowed'
  }
}

function addLogEntry(text) {
  const container = document.getElementById('logEntries')
  const entry = document.createElement('div')
  entry.className = 'log-entry'
  const time = new Date().toLocaleTimeString()
  entry.textContent = `[${time}] ${text}`
  container.appendChild(entry)
  const logContainer = document.getElementById('logContainer')
  logContainer.scrollTop = logContainer.scrollHeight
}

function updateStats() {
  const statsEl = document.getElementById('statsDisplay')
  if (photoCount > 0 || docCount > 0) {
    statsEl.classList.remove('hidden')
    let text = `${photoCount} photos`
    if (docCount > 0) text += `, ${docCount} docs`
    if (lastDownloadTime) {
      const diff = Math.floor((Date.now() - lastDownloadTime) / 1000)
      if (diff < 60) text += ` • just now`
      else text += ` • ${Math.floor(diff / 60)}m ago`
    }
    statsEl.textContent = text
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer')
  const toast = document.createElement('div')
  toast.className = `toast ${type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-[var(--glass-bg)]'}`
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(20px)'
    toast.style.transition = 'all 0.3s ease'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

export { initBotController, showToast, botRunning }
