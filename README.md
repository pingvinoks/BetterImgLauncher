# BetterImgLauncher

Open-source launcher for the **Better Image Fix** modpack.

## Features
- Import `.mrpack` from Modrinth or direct URL
- Auto-install Fabric / Forge / NeoForge / Quilt
- Built-in Modrinth browser (mods, resource packs, shaders)
- Offline profiles (pirate-friendly)
- Create instances with any MC version + loader
- Custom pre-launch / post-exit commands
- Per-instance mod manager, worlds, resource packs

## Download
Grab the latest build from [Releases](../../releases):
- **Windows:** `BetterImgLauncher Setup 1.0.0.exe` (installer) or portable `.exe`
- **macOS:** `BetterImgLauncher-1.0.0-universal.dmg`
- **Linux:** `BetterImgLauncher-1.0.0.AppImage'

## Installation notes
- **Windows:** SmartScreen may warn — click *More info → Run anyway*.
- **macOS:** unsigned build — right-click the `.app` → *Open* → *Open* once.
- **Java:** required. In launcher go to *Settings → Java → Browse* and pick your `java` / `javaw.exe` (Java 21 recommended for MC 1.21+).

## Build from source
```bash
npm install
npm start                 # dev
npm run dist:mac          # macOS universal
npm run dist:win          # Windows x64
npm run dist:linux        # Linux x64
```

## License
The Unlicense - https://unlicense.org/

## Credits
Built with [minecraft-launcher-core](https://github.com/Pierce01/MinecraftLauncher-core), [Electron](https://electronjs.org), [Modrinth API](https://docs.modrinth.com).
