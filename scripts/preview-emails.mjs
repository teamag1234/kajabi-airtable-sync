/**
 * Genera los 7 emails de la secuencia en HTML y texto para revisarlos.
 * Uso: node scripts/preview-emails.mjs [carpeta-salida]   (PREVIEW_CURSO=level para otro curso)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PASOS, generarEmail } from '../lib/renewal/sequence.js';
import { buscarCurso, ofertasRenovacionDeCurso } from '../lib/renewal/courses.js';
import { sumarDias, hoyMadrid } from '../lib/renewal/dates.js';

const out = process.argv[2] || join(process.cwd(), 'scripts', 'preview');
mkdirSync(out, { recursive: true });

const fechaFin = sumarDias(hoyMadrid(), 7);
const ctxBase = {
  nombre: 'María López',
  curso: buscarCurso(process.env.PREVIEW_CURSO || 'directo-express').nombre,
  fechaFin,
  fechaLimite: sumarDias(fechaFin, 7),
  ofertas: ofertasRenovacionDeCurso(buscarCurso(process.env.PREVIEW_CURSO || 'directo-express')),
};

for (const p of PASOS) {
  const mail = generarEmail(p.paso, { ...ctxBase, diasHastaFin: -p.offset, diasHastaLimite: 7 - p.offset });
  writeFileSync(join(out, `paso-${p.paso}.html`), mail.html);
  writeFileSync(join(out, `paso-${p.paso}.txt`), `Asunto: ${mail.asunto}\n\n${mail.texto}\n`);
  console.log(`Paso ${p.paso} (día ${p.offset >= 0 ? '+' : ''}${p.offset}): ${mail.asunto}`);
}
console.log(`\nEmails generados en ${out}`);
