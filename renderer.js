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

// ============ TOAST ============
function toast(msg, type = '') {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.className = 'toast ' + type, 2500);
}

// ============ RIPPLE ============
function attachRipple() {
    document.querySelectorAll('button').forEach(btn => {
        if (btn.dataset.rippleAttached) return;
        btn.dataset.rippleAttached = '1';
        btn.addEventListener('click', function (e) {
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
    });
}
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
    toast(`Game closed (code ${code})`, code === 0 ? 'success' : 'error');
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
        if (btn.dataset.tab === 'files') { refreshFilesInstances(); }
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
        toast('Theme applied', 'success');
    });
});

// ============ SETTINGS ============
if ($('pickJava')) $('pickJava').addEventListener('click', async () => {
    const p = await window.api.pickJava();
    if (p) $('javaPath').value = p;
});
if ($('ram')) $('ram').addEventListener('input', e => { $('ramLabel').textContent = `${e.target.value} MB`; });
document.querySelectorAll('.ram-presets .chip').forEach(b => {
    b.addEventListener('click', () => { $('ram').value = b.dataset.ram; $('ramLabel').textContent = `${b.dataset.ram} MB`; });
});
if ($('saveSettings')) $('saveSettings').addEventListener('click', async () => {
    await window.api.saveSettings({
        nickname: settings?.nickname || 'Player',
        ram: parseInt($('ram').value, 10) || 4096,
        javaPath: $('javaPath').value,
        instanceName: $('instanceName')?.value || 'BetterImageFix',
        extraJvmArgs: $('extraJvmArgs').value,
        language: 'en',
        modrinthToken: $('modrinthToken')?.value || '',
        authlibApi: $('authlibApi')?.value || 'https://account.ely.by/api/authlib-injector',
        theme: document.body.getAttribute('data-theme') || 'm3-dark'
    });
    settings = await window.api.getSettings();
    toast('Settings saved', 'success');
});

// ============ JAVA ============
if ($('detectJavaBtn')) $('detectJavaBtn').addEventListener('click', async () => {
    $('detectJavaBtn').disabled = true;
    $('detectJavaBtn').textContent = 'Scanning...';
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
            b.addEventListener('click', () => { $('javaPath').value = b.dataset.java; toast('Java selected', 'success'); });
        });
    }
    $('detectJavaBtn').disabled = false;
    $('detectJavaBtn').innerHTML = '<span class="material-symbols-rounded">search</span> Auto-detect Java';
    toast(`Found ${list.length} Java(s)`, list.length ? 'success' : 'warn');
});

// ============ AUTHLIB ============
if ($('authlibLoginBtn')) $('authlibLoginBtn').addEventListener('click', async () => {
    const apiRoot = $('authlibApi').value.trim();
    const username = $('authlibUser').value.trim();
    const password = $('authlibPass').value;
    if (!apiRoot || !username || !password) return toast('Fill API Root, Username, Password', 'error');
    $('authlibLoginBtn').disabled = true;
    $('authlibStatus').textContent = 'Logging in...';
    const r = await window.api.authlibLogin({ apiRoot, username, password });
    if (r.ok) {
        const save = await window.api.saveAuthlibProfile(r);
        if (save.ok) {
            $('authlibStatus').textContent = `✓ Logged in as ${r.name} (saved)`;
            $('authlibStatus').style.color = 'var(--success)';
            toast('Authlib account saved', 'success');
            await refreshProfiles();
        } else {
            toast('Failed to save account: ' + save.error, 'error');
        }
    } else {
        $('authlibStatus').textContent = '✗ ' + r.error;
        $('authlibStatus').style.color = 'var(--error)';
        toast('Login failed', 'error');
    }
    $('authlibLoginBtn').disabled = false;
});

