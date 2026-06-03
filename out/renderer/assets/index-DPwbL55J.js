const scriptRel = function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
}();
const assetsURL = function(dep, importerUrl) {
  return new URL(dep, importerUrl).href;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    const links = document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep, importerUrl);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        const isBaseRelative = !!importerUrl;
        if (isBaseRelative) {
          for (let i = links.length - 1; i >= 0; i--) {
            const link2 = links[i];
            if (link2.href === dep && (!isCss || link2.rel === "stylesheet")) {
              return;
            }
          }
        } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
let localeData = {};
const locales = {};
async function loadLocale(lang) {
  if (locales[lang]) {
    localeData = locales[lang];
  } else {
    try {
      const resp = await fetch(`./locales/${lang}.json`);
      localeData = await resp.json();
      locales[lang] = localeData;
    } catch (e) {
      console.error("Failed to load locale:", lang, e);
      localeData = locales["en"] || {};
    }
  }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  localStorage.setItem("lang", lang);
  updateDOM();
}
function t(key) {
  return key.split(".").reduce((obj, k) => obj && obj[k] !== void 0 ? obj[k] : null, localeData) || key;
}
function updateDOM() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });
}
async function initI18n(lang) {
  await loadLocale(lang);
}
const i18n = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  initI18n,
  loadLocale,
  t
}, Symbol.toStringTag, { value: "Module" }));
const themeNames = {
  aurora: "Aurora",
  neon: "Neon Nights",
  sunset: "Sunset",
  ocean: "Ocean",
  midnight: "Midnight",
  forest: "Forest",
  cyberpunk: "Cyberpunk",
  light: "Minimal Light"
};
const themeOrder = Object.keys(themeNames);
let currentThemeIndex = 0;
function applyTheme(themeId) {
  document.documentElement.className = `theme-${themeId}`;
  localStorage.setItem("theme", themeId);
  const nameEl = document.getElementById("currentThemeName");
  if (nameEl) nameEl.textContent = themeNames[themeId] || themeId;
  document.querySelectorAll(".theme-swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.theme === themeId);
  });
  if (window.particleSystem) {
    window.particleSystem.setTheme(themeId);
  }
  currentThemeIndex = themeOrder.indexOf(themeId);
}
function cycleTheme() {
  const themeId = themeOrder[(currentThemeIndex + 1) % themeOrder.length];
  applyTheme(themeId);
}
function initThemes() {
  const saved = localStorage.getItem("theme") || "aurora";
  if (themeOrder.includes(saved)) {
    currentThemeIndex = themeOrder.indexOf(saved);
  }
  applyTheme(themeOrder[currentThemeIndex]);
  document.querySelectorAll(".theme-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      applyTheme(swatch.dataset.theme);
    });
  });
  document.getElementById("themeBtn")?.addEventListener("click", cycleTheme);
}
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"]);
let currentIndex = 0;
function initPreview() {
  const overlay = document.getElementById("previewOverlay");
  const closeBtn = document.getElementById("previewCloseBtn");
  const prevBtn = document.getElementById("previewPrevBtn");
  const nextBtn = document.getElementById("previewNextBtn");
  const deleteBtn = document.getElementById("previewDeleteBtn");
  const openBtn = document.getElementById("previewOpenBtn");
  closeBtn.addEventListener("click", closePreview);
  prevBtn.addEventListener("click", () => navigate(-1));
  nextBtn.addEventListener("click", () => navigate(1));
  deleteBtn.addEventListener("click", handleDelete);
  openBtn.addEventListener("click", handleOpen);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePreview();
  });
  document.addEventListener("keydown", (e) => {
    if (!overlay.classList.contains("hidden")) {
      if (e.key === "Escape") closePreview();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "Delete") handleDelete();
      if (e.key === "o" || e.key === "O") handleOpen();
    }
  });
}
function isImageFile(filePath) {
  const ext = filePath.toLowerCase().split(".").pop();
  return IMAGE_EXTENSIONS.has(`.${ext}`);
}
function setPreviewIndex(idx) {
  currentIndex = idx;
}
function openPreview() {
  const entry = historyEntries[currentIndex];
  if (!entry) return;
  const overlay = document.getElementById("previewOverlay");
  const img = document.getElementById("previewImage");
  const info = document.getElementById("previewInfo");
  const prevBtn = document.getElementById("previewPrevBtn");
  const nextBtn = document.getElementById("previewNextBtn");
  document.getElementById("previewDeleteBtn");
  img.style.display = "block";
  img.src = "";
  overlay.classList.remove("hidden");
  prevBtn.style.display = currentIndex > 0 ? "flex" : "none";
  nextBtn.style.display = currentIndex < historyEntries.length - 1 ? "flex" : "none";
  const size = formatSize(entry.fileSize);
  const date = new Date(entry.date).toLocaleDateString();
  const typeIcon = getFileTypeIcon(entry.type || pathType(entry.path));
  info.innerHTML = `${typeIcon} ${entry.fileName} • ${size} • ${date}`;
  if (isImageFile(entry.path)) {
    img.style.display = "block";
    window.api.getImageData(entry.path).then((dataUrl) => {
      if (dataUrl) {
        img.src = dataUrl;
      } else {
        img.alt = "Failed to load image";
        showFileInfo(entry);
      }
    });
  } else {
    img.style.display = "none";
    showFileInfo(entry);
  }
}
function showFileInfo(entry) {
  const overlay = document.getElementById("previewOverlay");
  const info = document.getElementById("previewInfo");
  const size = formatSize(entry.fileSize);
  const date = new Date(entry.date).toLocaleDateString();
  const icon = getFileTypeIcon(entry.type || pathType(entry.path));
  let existingCard = document.getElementById("previewFileCard");
  if (!existingCard) {
    existingCard = document.createElement("div");
    existingCard.id = "previewFileCard";
    existingCard.className = "flex flex-col items-center gap-4";
    const center = overlay.querySelector(".flex.items-center.justify-center");
    if (center) center.appendChild(existingCard);
  }
  existingCard.innerHTML = `
    <div class="text-6xl mb-2">${icon}</div>
    <div class="text-lg font-medium text-white">${entry.fileName}</div>
    <div class="text-sm text-white/60">${size} • ${date}</div>
    <button onclick="window.api.openFile('${entry.path.replace(/\\/g, "\\\\")}')" class="mt-2 px-5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-all">
      <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
      Open File
    </button>
  `;
  info.textContent = `${entry.fileName} • ${size} • ${date}`;
  const img = document.getElementById("previewImage");
  if (img) img.style.display = "none";
}
function pathType(filePath) {
  const ext = filePath.toLowerCase().split(".").pop();
  const imgExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];
  const videoExts = ["mp4", "mkv", "webm", "mov", "avi", "wmv"];
  const docExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz"];
  if (imgExts.includes(ext)) return "photo";
  if (audioExts.includes(ext)) return "audio";
  if (videoExts.includes(ext)) return "video";
  if (docExts.includes(ext)) return "document";
  if (archiveExts.includes(ext)) return "archive";
  return "file";
}
function getFileTypeIcon(type) {
  const icons = {
    photo: "🖼",
    document: "📄",
    audio: "🎵",
    video: "🎬",
    voice: "🎙",
    animation: "📹",
    archive: "📦",
    file: "📁"
  };
  return icons[type] || icons.file;
}
function closePreview() {
  document.getElementById("previewOverlay").classList.add("hidden");
  const card = document.getElementById("previewFileCard");
  if (card) card.remove();
  const img = document.getElementById("previewImage");
  if (img) img.style.display = "block";
}
function navigate(dir) {
  const newIdx = currentIndex + dir;
  if (newIdx >= 0 && newIdx < historyEntries.length) {
    currentIndex = newIdx;
    openPreview();
  }
}
async function handleDelete() {
  const entry = historyEntries[currentIndex];
  if (!entry) return;
  await window.api.deleteFile(entry.path);
  historyEntries.splice(currentIndex, 1);
  showToast("File deleted");
  closePreview();
  if (historyEntries.length === 0) {
    document.getElementById("historyGrid").innerHTML = "";
    document.getElementById("historyEmpty").style.display = "flex";
  }
}
function handleOpen() {
  const entry = historyEntries[currentIndex];
  if (entry) window.api.openFile(entry.path);
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
let historyEntries = [];
async function initHistory() {
  historyEntries = await window.api.getHistory();
  renderGrid();
  document.getElementById("historySearch")?.addEventListener("input", (e) => {
    renderGrid(e.target.value.toLowerCase());
  });
  document.getElementById("clearHistoryBtn")?.addEventListener("click", async () => {
    await window.api.clearHistory();
    historyEntries = [];
    renderGrid();
  });
}
function renderGrid(filter = "") {
  const grid = document.getElementById("historyGrid");
  const empty = document.getElementById("historyEmpty");
  const filtered = filter ? historyEntries.filter((e) => e.fileName.toLowerCase().includes(filter)) : historyEntries;
  grid.innerHTML = "";
  if (filtered.length === 0) {
    empty.style.display = "flex";
    return;
  }
  empty.style.display = "none";
  const IMAGE_EXTENSIONS2 = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"]);
  const TYPE_ICONS = {
    photo: "🖼",
    document: "📄",
    audio: "🎵",
    video: "🎬",
    voice: "🎙",
    animation: "📹",
    archive: "📦",
    file: "📁"
  };
  filtered.forEach((entry, idx) => {
    const item = document.createElement("div");
    item.className = "history-item glass-card rounded-xl overflow-hidden group";
    item.dataset.index = idx;
    const isImage = IMAGE_EXTENSIONS2.has("." + entry.path.split(".").pop().toLowerCase());
    const typeIcon = TYPE_ICONS[entry.type] || TYPE_ICONS.file;
    const thumb = document.createElement("div");
    thumb.className = "aspect-square bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden";
    if (isImage) {
      thumb.innerHTML = `
        <div class="w-full h-full flex items-center justify-center">
          <svg class="w-8 h-8 text-[var(--text-secondary)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>`;
      window.api.getThumbnail(entry.path).then((dataUrl) => {
        if (dataUrl) {
          const imgEl = document.createElement("img");
          imgEl.src = dataUrl;
          imgEl.className = "w-full h-full object-cover";
          imgEl.loading = "lazy";
          thumb.innerHTML = "";
          thumb.appendChild(imgEl);
        }
      });
    } else {
      thumb.innerHTML = `<div class="text-3xl opacity-60 select-none">${typeIcon}</div>`;
    }
    const info = document.createElement("div");
    info.className = "p-2 flex items-center gap-1.5";
    const typeBadge = document.createElement("span");
    typeBadge.className = "text-xs opacity-50";
    typeBadge.textContent = entry.type || "file";
    const name = document.createElement("p");
    name.className = "text-xs truncate text-[var(--text-secondary)] flex-1";
    name.textContent = entry.fileName;
    info.appendChild(typeBadge);
    info.appendChild(name);
    item.appendChild(thumb);
    item.appendChild(info);
    item.addEventListener("click", () => {
      const globalIdx = historyEntries.indexOf(entry);
      setPreviewIndex(globalIdx);
      openPreview();
    });
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      handleContextMenu(entry, e.clientX, e.clientY);
    });
    grid.appendChild(item);
  });
}
function handleContextMenu(entry, x, y) {
  const menu = document.createElement("div");
  menu.className = "fixed z-50 glass-card rounded-xl py-1 text-sm shadow-2xl";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const items = [
    { label: "Open File", action: () => window.api.openFile(entry.path) },
    { label: "Open Folder", action: () => window.api.openFolder(entry.path) },
    { type: "separator" },
    { label: "Delete", action: () => deleteEntry(entry) }
  ];
  items.forEach((item) => {
    if (item.type === "separator") {
      const sep = document.createElement("div");
      sep.className = "border-t border-[var(--glass-border)] my-1";
      menu.appendChild(sep);
    } else {
      const btn = document.createElement("button");
      btn.className = "w-full text-left px-4 py-1.5 hover:bg-[var(--glass-bg)] transition-colors";
      btn.textContent = item.label;
      btn.addEventListener("click", () => {
        item.action();
        menu.remove();
      });
      menu.appendChild(btn);
    }
  });
  document.body.appendChild(menu);
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener("click", closeMenu);
    }
  };
  setTimeout(() => document.addEventListener("click", closeMenu), 0);
}
async function deleteEntry(entry) {
  await window.api.deleteFile(entry.path);
  historyEntries = historyEntries.filter((e) => e !== entry);
  renderGrid();
  await window.api.clearHistory();
  for (const e of historyEntries) {
    await window.api.addHistoryEntry(e);
  }
}
function addHistoryItem(entry) {
  historyEntries.unshift(entry);
  if (historyEntries.length > 200) historyEntries.length = 200;
  document.getElementById("historyGrid");
  const empty = document.getElementById("historyEmpty");
  empty.style.display = "none";
  renderGrid();
}
async function refreshHistory() {
  historyEntries = await window.api.getHistory();
  renderGrid();
}
let botRunning = false;
let photoCount = 0;
let docCount = 0;
let lastDownloadTime = null;
function initBotController() {
  const startBtn = document.getElementById("startBotBtn");
  const stopBtn = document.getElementById("stopBotBtn");
  startBtn.addEventListener("click", handleStart);
  stopBtn.addEventListener("click", handleStop);
  window.api.onBotLog((text) => {
    addLogEntry(text);
  });
  window.api.onBotStatus((status) => {
    botRunning = status === "running";
    updateUI();
  });
  window.api.onBotDownload((entry) => {
    if (entry.type === "photo") photoCount++;
    else docCount++;
    lastDownloadTime = /* @__PURE__ */ new Date();
    addHistoryItem(entry);
    updateStats();
  });
  window.api.onBotError((err) => {
    addLogEntry(`[ERROR] ${err}`);
  });
  window.api.onBotRequestStart(() => {
    handleStart();
  });
  window.api.getBotStatus().then((running) => {
    botRunning = running;
    updateUI();
  });
  document.getElementById("clearLogBtn")?.addEventListener("click", () => {
    document.getElementById("logEntries").innerHTML = "";
  });
  updateStats();
}
async function handleStart() {
  const config = await window.api.getConfig();
  if (!config.token) {
    showToast(t("errors.noToken"), "error");
    return;
  }
  if (!config.allowed_user_id) {
    showToast(t("errors.noUserId"), "error");
    return;
  }
  addLogEntry("[BOT] Starting...");
  await window.api.startBot({
    token: config.token,
    allowedUserId: config.allowed_user_id,
    downloadFolder: config.download_folder
  });
}
async function handleStop() {
  addLogEntry("[BOT] Stopping...");
  await window.api.stopBot();
}
function updateUI() {
  const badge = document.getElementById("statusBadge");
  document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  const startBtn = document.getElementById("startBotBtn");
  const stopBtn = document.getElementById("stopBotBtn");
  if (botRunning) {
    badge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 running";
    text.textContent = t("dashboard.botStatus.running");
    startBtn.disabled = true;
    startBtn.className = "btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 opacity-50 cursor-not-allowed";
    stopBtn.disabled = false;
    stopBtn.className = "btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200";
  } else {
    badge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 stopped";
    text.textContent = t("dashboard.botStatus.stopped");
    startBtn.disabled = false;
    startBtn.className = "btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200";
    stopBtn.disabled = true;
    stopBtn.className = "btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 opacity-50 cursor-not-allowed";
  }
}
function addLogEntry(text) {
  const container = document.getElementById("logEntries");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const time = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  entry.textContent = `[${time}] ${text}`;
  container.appendChild(entry);
  const logContainer = document.getElementById("logContainer");
  logContainer.scrollTop = logContainer.scrollHeight;
}
function updateStats() {
  const statsEl = document.getElementById("statsDisplay");
  if (photoCount > 0 || docCount > 0) {
    statsEl.classList.remove("hidden");
    let text = `${photoCount} photos`;
    if (docCount > 0) text += `, ${docCount} docs`;
    if (lastDownloadTime) {
      const diff = Math.floor((Date.now() - lastDownloadTime) / 1e3);
      if (diff < 60) text += ` • just now`;
      else text += ` • ${Math.floor(diff / 60)}m ago`;
    }
    statsEl.textContent = text;
  }
}
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "bg-red-500/20 border-red-500/30 text-red-300" : "bg-[var(--glass-bg)]"}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3e3);
}
const botController = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get botRunning() {
    return botRunning;
  },
  initBotController,
  showToast
}, Symbol.toStringTag, { value: "Module" }));
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.mouse = { x: -9999, y: -9999 };
    this.running = true;
    this.themeColor = "129, 140, 248";
    this.animationId = null;
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.animate();
  }
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  createParticles() {
    this.particles = [];
    const count = Math.min(80, Math.floor(this.canvas.width * this.canvas.height / 15e3));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }
  bindEvents() {
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    document.addEventListener("mouseleave", () => {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    });
  }
  setTheme(themeId) {
    const colorMap = {
      aurora: "129, 140, 248",
      neon: "236, 72, 153",
      sunset: "251, 146, 60",
      ocean: "34, 211, 238",
      midnight: "148, 163, 184",
      forest: "74, 222, 128",
      cyberpunk: "251, 191, 36",
      light: "99, 102, 241"
    };
    this.themeColor = colorMap[themeId] || "129, 140, 248";
  }
  animate() {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const [r, g, b] = this.themeColor.split(",").map(Number);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.01;
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.canvas.height + 10;
      if (p.y > this.canvas.height + 10) p.y = -10;
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const force = (120 - dist) / 120;
        p.x -= dx * force * 0.015;
        p.y -= dy * force * 0.015;
      }
      const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.08;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, pulseOpacity)})`;
      this.ctx.fill();
    }
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.06 * (1 - dist / 100)})`;
          this.ctx.stroke();
        }
      }
    }
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  destroy() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
async function init() {
  const config = await window.api.getConfig();
  const lang = config.language || "en";
  await initI18n(lang);
  initThemes();
  initBotController();
  initHistory();
  initPreview();
  initParticles();
  initRouter();
  initSettings();
  initFolderDrop();
  initNavigation();
}
function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  window.particleSystem = new ParticleSystem(canvas);
}
function initRouter() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageId = btn.dataset.page;
      navBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".page").forEach((p) => {
        p.classList.add("hidden");
      });
      document.getElementById(`page-${pageId}`).classList.remove("hidden");
      if (pageId === "history") refreshHistory();
    });
  });
  document.querySelector(".nav-btn.active")?.click();
}
function initSettings() {
  loadSettings();
  document.getElementById("saveSettingsBtn")?.addEventListener("click", saveSettings);
  document.getElementById("settingBrowseBtn")?.addEventListener("click", async () => {
    const folder = await window.api.selectFolder();
    if (folder) {
      document.getElementById("settingFolder").value = folder;
    }
  });
  document.getElementById("browseFolderBtn")?.addEventListener("click", async () => {
    const folder = await window.api.selectFolder();
    if (folder) {
      document.getElementById("folderPathDisplay").textContent = folder;
      const config = await window.api.getConfig();
      config.download_folder = folder;
      await window.api.saveConfig(config);
    }
  });
  document.getElementById("settingLanguage")?.addEventListener("change", async (e) => {
    const { loadLocale: loadLocale2 } = await __vitePreload(async () => {
      const { loadLocale: loadLocale3 } = await Promise.resolve().then(() => i18n);
      return { loadLocale: loadLocale3 };
    }, true ? void 0 : void 0, import.meta.url);
    await loadLocale2(e.target.value);
    const config = await window.api.getConfig();
    config.language = e.target.value;
    await window.api.saveConfig(config);
  });
}
async function loadSettings() {
  const config = await window.api.getConfig();
  document.getElementById("settingToken").value = config.token || "";
  document.getElementById("settingUserId").value = config.allowed_user_id || "";
  document.getElementById("settingFolder").value = config.download_folder || "";
  document.getElementById("settingLanguage").value = config.language || "en";
  document.getElementById("optAutoStart").checked = config.auto_start || false;
  document.getElementById("optNotifications").checked = config.notifications !== false;
  document.getElementById("optMinimizeTray").checked = config.minimize_to_tray !== false;
  document.getElementById("folderPathDisplay").textContent = config.download_folder || "";
}
async function saveSettings() {
  const config = {
    token: document.getElementById("settingToken").value.trim(),
    allowed_user_id: document.getElementById("settingUserId").value.trim(),
    download_folder: document.getElementById("settingFolder").value.trim(),
    language: document.getElementById("settingLanguage").value,
    auto_start: document.getElementById("optAutoStart").checked,
    notifications: document.getElementById("optNotifications").checked,
    minimize_to_tray: document.getElementById("optMinimizeTray").checked
  };
  await window.api.saveConfig(config);
  document.getElementById("folderPathDisplay").textContent = config.download_folder;
  const { showToast: showToast2 } = await __vitePreload(async () => {
    const { showToast: showToast3 } = await Promise.resolve().then(() => botController);
    return { showToast: showToast3 };
  }, true ? void 0 : void 0, import.meta.url);
  showToast2("Settings saved!");
}
function initFolderDrop() {
  const dropZone = document.getElementById("folderDropZone");
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.className = "flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border-2 border-dashed transition-all duration-300 cursor-pointer border-[var(--accent)]";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.className = "flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--glass-border)] transition-all duration-300 cursor-pointer hover:border-[var(--accent)]";
  });
  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropZone.className = "flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--glass-border)] transition-all duration-300 cursor-pointer hover:border-[var(--accent)]";
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const folder = files[0].path;
      document.getElementById("folderPathDisplay").textContent = folder;
      const config = await window.api.getConfig();
      config.download_folder = folder;
      await window.api.saveConfig(config);
    }
  });
}
function initNavigation() {
  document.getElementById("previewCloseBtn")?.addEventListener("click", () => {
    document.getElementById("previewOverlay").classList.add("hidden");
  });
}
document.addEventListener("DOMContentLoaded", init);
