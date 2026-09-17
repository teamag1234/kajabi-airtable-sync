/**
 * Genera los 7 emails de la secuencia en HTML y texto para revisarlos.
 * Uso: node scripts/preview-emails.mjs [carpeta-salida]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PASOS, generarEmail } from '../lib/renewal/sequence.js';
import { getOfertasRenovacion } from '../lib/renewal/courses.js';
import { sumarDias, hoyMadrid } from '../lib/renewal/dates.js';

const out = process.argv[2] || join(process.cwd(), 'scripts', 'preview');
mkdirSync(out, { recursive: true });

const fechaFin = sumarDias(hoyMadrid(), 7);
const ctxBase = {
  nombre: 'María López',
  curso: 'Curso APTIS 6 meses',
  fechaFin,
  fechaLimite: sumarDias(fechaFin, 7),
  ofertas: getOfertasRenovacion({
    RENEWAL_PRICE_1M: process.env.RENEWAL_PRICE_1M || '47',
    RENEWAL_URL_1M: process.env.RENEWAL_URL_1M || 'https://www.agacademyaptis.com/renovacion-1-mes',
    RENEWAL_PRICE_6M: process.env.RENEWAL_PRICE_6M || '97',
    RENEWAL_URL_6M: process.env.RENEWAL_URL_6M || 'https://www.agacademyaptis.com/renovacion-6-meses',
    RENEWAL_PRICE_12M: process.env.RENEWAL_PRICE_12M || '147',
    RENEWAL_URL_12M: process.env.RENEWAL_URL_12M || 'https://www.agacademyaptis.com/renovacion-1-ano',
  }),
};

for (const p of PASOS) {
  const mail = generarEmail(p.paso, { ...ctxBase, diasHastaFin: -p.offset, diasHastaLimite: 7 - p.offset });
  writeFileSync(join(out, `paso-${p.paso}.html`), mail.html);
  writeFileSync(join(out, `paso-${p.paso}.txt`), `Asunto: ${mail.asunto}\n\n${mail.texto}\n`);
  console.log(`Paso ${p.paso} (día ${p.offset >= 0 ? '+' : ''}${p.offset}): ${mail.asunto}`);
}
console.log(`\nEmails generados en ${out}`);
