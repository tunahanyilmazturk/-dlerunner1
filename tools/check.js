// Denge regresyon kontrolü: sim'i --json ile koşturup medyanların eşik
// aralığında kaldığını doğrular. `npm run check` = birim testler + bu script.
// Eşikler referans koşuların üstünde gevşek tutulur: amaç ince ayar değil,
// bozulan ilerlemeyi/duvarları erken yakalamak.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINUTES = 30;
const SEEDS = 3;

const median = (values) => {
  const v = values.filter((x) => x !== undefined).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : undefined;
};

const out = execFileSync(process.execPath, ['tools/balance-sim.js', '--minutes', String(MINUTES), '--seeds', String(SEEDS), '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
const sim = JSON.parse(out);

// [profil, etiket, runs → değer (saniye/adet), sınır, 'max'|'min']
const CHECKS = [
  ['aktif', 'aşama 20 ilk ulaşma', (r) => median(r.map((x) => x.milestones[20])), 600],
  ['aktif', 'aşama 50 ilk ulaşma', (r) => median(r.map((x) => x.milestones[50])), MINUTES * 60],
  ['aktif', 'son en iyi aşama', (r) => median(r.map((x) => x.final.best)), 55, 'min'],
  ['aktif', 'ortalama ttk (10. dk)', (r) => r[0].timeline.find((t) => t.min === 10)?.ttk, 15],
  ['aktif', 'en çok ölüm', (r) => Math.max(...r.map((x) => x.deaths)), 20],
  ['idle', 'aşama 20 ilk ulaşma', (r) => median(r.map((x) => x.milestones[20])), 780],
  ['idle', 'son en iyi aşama', (r) => median(r.map((x) => x.final.best)), 45, 'min'],
];

let failed = 0;
for (const [profile, label, read, limit, op = 'max'] of CHECKS) {
  const value = read(sim[profile]);
  const ok = value !== undefined && (op === 'max' ? value <= limit : value >= limit);
  const shown = value === undefined ? 'ulaşılmadı' : Number.isInteger(value) ? value : value.toFixed(2);
  console.log(`${ok ? '✓' : '✗'} ${profile} · ${label}: ${shown} (sınır ${op === 'max' ? '≤' : '≥'} ${limit})`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} denge kontrolü başarısız — son denge değişikliklerini gözden geçir.`);
  process.exit(1);
}
console.log('\nTüm denge kontrolleri geçti.');
