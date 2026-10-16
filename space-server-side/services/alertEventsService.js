const db = require('../db');

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getThresholdBreach(device) {
  const alertsEnabled = device.alert === true || Number(device.alert) === 1;
  const value = finiteNumber(device.latest_value);

  if (!alertsEnabled || value === null) return null;

  const minimum = finiteNumber(device.min_alert);
  const maximum = finiteNumber(device.max_alert);

  if (minimum !== null && value < minimum) {
    return { direction: 'below_min', value, threshold: minimum };
  }

  if (maximum !== null && value > maximum) {
    return { direction: 'above_max', value, threshold: maximum };
  }

  return null;
}

async function syncAlertEvents(devices, query = db.query.bind(db)) {
  const [openEvents] = await query(
    "SELECT id, device_id, direction, status FROM alert_events WHERE status IN ('active', 'silenced') ORDER BY started_at ASC, id ASC"
  );

  const openByDevice = new Map();
  for (const event of openEvents) {
    const deviceId = String(event.device_id);
    const events = openByDevice.get(deviceId) ?? [];
    events.push(event);
    openByDevice.set(deviceId, events);
  }

  const changes = { created: 0, resolved: 0 };

  for (const device of devices) {
    const deviceId = String(device.id);
    const breach = getThresholdBreach(device);
    const existingEvents = openByDevice.get(deviceId) ?? [];

    if (!breach) {
      for (const event of existingEvents) {
        await query(
          "UPDATE alert_events SET status = 'resolved', resolved_at = NOW() WHERE id = ? AND status IN ('active', 'silenced')",
          [event.id]
        );
        changes.resolved += 1;
      }
      continue;
    }

    const matchingEvent = existingEvents.find((event) => event.direction === breach.direction);

    for (const event of existingEvents) {
      if (event.direction === breach.direction) continue;
      await query(
        "UPDATE alert_events SET status = 'resolved', resolved_at = NOW() WHERE id = ? AND status IN ('active', 'silenced')",
        [event.id]
      );
      changes.resolved += 1;
    }

    if (!matchingEvent) {
      await query(
        `INSERT INTO alert_events
          (device_id, direction, alert_value, threshold_value, status, started_at)
         VALUES (?, ?, ?, ?, 'active', NOW())`,
        [device.id, breach.direction, breach.value, breach.threshold]
      );
      changes.created += 1;
    }
  }

  return changes;
}

module.exports = {
  finiteNumber,
  getThresholdBreach,
  syncAlertEvents,
};