// ============ PROFILES ============
async function refreshProfiles() {
    profiles = await window.api.listProfiles();
    const active = profiles.find(p => p.active) || profiles[0];
    const sel = $('profileSelect');
    if (sel) sel.innerHTML = profiles.map(p =>
        `<option value="${p.id}" ${p.id === active?.id ? 'selected' : ''}>${p.name}${p.type === 'authlib' ? ` (${p.service})` : ''}</option>`
    ).join('');
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
        <button data-use="${p.id}">${p.active ? '✓ Active' : 'Use'}</button>
        <button data-rename="${p.id}">Rename</button>
        <button data-del="${p.id}" style="color:var(--error)">✕</button>
      </div>
    </div>
  `).join('');

    list.querySelectorAll('button').forEach(attachRippleTo);
    list.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', async () => {
        await window.api.setActiveProfile(b.dataset.use);
        await refreshProfiles();
        toast('Profile switched', 'success');
    }));
    list.querySelectorAll('[data-rename]').forEach(b => b.addEventListener('click', async () => {
        const p = profiles.find(x => x.id === b.dataset.rename);
        const newName = prompt('New nickname:', p.name);
        if (!newName) return;
        const r = await window.api.renameProfile({ id: p.id, name: newName });
        if (r.ok) { await refreshProfiles(); toast('Renamed', 'success'); }
        else toast(r.error, 'error');
    }));
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
        if (profiles.length <= 1) return toast('Cannot delete last profile', 'error');
        if (!confirm('Delete this profile?')) return;
        await window.api.deleteProfile(b.dataset.del);
        await refreshProfiles();
        toast('Profile deleted', 'warn');
    }));
}
if ($('profileSelect')) $('profileSelect').addEventListener('change', async e => {
    await window.api.setActiveProfile(e.target.value);
    await refreshProfiles();
    toast('Profile switched', 'success');
});
if ($('addProfileBtn')) $('addProfileBtn').addEventListener('click', async () => {
    const name = $('newProfileName').value.trim();
    if (!name) return toast('Enter a nickname', 'error');
    const r = await window.api.addProfile(name);
    if (!r.ok) return toast(r.error, 'error');
    $('newProfileName').value = '';
    await refreshProfiles();
    toast('Profile added', 'success');
});

// ============ INSTANCES ============
async function refreshInstances() {
    instances = await window.api.listInstances();
    const grid = $('instanceGrid');
    const empty = $('emptyLib');
    if (!grid) return;
    if (instances.length === 0) { grid.innerHTML = ''; if (empty) empty.style.display = 'flex'; return; }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = instances.map(inst => {
        const icon = inst.icon
            ? `<div class="instance-icon"><img src="${inst.icon}" /></div>`
            : `<div class="instance-icon">${(inst.displayName || inst.name)[0].toUpperCase()}</div>`;
        const sizeMB = (inst.size / 1024 / 1024).toFixed(0);
        const playMin = inst.playTime ? Math.floor(inst.playTime / 60000) : 0;
        return `<div class="instance-card" data-instance="${inst.name}">
      <div class="instance-head">${icon}<div><div class="instance-name">${inst.displayName || inst.name}</div><div class="instance-loader">${inst.loader}</div></div></div>
      <div class="instance-meta">
        <span class="meta-badge">MC ${inst.mcVersion}</span>
        <span class="meta-badge">${sizeMB} MB</span>
        ${playMin ? `<span class="meta-badge">${playMin} min</span>` : ''}
      </div>
      <div class="instance-actions">
        <button class="play-btn" data-play="${inst.name}">▶ Play</button>
        <button data-edit="${inst.name}" data-tooltip="Edit"><span class="material-symbols-rounded">edit</span></button>
        <button data-folder="${inst.name}" data-tooltip="Open folder"><span class="material-symbols-rounded">folder_open</span></button>
      </div>
    </div>`;
    }).join('');

    grid.querySelectorAll('button').forEach(attachRippleTo);
    grid.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', async e => {
        e.stopPropagation();
        const name = b.dataset.play;
        const s = settings || await window.api.getSettings();
        b.disabled = true;
        b.textContent = 'Starting...';
        const r = await window.api.launch({
            instanceName: name, nickname: null, ram: s.ram,
            javaPath: s.javaPath, extraJvmArgs: s.extraJvmArgs, authlib: authlibSession
        });
        b.disabled = false;
        b.textContent = '▶ Play';
        if (r.ok) toast('Launching...', 'success');
        else toast('Error: ' + r.error, 'error');
    }));
    grid.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        openInstanceModal(b.dataset.edit);
    }));
    grid.querySelectorAll('[data-folder]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        window.api.openInstanceFolder({ name: b.dataset.folder, sub: '' });
    }));

    refreshHome();
    refreshDiscoverInstances();
    refreshFilesInstances();
}
if ($('refreshInstances')) $('refreshInstances').addEventListener('click', refreshInstances);
if ($('openInstances')) $('openInstances').addEventListener('click', () => window.api.openInstances());

// ============ HOME ============
async function refreshHome() {
    if (!instances || !instances.length) {
        if ($('lastPlayedCard')) $('lastPlayedCard').innerHTML = '<div class="hint">No instances yet. Create one to get started.</div>';
        return;
    }
    const last = [...instances].filter(i => i.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed)[0] || instances[0];
    if ($('lastPlayedCard')) {
        $('lastPlayedCard').innerHTML = `
      <div class="instance-head" style="margin-bottom:12px">
        <div class="instance-icon">${(last.displayName || last.name)[0].toUpperCase()}</div>
        <div><div class="instance-name">${last.displayName || last.name}</div><div class="instance-loader">${last.loader} · MC ${last.mcVersion}</div></div>
      </div>
      <button class="filled-btn" id="homePlayBtn">▶ Launch</button>
    `;
        const btn = $('homePlayBtn');
        attachRippleTo(btn);
        btn?.addEventListener('click', async () => {
            const s = settings || await window.api.getSettings();
            const r = await window.api.launch({
                instanceName: last.name, nickname: null, ram: s.ram,
                javaPath: s.javaPath, extraJvmArgs: s.extraJvmArgs, authlib: authlibSession
            });
            if (r.ok) toast('Launching...', 'success');
            else toast('Error: ' + r.error, 'error');
        });
    }
    try {
        const info = await window.api.sysInfo();
        if ($('homePlatform')) $('homePlatform').textContent = info.platform;
    } catch {}
}

// ============ DISCOVER ============
async function refreshDiscoverInstances() {
    const sel = $('discoverInstance');
    if (!sel) return;
    const list = await window.api.listInstances();
    sel.innerHTML = '<option value="">Select instance</option>' +
        list.map(i => `<option value="${i.name}">${i.displayName} (${i.mcVersion})</option>`).join('');
}
async function populateDiscoverMcVersions() {
    const sel = $('discoverMcVersion');
    if (!sel || sel.options.length > 1) return;
    const r = await window.api.getMcVersions();
    if (!r.ok) return;
    sel.innerHTML = '<option value="">Any MC version</option>' +
        r.versions.slice(0, 60).map(v => `<option value="${v.id}">${v.id}</option>`).join('');
}
async function runDiscoverSearch() {
    const query = $('discoverQuery')?.value.trim() || '';
    const type = $('discoverType')?.value || 'mod';
    const mc = $('discoverMcVersion')?.value || '';
    const loader = $('discoverLoader')?.value || '';
    const resultsEl = $('discoverResults');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="hint">Searching...</div>';
    const r = await window.api.modrinthSearch({ query, projectType: type, gameVersion: mc, loader, limit: 20, offset: 0 });
    if (!r.ok) { resultsEl.innerHTML = `<div class="hint" style="color:var(--error)">Error: ${r.error}</div>`; return; }
    if (!r.hits || !r.hits.length) { resultsEl.innerHTML = '<div class="hint">No results.</div>'; return; }

    resultsEl.innerHTML = r.hits.map(hit => {
        const icon = hit.icon_url ? `<img src="${hit.icon_url}" />` : '?';
        return `<div class="discover-card">
      <div class="discover-icon">${icon}</div>
      <div class="discover-body">
        <div class="discover-title">${hit.title}</div>
        <div class="discover-desc">${hit.description || ''}</div>
        <div class="discover-meta">
          <span class="meta-badge">${(hit.downloads || 0).toLocaleString()} dl</span>
          ${(hit.categories || []).slice(0, 2).map(c => `<span class="meta-badge">${c}</span>`).join('')}
        </div>
        <div class="discover-actions">
          <button data-install="${hit.project_id}" data-type="${hit.project_type}">Install</button>
        </div>
      </div>
    </div>`;
    }).join('');

    resultsEl.querySelectorAll('button').forEach(attachRippleTo);
    resultsEl.querySelectorAll('[data-install]').forEach(b => {
        b.addEventListener('click', async () => {
            const instance = $('discoverInstance')?.value;
            if (!instance) return toast('Select an instance first', 'error');
            b.disabled = true;
            b.textContent = 'Installing...';
            const res = await window.api.modrinthInstall({
                instanceName: instance,
                projectId: b.dataset.install,
                projectType: b.dataset.type,
                gameVersion: $('discoverMcVersion')?.value || '',
                loader: $('discoverLoader')?.value || ''
            });
            b.disabled = false;
            b.textContent = 'Install';
            if (res.ok) toast(`Installed: ${res.file}`, 'success');
            else toast('Error: ' + res.error, 'error');
        });
    });
}
if ($('discoverSearchBtn')) $('discoverSearchBtn').addEventListener('click', runDiscoverSearch);
if ($('discoverQuery')) $('discoverQuery').addEventListener('keydown', e => { if (e.key === 'Enter') runDiscoverSearch(); });

// ============ FILES ============
async function refreshFilesInstances() {
    const sel = $('filesInstanceSelect');
    if (!sel) return;
    const list = await window.api.listInstances();
    sel.innerHTML = '<option value="">Select instance</option>' +
        list.map(i => `<option value="${i.name}">${i.displayName} (${i.mcVersion})</option>`).join('');
    if (filesCurrentInstance) sel.value = filesCurrentInstance;
}

function getFileIcon(name) {
    const ext = name.toLowerCase().split('.').pop();
    if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'image';
    if (['ogg','mp3','wav'].includes(ext)) return 'audio_file';
    if (['json','txt','log','cfg','toml','yml','yaml','properties'].includes(ext)) return 'description';
    if (ext === 'jar') return 'deployed_code';
    if (['zip','mrpack'].includes(ext)) return 'folder_zip';
    return 'draft';
}
function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
}

async function loadFiles(path) {
    if (!filesCurrentInstance) return;
    filesCurrentPath = path;
    if ($('filesPathInput')) $('filesPathInput').value = '/' + (path || '');
    const r = await window.api.fileList({ instanceName: filesCurrentInstance, rel: path });
    const listEl = $('filesList');
    if (!listEl) return;
    if (!r.ok) { listEl.innerHTML = `<div class="hint" style="color:var(--error)">${r.error}</div>`; return; }
    if (!r.entries.length) { listEl.innerHTML = '<div class="hint" style="padding:20px">Empty folder</div>'; return; }

    listEl.innerHTML = r.entries.map(en => {
        const icon = en.isDir ? 'folder' : getFileIcon(en.name);
        const meta = en.isDir ? '' : formatBytes(en.size);
        return `<div class="file-row" data-name="${en.name}" data-dir="${en.isDir ? '1' : '0'}">
      <span class="material-symbols-rounded">${icon}</span>
      <span class="file-name">${en.name}</span>
      <span class="file-meta">${meta}</span>
      <div class="file-actions">
        ${!en.isDir ? `<button data-edit="${en.name}" data-tooltip="Edit"><span class="material-symbols-rounded">edit</span></button>` : ''}
        <button data-rename="${en.name}" data-tooltip="Rename"><span class="material-symbols-rounded">drive_file_rename_outline</span></button>
        <button data-delete="${en.name}" data-tooltip="Delete"><span class="material-symbols-rounded">delete</span></button>
      </div>
    </div>`;
    }).join('');

    listEl.querySelectorAll('button').forEach(attachRippleTo);
    listEl.querySelectorAll('.file-row').forEach(row => {
        row.addEventListener('click', e => {
            if (e.target.closest('button')) return;
            const name = row.dataset.name;
            const isDir = row.dataset.dir === '1';
            const newPath = filesCurrentPath ? filesCurrentPath + '/' + name : name;
            if (isDir) loadFiles(newPath);
            else openFileEditor(newPath);
        });
    });
    listEl.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        const p = filesCurrentPath ? filesCurrentPath + '/' + b.dataset.edit : b.dataset.edit;
        openFileEditor(p);
    }));
    listEl.querySelectorAll('[data-rename]').forEach(b => b.addEventListener('click', async e => {
        e.stopPropagation();
        const oldName = b.dataset.rename;
        const newName = prompt('New name:', oldName);
        if (!newName || newName === oldName) return;
        const p = filesCurrentPath ? filesCurrentPath + '/' + oldName : oldName;
        const rr = await window.api.fileRename({ instanceName: filesCurrentInstance, rel: p, newName });
        if (rr.ok) { toast('Renamed', 'success'); loadFiles(filesCurrentPath); }
        else toast(rr.error, 'error');
    }));
    listEl.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm(`Delete "${b.dataset.delete}"?`)) return;
        const p = filesCurrentPath ? filesCurrentPath + '/' + b.dataset.delete : b.dataset.delete;
        const rr = await window.api.fileDelete({ instanceName: filesCurrentInstance, rel: p });
        if (rr.ok) { toast('Deleted', 'warn'); loadFiles(filesCurrentPath); }
        else toast(rr.error, 'error');
    }));
}

async function openFileEditor(relPath) {
    const r = await window.api.fileRead({ instanceName: filesCurrentInstance, rel: relPath });
    if (!r.ok) return toast(r.error, 'error');
    const editor = document.createElement('div');
    editor.className = 'file-editor';
    editor.innerHTML = `
    <div class="row-inline" style="justify-content:space-between">
      <div style="font-family:monospace;font-size:13px">${relPath}</div>
      <div class="row-inline">
        <button class="outlined-btn" id="editorSaveBtn">Save</button>
        <button class="icon-btn" id="editorCloseBtn"><span class="material-symbols-rounded">close</span></button>
      </div>
    </div>
    <textarea id="editorText"></textarea>
  `;
    document.body.appendChild(editor);
    editor.querySelector('#editorText').value = r.content;
    attachRippleTo(editor.querySelector('#editorSaveBtn'));
    attachRippleTo(editor.querySelector('#editorCloseBtn'));
    editor.querySelector('#editorCloseBtn').addEventListener('click', () => editor.remove());
    editor.querySelector('#editorSaveBtn').addEventListener('click', async () => {
        const content = editor.querySelector('#editorText').value;
        const w = await window.api.fileWrite({ instanceName: filesCurrentInstance, rel: relPath, content });
        if (w.ok) { toast('Saved', 'success'); editor.remove(); }
        else toast(w.error, 'error');
    });
}

function initFilesTab() {
    if ($('filesInstanceSelect')) $('filesInstanceSelect').addEventListener('change', e => {
        filesCurrentInstance = e.target.value;
        loadFiles('');
    });
    if ($('filesUpBtn')) $('filesUpBtn').addEventListener('click', () => {
        if (!filesCurrentPath) return;
        const parts = filesCurrentPath.split('/');
        parts.pop();
        loadFiles(parts.join('/'));
    });
    if ($('filesRefreshBtn')) $('filesRefreshBtn').addEventListener('click', () => loadFiles(filesCurrentPath));
    if ($('filesImportBtn')) $('filesImportBtn').addEventListener('click', async () => {
        if (!filesCurrentInstance) return toast('Select instance first', 'error');
        const files = await window.api.filePick();
        if (!files.length) return;
        const r = await window.api.fileImport({ instanceName: filesCurrentInstance, rel: filesCurrentPath, files });
        if (r.ok) { toast(`Imported ${r.added}`, 'success'); loadFiles(filesCurrentPath); }
        else toast(r.error, 'error');
    });
    if ($('filesMkdirBtn')) $('filesMkdirBtn').addEventListener('click', async () => {
        if (!filesCurrentInstance) return toast('Select instance first', 'error');
        const name = prompt('Folder name:');
        if (!name) return;
        const r = await window.api.fileMkdir({ instanceName: filesCurrentInstance, rel: filesCurrentPath, name });
        if (r.ok) { toast('Folder created', 'success'); loadFiles(filesCurrentPath); }
        else toast(r.error, 'error');
    });
}

// ============ NEW INSTANCE ============
async function loadMcVersions() {
    const sel = $('mcVersionSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading...</option>';
    const r = await window.api.getMcVersions();
    if (!r.ok) { sel.innerHTML = '<option value="">Error</option>'; return; }
    sel.innerHTML = r.versions.map(v => `<option value="${v.id}">${v.id}</option>`).join('');
}
async function loadLoaderVersions() {
    const mc = $('mcVersionSelect')?.value;
    const loader = $('loaderSelect')?.value;
    const wrap = $('loaderVersionWrap');
    const sel = $('loaderVersionSelect');
    if (!wrap || !sel) return;
    if (!loader || loader === 'vanilla' || !mc) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    sel.innerHTML = '<option value="">Loading...</option>';
    let r;
    if (loader === 'fabric') r = await window.api.getFabricVersions(mc);
    else if (loader === 'quilt') r = await window.api.getQuiltVersions(mc);
    else if (loader === 'forge') r = await window.api.getForgeVersions(mc);
    else if (loader === 'neoforge') r = await window.api.getNeoforgeVersions(mc);
    if (!r || !r.ok || !r.versions.length) { sel.innerHTML = '<option value="">No versions</option>'; return; }
    sel.innerHTML = r.versions.map(v => `<option value="${v}">${v}</option>`).join('');
}
if ($('mcVersionSelect')) $('mcVersionSelect').addEventListener('change', loadLoaderVersions);
if ($('loaderSelect')) $('loaderSelect').addEventListener('change', loadLoaderVersions);

if ($('createInstanceBtn')) $('createInstanceBtn').addEventListener('click', async () => {
    const name = $('newInstName').value.trim();
    const mcVersion = $('mcVersionSelect').value;
    const loader = $('loaderSelect').value;
    const loaderVersion = $('loaderVersionSelect').value;
    if (!name) return toast('Enter instance name', 'error');
    if (!mcVersion) return toast('Select MC version', 'error');
    if (loader !== 'vanilla' && !loaderVersion) return toast('Select loader version', 'error');
    const btn = $('createInstanceBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    const r = await window.api.createInstance({ name, mcVersion, loader, loaderVersion });
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-rounded">add</span> Create Instance';
    if (r.ok) { toast('Instance created ✅', 'success'); await refreshInstances(); document.querySelector('aside nav button[data-tab="launch"]')?.click(); }
    else toast('Error: ' + r.error, 'error');
});

if ($('importBtn')) $('importBtn').addEventListener('click', async () => {
    const url = $('mrpackUrl').value.trim();
    const name = $('instanceName').value.trim();
    if (!url || !name) return toast('Provide URL and name', 'error');
    const btn = $('importBtn');
    btn.disabled = true;
    btn.textContent = 'Importing...';
    document.querySelector('aside nav button[data-tab="console"]')?.click();
    const r = await window.api.importMrpack({ url, instanceName: name });
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-rounded">download</span> Download & Install';
    if (r.ok) { toast('Instance imported ✅', 'success'); await refreshInstances(); document.querySelector('aside nav button[data-tab="launch"]')?.click(); }
    else toast('Import error: ' + r.error, 'error');
});

// ============ INSTANCE MODAL ============
async function openInstanceModal(name) {
    currentModalInstance = name;
    const inst = instances.find(i => i.name === name);
    $('modalTitle').textContent = inst?.displayName || name;
    $('instanceModal').classList.add('active');
    document.querySelectorAll('.modal-tabs button').forEach(b => b.classList.remove('active'));
    const first = document.querySelector('.modal-tabs button[data-mtab="overview"]');
    if (first) first.classList.add('active');
    switchModalTab('overview');
}
if ($('closeModal')) $('closeModal').addEventListener('click', () => {
    $('instanceModal').classList.remove('active');
    currentModalInstance = null;
});
document.querySelectorAll('.modal-tabs button').forEach(b => {
    b.addEventListener('click', () => {
        document.querySelectorAll('.modal-tabs button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        switchModalTab(b.dataset.mtab);
    });
});
async function switchModalTab(tab) {
    if (!currentModalInstance) return;
    const body = $('modalBody');
    const name = currentModalInstance;

    if (tab === 'overview') {
        const inst = instances.find(i => i.name === name);
        const playMin = inst.playTime ? Math.floor(inst.playTime / 60000) : 0;
        body.innerHTML = `
      <div class="list-item"><span class="name">Instance name</span><span class="meta">${inst?.displayName || name}</span></div>
      <div class="list-item"><span class="name">Minecraft</span><span class="meta">${inst?.mcVersion}</span></div>
      <div class="list-item"><span class="name">Loader</span><span class="meta">${inst?.loader}</span></div>
      <div class="list-item"><span class="name">Size</span><span class="meta">${(inst?.size / 1024 / 1024).toFixed(0)} MB</span></div>
      <div class="list-item"><span class="name">Play time</span><span class="meta">${playMin} minutes</span></div>
      <div class="row-inline" style="margin-top:16px">
        <button id="openFolderBtn" class="outlined-btn">Open Folder</button>
        <button id="copyBtn" class="outlined-btn">Copy Instance</button>
        <button id="exportBtn" class="outlined-btn">Export .zip</button>
        <button id="deleteBtn" class="outlined-btn" style="color:var(--error);border-color:var(--error)">Delete</button>
      </div>
    `;
        body.querySelectorAll('button').forEach(attachRippleTo);
        $('openFolderBtn').addEventListener('click', () => window.api.openInstanceFolder({ name, sub: '' }));
        $('deleteBtn').addEventListener('click', async () => {
            if (!confirm(`Delete instance "${name}"?`)) return;
            await window.api.deleteInstance(name);
            $('instanceModal').classList.remove('active');
            refreshInstances();
            toast('Instance deleted', 'warn');
        });
        $('exportBtn').addEventListener('click', async () => {
            const r = await window.api.exportInstance(name);
            if (r.ok) toast('Exported ✅', 'success');
        });
        $('copyBtn').addEventListener('click', async () => {
            const newName = prompt('New instance name:', name + '-copy');
            if (!newName) return;
            const r = await window.api.copyInstance({
                name, newName,
                copyOptions: { mods: true, saves: true, resourcepacks: true, shaderpacks: true, screenshots: false }
            });
            if (r.ok) { toast('Copied ✅', 'success'); refreshInstances(); }
            else toast('Copy error: ' + r.error, 'error');
        });
    }

    if (tab === 'mods') {
        const mods = await window.api.listMods(name);
        body.innerHTML = `
      <div class="row-inline" style="margin-bottom:12px">
        <button id="addModBtn" class="filled-btn" style="padding:8px 16px;font-size:13px"><span class="material-symbols-rounded">add</span> Add Mod</button>
        <span class="hint" style="margin:0">Or drag & drop .jar files</span>
      </div>
      ${mods.length ? mods.map(m => `
        <div class="list-item">
          <div class="toggle ${m.enabled ? 'on' : ''}" data-file="${m.file}"></div>
          <span class="name">${m.name}</span>
          <span class="meta">${(m.size / 1024).toFixed(0)} KB</span>
          <div class="actions"><button data-delete="${m.file}">✕</button></div>
        </div>
      `).join('') : '<p class="hint">No mods in this instance yet.</p>'}
    `;
        body.querySelectorAll('button').forEach(attachRippleTo);
        $('addModBtn').addEventListener('click', async () => {
            const files = await window.api.pickMods();
            if (!files.length) return;
            const r = await window.api.addMods({ instanceName: name, files });
            if (r.ok) { toast(`Added ${r.added} mod(s)`, 'success'); switchModalTab('mods'); }
            else toast('Error: ' + r.error, 'error');
        });
        body.querySelectorAll('.toggle').forEach(t => t.addEventListener('click', async () => {
            await window.api.toggleMod({ instanceName: name, file: t.dataset.file });
            switchModalTab('mods');
        }));
        body.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async () => {
            if (!confirm('Delete this mod?')) return;
            await window.api.deleteMod({ instanceName: name, file: b.dataset.delete });
            switchModalTab('mods');
        }));
    }

    if (tab === 'worlds') {
        const worlds = await window.api.listFolder({ instanceName: name, sub: 'saves' });
        if (!worlds.length) { body.innerHTML = '<p class="hint">No worlds yet.</p>'; return; }
        body.innerHTML = worlds.filter(w => w.isDir).map(w => `
      <div class="list-item">
        <span class="name">${w.name}</span>
        <span class="meta">${new Date(w.mtime).toLocaleDateString()}</span>
        <div class="actions"><button data-open-world="${w.name}">Open</button></div>
      </div>
    `).join('');
        body.querySelectorAll('button').forEach(attachRippleTo);
        body.querySelectorAll('[data-open-world]').forEach(b => b.addEventListener('click', () =>
            window.api.openInstanceFolder({ name, sub: 'saves/' + b.dataset.openWorld })));
    }

    if (tab === 'resourcepacks') {
        const packs = await window.api.listFolder({ instanceName: name, sub: 'resourcepacks' });
        if (!packs.length) { body.innerHTML = '<p class="hint">No resource packs.</p>'; return; }
        body.innerHTML = packs.map(p => `
      <div class="list-item">
        <span class="name">${p.name}</span>
        <span class="meta">${p.isDir ? 'folder' : (p.size / 1024).toFixed(0) + ' KB'}</span>
      </div>
    `).join('');
    }

    if (tab === 'advanced') {
        body.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <h3><span class="material-symbols-rounded">terminal</span> Custom Commands</h3>
        <label>Pre-launch command <input id="preLaunchCmd" type="text" placeholder="./prelaunch.sh" /></label>
        <label>Post-exit command <input id="postExitCmd" type="text" placeholder="./postexit.sh" /></label>
        <button id="saveCommands" class="outlined-btn">Save Commands</button>
      </div>
      <div class="card">
        <h3><span class="material-symbols-rounded">folder</span> Quick Actions</h3>
        <div class="row-inline">
          <button id="openModsFolder" class="outlined-btn">Mods</button>
          <button id="openSavesFolder" class="outlined-btn">Saves</button>
          <button id="openConfigFolder" class="outlined-btn">Config</button>
          <button id="openLogsFolder" class="outlined-btn">Logs</button>
        </div>
      </div>
    `;
        body.querySelectorAll('button').forEach(attachRippleTo);
        $('openModsFolder').addEventListener('click', () => window.api.openInstanceFolder({ name, sub: 'mods' }));
        $('openSavesFolder').addEventListener('click', () => window.api.openInstanceFolder({ name, sub: 'saves' }));
        $('openConfigFolder').addEventListener('click', () => window.api.openInstanceFolder({ name, sub: 'config' }));
        $('openLogsFolder').addEventListener('click', () => window.api.openInstanceFolder({ name, sub: 'logs' }));
        $('saveCommands').addEventListener('click', async () => {
            await window.api.updateInstanceMeta({
                name,
                patch: {
                    preLaunchCmd: $('preLaunchCmd').value || undefined,
                    postExitCmd: $('postExitCmd').value || undefined
                }
            });
            toast('Commands saved', 'success');
        });
    }
}

