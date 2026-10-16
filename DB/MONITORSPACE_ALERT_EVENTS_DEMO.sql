-- Optional presentation data for alert history.
-- Import once after the demo users and devices have been inserted and after
-- DB/migrations/20261016_create_alert_events.sql has been applied.

INSERT INTO alert_events (
  device_id,
  direction,
  alert_value,
  threshold_value,
  status,
  started_at,
  silenced_at,
  silenced_by_user_id,
  resolved_at
)
VALUES
  (5, 'above_max', 412.00, 300.00, 'active',
    DATE_SUB(NOW(), INTERVAL 12 MINUTE), NULL, NULL, NULL),
  (4, 'above_max', 31.20, 30.00, 'silenced',
    DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 110 MINUTE), 1, NULL),
  (1, 'above_max', 42.80, 40.00, 'resolved',
    DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL,
    DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 9 MINUTE)),
  (1, 'below_min', 8.40, 10.00, 'resolved',
    DATE_SUB(NOW(), INTERVAL 6 DAY), NULL, NULL,
    DATE_ADD(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 14 MINUTE)),
  (5, 'above_max', 486.00, 300.00, 'resolved',
    DATE_SUB(NOW(), INTERVAL 16 DAY), NULL, NULL,
    DATE_ADD(DATE_SUB(NOW(), INTERVAL 16 DAY), INTERVAL 7 MINUTE)),
  (4, 'below_min', 12.50, 18.00, 'resolved',
    DATE_SUB(NOW(), INTERVAL 45 DAY), NULL, NULL,
    DATE_ADD(DATE_SUB(NOW(), INTERVAL 45 DAY), INTERVAL 20 MINUTE));
