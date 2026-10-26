const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, Notification, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync, execFile, exec } = require('child_process');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { Client } = require('minecraft-launcher-core');
const { ensureLoader } = require('./loader/install');

const userData = app.getPath('userData');
const instancesDir = path.join(userData, 'instances');
const settingsFile = path.join(userData, 'settings.json');
const historyFile = path.join(userData, 'history.json');
const profilesFile = path.join(userData, 'profiles.json');
const authlibDir = path.join(userData, 'authlib');
const backupsDir = path.join(userData, 'backups');
const serversFile = path.join(userData, 'servers.json');
const themesDir = path.join(userData, 'themes');
const localeDir = path.join(__dirname, 'locales');

[instancesDir, authlibDir, backupsDir, themesDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

let win;
let tray;
let currentGame = null;
let discordRpc = null;
let globalHotkey = null;

function createWindow() {
    win = new BrowserWindow({
        width: 1320, height: 880, minWidth: 900, minHeight: 600,
        backgroundColor: '#141218', title: 'BetterImgLauncher',
        titleBarStyle: 'hidden',
        frame: false,
        trafficLightPosition: { x: -100, y: -100 },
        vibrancy: 'under-window', visualEffectState: 'active',
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    win.loadFile('index.html');
    win.setMenuBarVisibility(false);

    try {
        const iconPath = path.join(__dirname, 'icon.png');
        const img = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
        tray = new Tray(img);
        tray.setToolTip('BetterImgLauncher');
        const ctx = Menu.buildFromTemplate([
            { label: 'Show', click: () => win.show() },
            { label: 'Launch last instance', click: () => { win.show(); win.webContents.send('quick-launch'); } },
            { type: 'separator' },
            { label: 'Quit', click: () => app.quit() }
        ]);
        tray.setContextMenu(ctx);
        tray.on('click', () => win.show());
    } catch {}
}

app.whenReady().then(() => {
    createWindow();
    setTimeout(initDiscordRpc, 2000);
    setTimeout(registerGlobalHotkey, 3000);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

function sendLog(msg, type = 'log') { if (win && !win.isDestroyed()) win.webContents.send('log', { msg, type, ts: Date.now() }); }
function sendProgress(p) { if (win && !win.isDestroyed()) win.webContents.send('progress', p); }
function notify(title, body) { try { new Notification({ title, body }).show(); } catch {} }

// ================= WINDOW CONTROLS =================
ipcMain.handle('win-minimize', () => { if (win) win.minimize(); });
ipcMain.handle('win-maximize', () => { if (!win) return; if (win.isMaximized()) win.unmaximize(); else win.maximize(); });
ipcMain.handle('win-close', () => { if (win) win.close(); });

// ================= SETTINGS =================
function loadSettings() {
    if (!fs.existsSync(settingsFile)) {
        const def = {
            nickname: 'Player', ram: 4096, javaPath: '/usr/bin/java',
            instanceName: 'BetterImageFix', extraJvmArgs: '', language: 'en',
            modrinthToken: '', authlibApi: 'https://account.ely.by/api/authlib-injector',
            theme: 'm3-dark', customCss: '', wallpaper: '', autoBackup: true, discordRpc: false,
            minimizeToTray: false, quickLaunchKey: 'CommandOrControl+Shift+M', authlibWhitelist: []
        };
        fs.writeFileSync(settingsFile, JSON.stringify(def, null, 2));
        return def;
    }
    const s = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    if (!s.theme) s.theme = 'm3-dark';
    if (s.customCss === undefined) s.customCss = '';
    if (s.wallpaper === undefined) s.wallpaper = '';
    if (s.autoBackup === undefined) s.autoBackup = true;
    if (s.discordRpc === undefined) s.discordRpc = false;
    if (s.minimizeToTray === undefined) s.minimizeToTray = false;
    if (!s.quickLaunchKey) s.quickLaunchKey = 'CommandOrControl+Shift+M';
    if (!s.authlibWhitelist) s.authlibWhitelist = [];
    return s;
}
ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-settings', (e, s) => { fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2)); return true; });

ipcMain.handle('pick-wallpaper', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }] });
    if (r.canceled) return null;
    const data = fs.readFileSync(r.filePaths[0]).toString('base64');
    const ext = path.extname(r.filePaths[0]).slice(1);
    return `data:image/${ext};base64,${data}`;
});

// ================= LANGUAGE =================
ipcMain.handle('get-locale', (e, lang) => {
    const file = path.join(localeDir, `${lang || 'en'}.json`);
    if (!fs.existsSync(file)) return {};
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return {}; }
});

// ================= SERVERS =================
function loadServers() {
    if (!fs.existsSync(serversFile)) { fs.writeFileSync(serversFile, '[]'); return []; }
    try { return JSON.parse(fs.readFileSync(serversFile, 'utf-8')); } catch { return []; }
}
function saveServers(s) { fs.writeFileSync(serversFile, JSON.stringify(s, null, 2)); }
ipcMain.handle('list-servers', () => loadServers());
ipcMain.handle('add-server', (e, { name, ip, authlibApi }) => {
    const list = loadServers();
    const id = 's-' + Date.now();
    list.push({ id, name: name || ip, ip, authlibApi: authlibApi || null, addedAt: Date.now() });
    saveServers(list);
    return { ok: true, id };
});
ipcMain.handle('delete-server', (e, id) => { saveServers(loadServers().filter(s => s.id !== id)); return { ok: true }; });

// ================= HISTORY =================
function loadHistory() { if (!fs.existsSync(historyFile)) return []; try { return JSON.parse(fs.readFileSync(historyFile, 'utf-8')); } catch { return []; } }
function saveHistory(h) { fs.writeFileSync(historyFile, JSON.stringify(h.slice(0, 500), null, 2)); }
ipcMain.handle('get-history', () => loadHistory());
ipcMain.handle('clear-history', () => { saveHistory([]); return true; });

ipcMain.handle('get-stats', () => {
    const h = loadHistory();
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const month = 30 * 24 * 60 * 60 * 1000;

    const daily = {};
    const weekly = {};
    const byInstance = {};

    for (const item of h) {
        const day = new Date(item.endedAt).toISOString().slice(0, 10);
        daily[day] = (daily[day] || 0) + item.playMs;
        const weekNum = Math.floor((now - item.endedAt) / week);
        weekly[weekNum] = (weekly[weekNum] || 0) + item.playMs;
        byInstance[item.instance] = (byInstance[item.instance] || 0) + item.playMs;
    }

    const topInstances = Object.entries(byInstance).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, ms]) => ({ name, ms }));
    const totalMs = h.reduce((sum, item) => sum + item.playMs, 0);
    const totalLaunches = h.length;
    const weekMs = h.filter(item => now - item.endedAt < week).reduce((s, i) => s + i.playMs, 0);
    const monthMs = h.filter(item => now - item.endedAt < month).reduce((s, i) => s + i.playMs, 0);

    return {
        ok: true,
        totalMs, totalLaunches, weekMs, monthMs,
        daily: Object.entries(daily).sort(),
        topInstances,
        recent: h.slice(0, 20)
    };
});

// ================= PROFILES =================
function loadProfiles() {
    if (!fs.existsSync(profilesFile)) { const def = [{ id: 'default', name: 'Player', active: true, type: 'offline' }]; fs.writeFileSync(profilesFile, JSON.stringify(def, null, 2)); return def; }
    try { return JSON.parse(fs.readFileSync(profilesFile, 'utf-8')).map(p => ({ type: 'offline', ...p })); }
    catch { return [{ id: 'default', name: 'Player', active: true, type: 'offline' }]; }
}
function saveProfiles(p) { fs.writeFileSync(profilesFile, JSON.stringify(p, null, 2)); }

