import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDescriptorDefinition,
  normalizedCode,
  validateVarietalValue
} from './validation.js';

test('normalizedCode rejects whitespace and unsupported characters', () => {
  assert.equal(normalizedCode('SOY-PF-001'), 'SOY-PF-001');
  assert.throws(() => normalizedCode('SOY PF 001'), /no spaces/);
  assert.throws(() => normalizedCode('SOY@001'), /only letters/);
});

test('option descriptor requires at least two unique options', () => {
  assert.deepEqual(
    assertDescriptorDefinition({ data_type: 'option', allowed_values: ['Branca', 'Roxa'] }),
    ['Branca', 'Roxa']
  );
  assert.throws(() => assertDescriptorDefinition({ data_type: 'option', allowed_values: ['Roxa'] }), /at least two/);
  assert.throws(() => assertDescriptorDefinition({ data_type: 'option', allowed_values: ['Roxa', 'Roxa'] }), /duplicates/);
});

test('varietal value must match descriptor type', () => {
  assert.deepEqual(
    validateVarietalValue({ data_type: 'option', allowed_values: ['Branca', 'Roxa'] }, { value_text: 'Roxa' }),
    { value_text: 'Roxa', value_number: null, min_value: null, max_value: null, notes: undefined }
  );
  assert.throws(
    () => validateVarietalValue({ data_type: 'option', allowed_values: ['Branca', 'Roxa'] }, { value_text: 'Azul' }),
    /must be one of/
  );
  assert.throws(
    () => validateVarietalValue({ data_type: 'integer' }, { value_number: 6.2 }),
    /integer/
  );
});

test('range descriptor rejects inverted bounds', () => {
  assert.deepEqual(
    validateVarietalValue({ data_type: 'range' }, { min_value: 75, max_value: 95 }),
    { value_text: null, value_number: null, min_value: 75, max_value: 95, notes: undefined }
  );
  assert.throws(
    () => validateVarietalValue({ data_type: 'range' }, { min_value: 95, max_value: 75 }),
    /cannot be greater/
  );
});
