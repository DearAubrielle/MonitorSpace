import { useEffect, useMemo, useState } from 'react';
import { getAlertEvents, type AlertDays } from '../api/alertEvents';
import { getApiErrorMessage } from '../api/apiError';
import { useFloorplan } from '../context/useFlooplan';
import type { AlertEvent, AlertStatus } from '../types/AlertEvent';
import { getDeviceIconUrl, handleDeviceIconError } from '../utils/deviceIcon';
import styles from './History.module.css';

const RANGE_OPTIONS: Array<{ value: AlertDays; label: string }> = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 'all', label: 'All time' },
];

const TYPE_ORDER = ['Temperature', 'Gas', 'Humidity', 'Camera'];

const numberFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

function formatReading(value: number | null, unit: string | null): string {
  if (value === null) return '—';
  return `${numberFormatter.format(value)}${unit ? ` ${unit}` : ''}`;
}

function eventDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string): string {
  const date = eventDate(value);
  return date
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
    : '—';
}

function formatTime(value: string): string {
  const date = eventDate(value);
  return date
    ? new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
    : '—';
}

function formatDuration(startValue: string, endValue: string | null): string | null {
  if (!endValue) return null;
  const start = eventDate(startValue);
  const end = eventDate(endValue);
  if (!start || !end) return null;

  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function directionLabel(event: AlertEvent): string {
  if (event.direction === 'below_min') return 'Below minimum';
  if (event.direction === 'above_max') return 'Above maximum';
  return 'Threshold alert';
}

function detailText(event: AlertEvent): string {
  const thresholdKind = event.direction === 'below_min' ? 'minimum' : 'maximum';
  return `Recorded ${formatReading(event.alert_value, event.unit)} against the ${thresholdKind} threshold of ${formatReading(
    event.threshold_value,
    event.unit
  )}.`;
}

function outcomeText(event: AlertEvent): string {
  if (event.status === 'active') return 'Still active';

  const silencedBy = event.silenced_by_username
    ? `Silenced by ${event.silenced_by_username}`
    : event.silenced_at
      ? 'Silenced'
      : null;

  if (event.status === 'silenced') {
    return silencedBy ?? 'Silenced';
  }

  const duration = formatDuration(event.started_at, event.resolved_at);
  const resolution = duration ? `Resolved automatically after ${duration}` : 'Resolved automatically';
  return silencedBy ? `${silencedBy} · ${resolution}` : resolution;
}

function statusLabel(status: AlertStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function History() {
  const { deviceTypes } = useFloorplan();
  const [days, setDays] = useState<AlertDays>(30);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    getAlertEvents(days, { signal: controller.signal })
      .then((data) => {
        setEvents(data);
        setExpandedIds(new Set());
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(getApiErrorMessage(requestError, 'Unable to load alert history.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [days, reloadKey]);

  const typeOptions = useMemo(() => {
    const typeMap = new Map<number, { id: number; name: string; iconUrl: string | null }>();

    deviceTypes?.forEach((type) => {
      typeMap.set(type.id, { id: type.id, name: type.name, iconUrl: type.icon_url });
    });
    events.forEach((event) => {
      if (!typeMap.has(event.device_type_id)) {
        typeMap.set(event.device_type_id, {
          id: event.device_type_id,
          name: event.device_type,
          iconUrl: event.icon_url,
        });
      }
    });

    return [...typeMap.values()].sort((a, b) => {
      const aIndex = TYPE_ORDER.indexOf(a.name);
      const bIndex = TYPE_ORDER.indexOf(b.name);
      if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [deviceTypes, events]);

  const filteredEvents = useMemo(
    () => events.filter((event) => selectedType === null || event.device_type_id === selectedType),
    [events, selectedType]
  );

  const toggleExpanded = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <section className={styles.pageHeading} aria-labelledby="history-title">
          <div>
            <h1 id="history-title">Alert History</h1>
            <p>Review alert activity across every monitored device.</p>
          </div>

          <div className={styles.rangeSwitch} aria-label="Alert history date range">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={days === option.value ? styles.rangeActive : ''}
                aria-pressed={days === option.value}
                onClick={() => setDays(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.typeCounts} aria-label="Filter by device type">
          {typeOptions.map((type) => {
            const count = events.filter((event) => event.device_type_id === type.id).length;
            const isActive = selectedType === type.id;

            return (
              <button
                key={type.id}
                type="button"
                className={`${styles.typeCount} ${isActive ? styles.typeCountActive : ''}`}
                aria-pressed={isActive}
                onClick={() => setSelectedType(isActive ? null : type.id)}
              >
                <span className={styles.typeIcon} aria-hidden="true">
                  <img
                    src={getDeviceIconUrl(type.iconUrl)}
                    alt=""
                    onError={handleDeviceIconError}
                  />
                </span>
                <span className={styles.typeCopy}>
                  <strong>{count}</strong>
                  <span>{type.name}</span>
                </span>
              </button>
            );
          })}
        </section>

        <section className={styles.historyPanel} aria-labelledby="activity-heading">
          <header className={styles.panelHead}>
            <div>
              <h2 id="activity-heading">Alert activity</h2>
              <p>Newest alerts appear first.</p>
            </div>
            {!loading && !error && (
              <span className={styles.resultCount} aria-live="polite">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'alert' : 'alerts'}
              </span>
            )}
          </header>

          {loading && <div className={styles.messageState}>Loading alert history…</div>}

          {!loading && error && (
            <div className={`${styles.messageState} ${styles.errorState}`} role="alert">
              <strong>Alert history could not be loaded.</strong>
              <span>{error}</span>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filteredEvents.length === 0 && (
            <div className={styles.emptyState}>
              <div>
                <strong>No alerts in this period</strong>
                <p>Your monitored devices stayed within their configured thresholds.</p>
              </div>
              {selectedType !== null && (
                <button className={styles.emptyAction} type="button" onClick={() => setSelectedType(null)}>
                  Show all device types
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredEvents.length > 0 && (
            <div className={styles.alertList}>
              {filteredEvents.map((event) => {
                const expanded = expandedIds.has(event.id);
                const detailsId = `alert-details-${event.id}`;

                return (
                  <article
                    key={event.id}
                    className={`${styles.alertRow} ${expanded ? styles.alertRowExpanded : ''}`}
                  >
                    <button
                      type="button"
                      className={styles.alertSummary}
                      aria-expanded={expanded}
                      aria-controls={detailsId}
                      onClick={() => toggleExpanded(event.id)}
                    >
                      <span className={styles.deviceIcon} aria-hidden="true">
                        <img
                          src={getDeviceIconUrl(event.icon_url)}
                          alt=""
                          onError={handleDeviceIconError}
                        />
                      </span>

                      <span className={styles.deviceCopy}>
                        <strong>{event.device_name}</strong>
                        <span className={styles.deviceSubtitle}>
                          <span>{event.device_type}</span>
                          <span className={styles.subtitleDot} aria-hidden="true" />
                          <span className={styles.thresholdNote}>{directionLabel(event)}</span>
                        </span>
                      </span>

                      <span
                        className={`${styles.eventStatus} ${
                          event.status === 'active' ? styles.statusActive : styles.statusNeutral
                        }`}
                      >
                        {statusLabel(event.status)}
                      </span>

                      <span className={styles.valuePill}>{formatReading(event.alert_value, event.unit)}</span>

                      <span className={styles.alertDate}>
                        <strong>{formatDate(event.started_at)}</strong>
                        <span>{formatTime(event.started_at)}</span>
                      </span>
                    </button>

                    <div className={styles.alertDetails} id={detailsId} hidden={!expanded}>
                      <span>{detailText(event)}</span>
                      <span
                        className={`${styles.eventOutcome} ${
                          event.status === 'active' ? styles.outcomeActive : ''
                        }`}
                      >
                        {outcomeText(event)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
