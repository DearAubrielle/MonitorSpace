"""Camera incident storage using the existing alert_events columns.

Run one detector worker per camera. Clear-check counters are intentionally local;
after a restart or failed observation the worker must establish a fresh streak.
"""

from dataclasses import dataclass
import time


@dataclass(frozen=True)
class CameraEvent:
    id: int
    status: str


class CameraAlertEvents:
    def __init__(self, connect, clear_checks=3, clear_seconds=10, clock=time.monotonic):
        if clear_checks < 1 or clear_seconds < 0:
            raise ValueError("Invalid camera clear-check settings")
        self.connect = connect
        self.clear_checks = clear_checks
        self.clear_seconds = clear_seconds
        self.clock = clock
        self._clear_streaks = {}

    def observation_failed(self, camera_id):
        self._clear_streaks.pop(camera_id, None)

    def reset_observations(self):
        self._clear_streaks.clear()

    def observe(self, camera_id, detected):
        """Record one successful check (bool), or an unavailable check (None)."""
        conn = None
        cursor = None
        try:
            conn = self.connect()
            conn.start_transaction()
            cursor = conn.cursor(dictionary=True)
            # Serialize incident creation even when there is no event row to lock.
            # Read the current switch here rather than trusting a cached camera list.
            cursor.execute(
                """SELECT d.alert, dt.name AS device_type
                   FROM devices d
                   INNER JOIN device_type dt ON dt.id = d.device_type_id
                   WHERE d.id = %s FOR UPDATE""",
                (camera_id,),
            )
            device = cursor.fetchone()
            if not device or device['device_type'] != 'Camera':
                self.observation_failed(camera_id)
                conn.commit()
                return None

            cursor.execute(
                """SELECT id, status FROM alert_events
                   WHERE device_id = %s AND status IN ('active', 'silenced')
                   ORDER BY started_at ASC, id ASC FOR UPDATE""",
                (camera_id,),
            )
            events = cursor.fetchall()
            event = CameraEvent(events[0]['id'], events[0]['status']) if events else None
            should_resolve = False

            if not device['alert']:
                self.observation_failed(camera_id)
                should_resolve = True
            elif detected is None:
                self.observation_failed(camera_id)
            elif detected:
                self.observation_failed(camera_id)
                if event is None:
                    cursor.execute(
                        """INSERT INTO alert_events
                           (device_id, direction, alert_value, threshold_value, status, started_at)
                           VALUES (%s, NULL, NULL, NULL, 'active', NOW())""",
                        (camera_id,),
                    )
                    event = CameraEvent(cursor.lastrowid, 'active')
            elif event is not None:
                now = self.clock()
                previous = self._clear_streaks.get(camera_id)
                if previous is None or previous[0] != event.id:
                    previous = (event.id, 0, now)
                count = previous[1] + 1
                self._clear_streaks[camera_id] = (event.id, count, previous[2])
                should_resolve = count >= self.clear_checks and now - previous[2] >= self.clear_seconds
            else:
                self.observation_failed(camera_id)

            if should_resolve:
                if event is not None:
                    cursor.execute(
                        """UPDATE alert_events SET status = 'resolved', resolved_at = NOW()
                           WHERE device_id = %s AND status IN ('active', 'silenced')""",
                        (camera_id,),
                    )
                self.observation_failed(camera_id)
                event = None

            conn.commit()
            return event
        except Exception:
            self.observation_failed(camera_id)
            if conn is not None:
                conn.rollback()
            raise
        finally:
            if cursor is not None:
                cursor.close()
            if conn is not None:
                conn.close()


class CameraAlertMonitor:
    """Commit an observation before attempting LINE delivery."""

    def __init__(self, events, notify, cooldown=10, clock=time.monotonic):
        self.events = events
        self.notify = notify
        self.cooldown = cooldown
        self.clock = clock
        self._last_notifications = {}

    def observe(self, camera, detected):
        camera_id = camera['device_id']
        event = self.events.observe(camera_id, detected)
        if event is None:
            self._last_notifications.pop(camera_id, None)
        elif detected and event.status == 'active':
            now = self.clock()
            previous = self._last_notifications.get(camera_id)
            if previous is None or previous[0] != event.id or now - previous[1] >= self.cooldown:
                # Throttle failed delivery attempts too; the saved event survives.
                self._last_notifications[camera_id] = (event.id, now)
                self.notify(camera)
        return event
