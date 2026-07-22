const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDeviceName, isDuplicateEntryError } = require('../routes/utils/deviceName');

test('normalizeDeviceName trims only leading and trailing whitespace', () => {
  assert.equal(normalizeDeviceName('  Sensor A  '), 'Sensor A');
  assert.equal(normalizeDeviceName('Sensor  A'), 'Sensor  A');
});

test('normalizeDeviceName returns an empty string for non-string input', () => {
  assert.equal(normalizeDeviceName(null), '');
  assert.equal(normalizeDeviceName(undefined), '');
  assert.equal(normalizeDeviceName(123), '');
});

test('isDuplicateEntryError recognizes MySQL duplicate-entry errors', () => {
  assert.equal(isDuplicateEntryError({ code: 'ER_DUP_ENTRY' }), true);
  assert.equal(isDuplicateEntryError({ code: 'ER_BAD_NULL_ERROR' }), false);
  assert.equal(isDuplicateEntryError(null), false);
});
