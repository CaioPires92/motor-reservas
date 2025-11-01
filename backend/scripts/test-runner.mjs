import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('[TEST] DATABASE_URL/TEST_DATABASE_URL não definido.\n' +
    'Defina TEST_DATABASE_URL (ou DATABASE_URL) apontando para um PostgreSQL acessível.');
  process.exit(1);
}

const common = { stdio: 'inherit', shell: true, cwd: root, env: { ...process.env, DATABASE_URL: dbUrl } };

console.log('[TEST] Prisma generate...');
let r = spawnSync('npx', ['prisma', 'generate', '--schema', 'src/prisma/schema.prisma'], common);
if (r.status !== 0) process.exit(r.status ?? 1);

console.log('[TEST] Prisma db push...');
r = spawnSync('npx', ['prisma', 'db', 'push', '--schema', 'src/prisma/schema.prisma'], common);
if (r.status !== 0) process.exit(r.status ?? 1);

console.log('[TEST] Jest...');
r = spawnSync('node', ['--experimental-vm-modules', './node_modules/jest/bin/jest.js', '--detectOpenHandles', '--forceExit'], common);
process.exit(r.status ?? 0);

