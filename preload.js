const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
    getHistory: () => ipcRenderer.invoke('get-history'),
    pickJava: () => ipcRenderer.invoke('pick-java'),

    importMrpack: (p) => ipcRenderer.invoke('import-mrpack', p),
    repairInstance: (p) => ipcRenderer.invoke('repair-instance', p),
    deleteInstance: (n) => ipcRenderer.invoke('delete-instance', n),
    copyInstance: (p) => ipcRenderer.invoke('copy-instance', p),
    exportInstance: (n) => ipcRenderer.invoke('export-instance', n),
    updateInstanceMeta: (p) => ipcRenderer.invoke('update-instance-meta', p),

    listMods: (n) => ipcRenderer.invoke('list-mods', n),
    toggleMod: (p) => ipcRenderer.invoke('toggle-mod', p),
    deleteMod: (p) => ipcRenderer.invoke('delete-mod', p),
    listFolder: (p) => ipcRenderer.invoke('list-folder', p),
    addMods: (p) => ipcRenderer.invoke('add-mods', p),
    pickMods: () => ipcRenderer.invoke('pick-mods'),

    listProfiles: () => ipcRenderer.invoke('list-profiles'),
    addProfile: (n) => ipcRenderer.invoke('add-profile', n),
    setActiveProfile: (id) => ipcRenderer.invoke('set-active-profile', id),
    deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),
    renameProfile: (p) => ipcRenderer.invoke('rename-profile', p),

    getMcVersions: () => ipcRenderer.invoke('get-mc-versions'),
    getFabricVersions: (mc) => ipcRenderer.invoke('get-fabric-versions', mc),
    getQuiltVersions: (mc) => ipcRenderer.invoke('get-quilt-versions', mc),
    getForgeVersions: (mc) => ipcRenderer.invoke('get-forge-versions', mc),
    getNeoforgeVersions: (mc) => ipcRenderer.invoke('get-neoforge-versions', mc),
    createInstance: (p) => ipcRenderer.invoke('create-instance', p),

    modrinthSearch: (p) => ipcRenderer.invoke('modrinth-search', p),
    modrinthGetVersions: (p) => ipcRenderer.invoke('modrinth-get-versions', p),
    modrinthInstall: (p) => ipcRenderer.invoke('modrinth-install', p),
    modrinthGetProject: (id) => ipcRenderer.invoke('modrinth-get-project', id),

    launch: (p) => ipcRenderer.invoke('launch', p),
    killGame: () => ipcRenderer.invoke('kill-game'),
    isGameRunning: () => ipcRenderer.invoke('is-game-running'),

    listInstances: () => ipcRenderer.invoke('list-instances'),
    openInstances: () => ipcRenderer.invoke('open-instances'),
    openInstanceFolder: (p) => ipcRenderer.invoke('open-instance-folder', p),
    openFolder: (p) => ipcRenderer.invoke('open-folder', p),
    getInstancesDir: () => ipcRenderer.invoke('get-instances-dir'),
    sysInfo: () => ipcRenderer.invoke('sys-info'),

    onLog: (cb) => ipcRenderer.on('log', (_e, d) => cb(d)),
    onProgress: (cb) => ipcRenderer.on('progress', (_e, d) => cb(d)),
    onGameClosed: (cb) => ipcRenderer.on('game-closed', (_e, c) => cb(c))
});