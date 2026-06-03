import { openPreview, setPreviewIndex } from './preview.js'

let historyEntries = []

async function initHistory() {
  historyEntries = await window.api.getHistory()
  renderGrid()

  document.getElementById('historySearch')?.addEventListener('input', (e) => {
    renderGrid(e.target.value.toLowerCase())
  })

  document.getElementById('clearHistoryBtn')?.addEventListener('click', async () => {
    await window.api.clearHistory()
    historyEntries = []
    renderGrid()
  })
}

function renderGrid(filter = '') {
  const grid = document.getElementById('historyGrid')
  const empty = document.getElementById('historyEmpty')

  const filtered = filter
    ? historyEntries.filter((e) => e.fileName.toLowerCase().includes(filter))
    : historyEntries

  grid.innerHTML = ''

  if (filtered.length === 0) {
    empty.style.display = 'flex'
    return
  }
  empty.style.display = 'none'

  const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'])
  const TYPE_ICONS = {
    photo: '\u{1F5BC}', document: '\u{1F4C4}', audio: '\u{1F3B5}',
    video: '\u{1F3AC}', voice: '\u{1F399}', animation: '\u{1F4F9}',
    archive: '\u{1F4E6}', file: '\u{1F4C1}'
  }

  filtered.forEach((entry, idx) => {
    const item = document.createElement('div')
    item.className = 'history-item glass-card rounded-xl overflow-hidden group'
    item.dataset.index = idx

    const isImage = IMAGE_EXTENSIONS.has('.' + entry.path.split('.').pop().toLowerCase())
    const typeIcon = TYPE_ICONS[entry.type] || TYPE_ICONS.file

    const thumb = document.createElement('div')
    thumb.className = 'aspect-square bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden'

    if (isImage) {
      thumb.innerHTML = `
        <div class="w-full h-full flex items-center justify-center">
          <svg class="w-8 h-8 text-[var(--text-secondary)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>`
      window.api.getThumbnail(entry.path).then((dataUrl) => {
        if (dataUrl) {
          const imgEl = document.createElement('img')
          imgEl.src = dataUrl
          imgEl.className = 'w-full h-full object-cover'
          imgEl.loading = 'lazy'
          thumb.innerHTML = ''
          thumb.appendChild(imgEl)
        }
      })
    } else {
      thumb.innerHTML = `<div class="text-3xl opacity-60 select-none">${typeIcon}</div>`
    }

    const info = document.createElement('div')
    info.className = 'p-2 flex items-center gap-1.5'
    const typeBadge = document.createElement('span')
    typeBadge.className = 'text-xs opacity-50'
    typeBadge.textContent = entry.type || 'file'
    const name = document.createElement('p')
    name.className = 'text-xs truncate text-[var(--text-secondary)] flex-1'
    name.textContent = entry.fileName
    info.appendChild(typeBadge)
    info.appendChild(name)

    item.appendChild(thumb)
    item.appendChild(info)

    item.addEventListener('click', () => {
      const globalIdx = historyEntries.indexOf(entry)
      setPreviewIndex(globalIdx)
      openPreview()
    })

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      handleContextMenu(entry, e.clientX, e.clientY)
    })

    grid.appendChild(item)
  })
}

function handleContextMenu(entry, x, y) {
  const menu = document.createElement('div')
  menu.className = 'fixed z-50 glass-card rounded-xl py-1 text-sm shadow-2xl'
  menu.style.left = `${x}px`
  menu.style.top = `${y}px`

  const items = [
    { label: 'Open File', action: () => window.api.openFile(entry.path) },
    { label: 'Open Folder', action: () => window.api.openFolder(entry.path) },
    { type: 'separator' },
    { label: 'Delete', action: () => deleteEntry(entry) }
  ]

  items.forEach((item) => {
    if (item.type === 'separator') {
      const sep = document.createElement('div')
      sep.className = 'border-t border-[var(--glass-border)] my-1'
      menu.appendChild(sep)
    } else {
      const btn = document.createElement('button')
      btn.className = 'w-full text-left px-4 py-1.5 hover:bg-[var(--glass-bg)] transition-colors'
      btn.textContent = item.label
      btn.addEventListener('click', () => {
        item.action()
        menu.remove()
      })
      menu.appendChild(btn)
    }
  })

  document.body.appendChild(menu)

  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove()
      document.removeEventListener('click', closeMenu)
    }
  }
  setTimeout(() => document.addEventListener('click', closeMenu), 0)
}

async function deleteEntry(entry) {
  await window.api.deleteFile(entry.path)
  historyEntries = historyEntries.filter((e) => e !== entry)
  renderGrid()
  await window.api.clearHistory()
  for (const e of historyEntries) {
    await window.api.addHistoryEntry(e)
  }
}

function addHistoryItem(entry) {
  historyEntries.unshift(entry)
  if (historyEntries.length > 200) historyEntries.length = 200

  const grid = document.getElementById('historyGrid')
  const empty = document.getElementById('historyEmpty')
  empty.style.display = 'none'
  renderGrid()
}

async function refreshHistory() {
  historyEntries = await window.api.getHistory()
  renderGrid()
}

export { initHistory, addHistoryItem, refreshHistory, historyEntries }
