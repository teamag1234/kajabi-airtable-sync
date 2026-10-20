/**
 * Genera kajabi/demo-curso.html (lo que se pega en Kajabi) a partir de:
 *   - kajabi/demo-curso.template.html  (pantallas y comportamiento)
 *   - kajabi/demo-curso.css            (estilos; aquí se les añade !important)
 *   - lib/demo-curso/contenido.js      (temario y ejercicios de la demo)
 *   - lib/level-test/quiz.js           (cursos, precios y checkouts)
 *
 * Uso: npm run build:demo-curso
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { conImportant, quizParaNavegador } from './build-test-nivel.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(path.join(raiz, f), 'utf8');

export function construir() {
  return leer('kajabi/demo-curso.template.html')
    .replace('/*__CSS__*/', () => conImportant(leer('kajabi/demo-curso.css'), 'ag-demo'))
    .replace('/*__CONTENIDO__*/', () => quizParaNavegador(leer('lib/demo-curso/contenido.js')))
    .replace('/*__QUIZ__*/', () => quizParaNavegador(leer('lib/level-test/quiz.js')));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = construir();
  writeFileSync(path.join(raiz, 'kajabi/demo-curso.html'), html);
  console.log(`kajabi/demo-curso.html generado (${Math.round(html.length / 1024)} KB)`);
}
