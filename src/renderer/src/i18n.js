let currentLang = 'en'
let localeData = {}

const locales = {}

async function loadLocale(lang) {
  if (locales[lang]) {
    localeData = locales[lang]
  } else {
    try {
      const resp = await fetch(`./locales/${lang}.json`)
      localeData = await resp.json()
      locales[lang] = localeData
    } catch (e) {
      console.error('Failed to load locale:', lang, e)
      localeData = locales['en'] || {}
    }
  }
  currentLang = lang
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  localStorage.setItem('lang', lang)
  updateDOM()
}

function t(key) {
  return key.split('.').reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), localeData) || key
}

function updateDOM() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n
    el.textContent = t(key)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder
    el.placeholder = t(key)
  })
}

async function initI18n(lang) {
  await loadLocale(lang)
}

export { initI18n, loadLocale, t, currentLang }
