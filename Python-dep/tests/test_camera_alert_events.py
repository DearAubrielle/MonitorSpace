"""Exercise persisted lifecycles with SQLite; no cameras, LINE, or live DB needed.

The adapter translates MySQL placeholders/time/locking syntax. These tests do
not verify MySQL's lock behavior; the deployed worker uses SELECT FOR UPDATE.
"""

import sqlite3
import unittest

from camera_alert_events import CameraAlertEvents, CameraAlertMonitor


class Cursor:
    def __init__(self, db):
        self.cursor = db.cursor()

    def execute(self, sql, params=()):
        sql = sql.replace('%s', '?').replace(' FOR UPDATE', '').replace('NOW()', 'CURRENT_TIMESTAMP')
        self.cursor.execute(sql, params)

    def fetchone(self):
        row = self.cursor.fetchone()
        return dict(row) if row else None

    def fetchall(self):
        return [dict(row) for row in self.cursor.fetchall()]

    @property
    def lastrowid(self):
        return self.cursor.lastrowid

    def close(self):
        self.cursor.close()


class Connection:
    def __init__(self, db):
        self.db = db

    def start_transaction(self):
        self.db.execute('BEGIN IMMEDIATE')

    def cursor(self, dictionary):
        return Cursor(self.db)

    def commit(self):
        self.db.commit()

    def rollback(self):
        self.db.rollback()

    def close(self):
        # The fixture owns the shared in-memory database.
        pass


class CameraAlertTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:', isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        self.db.executescript("""
            CREATE TABLE device_type (id INTEGER PRIMARY KEY, name TEXT);
            CREATE TABLE devices (id INTEGER PRIMARY KEY, device_type_id INTEGER, alert INTEGER);
            CREATE TABLE alert_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER,
                direction TEXT, alert_value REAL, threshold_value REAL, status TEXT,
                started_at TEXT, resolved_at TEXT,
                silenced_at TEXT, silenced_by_user_id INTEGER
            );
            INSERT INTO device_type VALUES (1, 'Camera'), (2, 'Gas');
            INSERT INTO devices VALUES (7, 1, 1), (8, 1, 1), (9, 2, 1);
        """)
        self.now = 0
        self.events = self.new_worker()
        self.camera = {'device_id': 7}

    def new_worker(self):
        return CameraAlertEvents(lambda: Connection(self.db), clock=lambda: self.now)

    def rows(self):
        return [dict(row) for row in self.db.execute('SELECT * FROM alert_events ORDER BY id')]

    def observe_at(self, time, detected, camera_id=7):
        self.now = time
        return self.events.observe(camera_id, detected)

    def test_repeated_detections_reuse_one_event_with_null_thresholds(self):
        first = self.events.observe(7, True)
        self.assertEqual(first, self.observe_at(30, True))
        row, = self.rows()
        self.assertEqual(row['status'], 'active')
        self.assertIsNotNone(row['started_at'])
        for field in ('direction', 'alert_value', 'threshold_value', 'resolved_at'):
            self.assertIsNone(row[field])

    def test_restart_reuses_active_or_silenced_incident(self):
        first = self.events.observe(7, True)
        self.assertEqual(self.new_worker().observe(7, True).id, first.id)
        self.db.execute("UPDATE alert_events SET status = 'silenced', silenced_by_user_id = 4")
        resumed = self.new_worker().observe(7, True)
        self.assertEqual(resumed.id, first.id)
        self.assertEqual(resumed.status, 'silenced')
        self.assertEqual(len(self.rows()), 1)

    def test_resolution_requires_both_three_checks_and_ten_seconds(self):
        self.events.observe(7, True)
        self.observe_at(1, False)
        self.observe_at(2, False)
        self.assertEqual(self.observe_at(3, False).status, 'active')
        self.assertIsNone(self.observe_at(11, False))
        row, = self.rows()
        self.assertEqual(row['status'], 'resolved')
        self.assertIsNotNone(row['resolved_at'])

    def test_elapsed_time_alone_does_not_resolve(self):
        self.events.observe(7, True)
        self.observe_at(1, False)
        self.assertEqual(self.observe_at(100, False).status, 'active')
        self.assertIsNone(self.observe_at(101, False))

    def test_missing_frame_resets_the_clear_streak(self):
        self.events.observe(7, True)
        self.observe_at(1, False)
        self.observe_at(6, False)
        self.assertEqual(self.observe_at(100, None).status, 'active')
        self.observe_at(101, False)
        self.assertEqual(self.observe_at(106, False).status, 'active')
        self.assertIsNone(self.observe_at(111, False))

    def test_new_detection_resets_the_clear_streak(self):
        self.events.observe(7, True)
        self.observe_at(1, False)
        self.observe_at(6, False)
        self.observe_at(11, True)
        self.assertEqual(self.observe_at(20, False).status, 'active')

    def test_restart_requires_a_fresh_clear_streak(self):
        self.events.observe(7, True)
        self.observe_at(1, False)
        self.observe_at(6, False)
        self.events = self.new_worker()
        self.assertEqual(self.observe_at(100, False).status, 'active')

    def test_camera_list_failure_resets_all_clear_streaks(self):
        self.events.observe(7, True)
        self.observe_at(1, False)
        self.observe_at(6, False)
        self.events.reset_observations()
        self.assertEqual(self.observe_at(100, False).status, 'active')

    def test_silenced_event_resolves_without_losing_silence_audit(self):
        self.events.observe(7, True)
        self.db.execute("UPDATE alert_events SET status = 'silenced', silenced_by_user_id = 4, silenced_at = CURRENT_TIMESTAMP")
        self.observe_at(1, False)
        self.observe_at(6, False)
        self.observe_at(11, False)
        row, = self.rows()
        self.assertEqual(row['status'], 'resolved')
        self.assertEqual(row['silenced_by_user_id'], 4)
        self.assertIsNotNone(row['silenced_at'])

    def test_disabled_camera_closes_incident_even_without_footage(self):
        self.events.observe(7, True)
        self.db.execute('UPDATE devices SET alert = 0 WHERE id = 7')
        self.assertIsNone(self.events.observe(7, None))
        self.assertEqual(self.rows()[0]['status'], 'resolved')
        self.assertIsNone(self.events.observe(7, True))
        self.assertEqual(len(self.rows()), 1)

    def test_unknown_or_sensor_devices_cannot_create_camera_incidents(self):
        self.assertIsNone(self.events.observe(404, True))
        self.assertIsNone(self.events.observe(9, True))
        self.assertEqual(self.rows(), [])

    def test_cameras_have_independent_lifecycles(self):
        self.events.observe(7, True)
        other = self.events.observe(8, True)
        self.observe_at(1, False)
        self.observe_at(6, False)
        self.observe_at(11, False)
        self.assertEqual(self.events.observe(8, True), other)
        self.assertEqual([row['status'] for row in self.rows()], ['resolved', 'active'])

    def test_database_error_rolls_back_and_resets_clear_streak(self):
        self.events.observe(7, True)
        self.observe_at(1, False)
        self.observe_at(6, False)

        class FailingConnection(Connection):
            def commit(self):
                raise RuntimeError('database unavailable')

        self.events.connect = lambda: FailingConnection(self.db)
        with self.assertRaisesRegex(RuntimeError, 'unavailable'):
            self.observe_at(11, False)
        self.assertEqual(self.rows()[0]['status'], 'active')
        self.events.connect = lambda: Connection(self.db)
        self.assertEqual(self.observe_at(20, False).status, 'active')

    def test_line_failure_leaves_saved_event_and_throttles_retries(self):
        sent = []

        def failing_line(camera):
            self.assertFalse(self.db.in_transaction)
            self.assertEqual(self.rows()[0]['status'], 'active')
            sent.append(camera['device_id'])
            raise RuntimeError('LINE unavailable')

        monitor = CameraAlertMonitor(self.events, failing_line, clock=lambda: self.now)
        with self.assertRaisesRegex(RuntimeError, 'LINE unavailable'):
            monitor.observe(self.camera, True)
        self.now = 5
        monitor.observe(self.camera, True)
        self.assertEqual(sent, [7])
        self.now = 10
        with self.assertRaisesRegex(RuntimeError, 'LINE unavailable'):
            monitor.observe(self.camera, True)
        self.assertEqual(len(self.rows()), 1)

    def test_silence_suppresses_line_and_later_incident_notifies_again(self):
        sent = []
        monitor = CameraAlertMonitor(self.events, lambda camera: sent.append(camera['device_id']), clock=lambda: self.now)
        monitor.observe(self.camera, True)
        self.db.execute("UPDATE alert_events SET status = 'silenced'")
        self.now = 20
        monitor.observe(self.camera, True)
        # Silence is also respected after the detector process restarts.
        monitor = CameraAlertMonitor(self.new_worker(), lambda camera: sent.append(camera['device_id']), clock=lambda: self.now)
        monitor.observe(self.camera, True)
        self.assertEqual(sent, [7])
        for time in (21, 26, 31):
            self.now = time
            monitor.observe(self.camera, False)
        self.now = 32
        monitor.observe(self.camera, True)
        self.assertEqual(sent, [7, 7])
        self.assertEqual([row['status'] for row in self.rows()], ['resolved', 'active'])


if __name__ == '__main__':
    unittest.main()