// ============ SYS INFO ============
async function updateSys() {
    try {
        const info = await window.api.sysInfo();
        const used = info.totalMem - info.freeMem;
        const pct = (used / info.totalMem * 100).toFixed(0);
        if ($('ramStat')) $('ramStat').textContent = `${(used / 1024 / 1024 / 1024).toFixed(1)} / ${(info.totalMem / 1024 / 1024 / 1024).toFixed(0)} GB`;
        if ($('ramBar')) $('ramBar').style.width = pct + '%';
        if ($('cpuStat')) $('cpuStat').textContent = `${info.cpuModel} · ${info.cpus} cores`;
        if ($('javaCount')) $('javaCount').textContent = cachedJavas.length ? cachedJavas.length + ' found' : 'Click detect';
    } catch {}
}

// ============ DRAG & DROP ============
let dragCounter = 0;
const dropOverlay = $('dropOverlay');
window.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; if (dropOverlay) dropOverlay.classList.add('active'); });
window.addEventListener('dragleave', e => { e.preventDefault(); dragCounter--; if (dragCounter <= 0 && dropOverlay) { dropOverlay.classList.remove('active'); dragCounter = 0; } });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', async e => {
    e.preventDefault();
    dragCounter = 0;
    if (dropOverlay) dropOverlay.classList.remove('active');
    const files = Array.from(e.dataTransfer.files).map(f => f.path);
    const jars = files.filter(f => f.toLowerCase().endsWith('.jar'));
    if (!jars.length) return;
    if (!currentModalInstance) return toast('Open an instance (edit) to add mods', 'error');
    const r = await window.api.addMods({ instanceName: currentModalInstance, files: jars });
    if (r.ok) { toast(`Added ${r.added} mod(s)`, 'success'); switchModalTab('mods'); }
    else toast('Error: ' + r.error, 'error');
});

// ============ INIT ============
(async () => {
    settings = await window.api.getSettings();
    applyTheme(settings.theme || 'm3-dark');

    if ($('ram')) { $('ram').value = settings.ram; if ($('ramLabel')) $('ramLabel').textContent = `${settings.ram} MB`; }
    if ($('javaPath')) $('javaPath').value = settings.javaPath || '/usr/bin/java';
    if ($('extraJvmArgs')) $('extraJvmArgs').value = settings.extraJvmArgs || '';
    if ($('modrinthToken')) $('modrinthToken').value = settings.modrinthToken || '';
    if ($('authlibApi')) $('authlibApi').value = settings.authlibApi || 'https://account.ely.by/api/authlib-injector';

    attachRipple();
    initFilesTab();

    await refreshProfiles();
    await refreshInstances();
    await loadMcVersions();
    await populateDiscoverMcVersions();
    await refreshFilesInstances();

    updateSys();
    setInterval(updateSys, 3000);
})();