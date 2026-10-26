const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
    pickWallpaper: () => ipcRenderer.invoke('pick-wallpaper'),
    getHistory: () => ipcRenderer.invoke('get-history'),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    getStats: () => ipcRenderer.invoke('get-stats'),
    pickJava: () => ipcRenderer.invoke('pick-java'),
    findJavas: () => ipcRenderer.invoke('find-javas'),

    // Window controls
    winMinimize: () => ipcRenderer.invoke('win-minimize'),
    winMaximize: () => ipcRenderer.invoke('win-maximize'),
    winClose: () => ipcRenderer.invoke('win-close'),

    // Language
    getLocale: (lang) => ipcRenderer.invoke('get-locale', lang),

    // Authlib
    authlibLogin: (p) => ipcRenderer.invoke('authlib-login', p),
    saveAuthlibProfile: (p) => ipcRenderer.invoke('save-authlib-profile', p),

    // Servers
    listServers: () => ipcRenderer.invoke('list-servers'),
    addServer: (p) => ipcRenderer.invoke('add-server', p),
    deleteServer: (id) => ipcRenderer.invoke('delete-server', id),

    // Instances
    importMrpack: (p) => ipcRenderer.invoke('import-mrpack', p),
    deleteInstance: (n) => ipcRenderer.invoke('delete-instance', n),
    copyInstance: (p) => ipcRenderer.invoke('copy-instance', p),
    exportInstance: (n) => ipcRenderer.invoke('export-instance', n),
    exportMrpack: (p) => ipcRenderer.invoke('export-mrpack', p),
    updateInstanceMeta: (p) => ipcRenderer.invoke('update-instance-meta', p),
    pickInstanceIcon: (n) => ipcRenderer.invoke('pick-instance-icon', n),
    pickInstanceBanner: (n) => ipcRenderer.invoke('pick-instance-banner', n),
    setInstanceTags: (p) => ipcRenderer.invoke('set-instance-tags', p),
    getAllTags: () => ipcRenderer.invoke('get-all-tags'),

    // Modpack updates
    checkModpackUpdate: (n) => ipcRenderer.invoke('check-modpack-update', n),
    updateModpack: (p) => ipcRenderer.invoke('update-modpack', p),
    getModpackChangelog: (p) => ipcRenderer.invoke('get-modpack-changelog', p),
    resolveModDeps: (p) => ipcRenderer.invoke('resolve-moddeps', p),
    analyzeCrash: (n) => ipcRenderer.invoke('analyze-crash', n),
    detectConflicts: (n) => ipcRenderer.invoke('detect-conflicts', n),

    // Mod update tracking
    trackMod: (p) => ipcRenderer.invoke('track-mod', p),
    checkModUpdates: (n) => ipcRenderer.invoke('check-mod-updates', n),
    applyModUpdate: (p) => ipcRenderer.invoke('apply-mod-update', p),

    // Screenshots
    listScreenshots: (n) => ipcRenderer.invoke('list-screenshots', n),
    deleteScreenshot: (p) => ipcRenderer.invoke('delete-screenshot', p),
    uploadScreenshot: (p) => ipcRenderer.invoke('upload-screenshot', p),

    // Backups
    backupInstance: (p) => ipcRenderer.invoke('backup-instance', p),
    listBackups: (n) => ipcRenderer.invoke('list-backups', n),
    restoreBackup: (p) => ipcRenderer.invoke('restore-backup', p),
    deleteBackup: (p) => ipcRenderer.invoke('delete-backup', p),

    // Mods
    listMods: (n) => ipcRenderer.invoke('list-mods', n),
    toggleMod: (p) => ipcRenderer.invoke('toggle-mod', p),
    deleteMod: (p) => ipcRenderer.invoke('delete-mod', p),
    listFolder: (p) => ipcRenderer.invoke('list-folder', p),
    addMods: (p) => ipcRenderer.invoke('add-mods', p),
    pickMods: () => ipcRenderer.invoke('pick-mods'),

    // Files
    fileList: (p) => ipcRenderer.invoke('file-list', p),
    fileRead: (p) => ipcRenderer.invoke('file-read', p),
    fileDelete: (p) => ipcRenderer.invoke('file-delete', p),
    fileRename: (p) => ipcRenderer.invoke('file-rename', p),
    fileMkdir: (p) => ipcRenderer.invoke('file-mkdir', p),
    fileWrite: (p) => ipcRenderer.invoke('file-write', p),
    fileImport: (p) => ipcRenderer.invoke('file-import', p),
    filePick: () => ipcRenderer.invoke('file-pick'),

    // Profiles
    listProfiles: () => ipcRenderer.invoke('list-profiles'),
    addProfile: (n) => ipcRenderer.invoke('add-profile', n),
    setActiveProfile: (id) => ipcRenderer.invoke('set-active-profile', id),
    deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),
    renameProfile: (p) => ipcRenderer.invoke('rename-profile', p),

    // Versions
    getMcVersions: () => ipcRenderer.invoke('get-mc-versions'),
    getFabricVersions: (mc) => ipcRenderer.invoke('get-fabric-versions', mc),
    getQuiltVersions: (mc) => ipcRenderer.invoke('get-quilt-versions', mc),
    getForgeVersions: (mc) => ipcRenderer.invoke('get-forge-versions', mc),
    getNeoforgeVersions: (mc) => ipcRenderer.invoke('get-neoforge-versions', mc),
    createInstance: (p) => ipcRenderer.invoke('create-instance', p),

    // Modrinth
    modrinthSearch: (p) => ipcRenderer.invoke('modrinth-search', p),
    modrinthInstall: (p) => ipcRenderer.invoke('modrinth-install', p),
    modrinthGetProject: (id) => ipcRenderer.invoke('modrinth-get-project', id),
    modrinthGetFullProject: (id) => ipcRenderer.invoke('modrinth-get-full-project', id),
    modrinthGetAllVersions: (id) => ipcRenderer.invoke('modrinth-get-all-versions', id),
    modrinthInstallVersion: (p) => ipcRenderer.invoke('modrinth-install-version', p),
    modrinthInstallModpack: (p) => ipcRenderer.invoke('modrinth-install-modpack', p),

    // Themes
    exportTheme: (p) => ipcRenderer.invoke('export-theme', p),
    importTheme: () => ipcRenderer.invoke('import-theme'),
    listSavedThemes: () => ipcRenderer.invoke('list-saved-themes'),
    saveTheme: (p) => ipcRenderer.invoke('save-theme', p),
    deleteTheme: (n) => ipcRenderer.invoke('delete-theme', n),

    // Launch
    launch: (p) => ipcRenderer.invoke('launch', p),
    killGame: () => ipcRenderer.invoke('kill-game'),
    isGameRunning: () => ipcRenderer.invoke('is-game-running'),

    // Hotkey
    reregisterHotkey: () => ipcRenderer.invoke('reregister-hotkey'),

    // Auto-update
    checkLauncherUpdate: () => ipcRenderer.invoke('check-launcher-update'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // Instances list & system
    listInstances: () => ipcRenderer.invoke('list-instances'),
    openInstances: () => ipcRenderer.invoke('open-instances'),
    openInstanceFolder: (p) => ipcRenderer.invoke('open-instance-folder', p),
    openFolder: (p) => ipcRenderer.invoke('open-folder', p),
    getInstancesDir: () => ipcRenderer.invoke('get-instances-dir'),
    sysInfo: () => ipcRenderer.invoke('sys-info'),

    // Events
    onLog: (cb) => ipcRenderer.on('log', (_e, d) => cb(d)),
    onProgress: (cb) => ipcRenderer.on('progress', (_e, d) => cb(d)),
    onGameClosed: (cb) => ipcRenderer.on('game-closed', (_e, c) => cb(c)),
    onQuickLaunch: (cb) => ipcRenderer.on('quick-launch', () => cb())
});