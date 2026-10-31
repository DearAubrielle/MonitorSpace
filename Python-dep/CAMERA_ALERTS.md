# Camera alert events

The camera worker configured in `Procfile` is `Python-dep/Camera.py`. It stores
fall-detection incidents in the existing `alert_events` table. No schema migration
is needed. The `Python_camera` directory contains a separate older script; it is
not the worker configured by this Procfile.

## Behavior

- A possible fall creates one active event per camera. Repeated detections reuse
  the open event, including after a worker restart.
- Camera records leave `direction`, `alert_value`, and `threshold_value` NULL.
  The API and UI identify them through the camera's device type.
- LINE attempts retain the ten-second cooldown. Silencing the event suppresses
  further LINE attempts for that incident. Saving the event happens before LINE
  delivery, so a delivery error does not remove its history.
- Three or more consecutive successful checks without a detection, spanning at
  least ten seconds, resolve the event. Missing footage or failed processing
  resets the clear-check streak. A restart also requires a fresh streak.
- Turning off the camera's alert switch closes its open incident when the worker
  next processes that camera, even when footage is unavailable.
- A later incident creates a new record and can notify again.
- History shows first detection, silence details, and generic resolution. The
  existing schema does not store last detection time or resolution reason.

Run one detector worker per camera: clear-check counters live in process memory.
Database transactions lock the camera row before creating an event to serialize
creation. Database outages are logged and processing retries on subsequent
checks; observations are not durably queued while the database is unavailable.

## Rollout and checks

1. Deploy/restart the updated Node backend first. Its sensor synchronization must
   exclude cameras before the worker starts writing camera events.
2. Deploy the client so the alert panel and History display camera descriptions.
3. Deploy both `Camera.py` and `camera_alert_events.py`, then restart the worker
   from the `Python-dep` directory with `python Camera.py`.
4. Verify a controlled detection appears in Alerts and the Camera history filter,
   repeated detections share one row, silence suppresses repeats, and clear
   checks resolve it. Verify disconnecting the camera does not resolve it.

Run `python -B -m unittest discover -s tests -v` from `Python-dep` for offline
tests. They use SQLite to exercise stored lifecycles and stub camera/model/LINE
dependencies. They do not validate live MySQL locking, video inference quality,
or actual LINE delivery.
