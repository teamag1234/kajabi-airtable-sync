/**
 * Genera kajabi/test-nivel.html (lo que se pega en Kajabi) a partir de:
 *   - kajabi/test-nivel.template.html  (pantallas y comportamiento)
 *   - kajabi/test-nivel.css            (estilos; aquí se les añade !important)
 *   - lib/level-test/quiz.js           (preguntas, corrección y recomendación)
 *
 * Uso: npm run build:test-nivel
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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

/** Lo que se pega en el bloque Custom Code de Kajabi: carga public/test-nivel.js desde Vercel. */
export const SNIPPET_KAJABI = '<div id="ag-tn" class="ag-tn"></div>\n<script src="https://kajabi-airtable-sync-d9nm.vercel.app/test-nivel.js" defer></script>';

/**
 * El mismo widget como un solo .js (public/test-nivel.js, servido por Vercel):
 * mete la fuente y los estilos en <head>, crea el contenedor si falta y
 * ejecuta el script. Así cada cambio se publica con un deploy, sin volver a
 * pegar nada en Kajabi.
 */
export function construirJs(html = construir()) {
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  return `/* AG Academy · Test de nivel. Generado con npm run build:test-nivel; no editar a mano. */
(function () {
  var head = document.head;
  if (!document.querySelector('link[data-ag-tn]')) {
    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
    font.setAttribute('data-ag-tn', '');
    head.appendChild(font);
  }
  var style = document.createElement('style');
  style.textContent = ${JSON.stringify(css)};
  head.appendChild(style);
  if (!document.getElementById('ag-tn')) {
    var root = document.createElement('div');
    root.id = 'ag-tn';
    root.className = 'ag-tn';
    var aqui = document.currentScript;
    if (aqui && aqui.parentNode) aqui.parentNode.insertBefore(root, aqui);
    else document.body.appendChild(root);
  }
})();
${script.trim()}
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = construir();
  writeFileSync(path.join(raiz, 'kajabi/test-nivel.html'), html);
  console.log(`kajabi/test-nivel.html generado (${Math.round(html.length / 1024)} KB)`);
  mkdirSync(path.join(raiz, 'public'), { recursive: true });
  writeFileSync(path.join(raiz, 'public/test-nivel.js'), construirJs(html));
  console.log('public/test-nivel.js generado');
}
