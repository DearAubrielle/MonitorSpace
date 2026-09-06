import styles from './FloorPlan.module.css';
import { useRef, useEffect, useState } from 'react';
import { useFloorplan } from '../context/useFlooplan';
import type { Device } from '../types/Device';
import Floorplan from '../components/Floorplan';
import Button from '../components/Button';
import { handleDragEndFactory, PercentPosition } from '../utils/handleDragEnd';
import FloorplanCreateDialog from '../components/floorplan/FloorplanCreateDialog';
import FloorplanEditDialog from '../components/floorplan/FloorplanEditDialog';
import ImageUpload from '../components/floorplan/ImageUpload';
import { getDeviceIconUrl, handleDeviceIconError } from '../utils/deviceIcon';
import { useDeviceMonitoring } from '../hooks/useDeviceMonitoring';
import UnassignedDevicesView from '../components/UnassignedDevicesView';
import SuccessModal from '../components/SuccessModal';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function FloorplanPage() {
  const { floorplans, selected, setSelected, devices, setDevices, deviceTypes, refreshFloorplans } = useFloorplan();
  const { getDeviceValue, getDeviceAlert } = useDeviceMonitoring();
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
  const [successMessage, setSuccessMessage] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePhase, setDeletePhase] = useState<'idle' | 'moving' | 'deleting'>('idle');

  // When selected floorplan changes, load its image and set container size
  useEffect(() => {
    if (selected && selected.image_url) {
      const img = new window.Image();
      img.onload = () => {
        // Validate that dimensions are valid numbers
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        if (width > 0 && height > 0 && isFinite(width) && isFinite(height)) {
          setContainerSize({
            width: width,
            height: height,
          });
        } else {
          // Fallback to default size if dimensions are invalid
          console.warn('Invalid image dimensions, using defaults');
          setContainerSize({
            width: 800,
            height: 600,
          });
        }
      };
      img.onerror = () => {
        console.error('Failed to load image:', selected.image_url);
        // Fallback to default size on error
        setContainerSize({
          width: 800,
          height: 600,
        });
      };
      // Handle both Cloudinary URLs (start with http) and local URLs
      img.src = selected.image_url.startsWith('http') ? selected.image_url : SERVER_URL + selected.image_url;
    }
  }, [selected]);

  // Update rendered size on window resize for responsive layout
  const [renderedSize, setRenderedSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const nextWidth = containerRef.current.offsetWidth;
        const nextHeight = containerRef.current.offsetHeight;
        setRenderedSize((current) =>
          current.width === nextWidth && current.height === nextHeight
            ? current
            : { width: nextWidth, height: nextHeight }
        );
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
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
      setSuccessMessage('Your device positions are up to date.');
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
      return true;
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create floorplan';
      alert(errorMessage);
      return false;
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
      setSuccessMessage('Your floorplan is up to date.');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update floorplan';
      alert(errorMessage);
    }
  };

  const handleDeleteFloorplan = () => {
    if (!selected) return;
    setError(''); // Clear any previous errors
    setDeletePhase('idle');
    setShowDeleteConfirm(true);
  };

  // Get devices assigned to selected floorplan
  const getAssignedDevices = () => {
    if (!selected || !devices) return [];
    return devices.filter((d) => d.floorplan_id === selected.id);
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;

    setError('');
    setSuccess('');
    setIsDeleting(true);

    try {
      const assignedDevices = getAssignedDevices();

      if (assignedDevices.length > 0) {
        setDeletePhase('moving');
        const moveResponses = await Promise.all(
          assignedDevices.map((device) =>
            fetch(`${SERVER_URL}/api/devices/putdf/${device.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ floorplan_id: null }),
            })
          )
        );

        if (moveResponses.some((response) => !response.ok)) {
          throw new Error('MOVE_DEVICES_FAILED');
        }
      }

      setDeletePhase('deleting');
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
        setSuccess(
          assignedDevices.length > 0
            ? `Floor plan deleted. ${assignedDevices.length} device(s) were moved to Unassigned.`
            : 'Floor plan deleted successfully.'
        );
        // Clear the selected floorplan since it's been deleted
        setSelected(null);
        setShowDeleteConfirm(false);
        setDevices((prev) =>
          prev
            ? prev.map((device) =>
                assignedDevices.some((assignedDevice) => assignedDevice.id === device.id)
                  ? { ...device, floorplan_id: 0 }
                  : device
              )
            : []
        );
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
      if (err instanceof Error && err.message === 'MOVE_DEVICES_FAILED') {
        setError('Some devices could not be moved to Unassigned. The floor plan was not deleted. Please try again.');
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsDeleting(false);
      setDeletePhase('idle');
    }
  };

  return (
    <div className={styles.floorplanContainer}>
      <SuccessModal message={successMessage} onClose={() => setSuccessMessage('')} />
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
        <div className={styles.Wrapper}>
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
                  return a.id - b.id;
                })
                ?.map((plan) => {
                  const activeAlertCount = devices?.filter(
                    (device) =>
                      Number(device.floorplan_id) === Number(plan.id) && getDeviceAlert(device)
                  ).length ?? 0;

                  return (
                    <li
                      key={plan.id}
                      onClick={() => setSelected(plan)}
                      className={`${styles.List} ${
                        selected?.id === plan.id ? styles.Selected : styles.Unselected
                      } ${plan.name === 'Unassigned' ? styles.UnassignedFloorplan : ''}`}
                    >
                      <span className={styles.floorListContent}>
                        <span>{plan.name === 'Unassigned' ? 'Unplaced Devices' : plan.name}</span>
                        {activeAlertCount > 0 && (
                          <span className={styles.alertDetail} role="status">
                            {activeAlertCount} active {activeAlertCount === 1 ? 'alert' : 'alerts'}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* Floorplan Image with Drag-and-Drop */}
          <div className={styles.FloorPlan}>
            {selected && (
              <div ref={containerRef} style={{ width: '100%'}}>
                {selected.name === 'Unassigned' ? (
                  <UnassignedDevicesView
                    devices={devices?.filter((device) => device.floorplan_id === selected.id) ?? []}
                    deviceTypes={deviceTypes ?? []}
                    getDeviceValue={getDeviceValue}
                    getDeviceAlert={getDeviceAlert}
                  />
                ) : (
                  // Normal floorplan view
                  <Floorplan
                    imageUrl={
                      selected.image_url.startsWith('http') ? selected.image_url : SERVER_URL + selected.image_url
                    }
                    originalWidth={containerSize.width}
                    originalHeight={containerSize.height}
                    devices={devices?.filter((device) => device.floorplan_id === selected.id) ?? []}
                    deviceTypes={deviceTypes ?? []}
                    devicePositions={devicePositions}
                    renderedSize={renderedSize}
                    onDragEnd={handleDragEnd}
                    editMode={editMode}
                    getDeviceValue={getDeviceValue}
                    getDeviceAlert={getDeviceAlert}
                  />
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
            <div
              className={styles.deleteModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-floorplan-title"
              aria-describedby="delete-floorplan-description"
            >
              <div className={styles.deleteModalHeader}>
                <div className={styles.deleteIconWrap} aria-hidden="true">🗑</div>
                <div className={styles.deleteHeading}>
                  <h3 id="delete-floorplan-title">Delete “{selected?.name}”?</h3>
                  <p id="delete-floorplan-description">
                    This floor plan and its image will be permanently deleted. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.modalCloseButton}
                  aria-label="Close delete confirmation"
                  disabled={isDeleting}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setError('');
                  }}
                >
                  ×
                </button>
              </div>

              <div className={styles.deleteModalBody}>
                {getAssignedDevices().length > 0 && (
                  <>
                    <div className={styles.moveNotice}>
                      <span className={styles.moveNoticeIcon} aria-hidden="true">→</span>
                      <div>
                        <strong>{getAssignedDevices().length} device(s) will be moved to Unassigned</strong>
                        <p>Your devices and their settings will be kept. You can assign them to another floor plan later.</p>
                      </div>
                    </div>

                    <div className={styles.deviceListHeader}>
                      <h4>Devices to move</h4>
                      <span>{getAssignedDevices().length} devices</span>
                    </div>
                    <ul className={styles.devicesList} aria-label="Devices that will be moved to Unassigned">
                      {getAssignedDevices().map((device) => {
                        const deviceType = deviceTypes?.find((type) => type.id === device.device_type_id);
                        const icon = getDeviceIconUrl(deviceType?.icon_url);
                        return (
                          <li key={device.id}>
                            <span className={styles.deviceTypeIcon} aria-hidden="true">
                              <img src={icon} alt="" onError={handleDeviceIconError} />
                            </span>
                            <span className={styles.deviceDetails}>
                              <strong>{device.name}</strong>
                              <small>{deviceType?.name || 'Device'}</small>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {error && (
                  <div className={styles.errorMessage} role="alert">
                    <span className={styles.errorIcon}>!</span>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className={styles.modalActions}>
                <Button
                  variant="secondary"
                  disabled={isDeleting}
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
                  disabled={isDeleting}
                >
                  {deletePhase === 'moving'
                    ? 'Moving devices...'
                    : deletePhase === 'deleting'
                      ? 'Deleting floor plan...'
                      : getAssignedDevices().length > 0
                        ? 'Move devices & Delete'
                        : 'Delete Floor Plan'}
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
