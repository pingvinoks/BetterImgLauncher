const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
    getHistory: () => ipcRenderer.invoke('get-history'),
    pickJava: () => ipcRenderer.invoke('pick-java'),
    findJavas: () => ipcRenderer.invoke('find-javas'),

    authlibLogin: (p) => ipcRenderer.invoke('authlib-login', p),
    saveAuthlibProfile: (p) => ipcRenderer.invoke('save-authlib-profile', p),

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

    fileList: (p) => ipcRenderer.invoke('file-list', p),
    fileRead: (p) => ipcRenderer.invoke('file-read', p),
    fileDelete: (p) => ipcRenderer.invoke('file-delete', p),
    fileRename: (p) => ipcRenderer.invoke('file-rename', p),
    fileMkdir: (p) => ipcRenderer.invoke('file-mkdir', p),
    fileWrite: (p) => ipcRenderer.invoke('file-write', p),
    fileImport: (p) => ipcRenderer.invoke('file-import', p),
    filePick: () => ipcRenderer.invoke('file-pick'),

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
    modrinthInstall: (p) => ipcRenderer.invoke('modrinth-install', p),
    modrinthGetProject: (id) => ipcRenderer.invoke('modrinth-get-project', id),
    modrinthGetFullProject: (id) => ipcRenderer.invoke('modrinth-get-full-project', id),
    modrinthGetAllVersions: (id) => ipcRenderer.invoke('modrinth-get-all-versions', id),
    modrinthInstallVersion: (p) => ipcRenderer.invoke('modrinth-install-version', p),
    modrinthInstallModpack: (p) => ipcRenderer.invoke('modrinth-install-modpack', p),

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