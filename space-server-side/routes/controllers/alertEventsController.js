const db = require('../../db');

const VALID_DAY_FILTERS = new Set(['7', '30', '90', 'all']);
const VALID_STATUSES = new Set(['active', 'silenced', 'resolved']);

function normalizeAlertEvent(row) {
  return {
    ...row,
    alert_value: row.alert_value == null ? null : Number(row.alert_value),
    threshold_value: row.threshold_value == null ? null : Number(row.threshold_value),
  };
}

exports.getAlertEvents = async (req, res) => {
  const days = String(req.query.days ?? '30');
  const status = req.query.status == null ? null : String(req.query.status);

  if (!VALID_DAY_FILTERS.has(days)) {
    return res.status(400).json({ message: 'Days must be 7, 30, 90, or all' });
  }

  if (status && !VALID_STATUSES.has(status)) {
    return res.status(400).json({ message: 'Invalid alert status' });
  }

  const conditions = [];
  const params = [];

  if (days !== 'all') {
    conditions.push(`ae.started_at >= DATE_SUB(NOW(), INTERVAL ${Number(days)} DAY)`);
  }

  if (status) {
    conditions.push('ae.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await db.query(
      `SELECT
        ae.id,
        ae.device_id,
        d.name AS device_name,
        d.floorplan_id,
        dt.id AS device_type_id,
        dt.name AS device_type,
        dt.icon_url,
        dt.unit,
        ae.direction,
        ae.alert_value,
        ae.threshold_value,
        ae.status,
        ae.started_at,
        ae.silenced_at,
        ae.silenced_by_user_id,
        u.username AS silenced_by_username,
        ae.resolved_at
      FROM alert_events ae
      INNER JOIN devices d ON d.id = ae.device_id
      INNER JOIN device_type dt ON dt.id = d.device_type_id
      LEFT JOIN users u ON u.id = ae.silenced_by_user_id
      ${whereClause}
      ORDER BY ae.started_at DESC, ae.id DESC`,
      params
    );

    res.json(rows.map(normalizeAlertEvent));
  } catch (err) {
    console.error('Error fetching alert events:', err);
    res.status(500).json({ message: 'Unable to load alert history' });
  }
};

exports.normalizeAlertEvent = normalizeAlertEvent;