ipcMain.handle('list-profiles', () => loadProfiles());
ipcMain.handle('add-profile', (e, name) => {
    const profiles = loadProfiles();
    if (!name || !name.trim()) return { ok: false, error: 'Empty name' };
    if (profiles.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) return { ok: false, error: 'Exists' };
    const id = 'p-' + Date.now();
    profiles.push({ id, name: name.trim(), active: profiles.length === 0, type: 'offline' });
    saveProfiles(profiles);
    return { ok: true, id };
});
ipcMain.handle('set-active-profile', (e, id) => { const p = loadProfiles(); p.forEach(x => x.active = x.id === id); saveProfiles(p); return { ok: true }; });
ipcMain.handle('delete-profile', (e, id) => { let p = loadProfiles().filter(x => x.id !== id); if (p.length && !p.some(x => x.active)) p[0].active = true; saveProfiles(p); return { ok: true }; });
ipcMain.handle('rename-profile', (e, { id, name }) => {
    if (!name || !name.trim()) return { ok: false, error: 'Empty' };
    const p = loadProfiles(); const x = p.find(y => y.id === id);
    if (!x) return { ok: false, error: 'Not found' };
    x.name = name.trim(); saveProfiles(p); return { ok: true };
});

// ================= AUTHLIB =================
async function downloadAuthlib() {
    const jarPath = path.join(authlibDir, 'authlib-injector.jar');
    if (fs.existsSync(jarPath)) return jarPath;
    const rel = await fetch('https://api.github.com/repos/yushijinhun/authlib-injector/releases/latest', { headers: { 'User-Agent': 'BetterImgLauncher' } });
    if (!rel.ok) throw new Error('Failed to fetch');
    const data = await rel.json();
    const asset = data.assets.find(a => a.name.endsWith('.jar') && a.name.includes('authlib-injector'));
    if (!asset) throw new Error('No jar');
    const res = await fetch(asset.browser_download_url);
    const buf = await res.buffer();
    fs.writeFileSync(jarPath, buf);
    return jarPath;
}

