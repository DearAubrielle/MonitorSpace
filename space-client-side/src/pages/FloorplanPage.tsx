import styles from './FloorPlan.module.css';
import { useRef, useEffect, useState } from 'react';
import AspectRatioBox from '../components/AspectRatioBox';
import { DndContext } from '@dnd-kit/core';
import { useFloorplan } from '../context/useFlooplan';
import type { Device } from '../types/Device';
import DraggableBox from '../components/DraggableBox';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { handleDragEndFactory, PercentPosition } from '../utils/handleDragEnd';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;



export default function FloorplanPage() {
  const { floorplans, selected, setSelected, devices, setDevices, deviceTypes } = useFloorplan();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [modalDevice, setModalDevice] = useState<Device | null>(null);
  const [editMode, setEditMode] = useState(false);


  
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

  // Store the original positions for revert
  const [originalPositions, setOriginalPositions] = useState<Record<string, PercentPosition>>({});

  // Update devicePositions and originalPositions when devices or selected floorplan changes
  useEffect(() => {
    if (!selected) return;
    const filtered = devices?.filter((d) => d.floorplan_id === selected.id);
    const positions: Record<string, PercentPosition> = {};
    filtered?.forEach((device) => {
      positions[device.id] = { x: device.x_percent, y: device.y_percent };
    });
    setDevicePositions(positions);
    setOriginalPositions(positions);
  }, [devices, selected]);

    // Handles drag end event to update device position (percent-based)
    const handleDragEnd = handleDragEndFactory({
      devicePositions,
      setDevicePositions,
      renderedSize,
    });

  // Opens modal with device info on double click
  const handleDeviceClick = (device: Device) => {
    setModalDevice(device);
  };

  // Devices not yet on the selected floor plan
  const availableDevices = devices?.filter(
    (d) => !selected || d.floorplan_id !== selected.id
  );

  // Track which devices are being added in this session
  const [toAdd, setToAdd] = useState<Device[]>([]);

  // Add device to overlay "toAdd" list
  const handleAddToFloorPlan = (device: Device) => {
    setToAdd((prev) => [...prev, device]);
  };

  // Remove device from overlay "toAdd" list
  const handleRemoveFromFloorPlan = (device: Device) => {
    setToAdd((prev) => prev.filter((d) => d.id !== device.id));
  };

  // Save devices to floorplan by sending PUT requests to backend
  const handleSave = async () => {
    if (!selected) return;
    try {
      // Send a PUT request for each device being added
      await Promise.all(
        toAdd.map((device) =>
          fetch(`${SERVER_URL}/api/devices/putdf/${device.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ floorplan_id: selected.id }),
          })
        )
      );
      // Update local state after successful update
      setDevices((prev) =>
        prev ? prev.map((d) =>
          toAdd.find((add) => add.id === d.id)
            ? { ...d, floorplan_id: selected.id }
            : d
        ) : []
      );
      setToAdd([]);
      setShowOverlay(false);
    } catch (error) {
      console.error('Failed to update devices:', error);
      // Optionally show an error message to the user
    }
  };
  const handleSaveAllDevicePositions = async () => {
    if (!selected) return;

    try {
      // Get all devices for this floorplan
      const safeDevices = devices ?? [];
      const floorDevices = safeDevices.filter(
        (d) => d.floorplan_id === selected.id
      );

      // Send PUT requests for each device’s current position
      await Promise.all(
        floorDevices.map(async (device) => {
          const pos = devicePositions[device.id];
          if (!pos) return;

          await fetch(`${SERVER_URL}/api/devices/putdlo/${device.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              x_percent: pos.x,
              y_percent: pos.y,
            }),
          });
        })
      );
      console.log(
        'Saving device positions:',
        floorDevices.map((d) => ({
          id: d.id,
          pos: devicePositions[d.id],
        }))
      );
      setDevices((prev) =>
        prev ? prev.map((device) =>
          devicePositions[device.id]
            ? {
                ...device,
                x_percent: devicePositions[device.id].x,
                y_percent: devicePositions[device.id].y,
              }
            : device
        ) : []
      );

      console.log('All device positions saved successfully');
      alert('Device positions saved!');
      setEditMode(false); // Exit edit mode after saving
    } catch (error) {
      console.error('Failed to save device positions:', error);
      alert('Failed to save positions');
    }
  };

  return (
    <div>
      <div className={styles.mainWrap} >
      <h2 style={{ fontSize: '1rem' }}>Floor Plan</h2>
      <div style={{ marginBottom: '1rem'}}>
        <Button
          style={{ margin: '5px' }}
          onClick={() => {
            if (editMode) {
              // Exiting edit mode, revert positions if not saved
              setDevicePositions(originalPositions);
            }
            setEditMode((prev) => !prev);
          }}
          variant={editMode ? 'secondary' : 'primary'}
        >
          {editMode ? 'Exit Edit Mode' : 'Edit'}
        </Button>
        {editMode && (
          <>
            <Button onClick={() => setShowOverlay(true)} disabled={!selected}>
              Add Device to Floor Plan
            </Button>
            <Button onClick={handleSaveAllDevicePositions} variant="primary">
              Save Changes
            </Button>
          </>
        )}
      </div>
      <div className={styles.Wrapper} style={{ position: 'relative' }}>
        {/* Overlay Add Device Panel */}
        {showOverlay && (
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: '10%',
              width: '80%',
              minHeight: 350,
              background: '#fff',
              border: '1px solid #bbb',
              borderRadius: 8,
              display: 'flex',
              zIndex: 10,
              boxShadow: '0 2px 12px #0001',
              padding: 24,
              gap: 12,
            }}
          >
            {/* Available Devices */}
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Devices</div>
              {availableDevices?.map((device) => (
                <div
                  key={device.id}
                  style={{
                    background: '#f5faff',
                    color: '#2563eb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 10,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 500,
                    opacity: toAdd.find((d) => d.id === device.id) ? 0.5 : 1,
                    pointerEvents: toAdd.find((d) => d.id === device.id)
                      ? 'none'
                      : 'auto',
                  }}
                  onClick={() => handleAddToFloorPlan(device)}
                >
                  {device.name}
                </div>
              ))}
            </div>
            {/* Devices to be added */}
            <div
              style={{
                flex: 1,
                marginLeft: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                To current floor plan
              </div>
              {toAdd.length === 0 && (
                <div style={{ color: '#888', marginBottom: 12 }}>
                  No devices selected
                </div>
              )}
              {toAdd.map((device) => (
                <div
                  key={device.id}
                  style={{
                    background: '#e6f0fa',
                    color: '#2563eb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 10,
                    textAlign: 'center',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    maxWidth: 220,
                  }}
                >
                  <span>{device.name}</span>
                  <button
                    style={{
                      marginLeft: 12,
                      background: 'transparent',
                      border: 'none',
                      color: '#f44336',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 16,
                    }}
                    onClick={() => handleRemoveFromFloorPlan(device)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button
                style={{ marginTop: 24, opacity: toAdd.length === 0 ? 0.5 : 1 }}
                disabled={toAdd.length === 0}
                onClick={handleSave}
                variant="primary"
              >
                Save
              </Button>
              <Button
                style={{ marginTop: 8 }}
                onClick={() => setShowOverlay(false)}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Floorplan List */}
        <div className={styles.FloorList}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {floorplans?.map((plan) => (
              <li
                key={plan.id}
                onClick={() => setSelected(plan)}
                className={`${styles.List} ${selected?.id === plan.id ? styles.Selected : styles.Unselected}`}
              >
                {plan.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Floorplan Image with Drag-and-Drop */}
        <div className={styles.FloorPlan}>
          {selected && (
            <div ref={containerRef} style={{ width: '100%' }}>
              <AspectRatioBox
                originalWidth={containerSize.width}
                originalHeight={containerSize.height}
                backgroundImage={SERVER_URL + selected.image_url}
                maxWidth="100%"
              >
                
                <DndContext onDragEnd={handleDragEnd}>
                  {devices
                    ?.filter((device) => device.floorplan_id === selected?.id)
                    ?.map((device) => {
                      const type = deviceTypes?.find(
                        (t) => t.id === device.device_type_id
                      );
                      const icon = type
                        ? SERVER_URL + type.icon_url
                        : '/icons/default.png';
                      return (
                        <DraggableBox
                          key={device.id}
                          id={String(device.id)}
                          iconURL={icon}
                          label={String(device.id)}
                          position={
                          devicePositions[device.id] || {
                            x: device.x_percent,
                            y: device.y_percent,
                          }
                        }
                        containerWidth={renderedSize.width}
                        containerHeight={renderedSize.height}
                        onDoubleClick={() => handleDeviceClick(device)}
                        disabled={!editMode}
                      />
                      );
                    })}
                </DndContext>
              </AspectRatioBox>
            </div>
          )}
        </div>
        </div>

        {/* Device Info Modal */}
        <Modal open={!!modalDevice} onClose={() => setModalDevice(null)}>
          {modalDevice && (
            <>
              <h3>Device Info</h3>
              <div>
                <b>Name:</b> {modalDevice.name}
              </div>
              <div>
                <b>ID:</b> {modalDevice.id}
              </div>
            </>
          )}
        </Modal>
      </div>
    </div>
  );
}
