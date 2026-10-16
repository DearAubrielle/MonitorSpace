const test = require('node:test');
const assert = require('node:assert/strict');

const dbModulePath = require.resolve('../db');
require.cache[dbModulePath] = {
  id: dbModulePath,
  filename: dbModulePath,
  loaded: true,
  exports: { query: async () => [[]] },
};

const { getThresholdBreach, syncAlertEvents } = require('../services/alertEventsService');

test('getThresholdBreach detects enabled lower and upper threshold breaches', () => {
  assert.deepEqual(
    getThresholdBreach({ alert: 1, latest_value: '8.4', min_alert: '10', max_alert: '40' }),
    { direction: 'below_min', value: 8.4, threshold: 10 }
  );
  assert.deepEqual(
    getThresholdBreach({ alert: true, latest_value: 42.8, min_alert: 10, max_alert: 40 }),
    { direction: 'above_max', value: 42.8, threshold: 40 }
  );
  assert.equal(
    getThresholdBreach({ alert: 0, latest_value: 42.8, min_alert: 10, max_alert: 40 }),
    null
  );
});

test('syncAlertEvents creates one active event for a new threshold breach', async () => {
  const calls = [];
  const query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT')) return [[]];
    return [{ affectedRows: 1 }];
  };

  const changes = await syncAlertEvents(
    [{ id: 5, alert: 1, latest_value: 412, min_alert: 0, max_alert: 300 }],
    query
  );

  assert.deepEqual(changes, { created: 1, resolved: 0 });
  const insert = calls.find((call) => call.sql.includes('INSERT INTO alert_events'));
  assert.deepEqual(insert.params, [5, 'above_max', 412, 300]);
});

test('syncAlertEvents does not duplicate an open event in the same direction', async () => {
  const calls = [];
  const query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT')) {
      return [[{ id: 19, device_id: 5, direction: 'above_max', status: 'active' }]];
    }
    return [{ affectedRows: 1 }];
  };

  const changes = await syncAlertEvents(
    [{ id: 5, alert: 1, latest_value: 420, min_alert: 0, max_alert: 300 }],
    query
  );

  assert.deepEqual(changes, { created: 0, resolved: 0 });
  assert.equal(calls.some((call) => call.sql.includes('INSERT INTO alert_events')), false);
  assert.equal(calls.some((call) => call.sql.includes('UPDATE alert_events')), false);
});

test('syncAlertEvents resolves an open event after the device returns to range', async () => {
  const calls = [];
  const query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT')) {
      return [[{ id: 19, device_id: 5, direction: 'above_max', status: 'active' }]];
    }
    return [{ affectedRows: 1 }];
  };

  const changes = await syncAlertEvents(
    [{ id: 5, alert: 1, latest_value: 250, min_alert: 0, max_alert: 300 }],
    query
  );

  assert.deepEqual(changes, { created: 0, resolved: 1 });
  const update = calls.find((call) => call.sql.includes('UPDATE alert_events'));
  assert.deepEqual(update.params, [19]);
});
