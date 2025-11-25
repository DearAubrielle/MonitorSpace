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
  const { floorplans, selected, setSelected, devices, setDevices, deviceTypes, refreshFloorplans } = useFloorplan();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [openCreateFloorplan, setOpenCreateFloorplan] = useState(false);
  const [openEditFloorplan, setOpenEditFloorplan] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Devices not yet on the selected floor plan (including unassigned devices)
  const availableDevices = devices?.filter((d) => !selected || d.floorplan_id !== selected.id);

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
        prev ? prev.map((d) => (toAdd.find((add) => add.id === d.id) ? { ...d, floorplan_id: selected.id } : d)) : []
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
      const floorDevices = safeDevices.filter((d) => d.floorplan_id === selected.id);

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

  const submitNewFloorplan = async (data?: { name: string; description: string; imageFile: File | null }) => {
    const name = data?.name ?? newName;
    const description = data?.description ?? newDescription;
    const imageFile = data?.imageFile ?? newImageFile;

    if (!name) {
      alert('Please provide a name');
      return;
    }
    if (!imageFile) {
      alert('Please select an image file. Image is required for creating a floorplan.');
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
      setOpenCreateFloorplan(false);
      if (created && created.id) {
        setSelected(created);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create floorplan';
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to update floorplan';
      alert(errorMessage);
    }
  };

  const handleDeleteFloorplan = () => {
    if (!selected) return;
    setError(''); // Clear any previous errors
    setShowDeleteConfirm(true);
  };

  // Get devices assigned to selected floorplan
  const getAssignedDevices = () => {
    if (!selected || !devices) return [];
    return devices.filter((d) => d.floorplan_id === selected.id);
  };

  // Remove all devices from the floorplan
  const handleRemoveAllDevices = async () => {
    if (!selected) return;

    try {
      const assignedDevices = getAssignedDevices();

      // Remove floorplan assignment from all devices (set to null/0 to trigger unassigned logic)
      await Promise.all(
        assignedDevices.map((device) =>
          fetch(`${SERVER_URL}/api/devices/putdf/${device.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ floorplan_id: null }),
          })
        )
      );

      // The server will automatically assign these devices to an "Unassigned" floorplan
      // We need to refresh the data to reflect this change
      await refreshFloorplans();

      // Update local devices state by removing these devices from the current floorplan
      setDevices((prev) => (prev ? prev.filter((d) => !assignedDevices.find((ad) => ad.id === d.id)) : []));

      setSuccess(`Successfully removed ${assignedDevices.length} device(s) from floorplan`);
    } catch (error) {
      console.error('Failed to remove devices:', error);
      setError('Failed to remove devices from floorplan');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;

    setError('');
    setSuccess('');
    setIsDeleting(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/floorplans/delete/${selected.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.status === 200) {
        setSuccess('Floorplan deleted successfully!');
        // Clear the selected floorplan since it's been deleted
        setSelected(null);
        setShowDeleteConfirm(false);
        // Refresh the floorplans list
        await refreshFloorplans();
      } else if (res.status === 400) {
        // Handle devices still assigned error
        const deviceCount = devices?.filter((d) => d.floorplan_id === selected.id)?.length || 0;
        if (deviceCount > 0) {
          setError(
            `Cannot delete floorplan "${selected.name}". ${deviceCount} device(s) are still assigned to this floorplan. Please remove or reassign the devices first.`
          );
        } else {
          setError(data?.message || 'Cannot delete this floorplan');
        }
      } else if (res.status === 404) {
        setError('Floorplan not found. It may have already been deleted.');
      } else {
        setError(data?.message || 'Failed to delete floorplan. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting floorplan:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.floorplanContainer}>
      <div className={styles.floorplanWrapper}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <h1 className={styles.pageTitle}>Floor Plan Management</h1>
          <p className={styles.pageSubtitle}>Create, edit, and manage your floor plans and device locations</p>
        </div>

        {/* Action Bar */}
        <div className={styles.actionBar}>
          <div className={styles.actionGroup}>
            <Button onClick={handleNewFloorplan} variant="primary">
              New Floor Plan
            </Button>

            {selected && selected.name !== 'Unassigned' && (
              <Button onClick={handleEditFloorplan} variant="secondary">
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
                <Button onClick={() => setShowOverlay(true)} disabled={!selected} variant="secondary">
                  Add Devices
                </Button>
                <Button onClick={handleSaveAllDevicePositions} variant="primary">
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
          onDelete={handleDeleteFloorplan}
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
                      <div className={styles.emptyState}>No devices selected</div>
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
                    <Button onClick={handleSave} variant="primary" disabled={toAdd.length === 0}>
                      Add to Floor Plan
                    </Button>
                    <Button onClick={() => setShowOverlay(false)} variant="secondary">
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
              {floorplans
                ?.sort((a, b) => {
                  // Sort "Unassigned" floorplan to the bottom
                  if (a.name === 'Unassigned' && b.name !== 'Unassigned') return 1;
                  if (b.name === 'Unassigned' && a.name !== 'Unassigned') return -1;
                  return a.name.localeCompare(b.name);
                })
                ?.map((plan) => (
                  <li
                    key={plan.id}
                    onClick={() => setSelected(plan)}
                    className={`${styles.List} ${
                      selected?.id === plan.id ? styles.Selected : styles.Unselected
                    } ${plan.name === 'Unassigned' ? styles.UnassignedFloorplan : ''}`}
                  >
                    {plan.name === 'Unassigned' ? 'Unassigned Devices' : plan.name}
                  </li>
                ))}
            </ul>
          </div>

          {/* Floorplan Image with Drag-and-Drop */}
          <div className={styles.FloorPlan}>
            {selected && (
              <div ref={containerRef} style={{ width: '100%', boxShadow: '0 2px 8px #0003' }}>
                {selected.name === 'Unassigned' ? (
                  // Special view for unassigned devices
                  <div className={styles.unassignedView}>
                    <div className={styles.unassignedHeader}>
                      <h3>Unassigned Devices</h3>
                      <p>Devices waiting to be assigned to a floorplan</p>
                    </div>
                    <div className={styles.unassignedDeviceGrid}>
                      {devices
                        ?.filter((device) => device.floorplan_id === selected?.id)
                        ?.map((device) => {
                          const type = deviceTypes?.find((t) => t.id === device.device_type_id);
                          const icon = type ? SERVER_URL + type.icon_url : '/icons/default.png';
                          return (
                            <div key={device.id} className={styles.unassignedDevice}>
                              <img src={icon} alt={device.name} className={styles.deviceIcon} />
                              <div className={styles.deviceInfo}>
                                <div className={styles.deviceName}>{device.name}</div>
                                <div className={styles.deviceType}>{type?.name}</div>
                                {device.latest_value && (
                                  <div className={styles.deviceValue}>
                                    {device.latest_value} {type?.unit}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {!devices?.filter((d) => d.floorplan_id === selected?.id)?.length && (
                        <div className={styles.emptyUnassigned}>
                          <p>No unassigned devices</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Normal floorplan view
                  <AspectRatioBox
                    originalWidth={containerSize.width}
                    originalHeight={containerSize.height}
                    backgroundImage={
                      selected.image_url.startsWith('http') ? selected.image_url : SERVER_URL + selected.image_url
                    }
                  >
                    <DndContext onDragEnd={handleDragEnd}>
                      {devices
                        ?.filter((device) => device.floorplan_id === selected?.id)
                        ?.map((device) => {
                          const type = deviceTypes?.find((t) => t.id === device.device_type_id);
                          const icon = type ? SERVER_URL + type.icon_url : '/icons/default.png';
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
                              deviceName={device.name}
                              value={device.latest_value}
                              unit={type?.unit}
                            />
                          );
                        })}
                    </DndContext>
                  </AspectRatioBox>
                )}
              </div>
            )}
          </div>
          <div className={styles.Description}>
            {selected && (
              <div>
                <h3>Description</h3>
                <p>
                  {selected.name === 'Unassigned'
                    ? 'This is a temporary holding area for devices that have not been assigned to any floorplan. You can drag devices from here to other floorplans using the "Add Devices" feature.'
                    : selected.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className={styles.modalOverlay}>
            <div className={styles.deleteModal}>
              <div className={styles.modalIcon}>⚠️</div>

              <div className={styles.modalHeader}>
                <h3>Delete Floor Plan</h3>
                <p>Are you sure you want to delete "{selected?.name}"?</p>
                <p className={styles.warningText}>
                  This action cannot be undone and will permanently remove the floor plan and its image.
                </p>

                {/* Show assigned devices warning */}
                {getAssignedDevices().length > 0 && (
                  <div className={styles.assignedDevicesWarning}>
                    <h4>⚠️ Devices Still Assigned</h4>
                    <p>The following {getAssignedDevices().length} device(s) are assigned to this floorplan:</p>
                    <ul className={styles.devicesList}>
                      {getAssignedDevices().map((device) => (
                        <li key={device.id}>{device.name}</li>
                      ))}
                    </ul>
                    <p className={styles.removeDevicesText}>
                      Please remove these devices before deleting the floorplan.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={handleRemoveAllDevices}
                      style={{
                        marginTop: '0.75rem',
                        backgroundColor: '#f59e0b',
                        borderColor: '#f59e0b',
                        color: 'white',
                      }}
                    >
                      Remove All Devices
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <div className={styles.errorMessage}>
                  <span className={styles.errorIcon}>❌</span>
                  <span>{error}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setError(''); // Clear error when closing
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting || getAssignedDevices().length > 0}
                  style={{
                    backgroundColor: isDeleting || getAssignedDevices().length > 0 ? '#9ca3af' : '#dc2626',
                    borderColor: isDeleting || getAssignedDevices().length > 0 ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    cursor: isDeleting || getAssignedDevices().length > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Floor Plan'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className={styles.modalOverlay} onClick={() => setSuccess('')}>
            <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalIcon}>✓</div>

              <div className={styles.modalHeader}>
                <h3>Success!</h3>
                <p>{success}</p>
              </div>

              <div className={styles.modalActions}>
                <Button variant="primary" onClick={() => setSuccess('')}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
