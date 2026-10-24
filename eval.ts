// Measures the full app (rules + model, exactly as the browser runs them) on the held-out split
// written by train.py. Usage: npm run eval            (test split)
//                             npm run eval -- val     (validation split, used while tuning rules)
import { readFileSync } from 'node:fs';
import { analyze, mlProbability, type Model } from './src/engine.ts';

const split = process.argv[2] === 'val' ? 'val' : 'test';
const model: Model = JSON.parse(readFileSync(new URL('./src/model.json', import.meta.url), 'utf8'));
const rows: { text: string; label: number; source: string; p: number }[] = readFileSync(new URL(`./data/split/${split}.jsonl`, import.meta.url), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));

let maxDiff = 0;
for (const r of rows) maxDiff = Math.max(maxDiff, Math.abs(mlProbability(model, r.text) - r.p));
console.log(`${split} split: ${rows.length} messages. Largest JS vs Python probability difference: ${maxDiff.toExponential(2)}\n`);

const pct = (x: number) => (100 * x).toFixed(1) + '%';
for (const source of ['uci', 'synthetic']) {
  const set = rows.filter((r) => r.source === source);
  const out = set.map((r) => ({ r, v: analyze(model, r.text).verdict }));
  const report = (name: string, flagged: (v: string) => boolean) => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const { r, v } of out) {
      const f = flagged(v);
      if (r.label && f) tp++; else if (!r.label && f) fp++; else if (r.label) fn++; else tn++;
    }
    console.log(`  ${name.padEnd(30)} accuracy ${pct((tp + tn) / set.length)}  precision ${pct(tp / (tp + fp || 1))}  recall ${pct(tp / (tp + fn || 1))}  (tp ${tp}, fp ${fp}, fn ${fn}, tn ${tn})`);
  };
  console.log(`${source}: ${set.length} messages, ${set.filter((r) => r.label).length} spam/scam`);
  report('flagged (Suspicious or Scam)', (v) => v !== 'safe');
  report('"Likely scam" only', (v) => v === 'scam');
  if (process.argv.includes('--show')) {
    for (const { r, v } of out) if ((v !== 'safe') !== Boolean(r.label)) console.log(`    [${r.label ? 'missed' : 'false alarm'} ${v}] ${r.text.slice(0, 140)}`);
  }
  console.log();
}
