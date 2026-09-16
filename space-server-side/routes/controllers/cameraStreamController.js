const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../../db');

const STREAM_TOKEN_AUDIENCE = 'camera-stream';
const STREAM_TOKEN_TTL = '5m';

function getStreamSecret() {
  return process.env.CAMERA_STREAM_SECRET || process.env.ACCESS_SECRET;
}

async function findCamera(deviceId) {
  const [rows] = await db.query(
    `SELECT d.id, d.path_topic
     FROM devices d
     INNER JOIN device_type dt ON dt.id = d.device_type_id
     WHERE d.id = ? AND LOWER(dt.name) = 'camera'
     LIMIT 1`,
    [deviceId]
  );

  return rows[0];
}

exports.createStreamToken = async (req, res) => {
  const deviceId = Number(req.params.id);

  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    return res.status(400).json({ message: 'Invalid camera ID' });
  }

  try {
    const camera = await findCamera(deviceId);

    if (!camera) {
      return res.status(404).json({ message: 'Camera not found' });
    }

    if (!camera.path_topic?.trim()) {
      return res.status(404).json({ message: 'Camera stream URL is not configured' });
    }

    const token = jwt.sign(
      { purpose: STREAM_TOKEN_AUDIENCE, deviceId },
      getStreamSecret(),
      {
        audience: STREAM_TOKEN_AUDIENCE,
        subject: String(req.user.id),
        expiresIn: STREAM_TOKEN_TTL,
      }
    );

    res.json({
      streamPath: `/api/camera-streams/${deviceId}?token=${encodeURIComponent(token)}`,
      expiresInSeconds: 300,
    });
  } catch (error) {
    console.error('Error creating camera stream token:', error.message);
    res.status(500).json({ message: 'Could not create camera stream URL' });
  }
};

exports.streamCamera = async (req, res) => {
  const deviceId = Number(req.params.id);
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  if (!Number.isInteger(deviceId) || deviceId <= 0 || !token) {
    return res.status(400).json({ message: 'Invalid camera stream request' });
  }

  try {
    const payload = jwt.verify(token, getStreamSecret(), {
      audience: STREAM_TOKEN_AUDIENCE,
    });

    if (payload.purpose !== STREAM_TOKEN_AUDIENCE || Number(payload.deviceId) !== deviceId) {
      return res.status(403).json({ message: 'Invalid camera stream token' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Camera stream token is invalid or expired' });
  }

  let upstream;

  try {
    const camera = await findCamera(deviceId);
    const cameraUrl = camera?.path_topic?.trim();

    if (!cameraUrl) {
      return res.status(404).json({ message: 'Camera stream is not configured' });
    }

    const parsedUrl = new URL(cameraUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ message: 'Camera stream URL must use HTTP or HTTPS' });
    }

    upstream = await axios.get(cameraUrl, {
      responseType: 'stream',
      timeout: 10000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    res.status(upstream.status);
    res.setHeader(
      'Content-Type',
      upstream.headers['content-type'] || 'multipart/x-mixed-replace'
    );
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    upstream.data.on('error', (error) => {
      console.error(`Camera ${deviceId} stream error:`, error.message);
      res.destroy(error);
    });
    upstream.data.pipe(res);

    res.on('close', () => upstream?.data?.destroy());
  } catch (error) {
    upstream?.data?.destroy();
    console.error(`Camera ${deviceId} proxy error:`, error.message);

    if (!res.headersSent) {
      res.status(502).json({ message: 'Could not connect to the camera stream' });
    } else {
      res.destroy();
    }
  }
};
