const $ = id => document.getElementById(id);
const logEl = $('log');
let allLogs = [];
let logTypeFilter = 'all';
let currentLogFilter = '';

let settings = null;
let profiles = [];
let cachedJavas = [];
let authlibSession = null;
let instances = [];
let currentModalInstance = null;
let filesCurrentInstance = '';
let filesCurrentPath = '';
let currentLocale = {};
let currentLang = 'en';
let currentLibrarySearch = '';
let currentLibraryTag = '';
let currentTagList = [];

const DEFAULT_LOCALE = {
    'nav.home': 'Home', 'nav.library': 'Library', 'nav.discover': 'Discover',
    'nav.newInstance': 'New Instance', 'nav.servers': 'Servers', 'nav.files': 'Files',
    'nav.stats': 'Stats', 'nav.settings': 'Settings', 'nav.console': 'Console',
    'home.welcome': 'Welcome back', 'home.quickLaunch': 'Quick launch and status',
    'home.lastPlayed': 'Last played', 'home.system': 'System',
    'home.noInstances': 'No instances yet.', 'home.javaDetected': 'Java detected',
    'home.activeProfile': 'Active profile', 'home.platform': 'Platform',
    'library.title': 'Library', 'library.sub': 'Your modpack instances',
    'library.empty': 'No instances yet', 'library.emptySub': 'Create one on the New Instance tab',
    'library.play': 'Play', 'library.edit': 'Edit', 'library.folder': 'Folder',
    'library.update': 'Check mod updates', 'library.search': 'Search instances...',
    'library.allTags': 'All tags',
    'discover.title': 'Discover', 'discover.sub': 'Browse Modrinth',
    'discover.search': 'Search...', 'discover.searchBtn': 'Search',
    'discover.anyMc': 'Any MC version', 'discover.anyLoader': 'Any loader',
    'discover.selectInstance': 'Select instance', 'discover.noResults': 'No results.',
    'discover.install': 'Install', 'discover.installing': 'Installing...',
    'import.title': 'New Instance', 'import.sub': 'Create or import',
    'import.fromMrpack': 'From .mrpack', 'import.manual': 'Manual',
    'import.url': '.mrpack URL', 'import.instanceName': 'Instance name',
    'import.download': 'Download & Install', 'import.importing': 'Importing...',
    'import.mcVersion': 'Minecraft version', 'import.loader': 'Loader',
    'import.loaderVersion': 'Loader version', 'import.create': 'Create Instance',
    'import.creating': 'Creating...', 'import.selectMcFirst': 'Select MC first',
    'servers.title': 'Servers', 'servers.sub': 'Saved servers for quick join',
    'servers.add': 'Add', 'servers.name': 'Server name', 'servers.ip': 'play.example.com:25565',
    'servers.empty': 'No servers yet.',
    'files.title': 'Files', 'files.sub': 'Browse and edit instance files',
    'files.selectInstance': 'Select instance', 'files.import': 'Import',
    'files.newFolder': 'New Folder', 'files.empty': 'Empty folder',
    'stats.title': 'Stats', 'stats.sub': 'Playtime and history',
    'stats.total': 'Total playtime', 'stats.week': 'This week', 'stats.month': 'This month',
    'stats.launches': 'Total launches', 'stats.topInstances': 'Top instances',
    'stats.recent': 'Recent launches', 'stats.noData': 'No data yet. Play some Minecraft!',
    'stats.hours': 'h', 'stats.minutes': 'm',
    'settings.title': 'Settings', 'settings.sub': 'Global launcher configuration',
    'settings.appearance': 'Appearance', 'settings.theme': 'Theme',
    'settings.wallpaper': 'Wallpaper for Home', 'settings.choose': 'Choose',
    'settings.clear': 'Clear', 'settings.customCss': 'Custom CSS',
    'settings.customCssHint': 'Paste CSS to override theme', 'settings.applyCss': 'Apply CSS',
    'settings.language': 'Language', 'settings.notifications': 'Notifications & Integrations',
    'settings.autoBackup': 'Auto-backup before launch', 'settings.discordRpc': 'Discord Rich Presence',
    'settings.minimizeToTray': 'Minimize to tray on launch', 'settings.quickLaunchKey': 'Quick launch hotkey',
    'settings.accounts': 'Accounts', 'settings.addProfile': 'Add',
    'settings.authlib': 'Authlib (Ely.by / LittleSkin)',
    'settings.authlibApiRoot': 'API Root', 'settings.authlibUsername': 'Username',
    'settings.authlibPassword': 'Password', 'settings.authlibLogin': 'Login',
    'settings.performance': 'Performance', 'settings.memory': 'Memory',
    'settings.extraJvm': 'Extra JVM arguments', 'settings.java': 'Java',
    'settings.javaPath': 'Java path', 'settings.browse': 'Browse',
    'settings.detectJava': 'Auto-detect Java', 'settings.modrinthApi': 'Modrinth API',
    'settings.modrinthToken': 'Personal Access Token (optional)',
    'settings.save': 'Save Settings', 'settings.saved': 'Settings saved',
    'console.title': 'Console', 'console.sub': 'Launcher and game logs',
    'console.filter': 'Filter...', 'console.clear': 'Clear',
    'console.all': 'All', 'console.info': 'Info', 'console.success': 'Success',
    'console.warn': 'Warn', 'console.error': 'Error', 'console.game': 'Game',
    'modal.overview': 'Overview', 'modal.mods': 'Mods', 'modal.worlds': 'Worlds',
    'modal.resourcepacks': 'Resource Packs', 'modal.screenshots': 'Screenshots',
    'modal.backups': 'Backups', 'modal.crashes': 'Crashes', 'modal.advanced': 'Advanced',
    'modal.instance': 'Instance', 'modal.size': 'Size', 'modal.playTime': 'Play time',
    'modal.modpackVersion': 'Modpack version', 'modal.icon': 'Icon', 'modal.folder': 'Folder',
    'modal.copy': 'Copy', 'modal.exportZip': 'Export zip', 'modal.exportMrpack': 'Export mrpack',
    'modal.delete': 'Delete', 'modal.checkUpdate': 'Check update',
    'modal.checkingUpdate': 'Checking...', 'modal.updateAvailable': 'Update available',
    'modal.updateNow': 'Update now', 'modal.updating': 'Updating...',
    'modal.upToDate': 'Already up to date ✓',
    'mods.addMod': 'Add Mod', 'mods.checkUpdates': 'Check updates',
    'mods.checking': 'Checking...', 'mods.noMods': 'No mods.',
    'mods.updatesAvailable': 'update(s) available', 'mods.updateAll': 'Update all',
    'mods.update': 'Update', 'mods.delete': 'Delete',
    'worlds.noWorlds': 'No worlds.', 'resourcepacks.noPacks': 'No packs.',
    'screenshots.none': 'No screenshots yet.', 'screenshots.upload': 'Upload to 0x0.st',
    'screenshots.openFolder': 'Open folder', 'backups.create': 'Create backup',
    'backups.restore': 'Restore', 'backups.none': 'No backups.',
    'crashes.none': 'No crash reports. Good.', 'crashes.cause': 'Cause',
    'crashes.mod': 'Mod', 'crashes.preview': 'Show preview',
    'advanced.perInstance': 'Per-instance settings', 'advanced.ram': 'RAM (MB)',
    'advanced.javaPath': 'Java path', 'advanced.extraJvm': 'Extra JVM args',
    'advanced.defaultServer': 'Default server', 'advanced.save': 'Save',
    'advanced.customCommands': 'Custom Commands', 'advanced.preLaunch': 'Pre-launch',
    'advanced.postExit': 'Post-exit', 'advanced.saveCommands': 'Save Commands',
    'advanced.tags': 'Tags', 'advanced.tagsHint': 'Comma separated',
    'advanced.author': 'Author', 'advanced.description': 'Description',
    'conflicts.title': 'Mod conflicts', 'conflicts.missing': 'Missing dependency',
    'conflicts.duplicate': 'Duplicate mods', 'conflicts.install': 'Install',
    'conflicts.none': 'No conflicts detected',
    'toast.settingsSaved': 'Settings saved', 'toast.themeApplied': 'Theme applied',
    'toast.cssApplied': 'CSS applied', 'toast.wallpaperSet': 'Wallpaper set',
    'toast.wallpaperCleared': 'Wallpaper cleared', 'toast.javaSelected': 'Java selected',
    'toast.javaPathUpdated': 'Java path updated', 'toast.profileSwitched': 'Profile switched',
    'toast.profileAdded': 'Profile added', 'toast.profileDeleted': 'Profile deleted',
    'toast.renamed': 'Renamed', 'toast.deleted': 'Deleted', 'toast.copied': 'Copied',
    'toast.exported': 'Exported', 'toast.imported': 'Imported',
    'toast.instanceCreated': 'Instance created', 'toast.instanceDeleted': 'Instance deleted',
    'toast.serverAdded': 'Server added', 'toast.backupCreated': 'Backup created',
    'toast.restored': 'Restored', 'toast.launching': 'Launching...',
    'toast.gameClosed': 'Game closed', 'toast.upToDate': 'Up to date',
    'toast.updated': 'Updated', 'toast.uploaded': 'Uploaded: copy link from clipboard',
    'toast.noConflicts': 'No conflicts detected',
    'common.cancel': 'Cancel', 'common.ok': 'OK', 'common.close': 'Close',
    'common.save': 'Save', 'common.delete': 'Delete', 'common.yes': 'Yes', 'common.no': 'No'
};

function t(key) {
    return currentLocale[key] || DEFAULT_LOCALE[key] || key;
}

// ============ TOAST ============
function toast(msg, type = '') {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.className = 'toast ' + type, 2500);
}

// ============ RIPPLE ============
function attachRippleTo(el) {
    if (!el || el.dataset.rippleAttached) return;
    el.dataset.rippleAttached = '1';
    el.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
    });
}
function attachRipple() { document.querySelectorAll('button').forEach(attachRippleTo); }

