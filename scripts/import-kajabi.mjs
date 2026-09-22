/**
 * Carga inicial de alumnos desde Kajabi a la tabla Renovaciones.
 *   node scripts/import-kajabi.mjs --dry            simula (no escribe)
 *   node scripts/import-kajabi.mjs                  importa
 *   node scripts/import-kajabi.mjs --desde=2025-08-01
 *   node scripts/import-kajabi.mjs --sin-aprobados  no cruza con CURSOS KAJABI
 * Requiere KAJABI_CLIENT_ID, KAJABI_CLIENT_SECRET, AIRTABLE_TOKEN, AIRTABLE_BASE_ID.
 */
import { importarDesdeKajabi } from '../lib/renewal/import.js';
import { getRecords } from '../lib/airtable.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));

let aprobados = null;
if (!args['sin-aprobados']) {
  // Emails con "Resultado examen" = Aprobado en CURSOS KAJABI, con su fecha de examen si consta
  const filas = await getRecords('tblgpDhBxDXbsrn6u', '{Resultado examen} = "Aprobado"', { fields: ['Email', 'FECHA EXAMINADO ', 'Fecha examen'] });
  aprobados = new Map();
  for (const r of filas) {
    const email = String(r.fields.Email || '').trim().toLowerCase();
    if (!email) continue;
    const fecha = (r.fields['FECHA EXAMINADO '] || r.fields['Fecha examen'] || '').slice(0, 10) || null;
    if (!aprobados.has(email) || (fecha && (!aprobados.get(email) || fecha > aprobados.get(email)))) aprobados.set(email, fecha);
  }
  console.log(`Aprobados en CURSOS KAJABI: ${aprobados.size} (con fecha: ${[...aprobados.values()].filter(Boolean).length})`);
}

const r = await importarDesdeKajabi({ desde: args.desde, dryRun: Boolean(args.dry), aprobados });

console.log('\nResumen:', JSON.stringify({ ...r, detalle: undefined }, null, 2));
if (args.dry) {
  console.log('\nPrimeros 25 accesos que se cargarían:');
  for (const d of r.detalle.slice(0, 25)) console.log(`  ${d.email} | ${d.curso} | ${d.fechaInicio} → ${d.fechaFin} | ${d.oferta}`);
}
