/**
 * Primera pasada de la detección de altas manuales: apunta como Ignorado todo
 * acceso concedido en Kajabi que no esté en Renovaciones, salvo los emails que
 * se pasen, que se importan con fecha de inicio = hoy.
 *   node scripts/seed-altas-manuales.mjs --dry
 *   node scripts/seed-altas-manuales.mjs --importar=a@x.com,b@y.com --oferta=2026/27
 */
import { detectarAltasManuales } from '../lib/renewal/grants.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v === undefined ? true : v]; }));
const excepto = String(args.importar || '').split(',').map((s) => s.trim()).filter(Boolean);
const r = await detectarAltasManuales({ dryRun: Boolean(args.dry), seedIgnorar: true, excepto, soloOfertaExcepto: args.oferta || null });
console.log(JSON.stringify({ ...r, detalle: r.detalle.filter((d) => d.accion !== 'ignorado' && d.Estado !== 'Ignorado').slice(0, 30) }, null, 2));
