import stylesD from './dashboard.module.css';
import stylesF from './FloorPlan.module.css';
import { useRef, useEffect, useState } from 'react';
import AspectRatioBox from '../components/AspectRatioBox';
import MonitorPage from './MonitorPage';
import { PercentPosition } from '../components/DeviceItem';
import DraggableBox from '@/components/DraggableBox';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
import type { Device } from '../types/Device';
import { useFloorplan } from '../context/useFlooplan';
function FloorPlan() {
  const { floorplans, selected, setSelected, devices, deviceTypes } =
    useFloorplan();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });

  const [deviceValues, setDeviceValues] = useState<Record<string, number>>({});
  const [modalDevice, setModalDevice] = useState<Device | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      let updates: { id: string; latest_value: number }[] = [];

      if (Array.isArray(data)) {
        updates = data;
      } else if (data && typeof data === 'object') {
        updates = [data]; // wrap single update in array
      }

      const mapped = updates.reduce((acc: Record<string, number>, d) => {
        acc[d.id] = d.latest_value;
        return acc;
      }, {});

      setDeviceValues((prev) => ({ ...prev, ...mapped }));
    };
  }, []);

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

  return (
    <div style={{ padding: '1rem' }}>
      <div className={stylesD.Wrapper}>
        <div className={stylesF.FloorList}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {floorplans?.map((plan) => (
              <li
                key={plan.id}
                onClick={() => setSelected(plan)}
                className={`${stylesF.List} ${selected?.id === plan.id ? stylesF.Selected : stylesF.Unselected}`}
              >
                {plan.name}
              </li>
            ))}
          </ul>
        </div>

        <div className={stylesF.FloorPlan}>
          {selected && (
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
                    // Determine alert state
                    const value = deviceValues[device.id.toString()] ?? device.latest_value;
                    const alert = (value < Number(device.min_alert)) ||
                                  (value > Number(device.max_alert));
                    return (<div>
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
                        onClick={() => setModalDevice(device)}
                        disabled={true} // Disable dragging for now
                        alert={alert}
                      />
                      {/* <div>
                        <b>Latest Value:</b> {deviceValues[device.id] ?? device.latest_value}
                        <b>Alert:</b> {alert ? '🔴' : '🟢'}
                        <b></b>
                      </div> */}
                    </div>
                    );
                  })}
              </AspectRatioBox>
            </div>
          )}
        </div>
      </div>
      <div>
        {modalDevice && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: '#fff',
                padding: 24,
                borderRadius: 8,
                minWidth: 300,
              }}
            >
              <h3>Device Info</h3>
              <div>
                <b>Name:</b> {modalDevice.name}
              </div>
              <div>
                <b>ID:</b> {modalDevice.id}
              </div>

              <div>
                <b>Latest Value:</b>{' '}
                {deviceValues[modalDevice.id] ?? modalDevice.latest_value}
                <b>
                  {(() => {
                    const type = deviceTypes?.find(
                      (t) => t.id === modalDevice.device_type_id
                    );
                    return type && type.unit ? ` ${type.unit}` : '';
                  })()}
                </b>
              </div>
              <button
                onClick={() => setModalDevice(null)}
                style={{ marginTop: 16 }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function Dashboard() {
  const [selected, setSelected] = useState<'Floorplan' | 'Camera'>('Floorplan');
  return (
    <div style={{ marginTop: '1rem' }}>
      <div className={stylesD.buttonGroup}>
        <button onClick={() => setSelected('Floorplan')}>Floorplan</button>
        <button onClick={() => setSelected('Camera')}>Camera</button>
      </div>
      <div className={stylesD.title}>
        <b>{selected === 'Floorplan' ? 'Floorplan' : 'Camera'} Monitor</b>
      </div>

      {selected === 'Floorplan' && <FloorPlan />}
      {selected === 'Camera' && (
        <>
          <div className={stylesD.camera}>
            <MonitorPage />
          </div>
        </>
      )}
    </div>
  );
}
