const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const { Client } = require('minecraft-launcher-core');
const { ensureLoader } = require('./loader/install');

const userData = app.getPath('userData');
const instancesDir = path.join(userData, 'instances');
const settingsFile = path.join(userData, 'settings.json');
const historyFile = path.join(userData, 'history.json');
const profilesFile = path.join(userData, 'profiles.json');

if (!fs.existsSync(instancesDir)) fs.mkdirSync(instancesDir, { recursive: true });

let win;
let currentGame = null;

// ============================================================
// WINDOW
// ============================================================
function createWindow() {
    win = new BrowserWindow({
        width: 1240,
        height: 820,
        minWidth: 1024,
        minHeight: 680,
        backgroundColor: '#0a0a0f',
        title: 'BetterImgLauncher',
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 },
        vibrancy: 'under-window',
        visualEffectState: 'active',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ============================================================
// LOGGING
// ============================================================
function sendLog(msg, type = 'log') {
    if (win && !win.isDestroyed()) win.webContents.send('log', { msg, type, ts: Date.now() });
}
function sendProgress(p) {
    if (win && !win.isDestroyed()) win.webContents.send('progress', p);
}

// ============================================================
// SETTINGS
// ============================================================
function loadSettings() {
    if (!fs.existsSync(settingsFile)) {
        const def = {
            nickname: 'Player',
            ram: 4096,
            javaPath: '/usr/bin/java',
            instanceName: 'BetterImageFix',
            extraJvmArgs: '',
            language: 'en',
            modrinthToken: ''
        };
        fs.writeFileSync(settingsFile, JSON.stringify(def, null, 2));
        return def;
    }
    return { ...JSON.parse(fs.readFileSync(settingsFile, 'utf-8')) };
}

ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-settings', (e, s) => {
    fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2));
    return true;
});

// ============================================================
// HISTORY
// ============================================================
function loadHistory() {
    if (!fs.existsSync(historyFile)) return [];
    try { return JSON.parse(fs.readFileSync(historyFile, 'utf-8')); } catch { return []; }
}
function saveHistory(h) {
    fs.writeFileSync(historyFile, JSON.stringify(h.slice(0, 50), null, 2));
}
ipcMain.handle('get-history', () => loadHistory());

// ============================================================
// PROFILES (offline accounts)
// ============================================================
function loadProfiles() {
    if (!fs.existsSync(profilesFile)) {
        const def = [{ id: 'default', name: 'Player', active: true }];
        fs.writeFileSync(profilesFile, JSON.stringify(def, null, 2));
        return def;
    }
    try { return JSON.parse(fs.readFileSync(profilesFile, 'utf-8')); }
    catch { return [{ id: 'default', name: 'Player', active: true }]; }
}
function saveProfiles(p) {
    fs.writeFileSync(profilesFile, JSON.stringify(p, null, 2));
}

ipcMain.handle('list-profiles', () => loadProfiles());

ipcMain.handle('add-profile', (e, name) => {
    const profiles = loadProfiles();
    if (!name || !name.trim()) return { ok: false, error: 'Empty name' };
    if (profiles.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
        return { ok: false, error: 'Profile already exists' };
    }
    const id = 'p-' + Date.now();
    profiles.push({ id, name: name.trim(), active: profiles.length === 0 });
    saveProfiles(profiles);
    return { ok: true, id };
});

ipcMain.handle('set-active-profile', (e, id) => {
    const profiles = loadProfiles();
    profiles.forEach(p => p.active = p.id === id);
    saveProfiles(profiles);
    return { ok: true };
});

ipcMain.handle('delete-profile', (e, id) => {
    let profiles = loadProfiles().filter(p => p.id !== id);
    if (profiles.length && !profiles.some(p => p.active)) profiles[0].active = true;
    saveProfiles(profiles);
    return { ok: true };
});

