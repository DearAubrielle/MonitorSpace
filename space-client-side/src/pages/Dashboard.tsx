import stylesD from './dashboard.module.css';
import stylesF from './FloorPlan.module.css';
import { useRef, useEffect, useState, useCallback } from 'react';
import MonitorPage from './MonitorPage';
import { PercentPosition } from '../components/DraggableBox';
import FloorplanView from '../components/Floorplan';
import DeviceInfoModal from '../components/DeviceInfoModal';
import { useDeviceMonitoring } from '../hooks/useDeviceMonitoring';
import UnassignedDevicesView from '../components/UnassignedDevicesView';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
import type { Device } from '../types/Device';
import { useFloorplan } from '../context/useFlooplan';

interface FloorPlanProps {
  deviceValues: Record<string, number>;
  getDeviceValue: (device: Device) => number;
  getDeviceAlert: (device: Device) => boolean;
}

function FloorPlan({ deviceValues, getDeviceValue, getDeviceAlert }: FloorPlanProps) {
  const { floorplans, selected, setSelected, devices, deviceTypes } = useFloorplan();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });
  const [loadedFloorplanId, setLoadedFloorplanId] = useState<number | null>(null);

  const [modalDevice, setModalDevice] = useState<Device | null>(null);

  const handleDeviceClick = useCallback((device: Device) => {
    setModalDevice(device);
  }, []);

  const closeModal = useCallback(() => {
    setModalDevice(null);
  }, []);

  // When selected floorplan changes, load its image and set container size
  useEffect(() => {
    if (selected && selected.image_url) {
      let cancelled = false;
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        setContainerSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        setLoadedFloorplanId(selected.id);
      };
      img.onerror = () => {
        if (!cancelled) setLoadedFloorplanId(null);
      };
      // Handle both Cloudinary URLs (start with http) and local URLs
      img.src = selected.image_url.startsWith('http') ? selected.image_url : SERVER_URL + selected.image_url;

      return () => {
        cancelled = true;
      };
    }

    setLoadedFloorplanId(selected?.id ?? null);
  }, [selected]);

  // Update rendered size on window resize for responsive layout
  const [renderedSize, setRenderedSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setRenderedSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [containerSize.width, containerSize.height, loadedFloorplanId]);

  // Store device positions separately for drag state
  const [devicePositions, setDevicePositions] = useState<Record<string, PercentPosition>>({});

  // Update devicePositions when devices or selected floorplan changes
  useEffect(() => {
    if (!selected) return;
    const filtered = devices?.filter((d) => d.floorplan_id === selected.id);
    const positions: Record<string, PercentPosition> = {};
    filtered?.forEach((device) => {
      positions[device.id] = { x: device.x_percent, y: device.y_percent };
    });
    setDevicePositions(positions);
  }, [devices, selected]);

  return (
    <div className={stylesF.Wrapper}>
      <div className={stylesF.FloorList}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#212529' }}>Floor Plans</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[...(floorplans ?? [])]
            .sort((a, b) => {
              if (a.name === 'Unassigned' && b.name !== 'Unassigned') return 1;
              if (b.name === 'Unassigned' && a.name !== 'Unassigned') return -1;
              return a.id - b.id;
            })
            .map((plan) => {
              const activeAlertCount = devices?.filter(
                (device) =>
                  Number(device.floorplan_id) === Number(plan.id) && getDeviceAlert(device)
              ).length ?? 0;

              return (
                <li
                  key={plan.id}
                  onClick={() => setSelected(plan)}
                  className={`${stylesF.List} ${selected?.id === plan.id ? stylesF.Selected : stylesF.Unselected}`}
                >
                  <span className={stylesF.floorListContent}>
                    <span>{plan.name === 'Unassigned' ? 'Unplaced Devices' : plan.name}</span>
                    {activeAlertCount > 0 && (
                      <span className={stylesF.alertDetail} role="status">
                        {activeAlertCount} active {activeAlertCount === 1 ? 'alert' : 'alerts'}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
        </ul>
      </div>

      <div className={stylesF.FloorPlan}>
        {selected?.name === 'Unassigned' ? (
          <UnassignedDevicesView
            devices={devices?.filter((device) => Number(device.floorplan_id) === Number(selected.id)) ?? []}
            deviceTypes={deviceTypes ?? []}
            getDeviceValue={getDeviceValue}
            getDeviceAlert={getDeviceAlert}
            onDeviceClick={handleDeviceClick}
          />
        ) : selected && loadedFloorplanId === selected.id ? (
          <div key={selected.id} ref={containerRef} style={{ width: '100%' }}>
            <FloorplanView
              imageUrl={
                selected.image_url && selected.image_url.startsWith('http')
                  ? selected.image_url
                  : SERVER_URL + selected.image_url
              }
              originalWidth={containerSize.width}
              originalHeight={containerSize.height}
              devices={
                devices?.filter((device) => Number(device.floorplan_id) === Number(selected.id)) ?? []
              }
              deviceTypes={deviceTypes ?? []}
              devicePositions={devicePositions}
              renderedSize={renderedSize}
              onDeviceClick={handleDeviceClick}
              getDeviceValue={getDeviceValue}
              getDeviceAlert={getDeviceAlert}
            />
          </div>
        ) : selected ? (
          <div className={stylesF.emptyState} role="status" aria-live="polite">
            <p>Loading floorplan...</p>
          </div>
        ) : (
          <div className={stylesF.emptyState}>
            <div className={stylesF.emptyIcon}>🏠</div>
            <h3>Select a Floor Plan</h3>
            <p>Choose a floor plan from the list to view your devices</p>
          </div>
        )}
      </div>

      <div className={stylesF.Description}>
        {selected ? (
          <div>
            <h3>Description</h3>
            <p>{selected.description}</p>
          </div>
        ) : (
          <div>
            <h3>Welcome to Floor Plan Monitor</h3>
            <p>Select a floor plan from the list to view device locations and real-time monitoring data.</p>
          </div>
        )}
      </div>

      <DeviceInfoModal
        device={modalDevice}
        deviceTypes={deviceTypes}
        deviceValues={deviceValues}
        onClose={closeModal}
      />
    </div>
  );
}
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'Floorplan' | 'Camera'>('Floorplan');
  const [awaitingFreshData, setAwaitingFreshData] = useState(false);
  const hasReceivedDataRef = useRef(false);
  const recoveryPendingRef = useRef(false);
  const recoveryStartedAfterMessageRef = useRef<number | null>(null);
  const { deviceValues, isConnected, lastMessageAt, getDeviceValue, getDeviceAlert } = useDeviceMonitoring();

  useEffect(() => {
    if (!isConnected) {
      if (hasReceivedDataRef.current && !recoveryPendingRef.current) {
        recoveryPendingRef.current = true;
        recoveryStartedAfterMessageRef.current = lastMessageAt;
        setAwaitingFreshData(true);
      }
    }
  }, [isConnected, lastMessageAt]);

  useEffect(() => {
    if (lastMessageAt === null) return;

    hasReceivedDataRef.current = true;

    const receivedFreshRecoveryData =
      recoveryStartedAfterMessageRef.current === null ||
      lastMessageAt > recoveryStartedAfterMessageRef.current;

    if (isConnected && recoveryPendingRef.current && receivedFreshRecoveryData) {
      recoveryPendingRef.current = false;
      recoveryStartedAfterMessageRef.current = null;
      setAwaitingFreshData(false);
    }
  }, [isConnected, lastMessageAt]);

  const handleTabChange = (tab: 'Floorplan' | 'Camera') => {
    setActiveTab(tab);
  };

  return (
    <>
      <div className={stylesD.dashboardContainer}>
        <div className={stylesD.dashboardWrapper}>
          <div className={stylesD.pageHeader}>
            <div className={stylesD.headerSection}>
              <div className={stylesD.pageTitleRow}>
                <h3 className={stylesD.pageTitle}>{activeTab === 'Floorplan' ? 'Floorplan' : 'Camera'}</h3>
                {activeTab === 'Floorplan' &&
                  hasReceivedDataRef.current &&
                  (!isConnected || awaitingFreshData) && (
                  <div
                    className={`${stylesD.connectionBadge} ${stylesD.connectionBadgeConnecting}`}
                    role="status"
                    aria-live="polite"
                  >
                    <span className={stylesD.connectionBadgeDot} aria-hidden="true" />
                    Reconnecting…
                  </div>
                )}
              </div>
              <p className={stylesD.pageSubtitle}>
                {activeTab === 'Floorplan'
                  ? 'Monitor your devices in real time on the floorplan'
                  : 'Monitor your camera feeds in real time'}
              </p>
            </div>
            <div className={stylesD.tabNavigation} role="tablist" aria-label="Dashboard view">
              <button
                onClick={() => handleTabChange('Floorplan')}
                className={`${stylesD.tabButton} ${activeTab === 'Floorplan' ? stylesD.tabButtonActive : ''}`}
                aria-selected={activeTab === 'Floorplan'}
                role="tab"
              >
                Floorplan
              </button>
              <button
                onClick={() => handleTabChange('Camera')}
                className={`${stylesD.tabButton} ${activeTab === 'Camera' ? stylesD.tabButtonActive : ''}`}
                aria-selected={activeTab === 'Camera'}
                role="tab"
              >
                Camera
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className={stylesD.content}>
            {activeTab === 'Floorplan' && (
              <FloorPlan
                deviceValues={deviceValues}
                getDeviceValue={getDeviceValue}
                getDeviceAlert={getDeviceAlert}
              />
            )}
            {activeTab === 'Camera' && <MonitorPage />}
          </div>
        </div>
      </div>
    </>
  );
}
