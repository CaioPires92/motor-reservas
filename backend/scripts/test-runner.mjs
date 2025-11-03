import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// Fallback para SQLite local quando não houver variáveis definidas
const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'file:./src/prisma/test.db';

const isSQLite = dbUrl.startsWith('file:');
const schemaFile = isSQLite ? 'src/prisma/schema.test.prisma' : 'src/prisma/schema.prisma';
const common = { stdio: 'inherit', shell: true, cwd: root, env: { ...process.env, DATABASE_URL: dbUrl } };

console.log(`[TEST] Prisma generate (schema: ${schemaFile})...`);
let r = spawnSync('npx', ['prisma', 'generate', '--schema', schemaFile], common);
if (r.status !== 0) process.exit(r.status ?? 1);

// Para SQLite em testes, a suíte cria DDL diretamente nos specs; evitar push
if (!isSQLite) {
  console.log(`[TEST] Prisma db push (schema: ${schemaFile})...`);
  r = spawnSync('npx', ['prisma', 'db', 'push', '--schema', schemaFile], common);
  if (r.status !== 0) process.exit(r.status ?? 1);
} else {
  console.log('[TEST] SQLite detectado — pulando prisma db push (DDL nos testes).');
}

console.log('[TEST] Jest...');
r = spawnSync('node', ['--experimental-vm-modules', './node_modules/jest/bin/jest.js', '--detectOpenHandles', '--forceExit'], common);
process.exit(r.status ?? 0);
