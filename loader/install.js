const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const fetch = require('node-fetch');

const MC_VERSIONS_MANIFEST = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';

async function getJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return r.json();
}

async function downloadTo(url, dest) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    await new Promise((resolve, reject) => {
        const s = fs.createWriteStream(dest);
        r.body.pipe(s);
        r.body.on('error', reject);
        s.on('finish', resolve);
    });
}

function runJava(javaPath, args, log) {
    return new Promise((resolve, reject) => {
        log(`$ ${javaPath} ${args.join(' ')}`);
        const p = execFile(javaPath, args, { maxBuffer: 1024 * 1024 * 16 }, (err, stdout, stderr) => {
            if (stdout) log(stdout.trim());
            if (stderr) log(stderr.trim());
            if (err) reject(err); else resolve();
        });
        p.stdout.on('data', d => log(d.toString().trim()));
        p.stderr.on('data', d => log(d.toString().trim()));
    });
}

async function findMcVersionUrl(mcVersion) {
    const man = await getJson(MC_VERSIONS_MANIFEST);
    const v = man.versions.find(x => x.id === mcVersion);
    if (!v) throw new Error(`MC version ${mcVersion} not found`);
    return v.url;
}

// ---------- FABRIC ----------async function installFabric({ mcVersion, loaderVersion, javaPath, gameDir, log }) {
    log(`Устанавливаю Fabric ${loaderVersion} для MC ${mcVersion}...`);
    const installerUrl = `https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.0.1/fabric-installer-1.0.1.jar`;
    const tmp = path.join(os.tmpdir(), 'fabric-installer.jar');
    if (!fs.existsSync(tmp)) await downloadTo(installerUrl, tmp);

    await runJava(javaPath, [
        '-jar', tmp,
        'client',
        '-dir', gameDir,
        '-mcversion', mcVersion,
        '-loader', loaderVersion,
        '-noprofile'    ], log);
    return `fabric-loader-${loaderVersion}-${mcVersion}`;
}

// ---------- QUILT ----------async function installQuilt({ mcVersion, loaderVersion, javaPath, gameDir, log }) {
    log(`Устанавливаю Quilt ${loaderVersion} для MC ${mcVersion}...`);
    const installerUrl = `https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-installer/0.10.0/quilt-installer-0.10.0.jar`;
    const tmp = path.join(os.tmpdir(), 'quilt-installer.jar');
    if (!fs.existsSync(tmp)) await downloadTo(installerUrl, tmp);

    await runJava(javaPath, [
        '-jar', tmp,
        'install', 'client',
        mcVersion,
        '--loader', loaderVersion,
        '--install-dir=' + gameDir
    ], log);
    return `quilt-loader-${loaderVersion}-${mcVersion}`;
}

// ---------- FORGE / NEOFORGE ----------async function installForgeLike({ mcVersion, loaderVersion, javaPath, gameDir, log, type }) {
    log(`Устанавливаю ${type} ${loaderVersion} для MC ${mcVersion}...`);
    let installerUrl;
    if (type === 'neoforge') {
        installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVersion}/neoforge-${loaderVersion}-installer.jar`;
    } else {
        installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${loaderVersion}/forge-${mcVersion}-${loaderVersion}-installer.jar`;
    }
    const tmp = path.join(os.tmpdir(), `${type}-installer.jar`);
    if (!fs.existsSync(tmp)) await downloadTo(installerUrl, tmp);

    await runJava(javaPath, ['-jar', tmp, '--installClient', gameDir], log);

    // имя версии, которое создаст установщик    if (type === 'neoforge') return `neoforge-${loaderVersion}`;
    return `${mcVersion}-forge-${loaderVersion}`;
}

/** * Главная точка: ставит лоадер и возвращает имя custom-версии * для minecraft-launcher-core. */async function ensureLoader({ dependencies, javaPath, gameDir, log }) {
    const mcVersion = dependencies.minecraft;
    if (!mcVersion) throw new Error('dependencies.minecraft не указан в сборке');

    const loader = Object.entries(dependencies).find(([k]) => k !== 'minecraft');
    if (!loader) {
        log('В сборке нет загрузчика — ваниль');
        return null;
    }
    const [loaderName, loaderVersion] = loader;

    // Проверка: если уже установлен — скипаем    const versionsDir = path.join(gameDir, 'versions');
    const checkInstalled = (prefix) => fs.existsSync(versionsDir) &&
        fs.readdirSync(versionsDir).some(v => v.startsWith(prefix));

    if (loaderName === 'fabric-loader') {
        const ver = `fabric-loader-${loaderVersion}-${mcVersion}`;
        if (checkInstalled(ver)) { log('Fabric уже установлен'); return ver; }
        return await installFabric({ mcVersion, loaderVersion, javaPath, gameDir, log });
    }
    if (loaderName === 'quilt-loader') {
        const ver = `quilt-loader-${loaderVersion}-${mcVersion}`;
        if (checkInstalled(ver)) { log('Quilt уже установлен'); return ver; }
        return await installQuilt({ mcVersion, loaderVersion, javaPath, gameDir, log });
    }
    if (loaderName === 'forge') {
        const ver = `${mcVersion}-forge-${loaderVersion}`;
        if (checkInstalled(ver)) { log('Forge уже установлен'); return ver; }
        return await installForgeLike({ mcVersion, loaderVersion, javaPath, gameDir, log, type: 'forge' });
    }
    if (loaderName === 'neoforge') {
        const ver = `neoforge-${loaderVersion}`;
        if (checkInstalled(ver)) { log('NeoForge уже установлен'); return ver; }
        return await installForgeLike({ mcVersion, loaderVersion, javaPath, gameDir, log, type: 'neoforge' });
    }

    throw new Error(`Неизвестный загрузчик: ${loaderName}`);
}

module.exports = { ensureLoader };