// ============ SIDEBAR RESIZE ============
function initSidebarResize() {
    const resizer = $('sidebarResizer');
    const sidebar = document.querySelector('aside.rail');
    if (!resizer || !sidebar) return;
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) sidebar.style.width = savedWidth + 'px';
    let isDragging = false, startX = 0, startWidth = 0;
    resizer.addEventListener('mousedown', (e) => {
        isDragging = true; startX = e.clientX; startWidth = sidebar.offsetWidth;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        sidebar.style.width = Math.max(180, Math.min(400, startWidth + dx)) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem('sidebarWidth', sidebar.offsetWidth);
    });
    resizer.addEventListener('dblclick', () => { sidebar.style.width = ''; localStorage.removeItem('sidebarWidth'); });
}

// ============ LOG ============
function renderLogs() {
    if (!logEl) return;
    const filtered = allLogs.filter(l => {
        if (logTypeFilter !== 'all' && l.type !== logTypeFilter) return false;
        if (currentLogFilter && !l.msg.toLowerCase().includes(currentLogFilter.toLowerCase())) return false;
        return true;
    });
    logEl.innerHTML = filtered.map(l => {
        const safe = l.msg.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
        return `<span class="log-line ${l.type}"><span class="ts">${l.time}</span>${safe}</span>`;
    }).join('');
    logEl.scrollTop = logEl.scrollHeight;
}
window.api.onLog(d => {
    const time = new Date(d.ts).toLocaleTimeString();
    allLogs.push({ time, msg: d.msg, type: d.type });
    if (allLogs.length > 3000) allLogs = allLogs.slice(-3000);
    renderLogs();
});
window.api.onGameClosed(code => {
    toast(`${t('toast.gameClosed')} (${code})`, code === 0 ? 'success' : 'error');
    refreshInstances();
    refreshHome();
});
if ($('logFilter')) $('logFilter').addEventListener('input', e => { currentLogFilter = e.target.value; renderLogs(); });
document.querySelectorAll('.log-filters .chip').forEach(c => {
    c.addEventListener('click', () => {
        document.querySelectorAll('.log-filters .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active'); logTypeFilter = c.dataset.type; renderLogs();
    });
});
if ($('clearLog')) $('clearLog').addEventListener('click', () => { allLogs = []; renderLogs(); });

// ============ LANGUAGE ============
async function loadLocale(lang) {
    currentLang = lang || 'en';
    try {
        const data = await window.api.getLocale(currentLang);
        currentLocale = data || {};
    } catch { currentLocale = {}; }
    document.documentElement.lang = currentLang;
    applyTranslations();
}
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
}

// ============ TABS ============
document.querySelectorAll('aside nav button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('aside nav button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        const tab = document.querySelector(`#tab-${btn.dataset.tab}`);
        if (tab) tab.classList.add('active');
        if (btn.dataset.tab === 'home') refreshHome();
        if (btn.dataset.tab === 'discover') { refreshDiscoverInstances(); populateDiscoverMcVersions(); }
        if (btn.dataset.tab === 'files') refreshFilesInstances();
        if (btn.dataset.tab === 'servers') refreshServers();
        if (btn.dataset.tab === 'stats') renderStats();
    });
});

document.querySelectorAll('.mode-tabs button').forEach(b => {
    b.addEventListener('click', () => {
        document.querySelectorAll('.mode-tabs button').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.mode-pane').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const pane = document.querySelector(`.mode-pane[data-pane="${b.dataset.mode}"]`);
        if (pane) pane.classList.add('active');
    });
});

// ============ THEME ============
function applyTheme(name) {
    document.body.setAttribute('data-theme', name || 'm3-dark');
    document.querySelectorAll('.theme-tile').forEach(t => {
        t.classList.toggle('active', t.dataset.themeValue === name);
    });
}
document.querySelectorAll('.theme-tile').forEach(tile => {
    tile.addEventListener('click', async () => {
        const theme = tile.dataset.themeValue;
        applyTheme(theme);
        settings = settings || await window.api.getSettings();
        settings.theme = theme;
        await window.api.saveSettings(settings);
        toast(t('toast.themeApplied'), 'success');
    });
});

