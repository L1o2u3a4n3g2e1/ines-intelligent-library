import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const frontendDir = path.join(rootDir, 'digital-library-main', 'digital_library', 'frontend');
const frontendBuildDir = path.join(frontendDir, 'build');
const publicDir = path.join(rootDir, 'public');
const envFilePath = path.join(frontendDir, '.env');

// Remove hardcoded API URL from .env so production uses dynamic resolution
if (fs.existsSync(envFilePath)) {
  let envContent = fs.readFileSync(envFilePath, 'utf-8');
  envContent = envContent
    .split('\n')
    .filter((line) => !line.startsWith('REACT_APP_API_URL='))
    .join('\n');
  fs.writeFileSync(envFilePath, envContent);
}

execSync('npm run build', {
  cwd: frontendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: process.env.CI || 'false',
  },
});

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.cpSync(frontendBuildDir, publicDir, { recursive: true });
