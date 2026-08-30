import stylesD from './dashboard.module.css';
import stylesF from './FloorPlan.module.css';
import { useRef, useEffect, useState, useCallback } from 'react';
import MonitorPage from './MonitorPage';
import { PercentPosition } from '../components/DraggableBox';
import FloorplanView from '../components/Floorplan';
import DeviceInfoModal from '../components/DeviceInfoModal';
import { useDeviceMonitoring } from '../hooks/useDeviceMonitoring';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
import type { Device } from '../types/Device';
import { useFloorplan } from '../context/useFlooplan';
function FloorPlan() {
  const { floorplans, selected, setSelected, devices, deviceTypes } = useFloorplan();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });

  const [modalDevice, setModalDevice] = useState<Device | null>(null);

  const { deviceValues, connectionStatus, getDeviceValue, getDeviceAlert } = useDeviceMonitoring();

  const handleDeviceClick = useCallback((device: Device) => {
    setModalDevice(device);
  }, []);

  const closeModal = useCallback(() => {
    setModalDevice(null);
  }, []);

  // When selected floorplan changes, load its image and set container size
  useEffect(() => {
    if (selected && selected.image_url) {
      const img = new window.Image();
      img.onload = () => {
        setContainerSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      // Handle both Cloudinary URLs (start with http) and local URLs
      img.src = selected.image_url.startsWith('http') ? selected.image_url : SERVER_URL + selected.image_url;
    }
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
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [containerSize.width, containerSize.height]);

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

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={stylesF.Wrapper}>
      <div className={stylesF.FloorList}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#212529' }}>Floor Plans</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {floorplans
            ?.filter((plan) => plan.name !== 'Unassigned')
            .sort((a, b) => a.id - b.id)
            .map((plan) => {
              const hasActiveAlert = devices?.some(
                (device) =>
                  Number(device.floorplan_id) === Number(plan.id) && getDeviceAlert(device)
              );

              return (
                <li
                  key={plan.id}
                  onClick={() => setSelected(plan)}
                  className={`${stylesF.List} ${selected?.id === plan.id ? stylesF.Selected : stylesF.Unselected}`}
                >
                  <span>{plan.name}</span>
                  {hasActiveAlert && (
                    <span className={stylesF.alertIcon} aria-label="Floorplan has active alerts">!</span>
                  )}
                </li>
              );
            })}
        </ul>
      </div>

      <div className={stylesF.FloorPlan}>
        {/* Connection Status Indicator */}
        <div className={`${stylesD.connectionStatus} ${stylesD[connectionStatus]}`}>
          <div className={`${stylesD.statusDot} ${stylesD[connectionStatus]}`}></div>
          {getConnectionStatusText()}
        </div>
        {selected ? (
          <div ref={containerRef} style={{ width: '100%' }}>
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

  const handleTabChange = (tab: 'Floorplan' | 'Camera') => {
    setActiveTab(tab);
  };

  return (
    <>
      <div className={stylesD.dashboardContainer}>
        <div className={stylesD.dashboardWrapper}>
          <div className={stylesD.pageHeader}>
            <div className={stylesD.headerSection}>
              <h3 className={stylesD.pageTitle}>{activeTab === 'Floorplan' ? 'Floorplan' : 'Camera'}</h3>
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
            {activeTab === 'Floorplan' && <FloorPlan />}
            {activeTab === 'Camera' && <MonitorPage />}
          </div>
        </div>
      </div>
    </>
  );
}
