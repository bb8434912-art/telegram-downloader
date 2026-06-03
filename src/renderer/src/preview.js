import { historyEntries } from './history.js'
import { showToast } from './bot-controller.js'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'])

let currentIndex = 0

function initPreview() {
  const overlay = document.getElementById('previewOverlay')
  const closeBtn = document.getElementById('previewCloseBtn')
  const prevBtn = document.getElementById('previewPrevBtn')
  const nextBtn = document.getElementById('previewNextBtn')
  const deleteBtn = document.getElementById('previewDeleteBtn')
  const openBtn = document.getElementById('previewOpenBtn')

  closeBtn.addEventListener('click', closePreview)
  prevBtn.addEventListener('click', () => navigate(-1))
  nextBtn.addEventListener('click', () => navigate(1))
  deleteBtn.addEventListener('click', handleDelete)
  openBtn.addEventListener('click', handleOpen)

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePreview()
  })

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('hidden')) {
      if (e.key === 'Escape') closePreview()
      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
      if (e.key === 'Delete') handleDelete()
      if (e.key === 'o' || e.key === 'O') handleOpen()
    }
  })
}

function isImageFile(filePath) {
  const ext = filePath.toLowerCase().split('.').pop()
  return IMAGE_EXTENSIONS.has(`.${ext}`)
}

function setPreviewIndex(idx) {
  currentIndex = idx
}

function openPreview() {
  const entry = historyEntries[currentIndex]
  if (!entry) return

  const overlay = document.getElementById('previewOverlay')
  const img = document.getElementById('previewImage')
  const info = document.getElementById('previewInfo')
  const prevBtn = document.getElementById('previewPrevBtn')
  const nextBtn = document.getElementById('previewNextBtn')
  const deleteBtn = document.getElementById('previewDeleteBtn')

  img.style.display = 'block'
  img.src = ''
  overlay.classList.remove('hidden')

  prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none'
  nextBtn.style.display = currentIndex < historyEntries.length - 1 ? 'flex' : 'none'

  const size = formatSize(entry.fileSize)
  const date = new Date(entry.date).toLocaleDateString()
  const typeIcon = getFileTypeIcon(entry.type || pathType(entry.path))
  info.innerHTML = `${typeIcon} ${entry.fileName} • ${size} • ${date}`

  if (isImageFile(entry.path)) {
    img.style.display = 'block'
    window.api.getImageData(entry.path).then((dataUrl) => {
      if (dataUrl) {
        img.src = dataUrl
      } else {
        img.alt = 'Failed to load image'
        showFileInfo(entry)
      }
    })
  } else {
    img.style.display = 'none'
    showFileInfo(entry)
  }
}

function showFileInfo(entry) {
  const overlay = document.getElementById('previewOverlay')
  const info = document.getElementById('previewInfo')
  const size = formatSize(entry.fileSize)
  const date = new Date(entry.date).toLocaleDateString()
  const icon = getFileTypeIcon(entry.type || pathType(entry.path))

  let existingCard = document.getElementById('previewFileCard')
  if (!existingCard) {
    existingCard = document.createElement('div')
    existingCard.id = 'previewFileCard'
    existingCard.className = 'flex flex-col items-center gap-4'
    const center = overlay.querySelector('.flex.items-center.justify-center')
    if (center) center.appendChild(existingCard)
  }

  existingCard.innerHTML = `
    <div class="text-6xl mb-2">${icon}</div>
    <div class="text-lg font-medium text-white">${entry.fileName}</div>
    <div class="text-sm text-white/60">${size} • ${date}</div>
    <button onclick="window.api.openFile('${entry.path.replace(/\\/g, '\\\\')}')" class="mt-2 px-5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-all">
      <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
      Open File
    </button>
  `

  info.textContent = `${entry.fileName} • ${size} • ${date}`
  const img = document.getElementById('previewImage')
  if (img) img.style.display = 'none'
}

function pathType(filePath) {
  const ext = filePath.toLowerCase().split('.').pop()
  const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
  const videoExts = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv']
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz']
  if (imgExts.includes(ext)) return 'photo'
  if (audioExts.includes(ext)) return 'audio'
  if (videoExts.includes(ext)) return 'video'
  if (docExts.includes(ext)) return 'document'
  if (archiveExts.includes(ext)) return 'archive'
  return 'file'
}

function getFileTypeIcon(type) {
  const icons = {
    photo: '\u{1F5BC}',
    document: '\u{1F4C4}',
    audio: '\u{1F3B5}',
    video: '\u{1F3AC}',
    voice: '\u{1F399}',
    animation: '\u{1F4F9}',
    archive: '\u{1F4E6}',
    file: '\u{1F4C1}'
  }
  return icons[type] || icons.file
}

function closePreview() {
  document.getElementById('previewOverlay').classList.add('hidden')
  const card = document.getElementById('previewFileCard')
  if (card) card.remove()
  const img = document.getElementById('previewImage')
  if (img) img.style.display = 'block'
}

function navigate(dir) {
  const newIdx = currentIndex + dir
  if (newIdx >= 0 && newIdx < historyEntries.length) {
    currentIndex = newIdx
    openPreview()
  }
}

async function handleDelete() {
  const entry = historyEntries[currentIndex]
  if (!entry) return

  await window.api.deleteFile(entry.path)
  historyEntries.splice(currentIndex, 1)

  showToast('File deleted')
  closePreview()

  if (historyEntries.length === 0) {
    document.getElementById('historyGrid').innerHTML = ''
    document.getElementById('historyEmpty').style.display = 'flex'
  }
}

function handleOpen() {
  const entry = historyEntries[currentIndex]
  if (entry) window.api.openFile(entry.path)
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export { initPreview, openPreview, closePreview, setPreviewIndex }