function applyWallpaper(dataUrl) {
    const el = $('homeWallpaper');
    if (!el) return;
    if (dataUrl) {
        el.style.backgroundImage = `url(${dataUrl})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
    } else el.style.backgroundImage = '';
}
if ($('pickWallpaperBtn')) $('pickWallpaperBtn').addEventListener('click', async () => {
    const dataUrl = await window.api.pickWallpaper();
    if (!dataUrl) return;
    applyWallpaper(dataUrl);
    settings = settings || await window.api.getSettings();
    settings.wallpaper = dataUrl;
    await window.api.saveSettings(settings);
    toast(t('toast.wallpaperSet'), 'success');
});
if ($('clearWallpaperBtn')) $('clearWallpaperBtn').addEventListener('click', async () => {
    applyWallpaper(null);
    settings = settings || await window.api.getSettings();
    settings.wallpaper = '';
    await window.api.saveSettings(settings);
    toast(t('toast.wallpaperCleared'), 'success');
});

function applyCustomCss(css) {
    let style = document.getElementById('custom-css-style');
    if (!style) { style = document.createElement('style'); style.id = 'custom-css-style'; document.head.appendChild(style); }
    style.textContent = css || '';
}
if ($('applyCustomCss')) $('applyCustomCss').addEventListener('click', async () => {
    const css = $('customCss').value;
    applyCustomCss(css);
    settings = settings || await window.api.getSettings();
    settings.customCss = css;
    await window.api.saveSettings(settings);
    toast(t('toast.cssApplied'), 'success');
});

// ============ SETTINGS ============
if ($('pickJava')) $('pickJava').addEventListener('click', async () => {
    const p = await window.api.pickJava();
    if (p) {
        $('javaPath').value = p;
        settings = settings || await window.api.getSettings();
        settings.javaPath = p;
        await window.api.saveSettings(settings);
        toast(t('toast.javaPathUpdated'), 'success');
    }
});
if ($('ram')) $('ram').addEventListener('input', e => { $('ramLabel').textContent = `${e.target.value} MB`; });
document.querySelectorAll('.ram-presets .chip').forEach(b => {
    b.addEventListener('click', () => { $('ram').value = b.dataset.ram; $('ramLabel').textContent = `${b.dataset.ram} MB`; });
});
if ($('languageSelect')) $('languageSelect').addEventListener('change', async e => {
    const lang = e.target.value;
    await loadLocale(lang);
    settings = settings || await window.api.getSettings();
    settings.language = lang;
    await window.api.saveSettings(settings);
});
if ($('quickLaunchKey')) {
    $('quickLaunchKey').addEventListener('change', async e => {
        settings = settings || await window.api.getSettings();
        settings.quickLaunchKey = e.target.value;
        await window.api.saveSettings(settings);
        await window.api.reregisterHotkey();
        toast('Hotkey updated', 'success');
    });
}

if ($('saveSettings')) $('saveSettings').addEventListener('click', async () => {
    await window.api.saveSettings({
        nickname: settings?.nickname || 'Player',
        ram: parseInt($('ram').value, 10) || 4096,
        javaPath: $('javaPath').value || settings?.javaPath || '/usr/bin/java',
        instanceName: $('instanceName')?.value || 'BetterImageFix',
        extraJvmArgs: $('extraJvmArgs').value,
        language: currentLang,
        modrinthToken: $('modrinthToken')?.value || '',
        authlibApi: $('authlibApi')?.value || 'https://account.ely.by/api/authlib-injector',
        theme: document.body.getAttribute('data-theme') || 'm3-dark',
        customCss: $('customCss')?.value || '',
        wallpaper: settings?.wallpaper || '',
        autoBackup: $('autoBackup')?.checked ?? true,
        discordRpc: $('discordRpc')?.checked ?? false,
        minimizeToTray: $('minimizeToTray')?.checked ?? false,
        quickLaunchKey: $('quickLaunchKey')?.value || 'CommandOrControl+Shift+M',
        authlibWhitelist: settings?.authlibWhitelist || []
    });
    settings = await window.api.getSettings();
    toast(t('toast.settingsSaved'), 'success');
});

// ============ JAVA ============
if ($('detectJavaBtn')) $('detectJavaBtn').addEventListener('click', async () => {
    $('detectJavaBtn').disabled = true; $('detectJavaBtn').textContent = 'Scanning...';
    const list = await window.api.findJavas();
    cachedJavas = list;
    const box = $('javaList');
    if (!list.length) box.innerHTML = '<p class="hint">No Java found.</p>';
    else {
        box.innerHTML = list.map(j => `
      <div class="list-item">
        <span class="name">Java ${j.version}</span>
        <span class="meta">${j.path}</span>
        <div class="actions"><button data-java="${j.path}">Use</button></div>
      </div>
    `).join('');
        box.querySelectorAll('[data-java]').forEach(b => {
            attachRippleTo(b);
            b.addEventListener('click', async () => {
                $('javaPath').value = b.dataset.java;
                settings = settings || await window.api.getSettings();
                settings.javaPath = b.dataset.java;
                await window.api.saveSettings(settings);
                toast(t('toast.javaSelected'), 'success');
            });
        });
    }
    $('detectJavaBtn').disabled = false;
    $('detectJavaBtn').textContent = t('settings.detectJava');
    toast(`Found ${list.length}`, list.length ? 'success' : 'warn');
});

// ============ AUTHLIB ============
if ($('authlibLoginBtn')) $('authlibLoginBtn').addEventListener('click', async () => {
    const apiRoot = $('authlibApi').value.trim();
    const username = $('authlibUser').value.trim();
    const password = $('authlibPass').value;
    if (!apiRoot || !username || !password) return toast('Fill all fields', 'error');
    $('authlibLoginBtn').disabled = true; $('authlibStatus').textContent = 'Logging in...';
    const r = await window.api.authlibLogin({ apiRoot, username, password });
    if (r.ok) {
        const save = await window.api.saveAuthlibProfile(r);
        if (save.ok) {
            $('authlibStatus').textContent = `✓ ${r.name}`;
            $('authlibStatus').style.color = 'var(--success)';
            toast(t('toast.profileAdded'), 'success');
            await refreshProfiles();
        }
    } else {
        $('authlibStatus').textContent = '✗ ' + r.error;
        $('authlibStatus').style.color = 'var(--error)';
    }
    $('authlibLoginBtn').disabled = false;
});

// ============ PROFILES ============
async function refreshProfiles() {
    profiles = await window.api.listProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const sel = $('profileSelect');
    if (sel) sel.innerHTML = profiles.map(p => `<option value="${p.id}" ${p.id === active?.id ? 'selected' : ''}>${p.name}${p.type === 'authlib' ? ` (${p.service})` : ''}</option>`).join('');
    if (active) {
        if ($('profileName')) $('profileName').textContent = active.name;
        if ($('profileAvatar')) $('profileAvatar').textContent = active.name[0].toUpperCase();
        if ($('homeProfile')) $('homeProfile').textContent = active.name;
    }
    const list = $('profileList');
    if (!list) return;
    list.innerHTML = profiles.map(p => `
    <div class="profile-item ${p.active ? 'active' : ''}" data-id="${p.id}">
      <div class="profile-avatar">${p.name[0].toUpperCase()}</div>
      <span class="profile-name">${p.name}${p.type === 'authlib' ? `<span class="profile-badge">${p.service || 'Authlib'}</span>` : ''}</span>
      <div class="actions">
        <button data-use="${p.id}">${p.active ? '✓' : 'Use'}</button>
        <button data-rename="${p.id}">Rename</button>
        <button data-del="${p.id}" style="color:var(--error)">✕</button>
      </div>
    </div>
  `).join('');
    list.querySelectorAll('button').forEach(attachRippleTo);
    list.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', async () => {
        await window.api.setActiveProfile(b.dataset.use); await refreshProfiles(); toast(t('toast.profileSwitched'), 'success');
    }));
    list.querySelectorAll('[data-rename]').forEach(b => b.addEventListener('click', async () => {
        const p = profiles.find(x => x.id === b.dataset.rename);
        const nn = prompt('New name:', p.name); if (!nn) return;
        const r = await window.api.renameProfile({ id: p.id, name: nn });
        if (r.ok) { await refreshProfiles(); toast(t('toast.renamed'), 'success'); }
    }));
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
        if (profiles.length <= 1) return toast('Cannot delete last', 'error');
        if (!confirm('Delete?')) return;
        await window.api.deleteProfile(b.dataset.del); await refreshProfiles(); toast(t('toast.profileDeleted'), 'warn');
    }));
}
if ($('profileSelect')) $('profileSelect').addEventListener('change', async e => {
    await window.api.setActiveProfile(e.target.value); await refreshProfiles(); toast(t('toast.profileSwitched'), 'success');
});
if ($('addProfileBtn')) $('addProfileBtn').addEventListener('click', async () => {
    const n = $('newProfileName').value.trim(); if (!n) return toast('Enter nickname', 'error');
    const r = await window.api.addProfile(n); if (!r.ok) return toast(r.error, 'error');
    $('newProfileName').value = ''; await refreshProfiles(); toast(t('toast.profileAdded'), 'success');
});

// ============ INSTANCES ============
async function refreshInstances() {
    instances = await window.api.listInstances();
    currentTagList = await window.api.getAllTags();
    renderLibraryFilters();
    renderInstanceGrid();
    refreshHome(); refreshDiscoverInstances(); refreshFilesInstances();
}
function renderLibraryFilters() {
    const sel = $('libraryTagFilter');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = `<option value="">${t('library.allTags')}</option>` +
        currentTagList.map(tag => `<option value="${tag}" ${prev === tag ? 'selected' : ''}>${tag}</option>`).join('');
}
function renderInstanceGrid() {
    const grid = $('instanceGrid');
    const empty = $('emptyLib');
    if (!grid) return;
    let filtered = instances;
    if (currentLibrarySearch) {
        const q = currentLibrarySearch.toLowerCase();
        filtered = filtered.filter(i => (i.displayName || i.name).toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
    }
    if (currentLibraryTag) filtered = filtered.filter(i => (i.tags || []).includes(currentLibraryTag));

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (empty) {
            empty.style.display = 'flex';
            empty.innerHTML = `
        <span class="material-symbols-rounded" style="font-size:64px">inventory_2</span>
        <div class="empty-title">${instances.length ? 'No matches' : t('library.empty')}</div>
        <div class="empty-sub">${instances.length ? 'Try different search/tag' : t('library.emptySub')}</div>
      `;
        }
        return;
    }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = filtered.map(inst => {
        const iconSrc = inst.customIcon || inst.icon;
        const icon = iconSrc ? `<div class="instance-icon"><img src="${iconSrc}" /></div>` : `<div class="instance-icon">${(inst.displayName || inst.name)[0].toUpperCase()}</div>`;
        const sizeMB = (inst.size / 1024 / 1024).toFixed(0);
        const playMin = inst.playTime ? Math.floor(inst.playTime / 60000) : 0;
        const tagsHtml = (inst.tags || []).map(t => `<span class="meta-badge tag-badge">#${t}</span>`).join('');
        return `<div class="instance-card" data-instance="${inst.name}">
      <div class="instance-head">${icon}<div><div class="instance-name">${inst.displayName || inst.name}</div><div class="instance-loader">${inst.loader}</div></div></div>
      <div class="instance-meta">
        <span class="meta-badge">MC ${inst.mcVersion}</span>
        <span class="meta-badge">${sizeMB} MB</span>
        ${playMin ? `<span class="meta-badge">${playMin} min</span>` : ''}
        ${inst.modpackVersion ? `<span class="meta-badge">v${inst.modpackVersion}</span>` : ''}
        ${tagsHtml}
      </div>
      <div class="instance-actions">
        <button class="play-btn" data-play="${inst.name}">▶ ${t('library.play')}</button>
        <button data-check-updates="${inst.name}" data-tooltip="${t('library.update')}"><span class="material-symbols-rounded">update</span></button>
        <button data-edit="${inst.name}" data-tooltip="${t('library.edit')}"><span class="material-symbols-rounded">edit</span></button>
        <button data-folder="${inst.name}" data-tooltip="${t('library.folder')}"><span class="material-symbols-rounded">folder_open</span></button>
      </div>
    </div>`;
    }).join('');

    grid.querySelectorAll('button').forEach(attachRippleTo);
    grid.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', async e => {
        e.stopPropagation();
        const name = b.dataset.play;
        const s = settings || await window.api.getSettings();
        b.disabled = true; b.textContent = '...';
        const r = await window.api.launch({ instanceName: name, nickname: null, ram: s.ram, javaPath: s.javaPath, extraJvmArgs: s.extraJvmArgs, authlib: authlibSession });
        b.disabled = false; b.textContent = '▶ ' + t('library.play');
        if (r.ok) toast(t('toast.launching'), 'success'); else toast('Error: ' + r.error, 'error');
    }));
    grid.querySelectorAll('[data-check-updates]').forEach(b => b.addEventListener('click', async e => {
        e.stopPropagation();
        const name = b.dataset.checkUpdates;
        b.disabled = true;
        const r = await window.api.checkModUpdates(name);
        b.disabled = false;
        if (!r.ok) return toast('Error: ' + r.error, 'error');
        if (!r.updates.length) return toast(t('toast.upToDate'), 'success');
        toast(`${r.updates.length} ${t('mods.updatesAvailable')}`, 'warn');
        openInstanceModal(name);
        setTimeout(() => document.querySelector('.modal-tabs button[data-mtab="mods"]')?.click(), 100);
    }));
    grid.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openInstanceModal(b.dataset.edit); }));
    grid.querySelectorAll('[data-folder]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); window.api.openInstanceFolder({ name: b.dataset.folder, sub: '' }); }));
}
if ($('refreshInstances')) $('refreshInstances').addEventListener('click', refreshInstances);
if ($('openInstances')) $('openInstances').addEventListener('click', () => window.api.openInstances());
if ($('librarySearch')) $('librarySearch').addEventListener('input', e => { currentLibrarySearch = e.target.value; renderInstanceGrid(); });
if ($('libraryTagFilter')) $('libraryTagFilter').addEventListener('change', e => { currentLibraryTag = e.target.value; renderInstanceGrid(); });

// ============ HOME ============
async function refreshHome() {
    if (!instances || !instances.length) {
        if ($('lastPlayedCard')) $('lastPlayedCard').innerHTML = `<div class="hint">${t('home.noInstances')}</div>`;
        return;
    }
    const last = [...instances].filter(i => i.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed)[0] || instances[0];
    if ($('lastPlayedCard')) {
        $('lastPlayedCard').innerHTML = `
      <div class="instance-head" style="margin-bottom:12px">
        <div class="instance-icon">${(last.displayName || last.name)[0].toUpperCase()}</div>
        <div><div class="instance-name">${last.displayName || last.name}</div><div class="instance-loader">${last.loader} · MC ${last.mcVersion}</div></div>
      </div>
      <button class="filled-btn" id="homePlayBtn">▶ ${t('library.play')}</button>
    `;
        const btn = $('homePlayBtn'); attachRippleTo(btn);
        btn?.addEventListener('click', async () => {
            const s = settings || await window.api.getSettings();
            const r = await window.api.launch({ instanceName: last.name, nickname: null, ram: s.ram, javaPath: s.javaPath, extraJvmArgs: s.extraJvmArgs, authlib: authlibSession });
            if (r.ok) toast(t('toast.launching'), 'success'); else toast('Error: ' + r.error, 'error');
        });
    }
    try { const info = await window.api.sysInfo(); if ($('homePlatform')) $('homePlatform').textContent = info.platform; } catch {}
}

