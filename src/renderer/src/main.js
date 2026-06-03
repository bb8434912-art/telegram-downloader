import './style.css'
import { initI18n } from './i18n.js'
import { initThemes } from './themes.js'
import { initBotController } from './bot-controller.js'
import { initHistory, refreshHistory } from './history.js'
import { initPreview } from './preview.js'
import { ParticleSystem } from './particles.js'

async function init() {
  const config = await window.api.getConfig()
  const lang = config.language || 'en'
  await initI18n(lang)

  initThemes()
  initBotController()
  initHistory()
  initPreview()
  initParticles()
  initRouter()
  initSettings()
  initFolderDrop()
  initNavigation()
}

function initParticles() {
  const canvas = document.getElementById('particleCanvas')
  window.particleSystem = new ParticleSystem(canvas)
}

function initRouter() {
  const navBtns = document.querySelectorAll('.nav-btn')

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pageId = btn.dataset.page

      navBtns.forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')

      document.querySelectorAll('.page').forEach((p) => {
        p.classList.add('hidden')
      })
      document.getElementById(`page-${pageId}`).classList.remove('hidden')

      if (pageId === 'history') refreshHistory()
    })
  })

  document.querySelector('.nav-btn.active')?.click()
}

function initSettings() {
  loadSettings()

  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings)
  document.getElementById('settingBrowseBtn')?.addEventListener('click', async () => {
    const folder = await window.api.selectFolder()
    if (folder) {
      document.getElementById('settingFolder').value = folder
    }
  })
  document.getElementById('browseFolderBtn')?.addEventListener('click', async () => {
    const folder = await window.api.selectFolder()
    if (folder) {
      document.getElementById('folderPathDisplay').textContent = folder
      const config = await window.api.getConfig()
      config.download_folder = folder
      await window.api.saveConfig(config)
    }
  })

  document.getElementById('settingLanguage')?.addEventListener('change', async (e) => {
    const { loadLocale } = await import('./i18n.js')
    await loadLocale(e.target.value)
    const config = await window.api.getConfig()
    config.language = e.target.value
    await window.api.saveConfig(config)
  })
}

async function loadSettings() {
  const config = await window.api.getConfig()
  document.getElementById('settingToken').value = config.token || ''
  document.getElementById('settingUserId').value = config.allowed_user_id || ''
  document.getElementById('settingFolder').value = config.download_folder || ''
  document.getElementById('settingLanguage').value = config.language || 'en'
  document.getElementById('optAutoStart').checked = config.auto_start || false
  document.getElementById('optNotifications').checked = config.notifications !== false
  document.getElementById('optMinimizeTray').checked = config.minimize_to_tray !== false
  document.getElementById('folderPathDisplay').textContent = config.download_folder || ''
}

async function saveSettings() {
  const config = {
    token: document.getElementById('settingToken').value.trim(),
    allowed_user_id: document.getElementById('settingUserId').value.trim(),
    download_folder: document.getElementById('settingFolder').value.trim(),
    language: document.getElementById('settingLanguage').value,
    auto_start: document.getElementById('optAutoStart').checked,
    notifications: document.getElementById('optNotifications').checked,
    minimize_to_tray: document.getElementById('optMinimizeTray').checked
  }
  await window.api.saveConfig(config)
  document.getElementById('folderPathDisplay').textContent = config.download_folder

  const { showToast } = await import('./bot-controller.js')
  showToast('Settings saved!')
}

function initFolderDrop() {
  const dropZone = document.getElementById('folderDropZone')

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.className = 'flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border-2 border-dashed transition-all duration-300 cursor-pointer border-[var(--accent)]'
  })

  dropZone.addEventListener('dragleave', () => {
    dropZone.className = 'flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--glass-border)] transition-all duration-300 cursor-pointer hover:border-[var(--accent)]'
  })

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault()
    dropZone.className = 'flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--glass-border)] transition-all duration-300 cursor-pointer hover:border-[var(--accent)]'

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const folder = files[0].path
      document.getElementById('folderPathDisplay').textContent = folder
      const config = await window.api.getConfig()
      config.download_folder = folder
      await window.api.saveConfig(config)
    }
  })
}

function initNavigation() {
  document.getElementById('previewCloseBtn')?.addEventListener('click', () => {
    document.getElementById('previewOverlay').classList.add('hidden')
  })
}

document.addEventListener('DOMContentLoaded', init)
