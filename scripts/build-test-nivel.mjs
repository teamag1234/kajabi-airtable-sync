/**
 * Genera kajabi/test-nivel.html (lo que se pega en Kajabi) a partir de:
 *   - kajabi/test-nivel.template.html  (pantallas y comportamiento)
 *   - kajabi/test-nivel.css            (estilos; aquí se les añade !important)
 *   - lib/level-test/quiz.js           (preguntas, corrección y recomendación)
 *
 * Uso: npm run build:test-nivel
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(path.join(raiz, f), 'utf8');

/**
 * Cuelga cada selector de #ag-tn para ganar al tema de Kajabi: `.ag-tn-x` pasa
 * a `#ag-tn .ag-tn-x` y `.ag-tn …` (la raíz) a `#ag-tn …`.
 */
function acotarSelectores(css) {
  return css.replace(/(^|[{}])([^{}@]+)\{/g, (m, antes, selectores) => {
    const acotados = selectores.split(',').map((s) => {
      const sel = s.trim();
      if (/^\.ag-tn(?![-\w])/.test(sel)) return sel.replace(/^\.ag-tn/, '#ag-tn');
      return `#ag-tn ${sel}`;
    });
    const sangria = selectores.match(/^\s*/)[0];
    return `${antes}${sangria}${acotados.join(', ')} {`;
  });
}

/**
 * Añade !important a cada declaración y acota los selectores a #ag-tn, salvo
 * dentro de @keyframes (ahí no vale ninguna de las dos cosas).
 */
export function conImportant(css) {
  let salida = '';
  let i = 0;
  while (i < css.length) {
    const kf = css.indexOf('@keyframes', i);
    const fin = kf === -1 ? css.length : kf;
    const trozo = css.slice(i, fin).replace(/\/\*[\s\S]*?\*\//g, '');
    salida += acotarSelectores(trozo).replace(/([^{};]+:[^{};]+?)\s*(;|\})/g, (m, decl, cierre) => {
      if (/!important\s*$/.test(decl) || !/^\s*[-a-z]+\s*:/i.test(decl)) return m;
      return `${decl} !important${cierre}`;
    });
    if (kf === -1) break;
    // Copia el bloque @keyframes entero (llaves equilibradas) sin tocar.
    let nivel = 0;
    let j = css.indexOf('{', kf);
    for (; j < css.length; j++) {
      if (css[j] === '{') nivel++;
      if (css[j] === '}' && --nivel === 0) break;
    }
    salida += css.slice(kf, j + 1);
    i = j + 1;
  }
  return salida.replace(/\n{3,}/g, '\n\n').trim();
}

/** quiz.js sin `export` para poder incrustarlo en un <script> normal. */
export function quizParaNavegador(src) {
  return src.replace(/^export\s+/gm, '').trim();
}

export function construir() {
  const plantilla = leer('kajabi/test-nivel.template.html');
  return plantilla
    .replace('/*__CSS__*/', () => conImportant(leer('kajabi/test-nivel.css')))
    .replace('/*__QUIZ__*/', () => quizParaNavegador(leer('lib/level-test/quiz.js')));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = construir();
  writeFileSync(path.join(raiz, 'kajabi/test-nivel.html'), html);
  console.log(`kajabi/test-nivel.html generado (${Math.round(html.length / 1024)} KB)`);
}
