const test = require('node:test');
const assert = require('node:assert/strict');

const dbModulePath = require.resolve('../db');
const controllerModulePath = require.resolve('../routes/controllers/alertEventsController');

function loadController(query) {
  delete require.cache[controllerModulePath];
  require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: { query },
  };
  return require(controllerModulePath);
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('getAlertEvents rejects an unsupported date range', async () => {
  let queryCalled = false;
  const controller = loadController(async () => {
    queryCalled = true;
    return [[]];
  });
  const res = createResponse();

  await controller.getAlertEvents({ query: { days: '14' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: 'Days must be 7, 30, 90, or all' });
  assert.equal(queryCalled, false);
});

test('getAlertEvents applies date and status filters and normalizes decimal values', async () => {
  const calls = [];
  const controller = loadController(async (sql, params) => {
    calls.push({ sql, params });
    return [[{
      id: 8,
      alert_value: '31.20',
      threshold_value: '30.00',
      status: 'resolved',
    }]];
  });
  const res = createResponse();

  await controller.getAlertEvents({ query: { days: '7', status: 'resolved' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INTERVAL 7 DAY/);
  assert.match(calls[0].sql, /ae\.status = \?/);
  assert.deepEqual(calls[0].params, ['resolved']);
  assert.equal(res.body[0].alert_value, 31.2);
  assert.equal(res.body[0].threshold_value, 30);
});

test('getAlertEvents leaves the all-time query without a date condition', async () => {
  let capturedSql = '';
  const controller = loadController(async (sql) => {
    capturedSql = sql;
    return [[]];
  });
  const res = createResponse();

  await controller.getAlertEvents({ query: { days: 'all' } }, res);

  assert.equal(res.statusCode, 200);
  assert.doesNotMatch(capturedSql, /DATE_SUB/);
});