// ============ SERVERS ============
async function refreshServers() {
    const list = await window.api.listServers();
    const el = $('serversList'); if (!el) return;
    if (!list.length) { el.innerHTML = `<p class="hint">${t('servers.empty')}</p>`; return; }
    el.innerHTML = list.map(s => `
    <div class="list-item">
      <span class="name">${s.name}</span>
      <span class="meta">${s.ip}${s.authlibApi ? ` · ${s.authlibApi}` : ''}</span>
      <div class="actions"><button data-del-server="${s.id}">✕</button></div>
    </div>
  `).join('');
    el.querySelectorAll('button').forEach(attachRippleTo);
    el.querySelectorAll('[data-del-server]').forEach(b => b.addEventListener('click', async () => {
        await window.api.deleteServer(b.dataset.delServer); refreshServers();
    }));
}
if ($('addServerBtn')) $('addServerBtn').addEventListener('click', async () => {
    const name = $('newServerName').value.trim();
    const ip = $('newServerIp').value.trim();
    const authlibApi = $('newServerAuthlib')?.value.trim() || null;
    if (!ip) return toast('Enter IP', 'error');
    await window.api.addServer({ name: name || ip, ip, authlibApi });
    $('newServerName').value = ''; $('newServerIp').value = '';
    if ($('newServerAuthlib')) $('newServerAuthlib').value = '';
    refreshServers(); toast(t('toast.serverAdded'), 'success');
});

// ============ DISCOVER ============
async function refreshDiscoverInstances() {
    const sel = $('discoverInstance'); if (!sel) return;
    const list = await window.api.listInstances();
    sel.innerHTML = `<option value="">${t('discover.selectInstance')}</option>` + list.map(i => `<option value="${i.name}">${i.displayName} (${i.mcVersion})</option>`).join('');
}
async function populateDiscoverMcVersions() {
    const sel = $('discoverMcVersion'); if (!sel || sel.options.length > 1) return;
    const r = await window.api.getMcVersions();
    if (!r.ok) return;
    sel.innerHTML = `<option value="">${t('discover.anyMc')}</option>` + r.versions.slice(0, 60).map(v => `<option value="${v.id}">${v.id}</option>`).join('');
}
async function runDiscoverSearch() {
    const query = $('discoverQuery')?.value.trim() || '';
    const type = $('discoverType')?.value || 'mod';
    const mc = $('discoverMcVersion')?.value || '';
    const loader = $('discoverLoader')?.value || '';
    const resultsEl = $('discoverResults'); if (!resultsEl) return;
    resultsEl.innerHTML = Array(6).fill(0).map(() => `
    <div class="discover-card" style="animation:none">
      <div class="discover-icon skeleton"></div>
      <div class="discover-body">
        <div class="skeleton" style="height:14px;width:60%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:10px;width:100%;margin-bottom:4px"></div>
        <div class="skeleton" style="height:10px;width:80%"></div>
      </div>
    </div>
  `).join('');
    const r = await window.api.modrinthSearch({ query, projectType: type, gameVersion: mc, loader, limit: 20, offset: 0 });
    if (!r.ok) { resultsEl.innerHTML = `<div class="hint" style="color:var(--error)">Error: ${r.error}</div>`; return; }
    if (!r.hits?.length) { resultsEl.innerHTML = `<div class="hint">${t('discover.noResults')}</div>`; return; }
    resultsEl.innerHTML = r.hits.map(hit => {
        const icon = hit.icon_url ? `<img src="${hit.icon_url}" />` : '?';
        return `<div class="discover-card" data-project-id="${hit.project_id}" data-project-type="${hit.project_type}" style="cursor:pointer;">
      <div class="discover-icon">${icon}</div>
      <div class="discover-body">
        <div class="discover-title">${hit.title}</div>
        <div class="discover-desc">${hit.description || ''}</div>
        <div class="discover-meta">
          <span class="meta-badge">${(hit.downloads || 0).toLocaleString()} dl</span>
          ${(hit.categories || []).slice(0, 2).map(c => `<span class="meta-badge">${c}</span>`).join('')}
        </div>
      </div>
    </div>`;
    }).join('');
    resultsEl.querySelectorAll('.discover-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            openModDetail(card.dataset.projectId, card.dataset.projectType);
        });
    });
}
if ($('discoverSearchBtn')) $('discoverSearchBtn').addEventListener('click', runDiscoverSearch);
if ($('discoverQuery')) $('discoverQuery').addEventListener('keydown', e => { if (e.key === 'Enter') runDiscoverSearch(); });

// ============ MOD DETAIL ============
async function openModDetail(projectId, projectType) {
    const modal = $('modDetailModal'); const body = $('modDetailBody'); const title = $('modDetailTitle');
    if (!modal || !body) return;
    title.textContent = 'Loading...'; body.innerHTML = '<div class="hint">Fetching...</div>';
    modal.classList.add('active');
    const res = await window.api.modrinthGetFullProject(projectId);
    if (!res.ok) { body.innerHTML = `<div class="hint" style="color:var(--error)">${res.error}</div>`; return; }
    const p = res.project;
    title.textContent = p.title;
    const instance = $('discoverInstance')?.value;
    const mc = $('discoverMcVersion')?.value || '';
    const loader = $('discoverLoader')?.value || '';
    const vRes = await window.api.modrinthGetAllVersions(projectId);
    let versionsHtml = '';
    if (vRes.ok && vRes.versions.length) {
        const filtered = vRes.versions.filter(v => {
            if (mc && !v.game_versions.includes(mc)) return false;
            if (loader && loader !== 'vanilla' && v.loaders && !v.loaders.includes(loader)) return false;
            return true;
        });
        const list = (filtered.length ? filtered : vRes.versions).slice(0, 15);
        versionsHtml = `<h3 style="margin-top:16px;"><span class="material-symbols-rounded">list</span> Versions</h3>
      <div style="max-height:260px;overflow-y:auto;">
        ${list.map(v => `<div class="list-item">
          <span class="name">${v.version_number} <span class="meta">(${v.game_versions.join(', ')})</span></span>
          <div class="actions"><button data-install-version="${v.id}" data-project-type="${projectType}">${t('discover.install')}</button></div>
        </div>`).join('')}
      </div>`;
    }
    const desc = res.body ? res.body.replace(/</g, '&lt;') : (p.description || '');
    body.innerHTML = `
    <div style="display:flex;gap:16px;margin-bottom:16px;">
      <div class="discover-icon" style="width:80px;height:80px;font-size:32px;">${p.icon_url ? `<img src="${p.icon_url}" />` : p.title[0]}</div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:18px;">${p.title}</div>
        <div style="color:var(--on-surface-variant);font-size:13px;margin-top:4px;">${p.description || ''}</div>
        <div class="discover-meta" style="margin-top:8px;">
          <span class="meta-badge">${(p.downloads || 0).toLocaleString()} dl</span>
          <span class="meta-badge">${p.project_type}</span>
          ${(p.categories || []).slice(0, 3).map(c => `<span class="meta-badge">${c}</span>`).join('')}
        </div>
      </div>
    </div>
    <div style="white-space:pre-wrap;font-size:13px;line-height:1.6;color:var(--on-surface-variant);max-height:280px;overflow-y:auto;padding:12px;background:var(--surface-3);border-radius:12px;">${desc}</div>
    ${versionsHtml}
  `;
    body.querySelectorAll('button').forEach(attachRippleTo);
    body.querySelectorAll('[data-install-version]').forEach(b => b.addEventListener('click', async () => {
        if (!instance) return toast('Select instance first', 'error');
        b.disabled = true; b.textContent = t('discover.installing');
        let r;
        if (projectType === 'modpack') {
            const instName = prompt('New instance name:', p.slug || p.title);
            if (!instName) { b.disabled = false; b.textContent = t('discover.install'); return; }
            r = await window.api.modrinthInstallModpack({ projectId, versionId: b.dataset.installVersion, instanceName: instName });
            if (r.ok) refreshInstances();
        } else {
            r = await window.api.modrinthInstallVersion({ instanceName: instance, projectId, versionId: b.dataset.installVersion, projectType });
            if (r.ok) {
                try { await window.api.trackMod({ instanceName: instance, projectId, versionId: b.dataset.installVersion, fileName: r.file, projectType }); } catch {}
            }
        }
        b.disabled = false; b.textContent = t('discover.install');
        if (r.ok) toast(t('toast.imported'), 'success'); else toast('Error: ' + r.error, 'error');
    }));
}
if ($('closeModDetail')) $('closeModDetail').addEventListener('click', () => $('modDetailModal').classList.remove('active'));

