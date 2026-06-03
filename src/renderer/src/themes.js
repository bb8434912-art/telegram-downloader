const themeNames = {
  aurora: 'Aurora',
  neon: 'Neon Nights',
  sunset: 'Sunset',
  ocean: 'Ocean',
  midnight: 'Midnight',
  forest: 'Forest',
  cyberpunk: 'Cyberpunk',
  light: 'Minimal Light'
}

const themeOrder = Object.keys(themeNames)
let currentThemeIndex = 0

function getCurrentThemeId() {
  return themeOrder[currentThemeIndex]
}

function applyTheme(themeId) {
  document.documentElement.className = `theme-${themeId}`
  localStorage.setItem('theme', themeId)

  const nameEl = document.getElementById('currentThemeName')
  if (nameEl) nameEl.textContent = themeNames[themeId] || themeId

  document.querySelectorAll('.theme-swatch').forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.theme === themeId)
  })

  if (window.particleSystem) {
    window.particleSystem.setTheme(themeId)
  }

  currentThemeIndex = themeOrder.indexOf(themeId)
}

function cycleTheme() {
  const themeId = themeOrder[(currentThemeIndex + 1) % themeOrder.length]
  applyTheme(themeId)
}

function initThemes() {
  const saved = localStorage.getItem('theme') || 'aurora'
  if (themeOrder.includes(saved)) {
    currentThemeIndex = themeOrder.indexOf(saved)
  }
  applyTheme(themeOrder[currentThemeIndex])

  document.querySelectorAll('.theme-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      applyTheme(swatch.dataset.theme)
    })
  })

  document.getElementById('themeBtn')?.addEventListener('click', cycleTheme)
}

export { initThemes, applyTheme, cycleTheme, themeNames, themeOrder }
