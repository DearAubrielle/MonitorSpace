const test = require('node:test');
const assert = require('node:assert/strict');

const dbModulePath = require.resolve('../db');
const controllerModulePath = require.resolve('../routes/controllers/devicesController');

const loadController = (query) => {
  delete require.cache[controllerModulePath];
  require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: { query },
  };
  return require(controllerModulePath);
};

const createResponse = () => ({
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
  sendStatus(code) {
    this.statusCode = code;
    return this;
  },
});

test('createDevice trims the name and checks duplicates globally', async () => {
  const calls = [];
  const query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM device_type')) return [[{ id: 4, name: 'Camera' }]];
    if (sql.includes('FROM floorplan')) return [[{ id: 1 }]];
    if (sql.includes('SELECT id FROM devices')) return [[]];
    if (sql.includes('INSERT INTO devices')) return [{ insertId: 42 }];
    throw new Error(`Unexpected query: ${sql}`);
  };
  const controller = loadController(query);
  const req = {
    body: { name: '  Sensor A  ', device_type_id: 4, floorplan_id: 1, path_topic: null },
  };
  const res = createResponse();

  await controller.createDevice(req, res);

  assert.equal(res.statusCode, 201);
  const duplicateCall = calls.find((call) => call.sql.includes('SELECT id FROM devices'));
  assert.equal(duplicateCall.sql.includes('floorplan_id'), false);
  assert.deepEqual(duplicateCall.params, ['Sensor A']);
  const insertCall = calls.find((call) => call.sql.includes('INSERT INTO devices'));
  assert.equal(insertCall.params[0], 'Sensor A');
});

test('createDevice returns 409 when the global duplicate pre-check finds a name', async () => {
  const query = async (sql) => {
    if (sql.includes('FROM device_type')) return [[{ id: 4, name: 'Camera' }]];
    if (sql.includes('FROM floorplan')) return [[{ id: 1 }]];
    if (sql.includes('SELECT id FROM devices')) return [[{ id: 9 }]];
    throw new Error(`Unexpected query: ${sql}`);
  };
  const controller = loadController(query);
  const req = {
    body: { name: 'Sensor A', device_type_id: 4, floorplan_id: 2, path_topic: null },
  };
  const res = createResponse();

  await controller.createDevice(req, res);

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { message: 'A device with this name already exists.' });
});

test('createDevice maps a database unique-index race to HTTP 409', async () => {
  const query = async (sql) => {
    if (sql.includes('FROM device_type')) return [[{ id: 4, name: 'Camera' }]];
    if (sql.includes('FROM floorplan')) return [[{ id: 1 }]];
    if (sql.includes('SELECT id FROM devices')) return [[]];
    if (sql.includes('INSERT INTO devices')) {
      const error = new Error('Duplicate entry');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
  const controller = loadController(query);
  const req = {
    body: { name: 'sensor a', device_type_id: 4, floorplan_id: 3, path_topic: null },
  };
  const res = createResponse();

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await controller.createDevice(req, res);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { message: 'A device with this name already exists.' });
});

test('saveEditDevice excludes the current device from the global duplicate check', async () => {
  const calls = [];
  const query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql === 'SELECT * FROM devices WHERE id = ?') return [[{ id: 7, device_type_id: 4 }]];
    if (sql.includes('SELECT id FROM devices WHERE name')) return [[]];
    if (sql.includes('FROM device_type')) return [[{ id: 4, name: 'Camera' }]];
    if (sql.includes('UPDATE devices SET name')) return [{ affectedRows: 1 }];
    throw new Error(`Unexpected query: ${sql}`);
  };
  const controller = loadController(query);
  const req = {
    params: { id: '7' },
    body: { name: '  Camera Main  ', floorplan_id: 2, path_topic: null },
  };
  const res = createResponse();

  await controller.saveEditDevice(req, res);

  assert.equal(res.statusCode, 200);
  const duplicateCall = calls.find((call) => call.sql.includes('SELECT id FROM devices WHERE name'));
  assert.deepEqual(duplicateCall.params, ['Camera Main', '7']);
  const updateCall = calls.find((call) => call.sql.includes('UPDATE devices SET name'));
  assert.equal(updateCall.params[0], 'Camera Main');
});

test('saveEditDevice returns 409 when another device already uses the name', async () => {
  const query = async (sql) => {
    if (sql === 'SELECT * FROM devices WHERE id = ?') return [[{ id: 7, device_type_id: 4 }]];
    if (sql.includes('SELECT id FROM devices WHERE name')) return [[{ id: 8 }]];
    throw new Error(`Unexpected query: ${sql}`);
  };
  const controller = loadController(query);
  const req = {
    params: { id: '7' },
    body: { name: 'Camera Main', floorplan_id: 2, path_topic: null },
  };
  const res = createResponse();

  await controller.saveEditDevice(req, res);

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { message: 'A device with this name already exists.' });
});