// ============ FILES ============
async function refreshFilesInstances() {
    const sel = $('filesInstanceSelect'); if (!sel) return;
    const list = await window.api.listInstances();
    sel.innerHTML = `<option value="">${t('files.selectInstance')}</option>` + list.map(i => `<option value="${i.name}">${i.displayName}</option>`).join('');
    if (filesCurrentInstance) sel.value = filesCurrentInstance;
}
function fileIcon(n) {
    const ext = n.toLowerCase().split('.').pop();
    if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'image';
    if (['ogg','mp3','wav'].includes(ext)) return 'audio_file';
    if (['json','txt','log','cfg','toml','yml','yaml','properties'].includes(ext)) return 'description';
    if (ext === 'jar') return 'deployed_code';
    if (['zip','mrpack'].includes(ext)) return 'folder_zip';
    return 'draft';
}
function fmtSize(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; }
async function loadFiles(path) {
    if (!filesCurrentInstance) return;
    filesCurrentPath = path;
    if ($('filesPathInput')) $('filesPathInput').value = '/' + (path || '');
    const r = await window.api.fileList({ instanceName: filesCurrentInstance, rel: path });
    const el = $('filesList'); if (!el) return;
    if (!r.ok) { el.innerHTML = `<div class="hint" style="color:var(--error)">${r.error}</div>`; return; }
    if (!r.entries.length) { el.innerHTML = `<div class="hint" style="padding:20px">${t('files.empty')}</div>`; return; }
    el.innerHTML = r.entries.map(en => `
    <div class="file-row" data-name="${en.name}" data-dir="${en.isDir ? '1' : '0'}">
      <span class="material-symbols-rounded">${en.isDir ? 'folder' : fileIcon(en.name)}</span>
      <span class="file-name">${en.name}</span>
      <span class="file-meta">${en.isDir ? '' : fmtSize(en.size)}</span>
      <div class="file-actions">
        ${!en.isDir ? `<button data-edit="${en.name}" data-tooltip="Edit"><span class="material-symbols-rounded">edit</span></button>` : ''}
        <button data-rename="${en.name}" data-tooltip="Rename"><span class="material-symbols-rounded">drive_file_rename_outline</span></button>
        <button data-delete="${en.name}" data-tooltip="Delete"><span class="material-symbols-rounded">delete</span></button>
      </div>
    </div>
  `).join('');
    el.querySelectorAll('button').forEach(attachRippleTo);
    el.querySelectorAll('.file-row').forEach(row => {
        row.addEventListener('click', e => {
            if (e.target.closest('button')) return;
            const isDir = row.dataset.dir === '1';
            const p = filesCurrentPath ? filesCurrentPath + '/' + row.dataset.name : row.dataset.name;
            if (isDir) loadFiles(p); else openFileEditor(p);
        });
    });
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        const p = filesCurrentPath ? filesCurrentPath + '/' + b.dataset.edit : b.dataset.edit;
        openFileEditor(p);
    }));
    el.querySelectorAll('[data-rename]').forEach(b => b.addEventListener('click', async e => {
        e.stopPropagation();
        const nn = prompt('New name:', b.dataset.rename); if (!nn) return;
        const p = filesCurrentPath ? filesCurrentPath + '/' + b.dataset.rename : b.dataset.rename;
        const rr = await window.api.fileRename({ instanceName: filesCurrentInstance, rel: p, newName: nn });
        if (rr.ok) { toast(t('toast.renamed'), 'success'); loadFiles(filesCurrentPath); } else toast(rr.error, 'error');
    }));
    el.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm(`Delete "${b.dataset.delete}"?`)) return;
        const p = filesCurrentPath ? filesCurrentPath + '/' + b.dataset.delete : b.dataset.delete;
        const rr = await window.api.fileDelete({ instanceName: filesCurrentInstance, rel: p });
        if (rr.ok) { toast(t('toast.deleted'), 'warn'); loadFiles(filesCurrentPath); } else toast(rr.error, 'error');
    }));
}
async function openFileEditor(relPath) {
    const r = await window.api.fileRead({ instanceName: filesCurrentInstance, rel: relPath });
    if (!r.ok) return toast(r.error, 'error');
    const ed = document.createElement('div');
    ed.className = 'file-editor';
    ed.innerHTML = `
    <div class="row-inline" style="justify-content:space-between">
      <div style="font-family:monospace;font-size:13px">${relPath}</div>
      <div class="row-inline">
        <button class="outlined-btn" id="editorSaveBtn">${t('common.save')}</button>
        <button class="icon-btn" id="editorCloseBtn"><span class="material-symbols-rounded">close</span></button>
      </div>
    </div>
    <textarea id="editorText"></textarea>
  `;
    document.body.appendChild(ed);
    ed.querySelector('#editorText').value = r.content;
    attachRippleTo(ed.querySelector('#editorSaveBtn'));
    attachRippleTo(ed.querySelector('#editorCloseBtn'));
    ed.querySelector('#editorCloseBtn').addEventListener('click', () => ed.remove());
    ed.querySelector('#editorSaveBtn').addEventListener('click', async () => {
        const c = ed.querySelector('#editorText').value;
        const w = await window.api.fileWrite({ instanceName: filesCurrentInstance, rel: relPath, content: c });
        if (w.ok) { toast('Saved', 'success'); ed.remove(); } else toast(w.error, 'error');
    });
}
function initFilesTab() {
    if ($('filesInstanceSelect')) $('filesInstanceSelect').addEventListener('change', e => { filesCurrentInstance = e.target.value; loadFiles(''); });
    if ($('filesUpBtn')) $('filesUpBtn').addEventListener('click', () => {
        if (!filesCurrentPath) return;
        const parts = filesCurrentPath.split('/'); parts.pop();
        loadFiles(parts.join('/'));
    });
    if ($('filesRefreshBtn')) $('filesRefreshBtn').addEventListener('click', () => loadFiles(filesCurrentPath));
    if ($('filesImportBtn')) $('filesImportBtn').addEventListener('click', async () => {
        if (!filesCurrentInstance) return toast('Select instance', 'error');
        const files = await window.api.filePick();
        if (!files.length) return;
        const r = await window.api.fileImport({ instanceName: filesCurrentInstance, rel: filesCurrentPath, files });
        if (r.ok) { toast(`Imported ${r.added}`, 'success'); loadFiles(filesCurrentPath); } else toast(r.error, 'error');
    });
    if ($('filesMkdirBtn')) $('filesMkdirBtn').addEventListener('click', async () => {
        if (!filesCurrentInstance) return toast('Select instance', 'error');
        const n = prompt('Folder name:'); if (!n) return;
        const r = await window.api.fileMkdir({ instanceName: filesCurrentInstance, rel: filesCurrentPath, name: n });
        if (r.ok) loadFiles(filesCurrentPath); else toast(r.error, 'error');
    });
}

// ============ STATS ============
async function renderStats() {
    const container = $('statsBody');
    if (!container) return;
    container.innerHTML = '<div class="hint">Loading...</div>';
    const r = await window.api.getStats();
    if (!r.ok) { container.innerHTML = `<div class="hint" style="color:var(--error)">${r.error}</div>`; return; }

    if (r.totalLaunches === 0) {
        container.innerHTML = `<div class="hint">${t('stats.noData')}</div>`;
        return;
    }

    const fmtTime = (ms) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${h}${t('stats.hours')} ${m}${t('stats.minutes')}`;
    };

    const maxDaily = Math.max(...r.daily.map(([, ms]) => ms), 1);
    const barsHtml = r.daily.slice(-14).map(([day, ms]) => {
        const pct = (ms / maxDaily) * 100;
        return `<div class="stat-bar-wrap" title="${day}: ${fmtTime(ms)}">
      <div class="stat-bar" style="height:${Math.max(pct, 3)}%"></div>
      <div class="stat-bar-label">${day.slice(5)}</div>
    </div>`;
    }).join('');

    container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">${t('stats.total')}</div>
        <div class="stat-value">${fmtTime(r.totalMs)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${t('stats.week')}</div>
        <div class="stat-value">${fmtTime(r.weekMs)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${t('stats.month')}</div>
        <div class="stat-value">${fmtTime(r.monthMs)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${t('stats.launches')}</div>
        <div class="stat-value">${r.totalLaunches}</div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Playtime (last 14 days)</h3>
      <div class="stat-chart">${barsHtml}</div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>${t('stats.topInstances')}</h3>
      ${r.topInstances.map(i => `
        <div class="list-item">
          <span class="name">${i.name}</span>
          <span class="meta">${fmtTime(i.ms)}</span>
        </div>
      `).join('')}
    </div>
    <div class="card" style="margin-top:16px">
      <h3>${t('stats.recent')}</h3>
      ${r.recent.slice(0, 10).map(item => `
        <div class="list-item">
          <span class="name">${item.instance}</span>
          <span class="meta">${new Date(item.endedAt).toLocaleString()} · ${fmtTime(item.playMs)} · code ${item.code}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ============ THEMES GALLERY ============
async function refreshSavedThemes() {
    const list = await window.api.listSavedThemes();
    const el = $('savedThemesList');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<p class="hint">No saved themes.</p>'; return; }
    el.innerHTML = list.map(item => `
    <div class="list-item">
      <span class="name">${item.name}</span>
      <div class="actions">
        <button data-apply-theme="${item.file}">Apply</button>
        <button data-del-theme="${item.file}">✕</button>
      </div>
    </div>
  `).join('');
    el.querySelectorAll('button').forEach(attachRippleTo);
    el.querySelectorAll('[data-apply-theme]').forEach(b => b.addEventListener('click', async () => {
        const theme = list.find(x => x.file === b.dataset.applyTheme);
        if (!theme) return;
        if (theme.theme) applyTheme(theme.theme);
        if (theme.customCss !== undefined) applyCustomCss(theme.customCss);
        if (theme.wallpaper !== undefined) applyWallpaper(theme.wallpaper);
        settings = settings || await window.api.getSettings();
        if (theme.theme) settings.theme = theme.theme;
        if (theme.customCss !== undefined) settings.customCss = theme.customCss;
        if (theme.wallpaper !== undefined) settings.wallpaper = theme.wallpaper;
        await window.api.saveSettings(settings);
        toast(t('toast.themeApplied'), 'success');
    }));
    el.querySelectorAll('[data-del-theme]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Delete theme?')) return;
        await window.api.deleteTheme(b.dataset.delTheme);
        refreshSavedThemes();
    }));
}
if ($('saveCurrentThemeBtn')) $('saveCurrentThemeBtn').addEventListener('click', async () => {
    const name = prompt('Theme name:');
    if (!name) return;
    const theme = {
        theme: document.body.getAttribute('data-theme') || 'm3-dark',
        customCss: $('customCss')?.value || '',
        wallpaper: settings?.wallpaper || ''
    };
    await window.api.saveTheme({ name, theme });
    toast('Theme saved', 'success');
    refreshSavedThemes();
});
if ($('importThemeBtn')) $('importThemeBtn').addEventListener('click', async () => {
    const r = await window.api.importTheme();
    if (!r.ok) return;
    const name = prompt('Save as:', r.theme.name || 'Imported theme');
    if (!name) return;
    await window.api.saveTheme({ name, theme: r.theme });
    toast('Theme imported', 'success');
    refreshSavedThemes();
});
if ($('exportThemeBtn')) $('exportThemeBtn').addEventListener('click', async () => {
    const theme = {
        name: 'Current theme',
        theme: document.body.getAttribute('data-theme') || 'm3-dark',
        customCss: $('customCss')?.value || '',
        wallpaper: settings?.wallpaper || ''
    };
    const r = await window.api.exportTheme({ name: 'betterimg-theme', theme });
    if (r.ok) toast(t('toast.exported'), 'success');
});

