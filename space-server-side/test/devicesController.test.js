const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const dbModulePath = require.resolve('../db');
const controllerModulePath = require.resolve('../routes/controllers/devicesController');
const cameraControllerModulePath = require.resolve('../routes/controllers/cameraStreamController');
const streamSecret = 'camera-stream-test-secret';

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

const loadCameraController = (query) => {
  delete require.cache[cameraControllerModulePath];
  require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: { query },
  };
  return require(cameraControllerModulePath);
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

test('createStreamToken creates a short-lived token scoped to the camera', async () => {
  process.env.CAMERA_STREAM_SECRET = streamSecret;
  const controller = loadCameraController(async (_sql, params) => {
    assert.deepEqual(params, [12]);
    return [[{ id: 12, path_topic: 'http://camera.example/stream' }]];
  });
  const req = { params: { id: '12' }, user: { id: 7 } };
  const res = createResponse();

  await controller.createStreamToken(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.expiresInSeconds, 300);
  const streamUrl = new URL(res.body.streamPath, 'https://server.example');
  const payload = jwt.verify(streamUrl.searchParams.get('token'), streamSecret, {
    audience: 'camera-stream',
  });
  assert.equal(payload.deviceId, 12);
  assert.equal(payload.sub, '7');
  assert.equal(payload.purpose, 'camera-stream');
});

test('streamCamera rejects a token issued for another camera', async () => {
  process.env.CAMERA_STREAM_SECRET = streamSecret;
  let queryCalled = false;
  const controller = loadCameraController(async () => {
    queryCalled = true;
    return [[]];
  });
  const token = jwt.sign(
    { purpose: 'camera-stream', deviceId: 10 },
    streamSecret,
    { audience: 'camera-stream', expiresIn: '5m' }
  );
  const req = { params: { id: '11' }, query: { token } };
  const res = createResponse();

  await controller.streamCamera(req, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { message: 'Invalid camera stream token' });
  assert.equal(queryCalled, false);
});

test('streamCamera rejects a non-HTTP camera path from the database', async () => {
  process.env.CAMERA_STREAM_SECRET = streamSecret;
  const controller = loadCameraController(async () => [[{ id: 12, path_topic: 'file:///secret' }]]);
  const token = jwt.sign(
    { purpose: 'camera-stream', deviceId: 12 },
    streamSecret,
    { audience: 'camera-stream', expiresIn: '5m' }
  );
  const req = { params: { id: '12' }, query: { token } };
  const res = createResponse();

  await controller.streamCamera(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: 'Camera stream URL must use HTTP or HTTPS' });
});
