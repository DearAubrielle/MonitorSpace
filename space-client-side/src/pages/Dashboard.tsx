import stylesD from './dashboard.module.css';
import stylesF from './FloorPlan.module.css';
import { useRef, useEffect, useState } from 'react';
import AspectRatioBox from '../components/AspectRatioBox';
import MonitorPage from './MonitorPage';
import { PercentPosition } from '../components/DraggableBox';
import DraggableBox from '@/components/DraggableBox';
import { useWebSocket } from '../hooks/useWebSocket';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
import { useFloorplan } from '../context/useFlooplan';
function FloorPlan() {
  const { floorplans, selected, setSelected, devices, deviceTypes } =
    useFloorplan();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });

  // Use WebSocket hook for device values
  const { deviceValues, connectionStatus } = useWebSocket({
    url: 'ws://localhost:8080/',
    reconnectAttempts: 5,
    reconnectInterval: 3000,
  });

  // When selected floorplan changes, load its image and set container size
  useEffect(() => {
    if (selected) {
      const img = new window.Image();
      img.onload = () => {
        setContainerSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = SERVER_URL + selected.image_url;
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
  const [devicePositions, setDevicePositions] = useState<
    Record<string, PercentPosition>
  >({});

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

  // Check if a floorplan has any devices with alerts
  const hasFloorplanAlerts = (floorplanId: number) => {
    const floorplanDevices = devices?.filter((device) => 
      Number(device.floorplan_id) === Number(floorplanId)
    );
    
    return floorplanDevices?.some((device) => {
      const rawValue = deviceValues[device.id.toString()] ?? device.latest_value;
      const numValue = typeof rawValue === 'number' 
        ? rawValue 
        : typeof rawValue === 'string' 
          ? parseFloat(rawValue) 
          : null;
      
      return numValue !== null &&
        !isNaN(numValue) &&
        ((device.min_alert !== undefined && numValue < device.min_alert) ||
         (device.max_alert !== undefined && numValue > device.max_alert));
    }) ?? false;
  };

  // Count alerts for a floorplan
  const getFloorplanAlertCount = (floorplanId: number) => {
    const floorplanDevices = devices?.filter((device) => 
      Number(device.floorplan_id) === Number(floorplanId)
    );
    
    return floorplanDevices?.filter((device) => {
      const rawValue = deviceValues[device.id.toString()] ?? device.latest_value;
      const numValue = typeof rawValue === 'number' 
        ? rawValue 
        : typeof rawValue === 'string' 
          ? parseFloat(rawValue) 
          : null;
      
      return numValue !== null &&
        !isNaN(numValue) &&
        ((device.min_alert !== undefined && numValue < device.min_alert) ||
         (device.max_alert !== undefined && numValue > device.max_alert));
    })?.length ?? 0;
  };

  return (
    <div className={stylesF.Wrapper}>
      <div className={stylesF.FloorList}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#212529' }}>Floor Plans</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {floorplans?.map((plan) => {
            const hasAlerts = hasFloorplanAlerts(plan.id);
            const alertCount = getFloorplanAlertCount(plan.id);
            
            return (
              <li
                key={plan.id}
                onClick={() => setSelected(plan)}
                className={`
                  ${stylesF.List} 
                  ${selected?.id === plan.id ? stylesF.Selected : stylesF.Unselected}
                  ${hasAlerts ? stylesF.alertListItem : ''}
                `}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <span className={hasAlerts ? stylesF.alertText : ''}>
                    {hasAlerts && <span style={{ marginRight: '6px' }}>⚠️</span>}
                    {plan.name}
                  </span>
                  {hasAlerts && (
                    <div className={stylesF.alertBadge}>
                      {alertCount}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={stylesF.FloorPlan}>
        {/* Connection Status Indicator */}
        <div
          className={`${stylesD.connectionStatus} ${stylesD[connectionStatus]}`}
        >
          <div
            className={`${stylesD.statusDot} ${stylesD[connectionStatus]}`}
          ></div>
          {getConnectionStatusText()}
        </div>
        {selected ? (
          <div ref={containerRef} style={{ width: '100%' }}>
            <AspectRatioBox
              originalWidth={containerSize.width}
              originalHeight={containerSize.height}
              backgroundImage={SERVER_URL + selected.image_url}
              maxWidth="100%"
            >
              {devices
                ?.filter(
                  (device) =>
                    Number(device.floorplan_id) === Number(selected?.id)
                )
                ?.map((device) => {
                  const type = deviceTypes?.find(
                    (t) => t.id === device.device_type_id
                  );
                  const icon = type
                    ? SERVER_URL + type.icon_url
                    : '/icons/default.png';

                  // Determine alert state with better type checking
                  const rawValue =
                    deviceValues[device.id.toString()] ??
                    device.latest_value;
                  const numValue =
                    typeof rawValue === 'number'
                      ? rawValue
                      : typeof rawValue === 'string'
                        ? parseFloat(rawValue)
                        : null;
                  const alert =
                    numValue !== null &&
                    !isNaN(numValue) &&
                    ((device.min_alert !== undefined &&
                      numValue < device.min_alert) ||
                      (device.max_alert !== undefined &&
                        numValue > device.max_alert));

                  return (
                    <DraggableBox
                      key={device.id}
                      id={String(device.id)}
                      label={device.name}
                      iconURL={icon}
                      position={
                        devicePositions[device.id] || {
                          x: device.x_percent,
                          y: device.y_percent,
                        }
                      }
                      containerWidth={renderedSize.width}
                      containerHeight={renderedSize.height}
                      disabled={true} // Disable dragging for now
                      alert={alert}
                      deviceName={device.name}
                      value={deviceValues[device.id.toString()] ?? device.latest_value}
                      unit={type?.unit}
                      useBuiltInModal={true} // Use built-in modal with single-click
                    />
                  );
                })}
            </AspectRatioBox>
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
    </div>
  );
}
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'Floorplan' | 'Camera'>(
    'Floorplan'
  );

  const handleTabChange = (tab: 'Floorplan' | 'Camera') => {
    setActiveTab(tab);
  };

  return (
    <>
      <div className={stylesD.dashboardContainer}>
        <div className={stylesD.dashboardWrapper}>
          {/* Tab Navigation */}
          <div className={stylesD.tabNavigation}>
            <button
              onClick={() => handleTabChange('Floorplan')}
              className={`${stylesD.tabButton} ${
                activeTab === 'Floorplan' ? stylesD.tabButtonActive : ''
              }`}
              aria-selected={activeTab === 'Floorplan'}
            >
              Floorplan
            </button>
            <button
              onClick={() => handleTabChange('Camera')}
              className={`${stylesD.tabButton} ${
                activeTab === 'Camera' ? stylesD.tabButtonActive : ''
              }`}
              aria-selected={activeTab === 'Camera'}
            >
              Camera
            </button>
          </div>

          {/* Header Section */}
          <div className={stylesD.headerSection}>
            <h3 className={stylesD.pageTitle}>{
              activeTab === 'Floorplan' ? 'Floorplan' : 'Camera'
            }</h3>
            <p className={stylesD.pageSubtitle}>
              {activeTab === 'Floorplan' ? 'Monitor your Devices in real-time on Floorplan' : 'Monitor your camera feeds in real-time'}
            </p>
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