// ============ CONFLICTS ============
async function checkConflicts(instanceName) {
    const r = await window.api.detectConflicts(instanceName);
    if (!r.ok) return toast('Error: ' + r.error, 'error');
    if (!r.conflicts.length) return toast(t('toast.noConflicts'), 'success');
    const body = $('modalBody');
    body.innerHTML = `
    <h3 style="margin-bottom:16px">${t('conflicts.title')}</h3>
    ${r.conflicts.map(c => {
        if (c.type === 'missing') {
            return `<div class="list-item">
          <span class="name">⚠ ${c.mod} → ${t('conflicts.missing')}: ${c.dependency}</span>
          <div class="actions">
            <button data-install-dep="${c.dependencyProjectId}" data-dep-version="${c.dependencyVersionId}">${t('conflicts.install')}</button>
          </div>
        </div>`;
        }
        if (c.type === 'duplicate') {
            return `<div class="list-item">
          <span class="name">⚠ ${t('conflicts.duplicate')}</span>
          <span class="meta">${c.mods.join(', ')}</span>
        </div>`;
        }
        return '';
    }).join('')}
  `;
    body.querySelectorAll('button').forEach(attachRippleTo);
    body.querySelectorAll('[data-install-dep]').forEach(b => b.addEventListener('click', async () => {
        b.disabled = true; b.textContent = '...';
        const r = await window.api.modrinthInstallVersion({
            instanceName: currentModalInstance,
            projectId: b.dataset.installDep,
            versionId: b.dataset.depVersion,
            projectType: 'mod'
        });
        b.disabled = false; b.textContent = t('conflicts.install');
        if (r.ok) { toast(t('toast.imported'), 'success'); switchModalTab('mods'); }
        else toast('Error: ' + r.error, 'error');
    }));
}

// ============ NEW INSTANCE ============
async function loadMcVersions() {
    const sel = $('mcVersionSelect'); if (!sel) return;
    sel.innerHTML = '<option value="">Loading...</option>';
    const r = await window.api.getMcVersions();
    if (!r.ok) { sel.innerHTML = '<option value="">Error</option>'; return; }
    sel.innerHTML = r.versions.map(v => `<option value="${v.id}">${v.id}</option>`).join('');
}
async function loadLoaderVersions() {
    const mc = $('mcVersionSelect')?.value;
    const loader = $('loaderSelect')?.value;
    const wrap = $('loaderVersionWrap'); const sel = $('loaderVersionSelect');
    if (!wrap || !sel) return;
    if (!loader || loader === 'vanilla' || !mc) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block'; sel.innerHTML = '<option value="">Loading...</option>';
    let r;
    if (loader === 'fabric') r = await window.api.getFabricVersions(mc);
    else if (loader === 'quilt') r = await window.api.getQuiltVersions(mc);
    else if (loader === 'forge') r = await window.api.getForgeVersions(mc);
    else if (loader === 'neoforge') r = await window.api.getNeoforgeVersions(mc);
    if (!r?.ok || !r.versions.length) { sel.innerHTML = '<option value="">No versions</option>'; return; }
    sel.innerHTML = r.versions.map(v => `<option value="${v}">${v}</option>`).join('');
}
if ($('mcVersionSelect')) $('mcVersionSelect').addEventListener('change', loadLoaderVersions);
if ($('loaderSelect')) $('loaderSelect').addEventListener('change', loadLoaderVersions);
if ($('createInstanceBtn')) $('createInstanceBtn').addEventListener('click', async () => {
    const n = $('newInstName').value.trim(); const mc = $('mcVersionSelect').value;
    const l = $('loaderSelect').value; const lv = $('loaderVersionSelect').value;
    if (!n) return toast('Enter name', 'error');
    if (!mc) return toast('Select MC version', 'error');
    if (l !== 'vanilla' && !lv) return toast('Select loader version', 'error');
    const b = $('createInstanceBtn'); b.disabled = true; b.textContent = t('import.creating');
    const r = await window.api.createInstance({ name: n, mcVersion: mc, loader: l, loaderVersion: lv });
    b.disabled = false; b.textContent = t('import.create');
    if (r.ok) { toast(t('toast.instanceCreated'), 'success'); await refreshInstances(); document.querySelector('aside nav button[data-tab="launch"]')?.click(); }
    else toast('Error: ' + r.error, 'error');
});
if ($('importBtn')) $('importBtn').addEventListener('click', async () => {
    const url = $('mrpackUrl').value.trim(); const n = $('instanceName').value.trim();
    if (!url || !n) return toast('Provide URL and name', 'error');
    const b = $('importBtn'); b.disabled = true; b.textContent = t('import.importing');
    document.querySelector('aside nav button[data-tab="console"]')?.click();
    const r = await window.api.importMrpack({ url, instanceName: n });
    b.disabled = false; b.textContent = t('import.download');
    if (r.ok) { toast(t('toast.imported'), 'success'); await refreshInstances(); document.querySelector('aside nav button[data-tab="launch"]')?.click(); }
    else toast('Error: ' + r.error, 'error');
});

// ============ INSTANCE MODAL ============
async function openInstanceModal(name) {
    currentModalInstance = name;
    const inst = instances.find(i => i.name === name);
    $('modalTitle').textContent = inst?.displayName || name;
    $('instanceModal').classList.add('active');
    document.querySelectorAll('.modal-tabs button').forEach(b => b.classList.remove('active'));
    document.querySelector('.modal-tabs button[data-mtab="overview"]')?.classList.add('active');
    switchModalTab('overview');
}
if ($('closeModal')) $('closeModal').addEventListener('click', () => { $('instanceModal').classList.remove('active'); currentModalInstance = null; });
document.querySelectorAll('.modal-tabs button').forEach(b => {
    b.addEventListener('click', () => {
        document.querySelectorAll('.modal-tabs button').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); switchModalTab(b.dataset.mtab);
    });
});

