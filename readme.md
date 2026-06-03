# Telegram Batch File Downloader

A desktop application to automatically download files from Telegram. Runs as a bot — set your token, specify an allowed user, and every file they send gets saved instantly.

## Features

- **Download all file types** — photos, documents, audio, video, voice messages, animations
- **8 animated themes** — Aurora, Neon Nights, Sunset, Ocean, Midnight, Forest, Cyberpunk, Minimal Light
- **Live particle background** — floating particles with mouse interaction, per-theme colors
- **i18n** — English, العربية (RTL), Français
- **Download history** — thumbnail grid with search, inline preview, right-click context menu
- **System notifications** — alerts on new downloads
- **Minimize to tray** — runs in the background, tray icon shows bot status (green/gray)
- **Drag & drop** — set download folder by dragging it into the window
- **Auto-start bot** — optional, boots the bot when the app launches
- **Fully offline** — no external server, no telemetry, no internet except Telegram API


## Prerequisites

- Node.js 20+
- npm 9+
- A Telegram bot token (get one from [@BotFather](https://t.me/BotFather))

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Build for production
npm run build

# Package Windows installer
npm run dist
```

## Usage

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram and get your token
2. Get your Telegram user ID (use [@userinfobot](https://t.me/userinfobot))
3. Launch the app, go to **Settings**, enter your bot token and user ID
4. Set a download folder (or drag one in)
5. Go to **Dashboard** and click **Start Bot**
6. Send files from your Telegram account to the bot — they'll download automatically

## Packaging

```bash
npm run dist
```

Output: `dist/Telegram Downloader Setup x.x.x.exe` (Windows NSIS installer).

Config is stored at `%APPDATA%/telegram-downloader/config.json`.

## Project Structure

```
telegram-downloader/
├── src/
│   ├── main/          # Electron main process (window, tray, bot, IPC)
│   ├── preload/       # Secure context bridge
│   └── renderer/      # UI (HTML, Tailwind CSS, vanilla JS)
│       ├── locales/   # en.json, ar.json, fr.json
│       └── assets/    # SVG icon, tray icons
├── out/               # Build output (gitignored)
├── dist/              # NSIS installer (gitignored)
├── package.json
├── electron.vite.config.mjs
├── tailwind.config.js
├── postcss.config.js
└── electron-builder.yml
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Desktop shell | Electron 31 |
| Bundler | Vite via electron-vite |
| CSS | Tailwind CSS 3 |
| Telegram | node-telegram-bot-api |
| Packaging | electron-builder (NSIS) |

## Themes

Click the palette button in the top bar to cycle through themes. Each theme changes background gradient, accent color, particle colors, and glassmorphism tones:

1. **Aurora** — purple/blue/teal
2. **Neon Nights** — magenta/cyan
3. **Sunset** — orange/pink/gold
4. **Ocean** — cyan/teal/aqua
5. **Midnight** — slate/muted cool
6. **Forest** — emerald/green
7. **Cyberpunk** — hot pink/purple/yellow
8. **Minimal Light** — clean light mode

## Translations

Switch language in Settings. Arabic enables automatic RTL layout. Add new languages by creating `src/renderer/locales/{code}.json`.

## License

MIT
