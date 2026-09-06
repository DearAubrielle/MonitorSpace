const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

test('creation reports upload timeout without inserting a floorplan', async (t) => {
  const dbPath = require.resolve('../db');
  const previous = require.cache[dbPath];
  let queries = 0;
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
    exports: { query: async () => { queries++; } } };
  const originalUpload = cloudinary.uploader.upload_stream;
  t.after(() => {
    cloudinary.uploader.upload_stream = originalUpload;
    if (previous) require.cache[dbPath] = previous;
    else delete require.cache[dbPath];
    delete require.cache[require.resolve('../routes/controllers/floorplansController')];
  });
  cloudinary.uploader.upload_stream = (options, callback) => {
    assert.equal(options.timeout, 120000);
    return { end: () => callback({ message: 'Request Timeout', http_code: 499, name: 'TimeoutError' }) };
  };
  const controller = require('../routes/controllers/floorplansController');
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).png().toBuffer();
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await controller.createFloorplan[1]({ body: { name: 'Test' }, file: { buffer } }, res);
  assert.equal(res.statusCode, 504);
  assert.match(res.body.message, /Image upload timed out/);
  assert.equal(queries, 0);
});