ipcMain.handle('authlib-login', async (e, { apiRoot, username, password }) => {
    try {
        const base = apiRoot.replace(/\/+$/, '');
        const res = await fetch(`${base}/authserver/authenticate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'BetterImgLauncher' },
            body: JSON.stringify({ agent: { name: 'Minecraft', version: 1 }, username, password, clientToken: 'betterimg-' + Date.now() })
        });
        const data = await res.json();
        if (!res.ok || !data.accessToken) throw new Error(data.errorMessage || 'Login failed');
        return { ok: true, accessToken: data.accessToken, clientToken: data.clientToken || 'betterimg', uuid: data.selectedProfile?.id, name: data.selectedProfile?.name || username, apiRoot: base };
    } catch (err) { return { ok: false, error: err.message }; }
});

function detectService(apiRoot) {
    if (!apiRoot) return 'Authlib';
    if (apiRoot.includes('ely.by')) return 'Ely.by';
    if (apiRoot.includes('littleskin')) return 'LittleSkin';
    return 'Authlib';
}

ipcMain.handle('save-authlib-profile', (e, data) => {
    try {
        const profiles = loadProfiles();
        const id = 'auth-' + Date.now();
        profiles.push({
            id, name: data.name, type: 'authlib', service: detectService(data.apiRoot),
            apiRoot: data.apiRoot, accessToken: data.accessToken,
            clientToken: data.clientToken, uuid: data.uuid,
            active: !profiles.some(p => p.active)
        });
        saveProfiles(profiles);
        return { ok: true, id };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= JAVA =================
ipcMain.handle('pick-java', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Java', extensions: ['*'] }] });
    if (r.canceled) return null;
    return r.filePaths[0];
});

function detectJavaVersion(javaPath) {
    return new Promise((resolve) => {
        execFile(javaPath, ['-version'], { timeout: 5000 }, (err, stdout, stderr) => {
            const text = (stderr || '') + (stdout || '');
            const m = text.match(/version "(\d+)(?:\.(\d+))?/);
            if (m) resolve(m[1] === '1' ? parseInt(m[2], 10) : parseInt(m[1], 10)); else resolve(null);
        });
    });
}

ipcMain.handle('find-javas', async () => {
    const found = []; const candidates = [];
    const pushDir = (dir) => {
        if (!dir || !fs.existsSync(dir)) return;
        try {
            for (const sub of fs.readdirSync(dir)) {
                const full = path.join(dir, sub);
                if (fs.statSync(full).isDirectory()) {
                    const exe = process.platform === 'win32' ? 'javaw.exe' : 'java';
                    const p = path.join(full, 'bin', exe); if (fs.existsSync(p)) candidates.push(p);
                    const p2 = path.join(full, 'Contents', 'Home', 'bin', exe); if (fs.existsSync(p2)) candidates.push(p2);
                }
            }
        } catch {}
    };
    if (process.platform === 'darwin') {
        pushDir('/Library/Java/JavaVirtualMachines');
        pushDir(path.join(os.homedir(), 'Library/Java/JavaVirtualMachines'));
        try { const hm = execSync('/usr/libexec/java_home -V 2>&1', { encoding: 'utf-8' }); for (const line of hm.split('\n')) { const m = line.match(/(\/.*?\/Contents\/Home)/); if (m) candidates.push(path.join(m[1], 'bin', 'java')); } } catch {}
    } else if (process.platform === 'win32') {
        pushDir('C:\\Program Files\\Java'); pushDir('C:\\Program Files\\Eclipse Adoptium'); pushDir('C:\\Program Files\\Microsoft');
        try { const out = execSync('where java', { encoding: 'utf-8' }); out.split('\n').forEach(l => { if (l.trim()) candidates.push(l.trim()); }); } catch {}
    } else {
        pushDir('/usr/lib/jvm'); pushDir('/usr/java');
        try { const out = execSync('which -a java', { encoding: 'utf-8' }); out.split('\n').forEach(l => { if (l.trim()) candidates.push(l.trim()); }); } catch {}
    }
    const seen = new Set();
    for (const p of candidates) { if (seen.has(p)) continue; seen.add(p); const v = await detectJavaVersion(p); if (v) found.push({ path: p, version: v }); }
    return found.sort((a, b) => b.version - a.version);
});

// ================= DOWNLOAD =================
async function downloadFile(url, dest, onProgress, headers = {}) {
    const res = await fetch(url, { redirect: 'follow', headers });
    if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
    const total = parseInt(res.headers.get('content-length') || '0', 10);
    let done = 0;
    const fileStream = fs.createWriteStream(dest);
    res.body.on('data', chunk => { done += chunk.length; if (onProgress) onProgress(done, total); });
    await new Promise((resolve, reject) => { res.body.pipe(fileStream); res.body.on('error', reject); fileStream.on('finish', resolve); });
}
async function fetchJSON(url, headers = {}) {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'BetterImgLauncher/1.0.4', ...headers } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
}

// ================= INSTANCES =================
function instMeta(instDir) {
    const p = path.join(instDir, 'instance.json');
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}
function instSize(dir) {
    let total = 0;
    try { const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else total += st.size; } }; walk(dir); } catch {}
    return total;
}

ipcMain.handle('list-instances', () => {
    if (!fs.existsSync(instancesDir)) return [];
    return fs.readdirSync(instancesDir).map(name => {
        const dir = path.join(instancesDir, name);
        const m = instMeta(dir);
        if (!m) return null;
        return {
            name, displayName: m.name || name,
            mcVersion: m.dependencies?.minecraft,
            loader: Object.entries(m.dependencies || {}).filter(([k]) => k !== 'minecraft').map(([k, v]) => `${k.replace('-loader', '')} ${v}`)[0] || 'vanilla',
            importedAt: m.importedAt, size: instSize(dir), icon: m.icon || null,
            lastPlayed: m.lastPlayed || null, playTime: m.playTime || 0,
            customIcon: m.customIcon || null, server: m.server || null,
            perInstance: m.perInstance || {}, modpackVersion: m.modpackVersion || null,
            modpackProjectId: m.modpackProjectId || null,
            tags: m.tags || [], description: m.description || '', author: m.author || '', modpackBanner: m.modpackBanner || null
        };
    }).filter(Boolean);
});

ipcMain.handle('delete-instance', async (e, name) => {
    const dir = path.join(instancesDir, name);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    return true;
});
ipcMain.handle('update-instance-meta', (e, { name, patch }) => {
    const p = path.join(instancesDir, name, 'instance.json');
    if (!fs.existsSync(p)) return { ok: false };
    const m = JSON.parse(fs.readFileSync(p, 'utf-8'));
    Object.assign(m, patch);
    fs.writeFileSync(p, JSON.stringify(m, null, 2));
    return { ok: true };
});
ipcMain.handle('open-instances', () => shell.openPath(instancesDir));
ipcMain.handle('get-instances-dir', () => instancesDir);
ipcMain.handle('open-folder', (e, p) => shell.openPath(p));
ipcMain.handle('open-instance-folder', (e, { name, sub }) => {
    const p = path.join(instancesDir, name, sub || '');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return shell.openPath(p);
});

ipcMain.handle('pick-instance-icon', async (e, name) => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
    if (r.canceled) return { ok: false };
    const buf = fs.readFileSync(r.filePaths[0]).toString('base64');
    const ext = path.extname(r.filePaths[0]).slice(1);
    const dataUrl = `data:image/${ext};base64,${buf}`;
    const p = path.join(instancesDir, name, 'instance.json');
    if (fs.existsSync(p)) {
        const m = JSON.parse(fs.readFileSync(p, 'utf-8'));
        m.customIcon = dataUrl;
        fs.writeFileSync(p, JSON.stringify(m, null, 2));
    }
    return { ok: true, icon: dataUrl };
});

ipcMain.handle('pick-instance-banner', async (e, name) => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
    if (r.canceled) return { ok: false };
    const buf = fs.readFileSync(r.filePaths[0]).toString('base64');
    const ext = path.extname(r.filePaths[0]).slice(1);
    const dataUrl = `data:image/${ext};base64,${buf}`;
    const p = path.join(instancesDir, name, 'instance.json');
    if (fs.existsSync(p)) {
        const m = JSON.parse(fs.readFileSync(p, 'utf-8'));
        m.modpackBanner = dataUrl;
        fs.writeFileSync(p, JSON.stringify(m, null, 2));
    }
    return { ok: true, banner: dataUrl };
});

// ================= FILE MANAGER =================
function safeJoinInstance(instanceName, rel) {
    const instDir = path.join(instancesDir, instanceName);
    const target = path.join(instDir, rel || '');
    const normInst = path.resolve(instDir);
    const normTarget = path.resolve(target);
    if (!normTarget.startsWith(normInst)) throw new Error('Path outside instance');
    return normTarget;
}
ipcMain.handle('file-list', (e, { instanceName, rel }) => {
    try {
        const dir = safeJoinInstance(instanceName, rel);
        if (!fs.existsSync(dir)) return { ok: true, entries: [], path: rel || '' };
        if (!fs.statSync(dir).isDirectory()) return { ok: false, error: 'Not a directory' };
        const entries = fs.readdirSync(dir).map(name => { const full = path.join(dir, name); const st = fs.statSync(full); return { name, isDir: st.isDirectory(), size: st.size, mtime: st.mtimeMs }; }).sort((a, b) => { if (a.isDir !== b.isDir) return a.isDir ? -1 : 1; return a.name.localeCompare(b.name); });
        return { ok: true, entries, path: rel || '' };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('file-read', (e, { instanceName, rel, maxBytes = 1024 * 1024 }) => {
    try {
        const full = safeJoinInstance(instanceName, rel);
        if (!fs.existsSync(full)) return { ok: false, error: 'Not found' };
        const st = fs.statSync(full);
        if (st.isDirectory()) return { ok: false, error: 'Is dir' };
        if (st.size > maxBytes) return { ok: false, error: 'Too large' };
        const ext = path.extname(full).toLowerCase();
        if (['.jar', '.zip', '.png', '.jpg', '.jpeg', '.gif', '.ogg', '.mp3', '.wav', '.dat', '.nbt'].includes(ext)) return { ok: false, error: 'Binary' };
        return { ok: true, content: fs.readFileSync(full, 'utf-8'), ext };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('file-delete', (e, { instanceName, rel }) => {
    try {
        const full = safeJoinInstance(instanceName, rel);
        if (!fs.existsSync(full)) return { ok: false, error: 'Not found' };
        const st = fs.statSync(full);
        if (st.isDirectory()) fs.rmSync(full, { recursive: true, force: true }); else fs.unlinkSync(full);
        return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('file-rename', (e, { instanceName, rel, newName }) => {
    try {
        const full = safeJoinInstance(instanceName, rel);
        if (!fs.existsSync(full)) return { ok: false, error: 'Not found' };
        if (!newName || newName.includes('/') || newName.includes('\\')) return { ok: false, error: 'Invalid' };
        const dest = path.join(path.dirname(full), newName);
        if (fs.existsSync(dest)) return { ok: false, error: 'Exists' };
        fs.renameSync(full, dest);
        return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('file-mkdir', (e, { instanceName, rel, name }) => {
    try {
        const parent = safeJoinInstance(instanceName, rel);
        if (!name || name.includes('/') || name.includes('\\')) return { ok: false, error: 'Invalid' };
        fs.mkdirSync(path.join(parent, name), { recursive: true });
        return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('file-write', (e, { instanceName, rel, content }) => {
    try { fs.writeFileSync(safeJoinInstance(instanceName, rel), content, 'utf-8'); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('file-import', async (e, { instanceName, rel, files }) => {
    try {
        const dir = safeJoinInstance(instanceName, rel);
        fs.mkdirSync(dir, { recursive: true });
        let added = 0;
        for (const src of files) {
            let final = path.join(dir, path.basename(src));
            if (fs.existsSync(final)) { const ext = path.extname(src); const base = path.basename(src, ext); let n = 1; while (fs.existsSync(final)) { final = path.join(dir, `${base}-${n}${ext}`); n++; } }
            fs.copyFileSync(src, final); added++;
        }
        return { ok: true, added };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('file-pick', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] }); if (r.canceled) return []; return r.filePaths; });

// ================= MODS =================
ipcMain.handle('list-mods', (e, name) => {
    const d = path.join(instancesDir, name, 'mods');
    if (!fs.existsSync(d)) return [];
    return fs.readdirSync(d).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled')).map(f => ({ file: f, name: f.replace(/\.jar(\.disabled)?$/, ''), enabled: f.endsWith('.jar'), size: fs.statSync(path.join(d, f)).size })).sort((a, b) => a.name.localeCompare(b.name));
});
ipcMain.handle('toggle-mod', (e, { instanceName, file }) => {
    const full = path.join(instancesDir, instanceName, 'mods', file);
    if (!fs.existsSync(full)) return { ok: false };
    if (file.endsWith('.disabled')) fs.renameSync(full, full.replace(/\.disabled$/, '')); else fs.renameSync(full, full + '.disabled');
    return { ok: true };
});
ipcMain.handle('delete-mod', (e, { instanceName, file }) => {
    const full = path.join(instancesDir, instanceName, 'mods', file);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    return { ok: true };
});
ipcMain.handle('add-mods', async (e, { instanceName, files }) => {
    try {
        const d = path.join(instancesDir, instanceName, 'mods'); fs.mkdirSync(d, { recursive: true });
        let added = 0, skipped = 0;
        for (const src of files) {
            if (!src.toLowerCase().endsWith('.jar')) { skipped++; continue; }
            let dest = path.join(d, path.basename(src));
            if (fs.existsSync(dest)) { const base = path.basename(src, '.jar'); let n = 1, final = dest; while (fs.existsSync(final)) { final = path.join(d, `${base}-${n}.jar`); n++; } dest = final; }
            fs.copyFileSync(src, dest); added++;
        }
        return { ok: true, added, skipped };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('pick-mods', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Mod', extensions: ['jar'] }] }); if (r.canceled) return []; return r.filePaths; });
ipcMain.handle('list-folder', (e, { instanceName, sub }) => {
    const p = path.join(instancesDir, instanceName, sub);
    if (!fs.existsSync(p)) return [];
    return fs.readdirSync(p).map(f => { const full = path.join(p, f); const st = fs.statSync(full); return { name: f, isDir: st.isDirectory(), size: st.size, mtime: st.mtimeMs }; });
});

// ================= COPY / EXPORT =================
ipcMain.handle('copy-instance', async (e, { name, newName, copyOptions }) => {
    try {
        const src = path.join(instancesDir, name); const dst = path.join(instancesDir, newName);
        if (fs.existsSync(dst)) throw new Error('Exists');
        fs.mkdirSync(dst, { recursive: true });
        const skip = [];
        if (!copyOptions.mods) skip.push('mods');
        if (!copyOptions.saves) skip.push('saves');
        if (!copyOptions.resourcepacks) skip.push('resourcepacks');
        if (!copyOptions.shaderpacks) skip.push('shaderpacks');
        if (!copyOptions.screenshots) skip.push('screenshots');
        const copyRec = (s, d) => {
            for (const f of fs.readdirSync(s)) {
                if (skip.includes(f) && s === src) continue;
                const sp = path.join(s, f); const dp = path.join(d, f);
                const st = fs.statSync(sp);
                if (st.isDirectory()) { fs.mkdirSync(dp, { recursive: true }); copyRec(sp, dp); } else fs.copyFileSync(sp, dp);
            }
        };
        copyRec(src, dst);
        const mp = path.join(dst, 'instance.json');
        if (fs.existsSync(mp)) { const m = JSON.parse(fs.readFileSync(mp, 'utf-8')); m.name = newName; fs.writeFileSync(mp, JSON.stringify(m, null, 2)); }
        return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('export-instance', async (e, name) => {
    try {
        const src = path.join(instancesDir, name);
        if (!fs.existsSync(src)) throw new Error('Not found');
        const save = await dialog.showSaveDialog(win, { defaultPath: `${name}.zip`, filters: [{ name: 'Zip', extensions: ['zip'] }] });
        if (save.canceled) return { ok: false };
        const zip = new AdmZip(); zip.addLocalFolder(src); zip.writeZip(save.filePath);
        return { ok: true, path: save.filePath };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('export-mrpack', async (e, { name, meta: extraMeta }) => {
    try {
        const instDir = path.join(instancesDir, name); const meta = instMeta(instDir);
        if (!meta) throw new Error('Not found');
        const save = await dialog.showSaveDialog(win, { defaultPath: `${name}.mrpack`, filters: [{ name: 'Modrinth', extensions: ['mrpack'] }] });
        if (save.canceled) return { ok: false };
        const zip = new AdmZip(); const files = [];
        const modsDir = path.join(instDir, 'mods');
        if (fs.existsSync(modsDir)) for (const f of fs.readdirSync(modsDir)) {
            if (!f.endsWith('.jar')) continue;
            const buf = fs.readFileSync(path.join(modsDir, f));
            files.push({ path: `mods/${f}`, hashes: { sha512: crypto.createHash('sha512').update(buf).digest('hex') }, downloads: [], fileSize: buf.length });
            zip.addFile(`overrides/mods/${f}`, buf);
        }
        for (const d of ['config', 'defaultconfigs', 'kubejs', 'scripts', 'resourcepacks', 'shaderpacks']) {
            const p = path.join(instDir, d);
            if (fs.existsSync(p)) zip.addLocalFolder(p, `overrides/${d}`);
        }
        if (extraMeta) {
            if (extraMeta.description) fs.writeFileSync(path.join(userData, 'tmp-desc.txt'), extraMeta.description);
            if (extraMeta.banner) {
                const base64Data = extraMeta.banner.replace(/^data:image\/\w+;base64,/, '');
                zip.addFile('overrides/banner.png', Buffer.from(base64Data, 'base64'));
            }
        }
        const index = {
            formatVersion: 1, game: 'minecraft',
            versionId: extraMeta?.version || meta.modpackVersion || '1.0.0',
            name: extraMeta?.title || meta.name || name,
            summary: extraMeta?.description || 'Exported from BetterImgLauncher',
            author: extraMeta?.author || meta.author || '',
            files,
            dependencies: meta.dependencies
        };
        zip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(index, null, 2)));
        zip.writeZip(save.filePath);
        return { ok: true, path: save.filePath };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= IMPORT =================
async function importMrpackFromPath(zipPath, instanceName) {
    const instDir = path.join(instancesDir, instanceName);
    const zip = new AdmZip(zipPath);
    const idx = zip.getEntry('modrinth.index.json');
    if (!idx) throw new Error('No index');
    const index = JSON.parse(idx.getData().toString('utf-8'));
    fs.mkdirSync(instDir, { recursive: true });
    zip.getEntries().forEach(entry => {
        if (entry.entryName.startsWith('overrides/') && !entry.isDirectory) {
            const rel = entry.entryName.replace(/^overrides\//, '');
            const out = path.join(instDir, rel);
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, entry.getData());
        }
    });
    fs.mkdirSync(path.join(instDir, 'mods'), { recursive: true });
    let ok = 0, skip = 0, err = 0;
    for (const file of index.files) {
        if (file.env && file.env.client === 'unsupported') continue;
        const outPath = path.join(instDir, file.path);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        if (fs.existsSync(outPath)) { skip++; continue; }
        if (!file.downloads || !file.downloads.length) { skip++; continue; }
        try { await downloadFile(file.downloads[0], outPath); ok++; } catch { err++; }
    }
    let icon = null;
    for (const c of ['icon.png', 'pack.png']) { const p = path.join(instDir, c); if (fs.existsSync(p)) { icon = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); break; } }
    fs.writeFileSync(path.join(instDir, 'instance.json'), JSON.stringify({
        name: index.name, dependencies: index.dependencies,
        importedAt: new Date().toISOString(), icon, playTime: 0, lastPlayed: null,
        modpackVersion: index.versionId || '1.0.0',
        author: index.author || ''
    }, null, 2));
    const s = loadSettings();
    const cv = await ensureLoader({ dependencies: index.dependencies, javaPath: s.javaPath || '/usr/bin/java', gameDir: instDir, log: m => sendLog(m, 'loader') });
    return { index, customVersion: cv, icon, ok, skip, err };
}

ipcMain.handle('import-mrpack', async (e, { url, instanceName }) => {
    try {
        const tmp = path.join(userData, `tmp-${Date.now()}.mrpack`);
        await downloadFile(url, tmp, (done, total) => sendProgress({ kind: 'download', done, total, label: 'Downloading' }));
        const r = await importMrpackFromPath(tmp, instanceName);
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        return { ok: true, instanceDir: path.join(instancesDir, instanceName), customVersion: r.customVersion, icon: r.icon };
    } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('check-modpack-update', async (e, instanceName) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        const meta = instMeta(instDir);
        if (!meta || !meta.modpackProjectId) return { ok: false, error: 'Not a modpack' };
        const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${meta.modpackProjectId}/version`, modrinthHeaders());
        if (!versions.length) return { ok: false, error: 'No versions' };
        const latest = versions[0];
        return { ok: true, latest: { id: latest.id, version: latest.version_number, name: latest.name }, hasUpdate: latest.version_number !== meta.modpackVersion, current: meta.modpackVersion };
    } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('update-modpack', async (e, { instanceName, versionId }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        const meta = instMeta(instDir);
        if (!meta) throw new Error('Not found');
        if (loadSettings().autoBackup) await backupInstance(instanceName, 'pre-update');
        const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${meta.modpackProjectId}/version`, modrinthHeaders());
        const v = versions.find(x => x.id === versionId) || versions[0];
        const file = v.files.find(f => f.primary) || v.files[0];
        const tmp = path.join(userData, `tmp-upd-${Date.now()}.mrpack`);
        await downloadFile(file.url, tmp, null, modrinthHeaders());
        const zip = new AdmZip(tmp);
        const index = JSON.parse(zip.getEntry('modrinth.index.json').getData().toString('utf-8'));
        fs.mkdirSync(path.join(instDir, 'mods'), { recursive: true });
        let updated = 0;
        for (const f of index.files) {
            if (f.env && f.env.client === 'unsupported') continue;
            if (!f.path.startsWith('mods/')) continue;
            const out = path.join(instDir, f.path);
            if (!f.downloads || !f.downloads.length) continue;
            try { await downloadFile(f.downloads[0], out); updated++; } catch {}
        }
        zip.getEntries().forEach(entry => {
            if (entry.entryName.startsWith('overrides/config') && !entry.isDirectory) {
                const rel = entry.entryName.replace(/^overrides\//, '');
                const out = path.join(instDir, rel);
                fs.mkdirSync(path.dirname(out), { recursive: true });
                fs.writeFileSync(out, entry.getData());
            }
        });
        meta.modpackVersion = v.version_number;
        fs.writeFileSync(path.join(instDir, 'instance.json'), JSON.stringify(meta, null, 2));
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        return { ok: true, updated, version: v.version_number };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= BACKUPS =================
async function backupInstance(instanceName, tag = 'auto') {
    const src = path.join(instancesDir, instanceName);
    if (!fs.existsSync(src)) throw new Error('Not found');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const bd = path.join(backupsDir, instanceName);
    fs.mkdirSync(bd, { recursive: true });
    const zp = path.join(bd, `${tag}-${ts}.zip`);
    const zip = new AdmZip(); zip.addLocalFolder(src); zip.writeZip(zp);
    return zp;
}
ipcMain.handle('backup-instance', async (e, { instanceName, tag }) => {
    try { const p = await backupInstance(instanceName, tag || 'manual'); return { ok: true, path: p }; }
    catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('list-backups', (e, instanceName) => {
    const d = path.join(backupsDir, instanceName);
    if (!fs.existsSync(d)) return [];
    return fs.readdirSync(d).map(f => { const full = path.join(d, f); const st = fs.statSync(full); return { name: f, size: st.size, mtime: st.mtimeMs }; }).sort((a, b) => b.mtime - a.mtime);
});
ipcMain.handle('restore-backup', async (e, { instanceName, backupName }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        const bp = path.join(backupsDir, instanceName, backupName);
        if (!fs.existsSync(bp)) throw new Error('Not found');
        await backupInstance(instanceName, 'pre-restore');
        fs.rmSync(instDir, { recursive: true, force: true });
        fs.mkdirSync(instDir, { recursive: true });
        new AdmZip(bp).extractAllTo(instDir, true);
        return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('delete-backup', (e, { instanceName, backupName }) => {
    const p = path.join(backupsDir, instanceName, backupName);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return { ok: true };
});

// ================= CRASH ANALYZER =================
ipcMain.handle('analyze-crash', async (e, instanceName) => {
    try {
        const dir = path.join(instancesDir, instanceName, 'crash-reports');
        if (!fs.existsSync(dir)) return { ok: true, reports: [] };
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort().reverse().slice(0, 5);
        const reports = files.map(f => {
            const content = fs.readFileSync(path.join(dir, f), 'utf-8');
            const cm = content.match(/Caused by: ([^\n]+)/);
            const mm = content.match(/mod (\S+) ([^\n]+)/i);
            return { file: f, cause: cm ? cm[1] : 'Unknown', mod: mm ? `${mm[1]} ${mm[2]}` : null, preview: content.slice(0, 800) };
        });
        return { ok: true, reports };
    } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('resolve-moddeps', async (e, { projectId, versionId }) => {
    try {
        const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${projectId}/version`, modrinthHeaders());
        const v = versions.find(x => x.id === versionId) || versions[0];
        if (!v) return { ok: false, error: 'Not found' };
        const resolved = [];
        for (const d of (v.dependencies || [])) {
            if (!d.project_id) continue;
            try { const p = await fetchJSON(`https://api.modrinth.com/v2/project/${d.project_id}`, modrinthHeaders()); resolved.push({ projectId: d.project_id, title: p.title, icon: p.icon_url, type: d.dependency_type }); } catch {}
        }
        return { ok: true, dependencies: resolved };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= MOD CONFLICT DETECTOR =================
ipcMain.handle('detect-conflicts', async (e, instanceName) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        const meta = instMeta(instDir);
        const modsDir = path.join(instDir, 'mods');
        if (!fs.existsSync(modsDir)) return { ok: true, conflicts: [] };
        const installedMods = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar')).map(f => f.replace(/\.jar$/, ''));
        const conflicts = [];

        if (!meta || !meta.trackedMods) return { ok: true, conflicts: [] };

        for (const t of meta.trackedMods) {
            try {
                const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(t.projectId)}/version`, modrinthHeaders());
                const current = versions.find(v => v.id === t.versionId);
                if (!current) continue;
                const deps = current.dependencies || [];
                for (const dep of deps) {
                    if (!dep.project_id) continue;
                    try {
                        const depProject = await fetchJSON(`https://api.modrinth.com/v2/project/${dep.project_id}`, modrinthHeaders());
                        const depInstalled = installedMods.some(m => m.toLowerCase().includes(depProject.slug?.toLowerCase() || ''));
                        if (!depInstalled) {
                            conflicts.push({
                                type: 'missing',
                                mod: t.fileName,
                                dependency: depProject.title,
                                dependencyProjectId: dep.project_id,
                                dependencyVersionId: dep.version_id
                            });
                        }
                    } catch {}
                }
            } catch {}
        }

        const dupes = {};
        for (const m of installedMods) {
            const key = m.split('-')[0].toLowerCase().replace(/_/g, '');
            if (!dupes[key]) dupes[key] = [];
            dupes[key].push(m);
        }
        for (const [key, list] of Object.entries(dupes)) {
            if (list.length > 1) conflicts.push({ type: 'duplicate', mods: list });
        }

        return { ok: true, conflicts };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= TAGS =================
ipcMain.handle('set-instance-tags', (e, { name, tags }) => {
    const p = path.join(instancesDir, name, 'instance.json');
    if (!fs.existsSync(p)) return { ok: false };
    const m = JSON.parse(fs.readFileSync(p, 'utf-8'));
    m.tags = tags || [];
    fs.writeFileSync(p, JSON.stringify(m, null, 2));
    return { ok: true };
});

ipcMain.handle('get-all-tags', () => {
    if (!fs.existsSync(instancesDir)) return [];
    const tags = new Set();
    for (const name of fs.readdirSync(instancesDir)) {
        const m = instMeta(path.join(instancesDir, name));
        if (m && m.tags) m.tags.forEach(t => tags.add(t));
    }
    return Array.from(tags).sort();
});

// ================= THEMES =================
ipcMain.handle('export-theme', async (e, { name, theme }) => {
    try {
        const save = await dialog.showSaveDialog(win, { defaultPath: `${name}.theme.json`, filters: [{ name: 'Theme', extensions: ['theme.json', 'json'] }] });
        if (save.canceled) return { ok: false };
        fs.writeFileSync(save.filePath, JSON.stringify(theme, null, 2));
        return { ok: true, path: save.filePath };
    } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('import-theme', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Theme', extensions: ['json'] }] });
    if (r.canceled) return { ok: false };
    try {
        const data = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf-8'));
        return { ok: true, theme: data };
    } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('list-saved-themes', () => {
    if (!fs.existsSync(themesDir)) return [];
    return fs.readdirSync(themesDir).filter(f => f.endsWith('.json')).map(f => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(themesDir, f), 'utf-8'));
            return { file: f, name: data.name || f, ...data };
        } catch { return null; }
    }).filter(Boolean);
});

