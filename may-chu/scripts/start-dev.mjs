import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const ca = resolve(process.cwd(), 'certificates', 'supabase-ca.crt');
const env = { ...process.env };
if (existsSync(ca)) {
  env.NODE_EXTRA_CA_CERTS = ca;
  console.log('[TLS] Dang su dung chung chi CA:', ca);
} else {
  console.warn('[TLS] Khong tim thay certificates/supabase-ca.crt; neu gap loi SELF_SIGNED_CERT_IN_CHAIN, hay kiem tra file chung chi.');
}
const cli = resolve(process.cwd(), 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js');
const child = spawn(process.execPath, [cli, 'start', '--watch'], { stdio: 'inherit', env });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { if (!child.killed) child.kill(signal); });
}
