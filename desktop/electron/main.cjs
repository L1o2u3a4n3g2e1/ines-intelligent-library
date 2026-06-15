const { app, BrowserWindow, dialog, session, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const APP_HOST = '127.0.0.1';
const APP_PORT = 3040;
const APP_URL = `http://${APP_HOST}:${APP_PORT}`;
const BACKEND_HEALTH_URL = 'http://localhost/digital-library/backend/health';
const DEFAULT_PROJECT_ROOT = 'C:\\xampp\\htdocs\\digital-library';

let mainWindow;
let staticServer;

function findProjectRoot() {
  const candidates = [
    process.env.INES_PROJECT_ROOT,
    DEFAULT_PROJECT_ROOT,
    path.resolve(app.getAppPath()),
    path.resolve(app.getAppPath(), '..', '..'),
  ].filter(Boolean);

  return candidates.find((candidate) => (
    fs.existsSync(path.join(candidate, 'backend'))
    && fs.existsSync(path.join(candidate, 'scripts', 'start_ai_services.ps1'))
  ));
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }[extension] || 'application/octet-stream';
}

function resolveFrontendRoot() {
  const candidates = [
    path.join(app.getAppPath(), 'dist'),
    path.join(__dirname, '..', '..', 'dist'),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));
}

function startFrontendServer() {
  const frontendRoot = resolveFrontendRoot();
  if (!frontendRoot) {
    throw new Error('The React production build is missing. Run npm run build first.');
  }

  staticServer = http.createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const candidate = path.resolve(frontendRoot, relativePath);
    const insideRoot = candidate === frontendRoot || candidate.startsWith(`${frontendRoot}${path.sep}`);
    const filePath = insideRoot && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      ? candidate
      : path.join(frontendRoot, 'index.html');

    response.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
    });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve, reject) => {
    staticServer.once('error', reject);
    staticServer.listen(APP_PORT, APP_HOST, resolve);
  });
}

async function isReachable(url, timeoutMs = 2500) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

function startDetached(command, args, workingDirectory) {
  const child = spawn(command, args, {
    cwd: workingDirectory,
    detached: true,
    shell: false,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

async function waitFor(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function ensureApplicationServices() {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return {
      ready: false,
      message: `The application services were not found. Expected project folder: ${DEFAULT_PROJECT_ROOT}`,
    };
  }

  if (!(await isReachable(BACKEND_HEALTH_URL))) {
    const xamppRoot = process.env.XAMPP_ROOT || 'C:\\xampp';
    const mysqlStarter = path.join(xamppRoot, 'mysql_start.bat');
    const apacheStarter = path.join(xamppRoot, 'apache_start.bat');

    if (fs.existsSync(mysqlStarter)) {
      startDetached('cmd.exe', ['/d', '/s', '/c', mysqlStarter], xamppRoot);
    }
    if (fs.existsSync(apacheStarter)) {
      startDetached('cmd.exe', ['/d', '/s', '/c', apacheStarter], xamppRoot);
    }
  }

  const aiStarter = path.join(projectRoot, 'scripts', 'start_ai_services.ps1');
  startDetached(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', aiStarter],
    projectRoot,
  );

  const backendReady = await waitFor(BACKEND_HEALTH_URL);
  return {
    ready: backendReady,
    message: backendReady
      ? ''
      : 'The desktop interface started, but the PHP/MySQL backend is unavailable. Check XAMPP Apache and MySQL.',
  };
}

function configurePermissions() {
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    const trusted = (requestingOrigin || '').startsWith(APP_URL);
    return trusted && ['media', 'notifications'].includes(permission);
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const trusted = webContents.getURL().startsWith(APP_URL);
    callback(trusted && ['media', 'notifications'].includes(permission));
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f4f7f3',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const trustedPopup = url === 'about:blank'
      || url.startsWith(APP_URL)
      || url.startsWith('blob:')
      || url.startsWith('http://localhost/digital-library/backend');
    if (trustedPopup) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(`${APP_URL}/login`);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await startFrontendServer();
      configurePermissions();
      createWindow();
      const serviceStatus = await ensureApplicationServices();
      if (!serviceStatus.ready && mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: 'Library services unavailable',
          message: serviceStatus.message,
          detail: 'The app will remain open so you can retry after the services start.',
        });
      }
    } catch (error) {
      dialog.showErrorBox('INES Digital Library could not start', error.message);
      app.quit();
    }
  });
}

app.on('window-all-closed', () => {
  if (staticServer) staticServer.close();
  if (process.platform !== 'darwin') app.quit();
});