ipcMain.handle('save-theme', (e, { name, theme }) => {
    const file = path.join(themesDir, `${name.replace(/[^a-z0-9_-]/gi, '_')}.json`);
    fs.writeFileSync(file, JSON.stringify({ name, ...theme }, null, 2));
    return { ok: true, file };
});

ipcMain.handle('delete-theme', (e, fileName) => {
    const p = path.join(themesDir, fileName);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return { ok: true };
});

// ================= SCREENSHOT UPLOAD (0x0.st) =================
ipcMain.handle('upload-screenshot', async (e, { instanceName, name }) => {
    try {
        const p = path.join(instancesDir, instanceName, 'screenshots', name);
        if (!fs.existsSync(p)) throw new Error('Not found');
        const buf = fs.readFileSync(p);
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', buf, { filename: name });
        const res = await fetch('https://0x0.st', {
            method: 'POST',
            headers: { 'User-Agent': 'BetterImgLauncher/1.0.4', ...form.getHeaders() },
            body: form
        });
        const url = (await res.text()).trim();
        if (!url.startsWith('http')) throw new Error('Upload failed: ' + url);
        return { ok: true, url };
    } catch (err) { return { ok: false, error: err.message }; }
});



ipcMain.handle('open-external', (e, url) => { shell.openExternal(url); return { ok: true }; });