async function switchModalTab(tab) {
    if (!currentModalInstance) return;
    const body = $('modalBody'); const name = currentModalInstance;

    if (tab === 'overview') {
        const inst = instances.find(i => i.name === name);
        const playMin = inst.playTime ? Math.floor(inst.playTime / 60000) : 0;
        body.innerHTML = `
      <div class="list-item"><span class="name">${t('modal.instance')}</span><span class="meta">${inst?.displayName || name}</span></div>
      <div class="list-item"><span class="name">Minecraft</span><span class="meta">${inst?.mcVersion}</span></div>
      <div class="list-item"><span class="name">Loader</span><span class="meta">${inst?.loader}</span></div>
      <div class="list-item"><span class="name">${t('modal.size')}</span><span class="meta">${(inst?.size / 1024 / 1024).toFixed(0)} MB</span></div>
      <div class="list-item"><span class="name">${t('modal.playTime')}</span><span class="meta">${playMin} min</span></div>
      ${inst?.modpackVersion ? `<div class="list-item"><span class="name">${t('modal.modpackVersion')}</span><span class="meta">v${inst.modpackVersion}</span></div>` : ''}
      ${inst?.author ? `<div class="list-item"><span class="name">${t('advanced.author')}</span><span class="meta">${inst.author}</span></div>` : ''}
      ${inst?.description ? `<div class="list-item"><span class="name">${t('advanced.description')}</span><span class="meta">${inst.description}</span></div>` : ''}
      ${(inst?.tags || []).length ? `<div class="list-item"><span class="name">${t('advanced.tags')}</span><span class="meta">${inst.tags.map(tg => '#' + tg).join(' ')}</span></div>` : ''}
      <div class="row-inline" style="margin-top:16px">
        <button id="pickIconBtn" class="outlined-btn"><span class="material-symbols-rounded">image</span> ${t('modal.icon')}</button>
        <button id="pickBannerBtn" class="outlined-btn">Banner</button>
        <button id="openFolderBtn" class="outlined-btn">${t('modal.folder')}</button>
        <button id="copyBtn" class="outlined-btn">${t('modal.copy')}</button>
        <button id="exportBtn" class="outlined-btn">${t('modal.exportZip')}</button>
        <button id="exportMrpackBtn" class="outlined-btn">${t('modal.exportMrpack')}</button>
        <button id="conflictsBtn" class="outlined-btn">Conflicts</button>
        ${inst?.modpackProjectId ? `<button id="checkUpdateBtn" class="outlined-btn">${t('modal.checkUpdate')}</button>` : ''}
        <button id="deleteBtn" class="outlined-btn" style="color:var(--error);border-color:var(--error)">${t('modal.delete')}</button>
      </div>
      <div id="updateInfo" style="margin-top:12px"></div>
    `;
        body.querySelectorAll('button').forEach(attachRippleTo);
        $('pickIconBtn').addEventListener('click', async () => {
            const r = await window.api.pickInstanceIcon(name);
            if (r.ok) { toast('Icon set', 'success'); refreshInstances(); }
        });
        $('pickBannerBtn').addEventListener('click', async () => {
            const r = await window.api.pickInstanceBanner(name);
            if (r.ok) { toast('Banner set', 'success'); refreshInstances(); }
        });
        $('openFolderBtn').addEventListener('click', () => window.api.openInstanceFolder({ name, sub: '' }));
        $('conflictsBtn').addEventListener('click', () => checkConflicts(name));
        $('deleteBtn').addEventListener('click', async () => {
            if (!confirm(`Delete "${name}"?`)) return;
            await window.api.deleteInstance(name);
            $('instanceModal').classList.remove('active'); refreshInstances(); toast(t('toast.instanceDeleted'), 'warn');
        });
        $('exportBtn').addEventListener('click', async () => { const r = await window.api.exportInstance(name); if (r.ok) toast(t('toast.exported'), 'success'); });
        $('exportMrpackBtn').addEventListener('click', async () => {
            const inst = instances.find(i => i.name === name);
            const title = inst?.displayName || name;
            const author = inst?.author || '';
            const description = inst?.description || '';
            const version = prompt('Version:', inst?.modpackVersion || '1.0.0');
            const banner = inst?.modpackBanner || null;
            const r = await window.api.exportMrpack({ name, meta: { title, author, description, version, banner } });
            if (r.ok) toast(t('toast.exported'), 'success');
        });
        $('copyBtn').addEventListener('click', async () => {
            const nn = prompt('New name:', name + '-copy'); if (!nn) return;
            const r = await window.api.copyInstance({ name, newName: nn, copyOptions: { mods: true, saves: true, resourcepacks: true, shaderpacks: true, screenshots: false } });
            if (r.ok) { toast(t('toast.copied'), 'success'); refreshInstances(); } else toast(r.error, 'error');
        });
        if ($('checkUpdateBtn')) $('checkUpdateBtn').addEventListener('click', async () => {
            $('updateInfo').innerHTML = `<div class="hint">${t('modal.checkingUpdate')}</div>`;
            const r = await window.api.checkModpackUpdate(name);
            if (!r.ok) { $('updateInfo').innerHTML = `<div class="hint" style="color:var(--error)">${r.error}</div>`; return; }
            if (r.hasUpdate) {
                const ch = await window.api.getModpackChangelog({ instanceName: name, versionId: r.latest.id });
                const changelog = ch.ok ? (ch.changelog || 'No changelog.') : '';
                const safeLog = changelog.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
                $('updateInfo').innerHTML = `
          <div class="card" style="background:var(--primary-container);color:var(--on-primary-container)">
            <h3 style="margin-bottom:8px"><span class="material-symbols-rounded">update</span> ${t('modal.updateAvailable')}: v${r.latest.version}</h3>
            <div style="font-size:12px;white-space:pre-wrap;max-height:240px;overflow-y:auto;margin-bottom:12px;line-height:1.5">${safeLog}</div>
            <button id="doUpdateBtn" class="filled-btn" style="padding:8px 16px;font-size:13px">${t('modal.updateNow')}</button>
          </div>
        `;
                attachRippleTo($('doUpdateBtn'));
                $('doUpdateBtn').addEventListener('click', async () => {
                    $('doUpdateBtn').disabled = true; $('doUpdateBtn').textContent = t('modal.updating');
                    const u = await window.api.updateModpack({ instanceName: name, versionId: r.latest.id });
                    if (u.ok) { toast(`Updated v${u.version}`, 'success'); refreshInstances(); $('instanceModal').classList.remove('active'); }
                    else toast('Error: ' + u.error, 'error');
                });
            } else {
                $('updateInfo').innerHTML = `<div class="hint">${t('modal.upToDate')}</div>`;
            }
        });
    }

    if (tab === 'mods') {
        const mods = await window.api.listMods(name);
        const upRes = await window.api.checkModUpdates(name);
        const updates = upRes.ok ? upRes.updates : [];
        let updatesHtml = '';
        if (updates.length) {
            updatesHtml = `
        <div class="card" style="margin-bottom:16px;background:var(--primary-container);color:var(--on-primary-container)">
          <h3 style="margin-bottom:12px"><span class="material-symbols-rounded">update</span> ${updates.length} ${t('mods.updatesAvailable')}</h3>
          ${updates.map(u => `
            <div class="list-item" style="background:transparent">
              <span class="name">${u.fileName} → ${u.latestVersionNumber}</span>
              <div class="actions"><button data-apply-update="${u.latestVersion}">${t('mods.update')}</button></div>
            </div>
          `).join('')}
          <button id="updateAllBtn" class="filled-btn" style="margin-top:8px;padding:8px 16px;font-size:13px">${t('mods.updateAll')}</button>
        </div>
      `;
        }
        body.innerHTML = `
      ${updatesHtml}
      <div class="row-inline" style="margin-bottom:12px">
        <button id="addModBtn" class="filled-btn" style="padding:8px 16px;font-size:13px"><span class="material-symbols-rounded">add</span> ${t('mods.addMod')}</button>
        <button id="checkModUpdatesBtn" class="outlined-btn"><span class="material-symbols-rounded">update</span> ${t('mods.checkUpdates')}</button>
      </div>
      ${mods.length ? mods.map(m => `<div class="list-item">
        <div class="toggle ${m.enabled ? 'on' : ''}" data-file="${m.file}"></div>
        <span class="name">${m.name}</span>
        <span class="meta">${(m.size / 1024).toFixed(0)} KB</span>
        <div class="actions"><button data-delete="${m.file}">✕</button></div>
      </div>`).join('') : `<p class="hint">${t('mods.noMods')}</p>`}
    `;
        body.querySelectorAll('button').forEach(attachRippleTo);
        if ($('checkModUpdatesBtn')) $('checkModUpdatesBtn').addEventListener('click', async () => {
            $('checkModUpdatesBtn').disabled = true; $('checkModUpdatesBtn').textContent = t('mods.checking');
            const r = await window.api.checkModUpdates(name);
            if (r.ok && r.updates.length) toast(`${r.updates.length} ${t('mods.updatesAvailable')}`, 'warn');
            else if (r.ok) toast(t('toast.upToDate'), 'success');
            switchModalTab('mods');
        });
        if ($('updateAllBtn')) $('updateAllBtn').addEventListener('click', async () => {
            $('updateAllBtn').disabled = true; $('updateAllBtn').textContent = t('modal.updating');
            for (const u of updates) await window.api.applyModUpdate({ instanceName: name, update: u });
            toast(t('toast.updated'), 'success');
            switchModalTab('mods');
        });
        body.querySelectorAll('[data-apply-update]').forEach(b => b.addEventListener('click', async () => {
            const u = updates.find(x => x.latestVersion === b.dataset.applyUpdate);
            if (!u) return;
            b.disabled = true; b.textContent = '...';
            const r = await window.api.applyModUpdate({ instanceName: name, update: u });
            if (r.ok) { toast(t('toast.updated'), 'success'); switchModalTab('mods'); }
            else toast(r.error, 'error');
        }));
        $('addModBtn').addEventListener('click', async () => {
            const files = await window.api.pickMods();
            if (!files.length) return;
            const r = await window.api.addMods({ instanceName: name, files });
            if (r.ok) { toast(`Added ${r.added}`, 'success'); switchModalTab('mods'); } else toast(r.error, 'error');
        });
        body.querySelectorAll('.toggle').forEach(tg => tg.addEventListener('click', async () => {
            await window.api.toggleMod({ instanceName: name, file: tg.dataset.file }); switchModalTab('mods');
        }));
        body.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async () => {
            if (!confirm('Delete?')) return;
            await window.api.deleteMod({ instanceName: name, file: b.dataset.delete }); switchModalTab('mods');
        }));
    }

    if (tab === 'worlds') {
        const worlds = await window.api.listFolder({ instanceName: name, sub: 'saves' });
        if (!worlds.length) { body.innerHTML = `<p class="hint">${t('worlds.noWorlds')}</p>`; return; }
        body.innerHTML = worlds.filter(w => w.isDir).map(w => `<div class="list-item"><span class="name">${w.name}</span><span class="meta">${new Date(w.mtime).toLocaleDateString()}</span></div>`).join('');
    }

    if (tab === 'resourcepacks') {
        const packs = await window.api.listFolder({ instanceName: name, sub: 'resourcepacks' });
        if (!packs.length) { body.innerHTML = `<p class="hint">${t('resourcepacks.noPacks')}</p>`; return; }
        body.innerHTML = packs.map(p => `<div class="list-item"><span class="name">${p.name}</span><span class="meta">${p.isDir ? 'folder' : (p.size / 1024).toFixed(0) + ' KB'}</span></div>`).join('');
    }

    if (tab === 'screenshots') {
        const shots = await window.api.listScreenshots(name);
        if (!shots.length) { body.innerHTML = `<p class="hint">${t('screenshots.none')}</p>`; return; }
        body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
        ${shots.map(s => `
          <div class="card" style="padding:8px;position:relative">
            <img src="${s.dataUrl}" style="width:100%;border-radius:8px;display:block" />
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:11px;color:var(--on-surface-variant)">
              <span title="${s.name}">${s.name.slice(0, 20)}</span>
              <div class="row-inline">
                <button data-upload-shot="${s.name}" class="icon-btn" style="width:24px;height:24px" title="${t('screenshots.upload')}"><span class="material-symbols-rounded" style="font-size:16px">upload</span></button>
                <button data-del-shot="${s.name}" class="icon-btn" style="width:24px;height:24px"><span class="material-symbols-rounded" style="font-size:16px">delete</span></button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <button id="openScreenshotsFolder" class="outlined-btn" style="margin-top:12px">${t('screenshots.openFolder')}</button>
    `;
        body.querySelectorAll('button').forEach(attachRippleTo);
        $('openScreenshotsFolder').addEventListener('click', () => window.api.openInstanceFolder({ name, sub: 'screenshots' }));
        body.querySelectorAll('[data-upload-shot]').forEach(b => b.addEventListener('click', async () => {
            b.disabled = true;
            const r = await window.api.uploadScreenshot({ instanceName: name, name: b.dataset.uploadShot });
            b.disabled = false;
            if (r.ok) {
                navigator.clipboard.writeText(r.url).catch(() => {});
                toast(t('toast.uploaded') + ': ' + r.url, 'success');
            } else toast('Error: ' + r.error, 'error');
        }));
        body.querySelectorAll('[data-del-shot]').forEach(b => b.addEventListener('click', async () => {
            if (!confirm('Delete screenshot?')) return;
            await window.api.deleteScreenshot({ instanceName: name, name: b.dataset.delShot });
            switchModalTab('screenshots');
        }));
    }

    if (tab === 'backups') {
        const backups = await window.api.listBackups(name);
        body.innerHTML = `
      <div class="row-inline" style="margin-bottom:12px">
        <button id="makeBackupBtn" class="filled-btn" style="padding:8px 16px;font-size:13px"><span class="material-symbols-rounded">archive</span> ${t('backups.create')}</button>
      </div>
      ${backups.length ? backups.map(b => `<div class="list-item">
        <span class="name">${b.name}</span>
        <span class="meta">${(b.size / 1024 / 1024).toFixed(1)} MB</span>
        <div class="actions"><button data-restore="${b.name}">${t('backups.restore')}</button><button data-del-backup="${b.name}">✕</button></div>
      </div>`).join('') : `<p class="hint">${t('backups.none')}</p>`}
    `;
        body.querySelectorAll('button').forEach(attachRippleTo);
        $('makeBackupBtn').addEventListener('click', async () => {
            const r = await window.api.backupInstance({ instanceName: name, tag: 'manual' });
            if (r.ok) { toast(t('toast.backupCreated'), 'success'); switchModalTab('backups'); } else toast(r.error, 'error');
        });
        body.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', async () => {
            if (!confirm('Restore?')) return;
            const r = await window.api.restoreBackup({ instanceName: name, backupName: b.dataset.restore });
            if (r.ok) { toast(t('toast.restored'), 'success'); refreshInstances(); } else toast(r.error, 'error');
        }));
        body.querySelectorAll('[data-del-backup]').forEach(b => b.addEventListener('click', async () => {
            if (!confirm('Delete backup?')) return;
            await window.api.deleteBackup({ instanceName: name, backupName: b.dataset.delBackup });
            switchModalTab('backups');
        }));
    }

    if (tab === 'crashes') {
        const r = await window.api.analyzeCrash(name);
        if (!r.ok) { body.innerHTML = `<div class="hint" style="color:var(--error)">${r.error}</div>`; return; }
        if (!r.reports.length) { body.innerHTML = `<p class="hint">${t('crashes.none')}</p>`; return; }
        body.innerHTML = r.reports.map(rep => `
      <div class="card" style="margin-bottom:12px">
        <div style="font-weight:500;margin-bottom:6px">${rep.file}</div>
        <div class="list-item" style="margin-bottom:6px"><span class="name">${t('crashes.cause')}</span><span class="meta" style="color:var(--error)">${rep.cause}</span></div>
        ${rep.mod ? `<div class="list-item" style="margin-bottom:6px"><span class="name">${t('crashes.mod')}</span><span class="meta">${rep.mod}</span></div>` : ''}
        <details><summary style="cursor:pointer;font-size:12px;color:var(--primary)">${t('crashes.preview')}</summary>
        <pre style="margin-top:8px;font-size:11px;white-space:pre-wrap;background:var(--surface-3);padding:8px;border-radius:8px;max-height:200px;overflow-y:auto">${rep.preview.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>
        </details>
      </div>
    `).join('');
    }

    if (tab === 'advanced') {
        const inst = instances.find(i => i.name === name);
        body.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <h3>${t('advanced.perInstance')}</h3>
        <label>${t('advanced.ram')} <input id="piRam" type="number" min="1024" step="512" value="${inst?.perInstance?.ram || ''}" placeholder="Use global" /></label>
        <label>${t('advanced.javaPath')} <input id="piJava" type="text" value="${inst?.perInstance?.javaPath || ''}" placeholder="Use global" /></label>
        <label>${t('advanced.extraJvm')} <input id="piArgs" type="text" value="${inst?.perInstance?.extraJvmArgs || ''}" placeholder="Use global" /></label>
        <label>${t('advanced.defaultServer')} <input id="piServer" type="text" value="${inst?.perInstance?.server || ''}" placeholder="play.example.com:25565" /></label>
        <label>${t('advanced.tags')} <input id="piTags" type="text" value="${(inst?.tags || []).join(', ')}" placeholder="${t('advanced.tagsHint')}" /></label>
        <label>${t('advanced.author')} <input id="piAuthor" type="text" value="${inst?.author || ''}" /></label>
        <label>${t('advanced.description')} <input id="piDesc" type="text" value="${inst?.description || ''}" /></label>
        <button id="savePiBtn" class="outlined-btn">${t('advanced.save')}</button>
      </div>
      <div class="card">
        <h3>${t('advanced.customCommands')}</h3>
        <label>${t('advanced.preLaunch')} <input id="preLaunchCmd" type="text" placeholder="./prelaunch.sh" /></label>
        <label>${t('advanced.postExit')} <input id="postExitCmd" type="text" placeholder="./postexit.sh" /></label>
        <button id="saveCommands" class="outlined-btn">${t('advanced.saveCommands')}</button>
      </div>
    `;
        body.querySelectorAll('button').forEach(attachRippleTo);
        $('savePiBtn').addEventListener('click', async () => {
            const perInstance = {};
            if ($('piRam').value) perInstance.ram = parseInt($('piRam').value, 10);
            if ($('piJava').value) perInstance.javaPath = $('piJava').value;
            if ($('piArgs').value) perInstance.extraJvmArgs = $('piArgs').value;
            if ($('piServer').value) perInstance.server = $('piServer').value;
            const tags = ($('piTags').value || '').split(',').map(x => x.trim()).filter(Boolean);
            await window.api.updateInstanceMeta({
                name,
                patch: {
                    perInstance,
                    tags,
                    author: $('piAuthor').value || '',
                    description: $('piDesc').value || ''
                }
            });
            toast(t('toast.settingsSaved'), 'success'); refreshInstances();
        });
        $('saveCommands').addEventListener('click', async () => {
            await window.api.updateInstanceMeta({ name, patch: { preLaunchCmd: $('preLaunchCmd').value || undefined, postExitCmd: $('postExitCmd').value || undefined } });
            toast(t('toast.settingsSaved'), 'success');
        });
    }
}

// ============ SYS ============
async function updateSys() {
    try {
        const info = await window.api.sysInfo();
        const used = info.totalMem - info.freeMem;
        if ($('ramStat')) $('ramStat').textContent = `${(used / 1024 / 1024 / 1024).toFixed(1)} / ${(info.totalMem / 1024 / 1024 / 1024).toFixed(0)} GB`;
        if ($('ramBar')) $('ramBar').style.width = (used / info.totalMem * 100).toFixed(0) + '%';
        if ($('cpuStat')) $('cpuStat').textContent = `${info.cpuModel} · ${info.cpus} cores`;
        if ($('javaCount')) $('javaCount').textContent = cachedJavas.length ? cachedJavas.length + ' found' : 'Click detect';
    } catch {}
}

// ============ AUTO-UPDATE ============
async function checkLauncherUpdate() {
    const r = await window.api.checkLauncherUpdate();
    if (!r.ok || !r.hasUpdate) return;
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.innerHTML = `
    <span class="material-symbols-rounded">download</span>
    <span>Update available: v${r.latest} (you have v${r.current})</span>
    <button class="filled-btn" style="padding:6px 14px;font-size:12px" onclick="window.api.openExternal('${r.url}')">Download</button>
    <button class="icon-btn" onclick="this.parentElement.remove()"><span class="material-symbols-rounded">close</span></button>
  `;
    document.body.appendChild(banner);
    attachRippleTo(banner.querySelector('.filled-btn'));
    attachRippleTo(banner.querySelector('.icon-btn'));
}

// ============ QUICK LAUNCH ============
window.api.onQuickLaunch(async () => {
    if (!instances.length) return toast('No instances', 'error');
    const last = [...instances].filter(i => i.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed)[0] || instances[0];
    const s = settings || await window.api.getSettings();
    await window.api.launch({ instanceName: last.name, nickname: null, ram: s.ram, javaPath: s.javaPath, extraJvmArgs: s.extraJvmArgs, authlib: authlibSession });
    toast(t('toast.launching'), 'success');
});

// ============ DRAG & DROP ============
let dragCounter = 0;
const dropOverlay = $('dropOverlay');
window.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; if (dropOverlay) dropOverlay.classList.add('active'); });
window.addEventListener('dragleave', e => { e.preventDefault(); dragCounter--; if (dragCounter <= 0 && dropOverlay) { dropOverlay.classList.remove('active'); dragCounter = 0; } });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', async e => {
    e.preventDefault(); dragCounter = 0;
    if (dropOverlay) dropOverlay.classList.remove('active');
    const files = Array.from(e.dataTransfer.files).map(f => f.path);
    const jars = files.filter(f => f.toLowerCase().endsWith('.jar'));
    if (!jars.length) return;
    if (!currentModalInstance) return toast('Open an instance first', 'error');
    const r = await window.api.addMods({ instanceName: currentModalInstance, files: jars });
    if (r.ok) { toast(`Added ${r.added}`, 'success'); switchModalTab('mods'); }
});

// ============ WINDOW CONTROLS ============
if ($('winMinimize')) $('winMinimize').addEventListener('click', () => window.api.winMinimize());
if ($('winMaximize')) $('winMaximize').addEventListener('click', () => window.api.winMaximize());
if ($('winClose')) $('winClose').addEventListener('click', () => window.api.winClose());

// ============ INIT ============
(async () => {
    if (navigator.platform.toLowerCase().includes('mac')) document.body.classList.add('mac');

    settings = await window.api.getSettings();
    await loadLocale(settings.language || 'en');

    applyTheme(settings.theme || 'm3-dark');
    applyCustomCss(settings.customCss || '');
    applyWallpaper(settings.wallpaper || '');

    if ($('customCss')) $('customCss').value = settings.customCss || '';
    if ($('ram')) { $('ram').value = settings.ram; if ($('ramLabel')) $('ramLabel').textContent = `${settings.ram} MB`; }
    if ($('javaPath')) $('javaPath').value = settings.javaPath || '/usr/bin/java';
    if ($('extraJvmArgs')) $('extraJvmArgs').value = settings.extraJvmArgs || '';
    if ($('modrinthToken')) $('modrinthToken').value = settings.modrinthToken || '';
    if ($('authlibApi')) $('authlibApi').value = settings.authlibApi || 'https://account.ely.by/api/authlib-injector';
    if ($('autoBackup')) $('autoBackup').checked = settings.autoBackup !== false;
    if ($('discordRpc')) $('discordRpc').checked = !!settings.discordRpc;
    if ($('minimizeToTray')) $('minimizeToTray').checked = !!settings.minimizeToTray;
    if ($('quickLaunchKey')) $('quickLaunchKey').value = settings.quickLaunchKey || 'CommandOrControl+Shift+M';
    if ($('languageSelect')) $('languageSelect').value = settings.language || 'en';

    attachRipple();
    initSidebarResize();
    initFilesTab();

    await refreshProfiles();
    await refreshInstances();
    await loadMcVersions();
    await populateDiscoverMcVersions();
    await refreshFilesInstances();
    await refreshServers();
    await refreshSavedThemes();

    updateSys();
    setInterval(updateSys, 3000);

    setTimeout(checkLauncherUpdate, 3000);
})();