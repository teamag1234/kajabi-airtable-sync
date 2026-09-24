import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etiquetaNivel, describirError } from '../lib/level-test/kajabi.js';

test('etiqueta de nivel en minúsculas', () => {
  assert.equal(etiquetaNivel('B1'), 'test-nivel-b1');
});

test('errores de Kajabi legibles para Airtable', () => {
  const e403 = { response: { status: 403, data: { errors: [{ title: 'Forbidden' }] } }, message: 'x' };
  assert.equal(describirError(e403), 'Error 403: Forbidden (la clave de la API no tiene permiso de escritura)');
  assert.equal(describirError(new Error('No existe en Kajabi el formulario "Test de nivel"')), 'Error: No existe en Kajabi el formulario "Test de nivel"');
});
