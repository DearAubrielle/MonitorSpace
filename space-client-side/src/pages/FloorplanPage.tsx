import styles from './FloorPlan.module.css';
import { useRef, useEffect, useState } from 'react';
import AspectRatioBox from '../components/AspectRatioBox';
import { DndContext } from '@dnd-kit/core';
import { useFloorplan } from '../context/useFlooplan';
import type { Device } from '../types/Device';
import DraggableBox from '../components/DraggableBox';
import Button from '../components/Button';
import { handleDragEndFactory, PercentPosition } from '../utils/handleDragEnd';
import FloorplanCreateDialog from '../components/floorplan/FloorplanCreateDialog';
import FloorplanEditDialog from '../components/floorplan/FloorplanEditDialog';
import ImageUpload from '../components/floorplan/ImageUpload';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function FloorplanPage() {
  const {
    floorplans,
    selected,
    setSelected,
    devices,
    setDevices,
    deviceTypes,
  } = useFloorplan();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [openCreateFloorplan, setOpenCreateFloorplan] = useState(false);
  const [openEditFloorplan, setOpenEditFloorplan] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

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
  const [originalPositions, setOriginalPositions] = useState<
    Record<string, PercentPosition>
  >({});

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
        prev
          ? prev.map((d) =>
              toAdd.find((add) => add.id === d.id)
                ? { ...d, floorplan_id: selected.id }
                : d
            )
          : []
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
        prev
          ? prev.map((device) =>
              devicePositions[device.id]
                ? {
                    ...device,
                    x_percent: devicePositions[device.id].x,
                    y_percent: devicePositions[device.id].y,
                  }
                : device
            )
          : []
      );

      console.log('All device positions saved successfully');
      alert('Device positions saved!');
      setEditMode(false); // Exit edit mode after saving
    } catch (error) {
      console.error('Failed to save device positions:', error);
      alert('Failed to save positions');
    }
  };
  const handleNewFloorplan = () => {
    setNewName('');
    setNewDescription('');
    setNewImageFile(null);
    setOpenCreateFloorplan(true);
  };

  // Accept optional data from the create dialog: { name, description, imageFile }
  const submitNewFloorplan = async (data?: {
    name: string;
    description: string;
    imageFile: File | null;
  }) => {
    const name = data?.name ?? newName;
    const description = data?.description ?? newDescription;
    const imageFile = data?.imageFile ?? newImageFile;

    if (!name) {
      alert('Please provide a name');
      return;
    }

    // Image is now required
    if (!imageFile) {
      alert(
        'Please select an image file. Image is required for creating a floorplan.'
      );
      return;
    }

    try {
      const form = new FormData();
      form.append('name', name);
      form.append('description', description);
      form.append('image', imageFile);

      const res = await fetch(`${SERVER_URL}/api/floorplans/createf`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create floorplan');
      }

      const created = await res.json();
      // Append to local list and select it
      setDevices((prev) => prev ?? prev); // no-op to keep TS happy if needed
      setOpenCreateFloorplan(false);
      // If API returned the created floorplan, select it
      if (created && created.id) {
        setSelected(created);
      }
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create floorplan';
      alert(errorMessage);
    }
  };

  const handleEditFloorplan = () => {
    if (!selected) return;
    setOpenEditFloorplan(true);
  };

  const submitEditFloorplan = async (data: {
    id: number;
    name: string;
    description: string;
    imageFile: File | null;
  }) => {
    try {
      const form = new FormData();
      form.append('name', data.name);
      form.append('description', data.description);
      if (data.imageFile) {
        form.append('image', data.imageFile);
      }

      const res = await fetch(`${SERVER_URL}/api/floorplans/edit/${data.id}`, {
        method: 'PUT',
        body: form,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update floorplan');
      }

      const updated = await res.json();

      // Update the selected floorplan
      setSelected(updated);

      // Update floorplans list in context
      // Note: You might need to add an update function to your FloorplanContext

      setOpenEditFloorplan(false);
      alert('Floorplan updated successfully!');
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update floorplan';
      alert(errorMessage);
    }
  };
  return (
    <div className={styles.floorplanContainer}>
      <div className={styles.floorplanWrapper}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <h1 className={styles.pageTitle}>Floor Plan Management</h1>
          <p className={styles.pageSubtitle}>
            Create, edit, and manage your floor plans and device locations
          </p>
        </div>

        {/* Action Bar */}
        <div className={styles.actionBar}>
          <div className={styles.actionGroup}>
            <Button onClick={handleNewFloorplan} variant="primary">
              New Floor Plan
            </Button>

            {selected && (
              <Button
                onClick={handleEditFloorplan}
                variant="secondary"
              >
                Edit Floor Plan
              </Button>
            )}
          </div>

          <div className={styles.actionGroup}>
            <Button
              onClick={() => {
                if (editMode) {
                  setDevicePositions(originalPositions);
                }
                setEditMode((prev) => !prev);
              }}
              variant={editMode ? 'secondary' : 'primary'}
            >
              {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
            </Button>
            
            {editMode && (
              <>
                <Button 
                  onClick={() => setShowOverlay(true)} 
                  disabled={!selected}
                  variant="secondary"
                >
                  Add Devices
                </Button>
                <Button 
                  onClick={handleSaveAllDevicePositions} 
                  variant="primary"
                >
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
        {/* New Floorplan Modal */}
        <FloorplanCreateDialog
          open={openCreateFloorplan}
          onOpenChange={setOpenCreateFloorplan}
          onSubmit={submitNewFloorplan}
          ImageUpload={ImageUpload}
        />

        {/* Edit Floorplan Modal */}
        <FloorplanEditDialog
          open={openEditFloorplan}
          onOpenChange={setOpenEditFloorplan}
          onSubmit={submitEditFloorplan}
          ImageUpload={ImageUpload}
          floorplan={selected}
          serverUrl={SERVER_URL}
        />
        <div className={styles.Wrapper} style={{ position: 'relative' }}>
          {/* Overlay Add Device Panel */}
          {showOverlay && (
            <div className={styles.deviceOverlay}>
              <div className={styles.overlayContent}>
                {/* Available Devices */}
                <div className={styles.deviceSection}>
                  <h3 className={styles.sectionTitle}>Available Devices</h3>
                  <div className={styles.deviceList}>
                    {availableDevices?.map((device) => (
                      <div
                        key={device.id}
                        className={`${styles.deviceItem} ${
                          toAdd.find((d) => d.id === device.id) ? styles.deviceItemDisabled : ''
                        }`}
                        onClick={() => !toAdd.find((d) => d.id === device.id) && handleAddToFloorPlan(device)}
                      >
                        {device.name}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Devices to be added */}
                <div className={styles.deviceSection}>
                  <h3 className={styles.sectionTitle}>Selected for Floor Plan</h3>
                  <div className={styles.deviceList}>
                    {toAdd.length === 0 ? (
                      <div className={styles.emptyState}>
                        No devices selected
                      </div>
                    ) : (
                      toAdd.map((device) => (
                        <div key={device.id} className={styles.selectedDevice}>
                          <span>{device.name}</span>
                          <button
                            className={styles.removeButton}
                            onClick={() => handleRemoveFromFloorPlan(device)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className={styles.overlayActions}>
                    <Button
                      onClick={handleSave}
                      variant="primary"
                      disabled={toAdd.length === 0}
                    >
                      Add to Floor Plan
                    </Button>
                    <Button
                      onClick={() => setShowOverlay(false)}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
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
              <div
                ref={containerRef}
                style={{ width: '100%', boxShadow: '0 2px 8px #0003' }}
              >
                <AspectRatioBox
                  originalWidth={containerSize.width}
                  originalHeight={containerSize.height}
                  backgroundImage={SERVER_URL + selected.image_url}
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
                            disabled={!editMode}
                          />
                        );
                      })}
                  </DndContext>
                </AspectRatioBox>
              </div>
            )}
          </div>
          <div className={styles.Description}>
            {selected && (
              <div>
                <h3>Description</h3>
                <p>{selected.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