// ================= MODRINTH =================
function modrinthHeaders() {
    const s = loadSettings();
    const h = { 'User-Agent': 'BetterImgLauncher/1.0.4' };
    if (s.modrinthToken && s.modrinthToken.trim()) h['Authorization'] = s.modrinthToken.trim();
    return h;
}
ipcMain.handle('modrinth-search', async (e, { query, projectType, gameVersion, loader, offset, limit }) => {
    try {
        const params = new URLSearchParams();
        if (query) params.set('query', query);
        if (offset) params.set('offset', String(offset));
        if (limit) params.set('limit', String(limit));
        const f = [];
        if (projectType) f.push([`project_type:${projectType}`]);
        if (gameVersion) f.push([`versions:${gameVersion}`]);
        if (loader && loader !== 'vanilla') f.push([`categories:${loader}`]);
        if (f.length) params.set('facets', JSON.stringify(f));
        const data = await fetchJSON(`https://api.modrinth.com/v2/search?${params.toString()}`, modrinthHeaders());
        return { ok: true, hits: data.hits, total: data.total_hits };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('modrinth-install', async (e, { instanceName, projectId, projectType, gameVersion, loader }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        if (!fs.existsSync(instDir)) throw new Error('Not found');
        const params = new URLSearchParams();
        if (gameVersion) params.set('game_versions', JSON.stringify([gameVersion]));
        if (loader && loader !== 'vanilla') params.set('loaders', JSON.stringify([loader]));
        else if (projectType === 'resourcepack') params.set('loaders', JSON.stringify(['minecraft']));
        const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version?${params.toString()}`, modrinthHeaders());
        if (!versions.length) throw new Error('No versions');
        const v = versions[0]; const file = v.files.find(f => f.primary) || v.files[0];
        let sub = 'mods';
        if (projectType === 'resourcepack') sub = 'resourcepacks';
        else if (projectType === 'shader') sub = 'shaderpacks';
        const td = path.join(instDir, sub); fs.mkdirSync(td, { recursive: true });
        await downloadFile(file.url, path.join(td, file.filename), null, modrinthHeaders());
        return { ok: true, file: file.filename, version: v.version_number };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('modrinth-get-project', async (e, id) => {
    try { return { ok: true, project: await fetchJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(id)}`, modrinthHeaders()) }; }
    catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('modrinth-get-full-project', async (e, id) => {
    try {
        const project = await fetchJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(id)}`, modrinthHeaders());
        let body = '';
        try { const res = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(id)}/body`, { headers: modrinthHeaders() }); if (res.ok) body = await res.text(); } catch {}
        return { ok: true, project, body };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('modrinth-get-all-versions', async (e, id) => {
    try { return { ok: true, versions: await fetchJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(id)}/version`, modrinthHeaders()) }; }
    catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('modrinth-install-version', async (e, { instanceName, projectId, versionId, projectType }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version`, modrinthHeaders());
        const v = versions.find(x => x.id === versionId) || versions[0];
        const file = v.files.find(f => f.primary) || v.files[0];
        let sub = 'mods';
        if (projectType === 'resourcepack') sub = 'resourcepacks';
        else if (projectType === 'shader') sub = 'shaderpacks';
        const td = path.join(instDir, sub); fs.mkdirSync(td, { recursive: true });
        await downloadFile(file.url, path.join(td, file.filename), null, modrinthHeaders());
        return { ok: true, file: file.filename, version: v.version_number };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('modrinth-install-modpack', async (e, { projectId, versionId, instanceName }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        if (fs.existsSync(instDir)) throw new Error('Exists');
        const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version`, modrinthHeaders());
        const v = versions.find(x => x.id === versionId) || versions[0];
        const file = v.files.find(f => f.primary) || v.files[0];
        const tmp = path.join(userData, `tmp-mp-${Date.now()}.mrpack`);
        await downloadFile(file.url, tmp, null, modrinthHeaders());
        const r = await importMrpackFromPath(tmp, instanceName);
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        const mp = path.join(instDir, 'instance.json');
        const m = JSON.parse(fs.readFileSync(mp, 'utf-8'));
        m.modpackProjectId = projectId;
        m.modpackVersion = v.version_number;
        fs.writeFileSync(mp, JSON.stringify(m, null, 2));
        return { ok: true, instanceName, customVersion: r.customVersion, icon: r.icon };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= VERSIONS =================
ipcMain.handle('get-mc-versions', async () => {
    try { const man = await fetchJSON('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'); return { ok: true, latest: man.latest, versions: man.versions.filter(v => v.type === 'release').map(v => ({ id: v.id, type: v.type, releaseTime: v.releaseTime })) }; }
    catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('get-fabric-versions', async (e, mc) => {
    try { const d = await fetchJSON(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mc)}`); return { ok: true, versions: d.map(v => v.loader.version) }; } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('get-quilt-versions', async (e, mc) => {
    try { const d = await fetchJSON(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mc)}`); return { ok: true, versions: d.map(v => v.loader.version) }; } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('get-forge-versions', async (e, mc) => {
    try {
        const d = await fetchJSON('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
        const vs = [];
        for (const [k, v] of Object.entries(d.promotions)) if (k.startsWith(mc + '-')) vs.push(v);
        return { ok: true, versions: Array.from(new Set(vs)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).reverse() };
    } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('get-neoforge-versions', async (e, mc) => {
    try {
        const [maj, min] = mc.split('.').map(Number);
        const prefix = `${maj}.${min}.`;
        const xml = await (await fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml')).text();
        const all = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1]);
        return { ok: true, versions: all.filter(v => v.startsWith(prefix)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).reverse() };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= CREATE INSTANCE =================
ipcMain.handle('create-instance', async (e, { name, mcVersion, loader, loaderVersion }) => {
    try {
        if (!name || !name.trim()) throw new Error('Name required');
        if (!mcVersion) throw new Error('MC required');
        const instDir = path.join(instancesDir, name);
        if (fs.existsSync(instDir)) throw new Error('Exists');
        fs.mkdirSync(instDir, { recursive: true });
        fs.mkdirSync(path.join(instDir, 'mods'), { recursive: true });
        const deps = { minecraft: mcVersion };
        if (loader && loader !== 'vanilla' && loaderVersion) {
            if (loader === 'fabric') deps['fabric-loader'] = loaderVersion;
            else if (loader === 'quilt') deps['quilt-loader'] = loaderVersion;
            else if (loader === 'forge') deps['forge'] = loaderVersion;
            else if (loader === 'neoforge') deps['neoforge'] = loaderVersion;
        }
        fs.writeFileSync(path.join(instDir, 'instance.json'), JSON.stringify({ name, dependencies: deps, importedAt: new Date().toISOString(), icon: null, playTime: 0, lastPlayed: null, manual: true, perInstance: {}, tags: [] }, null, 2));
        if (loader && loader !== 'vanilla' && loaderVersion) {
            const s = loadSettings();
            const cv = await ensureLoader({ dependencies: deps, javaPath: s.javaPath || '/usr/bin/java', gameDir: instDir, log: m => sendLog(m, 'loader') });
            return { ok: true, customVersion: cv };
        }
        return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= DISCORD RPC =================
async function initDiscordRpc() {
    const s = loadSettings();
    if (!s.discordRpc) return;
    let DiscordRPC;
    try { DiscordRPC = require('discord-rpc'); }
    catch { sendLog('discord-rpc not installed, RPC disabled', 'warn'); return; }
    try {
        discordRpc = new DiscordRPC.Client({ transport: 'ipc' });
        await discordRpc.login({ clientId: '1564258194958852237' });
        discordRpc.on('ready', () => {
            discordRpc.setActivity({ details: 'In launcher', state: 'BetterImgLauncher', startTimestamp: new Date(), largeImageKey: 'logo', largeImageText: 'BetterImgLauncher' });
        });
        sendLog('Discord RPC connected', 'success');
    } catch (err) {
        sendLog('Discord RPC failed: ' + err.message, 'warn');
        discordRpc = null;
    }
}
function updateRpcPlaying(name) {
    if (!discordRpc) return;
    try { discordRpc.setActivity({ details: `Playing ${name}`, state: 'Minecraft', startTimestamp: new Date(), largeImageKey: 'logo', largeImageText: 'BetterImgLauncher' }); } catch {}
}
function updateRpcIdle() {
    if (!discordRpc) return;
    try { discordRpc.setActivity({ details: 'In launcher', state: 'BetterImgLauncher', startTimestamp: new Date(), largeImageKey: 'logo', largeImageText: 'BetterImgLauncher' }); } catch {}
}

// ================= GLOBAL HOTKEY =================
function registerGlobalHotkey() {
    const s = loadSettings();
    if (!s.quickLaunchKey) return;
    try {
        if (globalHotkey) globalShortcut.unregister(globalHotkey);
        globalShortcut.register(s.quickLaunchKey, () => {
            if (win) { win.show(); win.webContents.send('quick-launch'); }
        });
        globalHotkey = s.quickLaunchKey;
        sendLog(`Hotkey registered: ${s.quickLaunchKey}`, 'info');
    } catch (err) { sendLog('Hotkey failed: ' + err.message, 'warn'); }
}
ipcMain.handle('reregister-hotkey', () => { registerGlobalHotkey(); return { ok: true }; });

// ================= LAUNCH =================
function runShell(cmd, cwd, env) {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd, env: { ...process.env, ...env } }, (err, stdout, stderr) => {
            if (stdout) sendLog(stdout, 'game');
            if (stderr) sendLog(stderr, 'warn');
            if (err) reject(err); else resolve();
        });
    });
}

ipcMain.handle('launch', async (e, { instanceName, nickname, ram, javaPath, extraJvmArgs, server, authlib }) => {
    try {
        if (currentGame) throw new Error('Game already running');

        const instDir = path.join(instancesDir, instanceName);
        const meta = instMeta(instDir);
        if (!meta) throw new Error('Instance not found');

        const storedSettings = loadSettings();

        if (storedSettings.autoBackup) {
            sendLog('Creating backup...', 'info');
            try { await backupInstance(instanceName, 'auto'); } catch (err) { sendLog('Backup failed: ' + err.message, 'warn'); }
        }

        const perInstance = meta.perInstance || {};
        const finalRam = perInstance.ram || ram || storedSettings.ram || 4096;
        const finalJava = perInstance.javaPath || javaPath || storedSettings.javaPath || '/usr/bin/java';
        const finalArgs = perInstance.extraJvmArgs || extraJvmArgs || storedSettings.extraJvmArgs || '';
        let finalServer = server || meta.server || perInstance.server;
        let serverAuthlibApi = null;

        if (finalServer) {
            const servers = loadServers();
            const found = servers.find(s => s.ip === finalServer);
            if (found && found.authlibApi) {
                serverAuthlibApi = found.authlibApi;
                sendLog(`Server requires authlib: ${serverAuthlibApi}`, 'info');
            }
        }

        sendLog(`Using Java: ${finalJava}`, 'info');

        let userName = nickname;
        let accessToken = 'offline';
        let uuid = '00000000000000000000000000000000';
        let javaAgentArg = null;

        let activeAuthlib = authlib;
        if (!activeAuthlib) {
            const profiles = loadProfiles();
            const active = profiles.find(p => p.active);
            if (active && active.type === 'authlib' && active.accessToken) {
                if (serverAuthlibApi && active.apiRoot !== serverAuthlibApi) {
                    const matching = profiles.find(p => p.type === 'authlib' && p.apiRoot === serverAuthlibApi && p.accessToken);
                    if (matching) activeAuthlib = matching;
                    else activeAuthlib = active;
                } else activeAuthlib = active;
            }
        }
        if (activeAuthlib && activeAuthlib.accessToken) {
            userName = activeAuthlib.name || nickname;
            accessToken = activeAuthlib.accessToken;
            uuid = activeAuthlib.uuid || uuid;
            const jar = await downloadAuthlib();
            javaAgentArg = `-javaagent:${jar}=${activeAuthlib.apiRoot}`;
        } else if (!userName) {
            const profiles = loadProfiles();
            const active = profiles.find(p => p.active);
            userName = active ? active.name : 'Player';
        }

        if (meta.preLaunchCmd) {
            await runShell(meta.preLaunchCmd, instDir, { INST_NAME: meta.name || instanceName, INST_ID: instanceName, INST_DIR: instDir }).catch(err => sendLog('Pre-launch: ' + err.message, 'warn'));
        }

        const customVersion = await ensureLoader({ dependencies: meta.dependencies, javaPath: finalJava, gameDir: instDir, log: m => sendLog(m, 'loader') });

        const launcher = new Client();
        const extraJVM = [];
        if (javaAgentArg) extraJVM.push(javaAgentArg);
        if (process.platform === 'darwin') extraJVM.push('-XstartOnFirstThread', '-Djava.awt.headless=false');
        if (finalArgs) extraJVM.push(...finalArgs.split(/\s+/).filter(Boolean));

        const opts = {
            authorization: { access_token: accessToken, client_token: 'offline', uuid, name: userName, user_properties: '{}', meta: { type: 'msa', demo: false } },
            root: instDir,
            version: { number: meta.dependencies.minecraft, type: 'release', custom: customVersion || undefined },
            memory: { max: `${finalRam}M`, min: '1024M' },
            customArgs: extraJVM,
            javaPath: finalJava,
            overrides: { detached: false }
        };
        if (finalServer) {
            const [host, port] = finalServer.split(':');
            opts.server = { host, port: port || '25565' };
        }

        const startedAt = Date.now();
        launcher.on('debug', m => sendLog('[debug] ' + m, 'debug'));
        launcher.on('data', m => { const t = m.toString(); sendLog(t, t.toLowerCase().includes('error') ? 'error' : 'game'); });
        launcher.on('progress', p => sendProgress({ kind: 'launch', done: p.task, total: p.total, label: p.type }));
        launcher.on('close', async code => {
            sendLog('Game closed, code ' + code, code === 0 ? 'success' : 'warn');
            notify('Minecraft closed', `Code ${code}`);
            if (win && !win.isDestroyed()) win.webContents.send('game-closed', code);
            const playMs = Date.now() - startedAt;
            try {
                const m2 = JSON.parse(fs.readFileSync(path.join(instDir, 'instance.json'), 'utf-8'));
                m2.playTime = (m2.playTime || 0) + playMs;
                m2.lastPlayed = Date.now();
                fs.writeFileSync(path.join(instDir, 'instance.json'), JSON.stringify(m2, null, 2));
            } catch {}
            const h = loadHistory();
            h.unshift({ instance: instanceName, endedAt: Date.now(), code, playMs });
            saveHistory(h);
            currentGame = null;
            updateRpcIdle();
            if (meta.postExitCmd) {
                runShell(meta.postExitCmd, instDir, { INST_NAME: meta.name || instanceName, INST_ID: instanceName, INST_DIR: instDir }).catch(() => {});
            }
        });

        sendLog(`Launching as "${userName}"...`, 'info');
        launcher.launch(opts);
        currentGame = { launcher, instanceName, startedAt };
        updateRpcPlaying(meta.name || instanceName);
        if (storedSettings.minimizeToTray && win) win.hide();
        return { ok: true };
    } catch (err) {
        sendLog('Launch error: ' + err.message, 'error');
        currentGame = null;
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('kill-game', () => {
    if (!currentGame) return { ok: false, error: 'Not running' };
    try { currentGame.launcher.kill(); currentGame = null; return { ok: true }; } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('is-game-running', () => !!currentGame);

ipcMain.handle('sys-info', () => ({
    platform: process.platform, arch: process.arch,
    totalMem: os.totalmem(), freeMem: os.freemem(),
    cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model,
    userData, instancesDir,
    launcherVersion: '1.0.4'
}));

// ================= MOD UPDATE TRACKING =================
ipcMain.handle('track-mod', (e, { instanceName, projectId, versionId, fileName, projectType }) => {
    const p = path.join(instancesDir, instanceName, 'instance.json');
    if (!fs.existsSync(p)) return { ok: false };
    const m = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (!m.trackedMods) m.trackedMods = [];
    m.trackedMods = m.trackedMods.filter(t => t.fileName !== fileName);
    m.trackedMods.push({ projectId, versionId, fileName, projectType, installedAt: Date.now() });
    fs.writeFileSync(p, JSON.stringify(m, null, 2));
    return { ok: true };
});

ipcMain.handle('check-mod-updates', async (e, instanceName) => {
    try {
        const p = path.join(instancesDir, instanceName, 'instance.json');
        if (!fs.existsSync(p)) return { ok: false, error: 'Not found' };
        const meta = JSON.parse(fs.readFileSync(p, 'utf-8'));
        const tracked = meta.trackedMods || [];
        if (!tracked.length) return { ok: true, updates: [] };
        const updates = [];
        for (const t of tracked) {
            try {
                const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(t.projectId)}/version`, modrinthHeaders());
                if (!versions.length) continue;
                const latest = versions[0];
                if (latest.id !== t.versionId) {
                    const file = latest.files.find(f => f.primary) || latest.files[0];
                    updates.push({ projectId: t.projectId, fileName: t.fileName, projectType: t.projectType || 'mod', currentVersion: t.versionId, latestVersion: latest.id, latestVersionNumber: latest.version_number, latestFileName: file.filename, downloadUrl: file.url });
                }
            } catch {}
        }
        return { ok: true, updates };
    } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('apply-mod-update', async (e, { instanceName, update }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        let sub = 'mods';
        if (update.projectType === 'resourcepack') sub = 'resourcepacks';
        else if (update.projectType === 'shader') sub = 'shaderpacks';
        const targetDir = path.join(instDir, sub);
        fs.mkdirSync(targetDir, { recursive: true });
        const oldPath = path.join(targetDir, update.fileName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        const newPath = path.join(targetDir, update.latestFileName);
        await downloadFile(update.downloadUrl, newPath, null, modrinthHeaders());
        const p = path.join(instDir, 'instance.json');
        const m = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (m.trackedMods) {
            const idx = m.trackedMods.findIndex(t => t.fileName === update.fileName);
            if (idx >= 0) { m.trackedMods[idx].fileName = update.latestFileName; m.trackedMods[idx].versionId = update.latestVersion; }
            fs.writeFileSync(p, JSON.stringify(m, null, 2));
        }
        return { ok: true, file: update.latestFileName };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= CHANGELOG =================
ipcMain.handle('get-modpack-changelog', async (e, { instanceName, versionId }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        const meta = instMeta(instDir);
        if (!meta || !meta.modpackProjectId) return { ok: false, error: 'Not a modpack' };
        const versions = await fetchJSON(`https://api.modrinth.com/v2/project/${meta.modpackProjectId}/version`, modrinthHeaders());
        const v = versions.find(x => x.id === versionId);
        if (!v) return { ok: false, error: 'Version not found' };
        return { ok: true, version: v.version_number, name: v.name, changelog: v.changelog || '', date: v.date_published };
    } catch (err) { return { ok: false, error: err.message }; }
});

// ================= SCREENSHOTS =================
ipcMain.handle('list-screenshots', (e, instanceName) => {
    const dir = path.join(instancesDir, instanceName, 'screenshots');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).map(f => {
        const full = path.join(dir, f);
        const st = fs.statSync(full);
        const buf = fs.readFileSync(full).toString('base64');
        const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
        return { name: f, size: st.size, mtime: st.mtimeMs, dataUrl: `data:image/${ext};base64,${buf}` };
    }).sort((a, b) => b.mtime - a.mtime);
});
ipcMain.handle('delete-screenshot', (e, { instanceName, name }) => {
    const p = path.join(instancesDir, instanceName, 'screenshots', name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return { ok: true };
});

ipcMain.handle('check-launcher-update', async () => {
    try {
        const res = await fetch('https://api.github.com/repos/pingvinoks/betterimglauncher/releases/latest', {
            headers: { 'User-Agent': 'BetterImgLauncher/1.0.4' }
        });
        if (!res.ok) return { ok: false, error: 'No releases found (' + res.status + ')' };
        const data = await res.json();

        // Вытаскиваем версию из тега: "1.0.3", "v1.0.3", "1.0.3release" -> "1.0.3"
        const tagMatch = (data.tag_name || '').match(/(\d+)\.(\d+)\.(\d+)/);
        if (!tagMatch) return { ok: false, error: 'Invalid tag: ' + data.tag_name };
        const latest = `${tagMatch[1]}.${tagMatch[2]}.${tagMatch[3]}`;
        const current = '1.0.4';

        // Числовое сравнение версий
        const cmp = (a, b) => {
            const pa = a.split('.').map(Number);
            const pb = b.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
                if (pa[i] > pb[i]) return 1;
                if (pa[i] < pb[i]) return -1;
            }
            return 0;
        };

        const hasUpdate = cmp(latest, current) > 0;
        return { ok: true, latest, current, hasUpdate, url: data.html_url, notes: data.body, tagName: data.tag_name };
    } catch (err) { return { ok: false, error: err.message }; }
});