-- Store one row for each threshold alert lifecycle.
-- Apply this migration before enabling the alert history API.

CREATE TABLE IF NOT EXISTS alert_events (
  id INT AUTO_INCREMENT PRIMARY KEY,

  device_id INT NOT NULL,

  direction ENUM('above_max', 'below_min') NULL,
  alert_value DECIMAL(10,2) NULL,
  threshold_value DECIMAL(10,2) NULL,

  status ENUM('active', 'silenced', 'resolved')
    NOT NULL DEFAULT 'active',

  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  silenced_at DATETIME NULL,
  silenced_by_user_id INT NULL,

  resolved_at DATETIME NULL,

  INDEX idx_alert_events_started_at (started_at),
  INDEX idx_alert_events_status_started_at (status, started_at),
  INDEX idx_alert_events_device_status (device_id, status),

  CONSTRAINT fk_alert_events_device
    FOREIGN KEY (device_id) REFERENCES devices(id),
  CONSTRAINT fk_alert_events_silenced_by
    FOREIGN KEY (silenced_by_user_id) REFERENCES users(id)
);