ipcMain.handle('rename-profile', (e, { id, name }) => {
    if (!name || !name.trim()) return { ok: false, error: 'Empty name' };
    const profiles = loadProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return { ok: false, error: 'Not found' };
    p.name = name.trim();
    saveProfiles(profiles);
    return { ok: true };
});

// ============================================================
// JAVA PICKER
// ============================================================
ipcMain.handle('pick-java', async () => {
    const r = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [{ name: 'Java', extensions: ['*'] }]
    });
    if (r.canceled) return null;
    return r.filePaths[0];
});

// ============================================================
// DOWNLOAD HELPER
// ============================================================
async function downloadFile(url, dest, onProgress, headers = {}) {
    const res = await fetch(url, { redirect: 'follow', headers });
    if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
    const total = parseInt(res.headers.get('content-length') || '0', 10);
    let done = 0;
    const fileStream = fs.createWriteStream(dest);
    res.body.on('data', chunk => {
        done += chunk.length;
        if (onProgress) onProgress(done, total);
    });
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on('error', reject);
        fileStream.on('finish', resolve);
    });
}

async function fetchJSON(url, headers = {}) {
    const res = await fetch(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': 'BetterImgLauncher/1.4 (contact@example.com)',
            ...headers
        }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
}

// ============================================================
// INSTANCES
// ============================================================
function instMeta(instDir) {
    const p = path.join(instDir, 'instance.json');
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

function instSize(dir) {
    let total = 0;
    try {
        const walk = d => {
            for (const f of fs.readdirSync(d)) {
                const p = path.join(d, f);
                const st = fs.statSync(p);
                if (st.isDirectory()) walk(p);
                else total += st.size;
            }
        };
        walk(dir);
    } catch {}
    return total;
}

ipcMain.handle('list-instances', () => {
    if (!fs.existsSync(instancesDir)) return [];
    return fs.readdirSync(instancesDir)
        .map(name => {
            const dir = path.join(instancesDir, name);
            const m = instMeta(dir);
            if (!m) return null;
            return {
                name,
                displayName: m.name || name,
                mcVersion: m.dependencies?.minecraft,
                loader: Object.entries(m.dependencies || {})
                    .filter(([k]) => k !== 'minecraft')
                    .map(([k, v]) => `${k.replace('-loader', '')} ${v}`)[0] || 'vanilla',
                importedAt: m.importedAt,
                size: instSize(dir),
                icon: m.icon || null,
                lastPlayed: m.lastPlayed || null,
                playTime: m.playTime || 0
            };
        })
        .filter(Boolean);
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

// ============================================================
// MODS
// ============================================================
ipcMain.handle('list-mods', (e, instanceName) => {
    const modsDir = path.join(instancesDir, instanceName, 'mods');
    if (!fs.existsSync(modsDir)) return [];
    return fs.readdirSync(modsDir)
        .filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
        .map(f => ({
            file: f,
            name: f.replace(/\.jar(\.disabled)?$/, ''),
            enabled: f.endsWith('.jar'),
            size: fs.statSync(path.join(modsDir, f)).size
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle('toggle-mod', (e, { instanceName, file }) => {
    const modsDir = path.join(instancesDir, instanceName, 'mods');
    const full = path.join(modsDir, file);
    if (!fs.existsSync(full)) return { ok: false };
    if (file.endsWith('.disabled')) {
        fs.renameSync(full, full.replace(/\.disabled$/, ''));
    } else {
        fs.renameSync(full, full + '.disabled');
    }
    return { ok: true };
});

ipcMain.handle('delete-mod', (e, { instanceName, file }) => {
    const full = path.join(instancesDir, instanceName, 'mods', file);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    return { ok: true };
});

ipcMain.handle('add-mods', async (e, { instanceName, files }) => {
    try {
        const modsDir = path.join(instancesDir, instanceName, 'mods');
        fs.mkdirSync(modsDir, { recursive: true });

        let added = 0, skipped = 0;
        for (const src of files) {
            if (!src.toLowerCase().endsWith('.jar')) { skipped++; continue; }
            let dest = path.join(modsDir, path.basename(src));
            if (fs.existsSync(dest)) {
                const base = path.basename(src, '.jar');
                let n = 1, final = dest;
                while (fs.existsSync(final)) {
                    final = path.join(modsDir, `${base}-${n}.jar`);
                    n++;
                }
                dest = final;
            }
            fs.copyFileSync(src, dest);
            added++;
            sendLog(`Added mod: ${path.basename(dest)}`, 'success');
        }
        if (skipped) sendLog(`Skipped ${skipped} non-jar file(s)`, 'warn');
        sendLog(`Done: ${added} mod(s) added`, 'success');
        return { ok: true, added, skipped };
    } catch (err) {
        sendLog('Add mods error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('pick-mods', async () => {
    const r = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Minecraft Mod', extensions: ['jar'] }]
    });
    if (r.canceled) return [];
    return r.filePaths;
});

// ============================================================
// FOLDER LISTING
// ============================================================
ipcMain.handle('list-folder', (e, { instanceName, sub }) => {
    const p = path.join(instancesDir, instanceName, sub);
    if (!fs.existsSync(p)) return [];
    return fs.readdirSync(p).map(f => {
        const full = path.join(p, f);
        const st = fs.statSync(full);
        return { name: f, isDir: st.isDirectory(), size: st.size, mtime: st.mtimeMs };
    });
});

// ============================================================
// COPY / EXPORT
// ============================================================
ipcMain.handle('copy-instance', async (e, { name, newName, copyOptions }) => {
    try {
        const src = path.join(instancesDir, name);
        const dst = path.join(instancesDir, newName);
        if (fs.existsSync(dst)) throw new Error('Instance already exists');
        if (!fs.existsSync(src)) throw new Error('Source instance not found');

        sendLog(`Copying ${name} -> ${newName}...`, 'info');
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
                const sp = path.join(s, f);
                const dp = path.join(d, f);
                const st = fs.statSync(sp);
                if (st.isDirectory()) {
                    fs.mkdirSync(dp, { recursive: true });
                    copyRec(sp, dp);
                } else {
                    fs.copyFileSync(sp, dp);
                }
            }
        };
        copyRec(src, dst);

        const metaPath = path.join(dst, 'instance.json');
        if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            meta.name = newName;
            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        }
        sendLog(`Copied to ${newName} ✅`, 'success');
        return { ok: true };
    } catch (err) {
        sendLog('Copy error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('export-instance', async (e, name) => {
    try {
        const src = path.join(instancesDir, name);
        if (!fs.existsSync(src)) throw new Error('Instance not found');
        const save = await dialog.showSaveDialog(win, {
            defaultPath: `${name}.zip`,
            filters: [{ name: 'Zip', extensions: ['zip'] }]
        });
        if (save.canceled) return { ok: false };

        const zip = new AdmZip();
        zip.addLocalFolder(src);
        zip.writeZip(save.filePath);
        sendLog(`Exported to ${save.filePath} ✅`, 'success');
        return { ok: true, path: save.filePath };
    } catch (err) {
        sendLog('Export error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

// ============================================================
// IMPORT .mrpack
// ============================================================
ipcMain.handle('import-mrpack', async (e, { url, instanceName }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        const tmpZip = path.join(userData, `tmp-${Date.now()}.mrpack`);

        sendLog('Downloading .mrpack...', 'info');
        await downloadFile(url, tmpZip, (done, total) => {
            sendProgress({ kind: 'download', done, total, label: 'Downloading archive' });
        });

        sendLog('Extracting...', 'info');
        const zip = new AdmZip(tmpZip);
        const indexEntry = zip.getEntry('modrinth.index.json');
        if (!indexEntry) throw new Error('No modrinth.index.json in archive');
        const index = JSON.parse(indexEntry.getData().toString('utf-8'));

        const deps = index.dependencies || {};
        const loaderStr = Object.entries(deps).filter(([k]) => k !== 'minecraft').map(([k, v]) => `${k.replace('-loader', '')} ${v}`)[0] || 'vanilla';
        sendLog(`Pack: ${index.name} | MC ${deps.minecraft} | ${loaderStr}`, 'success');

        fs.mkdirSync(instDir, { recursive: true });

        sendLog('Extracting overrides...', 'info');
        zip.getEntries().forEach(entry => {
            if (entry.entryName.startsWith('overrides/') && !entry.isDirectory) {
                const rel = entry.entryName.replace(/^overrides\//, '');
                const out = path.join(instDir, rel);
                fs.mkdirSync(path.dirname(out), { recursive: true });
                fs.writeFileSync(out, entry.getData());
            }
        });

        const modsDir = path.join(instDir, 'mods');
        fs.mkdirSync(modsDir, { recursive: true });

        let i = 0;
        const totalFiles = index.files.length;
        let okCount = 0, skipCount = 0, errCount = 0;

        for (const file of index.files) {
            i++;
            if (file.env && file.env.client === 'unsupported') continue;
            const fileName = file.path.split('/').pop();
            const outPath = path.join(instDir, file.path);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });

            if (fs.existsSync(outPath)) {
                skipCount++;
                sendLog(`[${i}/${totalFiles}] exists: ${fileName}`, 'muted');
                continue;
            }

            sendLog(`[${i}/${totalFiles}] ${fileName}`, 'info');
            sendProgress({ kind: 'mods', done: i, total: totalFiles, label: fileName });
            try {
                await downloadFile(file.downloads[0], outPath);
                okCount++;
            } catch (err) {
                errCount++;
                sendLog(`!! Error: ${fileName} — ${err.message}`, 'error');
            }
        }

        const iconCandidates = ['icon.png', 'pack.png'];
        let icon = null;
        for (const c of iconCandidates) {
            const p = path.join(instDir, c);
            if (fs.existsSync(p)) {
                icon = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
                break;
            }
        }

        fs.writeFileSync(path.join(instDir, 'instance.json'), JSON.stringify({
            name: index.name,
            dependencies: index.dependencies,
            importedAt: new Date().toISOString(),
            icon,
            playTime: 0,
            lastPlayed: null
        }, null, 2));

        sendLog(`Done: ${okCount} downloaded, ${skipCount} skipped, ${errCount} errors`, 'success');

        sendLog('Installing loader...', 'info');
        const s = loadSettings();
        const customVersion = await ensureLoader({
            dependencies: index.dependencies,
            javaPath: s.javaPath || '/usr/bin/java',
            gameDir: instDir,
            log: m => sendLog(m, 'loader')
        });
        sendLog(`Loader ready: ${customVersion || 'vanilla'}`, 'success');

        if (fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip);
        return { ok: true, instanceDir: instDir, customVersion, icon };
    } catch (err) {
        sendLog('Import error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

// ============================================================
// REPAIR
// ============================================================
ipcMain.handle('repair-instance', async (e, { instanceName, url }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        if (!fs.existsSync(instDir)) throw new Error('Instance not found');
        const tmpZip = path.join(userData, `tmp-${Date.now()}.mrpack`);
        sendLog('Downloading .mrpack for verification...', 'info');
        await downloadFile(url, tmpZip);
        const zip = new AdmZip(tmpZip);
        const index = JSON.parse(zip.getEntry('modrinth.index.json').getData().toString('utf-8'));

        let missing = 0;
        for (const file of index.files) {
            const outPath = path.join(instDir, file.path);
            if (!fs.existsSync(outPath)) {
                missing++;
                sendLog(`Missing: ${file.path.split('/').pop()} — downloading`, 'warn');
                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                try { await downloadFile(file.downloads[0], outPath); }
                catch (err) { sendLog('!! ' + err.message, 'error'); }
            }
        }
        if (fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip);
        sendLog(missing ? `Restored ${missing} files` : 'All files present ✅', 'success');
        return { ok: true, missing };
    } catch (err) {
        sendLog('Repair error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

// ============================================================
// MC VERSION METADATA
// ============================================================
ipcMain.handle('get-mc-versions', async () => {
    try {
        const man = await fetchJSON('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
        return {
            ok: true,
            latest: man.latest,
            versions: man.versions
                .filter(v => v.type === 'release')
                .map(v => ({ id: v.id, type: v.type, releaseTime: v.releaseTime }))
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('get-fabric-versions', async (e, mcVersion) => {
    try {
        const data = await fetchJSON(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}`);
        return { ok: true, versions: data.map(v => v.loader.version) };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('get-quilt-versions', async (e, mcVersion) => {
    try {
        const data = await fetchJSON(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}`);
        return { ok: true, versions: data.map(v => v.loader.version) };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('get-forge-versions', async (e, mcVersion) => {
    try {
        const data = await fetchJSON('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
        const versions = [];
        for (const [k, v] of Object.entries(data.promotions)) {
            if (k.startsWith(mcVersion + '-')) versions.push(v);
        }
        const uniq = Array.from(new Set(versions)).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true });
        }).reverse();
        return { ok: true, versions: uniq };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('get-neoforge-versions', async (e, mcVersion) => {
    try {
        const [maj, min] = mcVersion.split('.').map(Number);
        const prefix = `${maj}.${min}.`;
        const xml = await (await fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml')).text();
        const all = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1]);
        const versions = all.filter(v => v.startsWith(prefix)).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true });
        }).reverse();
        return { ok: true, versions };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

// ============================================================
// CREATE INSTANCE
// ============================================================
ipcMain.handle('create-instance', async (e, { name, mcVersion, loader, loaderVersion }) => {
    try {
        if (!name || !name.trim()) throw new Error('Instance name is required');
        if (!mcVersion) throw new Error('MC version is required');

        const instDir = path.join(instancesDir, name);
        if (fs.existsSync(instDir)) throw new Error('Instance already exists');
        fs.mkdirSync(instDir, { recursive: true });
        fs.mkdirSync(path.join(instDir, 'mods'), { recursive: true });

        const dependencies = { minecraft: mcVersion };
        if (loader && loader !== 'vanilla' && loaderVersion) {
            if (loader === 'fabric') dependencies['fabric-loader'] = loaderVersion;
            else if (loader === 'quilt') dependencies['quilt-loader'] = loaderVersion;
            else if (loader === 'forge') dependencies['forge'] = loaderVersion;
            else if (loader === 'neoforge') dependencies['neoforge'] = loaderVersion;
        }

        fs.writeFileSync(path.join(instDir, 'instance.json'), JSON.stringify({
            name,
            dependencies,
            importedAt: new Date().toISOString(),
            icon: null,
            playTime: 0,
            lastPlayed: null,
            manual: true
        }, null, 2));

        sendLog(`Created instance "${name}" (${mcVersion} / ${loader} ${loaderVersion || ''})`, 'success');

        if (loader && loader !== 'vanilla' && loaderVersion) {
            sendLog('Installing loader...', 'info');
            const s = loadSettings();
            const cv = await ensureLoader({
                dependencies,
                javaPath: s.javaPath || '/usr/bin/java',
                gameDir: instDir,
                log: m => sendLog(m, 'loader')
            });
            sendLog(`Loader ready: ${cv}`, 'success');
        }
        return { ok: true };
    } catch (err) {
        sendLog('Create instance error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

// ============================================================
// MODRINTH API
// ============================================================
function modrinthHeaders() {
    const s = loadSettings();
    const headers = {
        'User-Agent': 'BetterImgLauncher/1.4 (contact@example.com)'
    };
    if (s.modrinthToken && s.modrinthToken.trim()) {
        headers['Authorization'] = s.modrinthToken.trim();
    }
    return headers;
}

ipcMain.handle('modrinth-search', async (e, { query, projectType, gameVersion, loader, offset, limit }) => {
    try {
        const params = new URLSearchParams();
        if (query) params.set('query', query);
        if (offset) params.set('offset', String(offset));
        if (limit) params.set('limit', String(limit));

        const facets = [];
        if (projectType) facets.push([`project_type:${projectType}`]);
        if (gameVersion) facets.push([`versions:${gameVersion}`]);
        if (loader && loader !== 'vanilla') facets.push([`categories:${loader}`]);
        if (facets.length) params.set('facets', JSON.stringify(facets));

        const url = `https://api.modrinth.com/v2/search?${params.toString()}`;
        sendLog(`Modrinth search: ${query || '(empty)'} [${projectType || 'any'}]`, 'info');
        const data = await fetchJSON(url, modrinthHeaders());
        return { ok: true, hits: data.hits, total: data.total_hits };
    } catch (err) {
        sendLog('Modrinth search error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('modrinth-get-versions', async (e, { projectId, gameVersion, loader, projectType }) => {
    try {
        const params = new URLSearchParams();
        if (gameVersion) params.set('game_versions', JSON.stringify([gameVersion]));
        if (loader && loader !== 'vanilla') params.set('loaders', JSON.stringify([loader]));
        else if (projectType === 'resourcepack') params.set('loaders', JSON.stringify(['minecraft']));

        const url = `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version?${params.toString()}`;
        const versions = await fetchJSON(url, modrinthHeaders());
        return { ok: true, versions };
    } catch (err) {
        sendLog('Modrinth versions error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('modrinth-install', async (e, { instanceName, projectId, projectType, gameVersion, loader }) => {
    try {
        const instDir = path.join(instancesDir, instanceName);
        if (!fs.existsSync(instDir)) throw new Error('Instance not found');

        // Получаем версии с фильтрами
        const params = new URLSearchParams();
        if (gameVersion) params.set('game_versions', JSON.stringify([gameVersion]));
        if (loader && loader !== 'vanilla') params.set('loaders', JSON.stringify([loader]));
        else if (projectType === 'resourcepack') params.set('loaders', JSON.stringify(['minecraft']));

        const url = `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version?${params.toString()}`;
        const versions = await fetchJSON(url, modrinthHeaders());

        if (!versions.length) throw new Error('No compatible versions found');

        const version = versions[0]; // берём самый новый
        const file = version.files.find(f => f.primary) || version.files[0];
        if (!file) throw new Error('No file in version');

        let subDir = 'mods';
        if (projectType === 'resourcepack') subDir = 'resourcepacks';
        else if (projectType === 'shader') subDir = 'shaderpacks';

        const targetDir = path.join(instDir, subDir);
        fs.mkdirSync(targetDir, { recursive: true });
        const dest = path.join(targetDir, file.filename);

        sendLog(`Downloading ${file.filename}...`, 'info');
        await downloadFile(file.url, dest, null, modrinthHeaders());
        sendLog(`Installed: ${file.filename}`, 'success');
        return { ok: true, file: file.filename, version: version.version_number };
    } catch (err) {
        sendLog('Modrinth install error: ' + err.message, 'error');
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('modrinth-get-project', async (e, projectId) => {
    try {
        const url = `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}`;
        const data = await fetchJSON(url, modrinthHeaders());
        return { ok: true, project: data };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

// ============================================================
// CUSTOM COMMANDS
// ============================================================
function runShell(cmd, cwd, env) {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(cmd, { cwd, env: { ...process.env, ...env } }, (err, stdout, stderr) => {
            if (stdout) sendLog(stdout, 'game');
            if (stderr) sendLog(stderr, 'warn');
            if (err) reject(err); else resolve();
        });
    });
}

// ============================================================
// LAUNCH
// ============================================================
ipcMain.handle('launch', async (e, { instanceName, nickname, ram, javaPath, extraJvmArgs, server }) => {
    try {
        if (currentGame) throw new Error('Game already running');

        if (!nickname) {
            const profiles = loadProfiles();
            const active = profiles.find(p => p.active);
            nickname = active ? active.name : 'Player';
        }

        const instDir = path.join(instancesDir, instanceName);
        const meta = instMeta(instDir);
        if (!meta) throw new Error('Instance not found');

        if (meta.preLaunchCmd) {
            sendLog('Running pre-launch command...', 'info');
            await runShell(meta.preLaunchCmd, instDir, {
                INST_NAME: meta.name || instanceName,
                INST_ID: instanceName,
                INST_DIR: instDir
            }).catch(err => sendLog('Pre-launch error: ' + err.message, 'warn'));
        }

        const customVersion = await ensureLoader({
            dependencies: meta.dependencies,
            javaPath: javaPath || '/usr/bin/java',
            gameDir: instDir,
            log: m => sendLog(m, 'loader')
        });

        const launcher = new Client();

        const extraJVM = process.platform === 'darwin'
            ? ['-XstartOnFirstThread', '-Djava.awt.headless=false']
            : [];
        if (extraJvmArgs) extraJVM.push(...extraJvmArgs.split(/\s+/).filter(Boolean));

        const opts = {
            authorization: {
                access_token: 'offline',
                client_token: 'offline',
                uuid: '00000000000000000000000000000000',
                name: nickname,
                user_properties: '{}',
                meta: { type: 'msa', demo: false }
            },
            root: instDir,
            version: {
                number: meta.dependencies.minecraft,
                type: 'release',
                custom: customVersion || undefined
            },
            memory: { max: `${ram}M`, min: '1024M' },
            customArgs: extraJVM,
            javaPath: javaPath || '/usr/bin/java',
            overrides: { detached: false }
        };

        if (server) {
            const [host, port] = server.split(':');
            opts.server = { host, port: port || '25565' };
        }

        const startedAt = Date.now();

        launcher.on('debug', m => sendLog('[debug] ' + m, 'debug'));
        launcher.on('data', m => {
            const text = m.toString();
            sendLog(text, text.toLowerCase().includes('error') ? 'error' : 'game');
        });
        launcher.on('progress', p => sendProgress({ kind: 'launch', done: p.task, total: p.total, label: p.type }));
        launcher.on('close', async code => {
            sendLog('Game closed, code ' + code, code === 0 ? 'success' : 'warn');
            if (win && !win.isDestroyed()) win.webContents.send('game-closed', code);

            const playMs = Date.now() - startedAt;
            try {
                const metaPath = path.join(instDir, 'instance.json');
                const m2 = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                m2.playTime = (m2.playTime || 0) + playMs;
                m2.lastPlayed = Date.now();
                fs.writeFileSync(metaPath, JSON.stringify(m2, null, 2));
            } catch {}

            const h = loadHistory();
            h.unshift({ instance: instanceName, endedAt: Date.now(), code, playMs });
            saveHistory(h);
            currentGame = null;

            if (meta.postExitCmd) {
                sendLog('Running post-exit command...', 'info');
                runShell(meta.postExitCmd, instDir, {
                    INST_NAME: meta.name || instanceName,
                    INST_ID: instanceName,
                    INST_DIR: instDir
                }).catch(err => sendLog('Post-exit error: ' + err.message, 'warn'));
            }
        });

        sendLog(`Launching as "${nickname}"...`, 'info');
        launcher.launch(opts);
        currentGame = { launcher, instanceName, startedAt };
        return { ok: true };
    } catch (err) {
        sendLog('Launch error: ' + err.message, 'error');
        currentGame = null;
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('kill-game', () => {
    if (!currentGame) return { ok: false, error: 'Game not running' };
    try {
        currentGame.launcher.kill();
        currentGame = null;
        sendLog('Game killed', 'warn');
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('is-game-running', () => !!currentGame);

// ============================================================
// SYSTEM INFO
// ============================================================
ipcMain.handle('sys-info', () => ({
    platform: process.platform,
    arch: process.arch,
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model,
    userData,
    instancesDir
}));