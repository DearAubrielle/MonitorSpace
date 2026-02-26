import Button from '@/components/Button';
import { useFloorplan } from '@/context/useFlooplan';
import { useEffect, useState } from 'react';
import type { Device } from '../types/Device';
import styles from './devices.module.css';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const Devices = () => {
  const { floorplans, devices, deviceTypes, setDevices } = useFloorplan();
  const [showModal, setShowModal] = useState(false);
  const [showEditDevice, setShowEditDevice] = useState<Device | null>(null);
  const [showDeviceDetails, setShowDeviceDetails] = useState<Device | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Device | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // const selectedDeviceType = deviceTypes.find(dt => dt.id.toString() === form.devicetype); // Moved inline where needed

  // Auto-dismiss success message after 5 seconds (5000ms)
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000); // Change this value to adjust timing
      return () => clearTimeout(timer);
    }
  }, [success]);
  const [form, setForm] = useState({
    name: '',
    device_type_id: '',
    floorplan_id: '',
    path_topic: '',
    min_alert: '',
    max_alert: '',
  });

  const [editDeviceForm, setEditDeviceForm] = useState({
    name: '',
    floorplan_id: '',
    path_topic: '',
    min_alert: '',
    max_alert: '',
  });

  const handleViewDevice = (device: Device) => {
    setShowDeviceDetails(device);
    console.log('View device with ID:', device.id);
  };

  const handleAddDevice = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError('');
    // Reset form to initial empty state
    setForm({
      name: '',
      device_type_id: '',
      floorplan_id: '',
      path_topic: '',
      min_alert: '',
      max_alert: '',
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate form on frontend
    if (!form.name.trim()) {
      setError('Device name is required');
      return;
    }

    if (form.name.trim().length < 2 || form.name.trim().length > 100) {
      setError('Device name must be between 2 and 100 characters');
      return;
    }

    if (!form.device_type_id) {
      setError('Please select a device type');
      return;
    }

    if (!form.floorplan_id) {
      setError('Please select a floorplan');
      return;
    }

    // Get device type for validation
    const selectedType = deviceTypes?.find((dt) => dt.id.toString() === form.device_type_id);
    const isCamera = selectedType && selectedType.name === 'Camera';


    // Validate alert values for non-camera devices
    if (!isCamera) {
      if (!form.min_alert || !form.max_alert) {
        setError('Min and Max alert values are required for sensor devices');
        return;
      }

      const minAlert = Number(form.min_alert);
      const maxAlert = Number(form.max_alert);

      if (isNaN(minAlert) || isNaN(maxAlert)) {
        setError('Alert values must be valid numbers');
        return;
      }

      if (minAlert >= maxAlert) {
        setError('Min alert must be less than max alert');
        return;
      }
    }

    // Prepare payload based on device type
    const payload: Record<string, string | number | null> = {
      name: form.name.trim(),
      device_type_id: Number(form.device_type_id),
      floorplan_id: Number(form.floorplan_id),
      path_topic: form.path_topic.trim() || null,
    };

    // Only include alert values for non-camera devices
    if (!isCamera) {
      payload.min_alert = Number(form.min_alert);
      payload.max_alert = Number(form.max_alert);
    }

    try {
      const res = await fetch(`${SERVER_URL}/api/devices/postd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.status === 201) {
        setSuccess(data?.message || 'Device added successfully!');
        // Refresh device list from backend
        fetch(`${SERVER_URL}/api/devices/getd`)
          .then((res) => res.json())
          .then((data) => setDevices(data));
        handleCloseModal();
      } else {
        setError(data?.message || 'Failed to add device');
      }
    } catch (err) {
      console.error('Error adding device:', err);
      setError('Network error. Please check your connection and try again.');
    }
  };
  const handleShowEditDevice = (device: Device) => {
    setShowEditDevice(device);
    // populate the edit form with the current device values (coerce numbers to strings)
    setEditDeviceForm({
      name: device.name ?? '',
      floorplan_id: device.floorplan_id != null ? String(device.floorplan_id) : '',
      path_topic: device.path_topic ?? '',
      min_alert: device.min_alert != null ? String(device.min_alert) : '',
      max_alert: device.max_alert != null ? String(device.max_alert) : '',
    });
    console.log('Edit device with ID:', device.id);
  };
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditDeviceForm({ ...editDeviceForm, [e.target.name]: e.target.value });
  };
  const handleSubmitEditDevice = async () => {
    if (!showEditDevice) return;

    setError('');
    setSuccess('');

    try {
      // Get device type to determine what fields to send
      const deviceType = deviceTypes?.find((t) => String(t.id) === String(showEditDevice.device_type_id));
      const isCamera = deviceType && deviceType.name === 'Camera';

      // Prepare payload based on device type
      const payload: Record<string, string | number | null> = {
        name: editDeviceForm.name,
        floorplan_id: Number(editDeviceForm.floorplan_id),
        path_topic: editDeviceForm.path_topic,
      };

      // Only include alert values for non-camera devices
      if (!isCamera) {
        // Validate alert values on frontend
        const minAlert = Number(editDeviceForm.min_alert);
        const maxAlert = Number(editDeviceForm.max_alert);

        if (isNaN(minAlert) || isNaN(maxAlert)) {
          setError('Min and Max alert values must be valid numbers');
          return;
        }

        if (minAlert > maxAlert) {
          setError('Min alert cannot be greater than max alert');
          return;
        }

        payload.min_alert = minAlert;
        payload.max_alert = maxAlert;
      }

      const res = await fetch(`${SERVER_URL}/api/devices/edit/${showEditDevice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.status === 200) {
        fetch(`${SERVER_URL}/api/devices/getd`)
          .then((res) => res.json())
          .then((data) => {
            setDevices(data);
            // Find the updated device from the fresh data
            const updatedDevice = data.find((d: Device) => d.id === showEditDevice.id);
            setShowDeviceDetails(updatedDevice || null);
          });
        setShowEditDevice(null);
        setSuccess('Device updated successfully!');
        // Refresh device list from backend
      } else {
        setError(data && data.message ? data.message : 'Failed to update device');
      }
    } catch (err) {
      console.error('Error updating device:', err);
      setError('Network error');
    }
  };

  const handleDeleteDevice = (device: Device) => {
    setShowDeleteConfirm(device);
    console.log('Delete device with ID:', device.id);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${SERVER_URL}/api/devices/delete/${showDeleteConfirm.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.status === 200) {
        setSuccess('Device deleted successfully!');
        // Refresh device list from backend
        fetch(`${SERVER_URL}/api/devices/getd`)
          .then((res) => res.json())
          .then((data) => setDevices(data));

        // Close any open modals if the deleted device was being viewed/edited
        if (showDeviceDetails && showDeviceDetails.id === showDeleteConfirm.id) {
          setShowDeviceDetails(null);
        }
        if (showEditDevice && showEditDevice.id === showDeleteConfirm.id) {
          setShowEditDevice(null);
        }

        setShowDeleteConfirm(null);
      } else {
        setError(data?.message || 'Failed to delete device');
      }
    } catch (err) {
      console.error('Error deleting device:', err);
      setError('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.devicesWrapper}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <h1 className={styles.pageTitle}>Device Management</h1>
          <p className={styles.pageSubtitle}>Monitor and configure your connected devices</p>
        </div>

        {/* Action Bar */}
        <div className={styles.actionBar}>
          <div className={styles.deviceStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{devices?.length || 0}</span>
              <span className={styles.statLabel}>Total Devices</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {devices?.filter((d) => deviceTypes?.find((t) => t.id === d.device_type_id)?.name !== 'Camera')
                  .length || 0}
              </span>
              <span className={styles.statLabel}>Sensors</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {devices?.filter((d) => deviceTypes?.find((t) => t.id === d.device_type_id)?.name === 'Camera')
                  .length || 0}
              </span>
              <span className={styles.statLabel}>Cameras</span>
            </div>
          </div>

          <Button onClick={handleAddDevice} variant="primary">
            Add New Device
          </Button>
        </div>

        {/* Device Grid */}
        <div className={styles.deviceGrid}>
          {devices?.map((device) => (
            <div key={device.id} className={styles.deviceCard}>
              <div className={styles.Wrapper}>
                <div className={styles.left}>
                  <h3 className={styles.deviceName}>{device.name}</h3>
                  <p className={styles.deviceType}>
                    {deviceTypes?.find((t) => String(t.id) === String(device.device_type_id))?.name ??
                      device.device_type_id}
                  </p>
                </div>
                <div className={styles.right}></div>
              </div>
              <div className={styles.deviceActions}>
                <button className={styles.actionButton} onClick={() => handleViewDevice(device)}>
                  View
                </button>
                <button className={styles.actionButton} onClick={() => handleShowEditDevice(device)}>
                  Edit
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => handleDeleteDevice(device)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className={styles.overlay}>
            <div className={styles.modal}>
              <h2 className={styles.headerDetail}>Add New Device</h2>

              {error && (
                <div
                  style={{
                    color: 'red',
                    marginBottom: '10px',
                    padding: '8px',
                    backgroundColor: '#ffebee',
                    borderRadius: '4px',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className={styles.label}>
                  Device Name:
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    className={styles.editValue}
                    placeholder="Enter device name (2-100 characters)"
                    maxLength={100}
                  />
                  <small style={{ color: '#666', fontSize: '0.85em' }}>
                    Must be unique within the selected floorplan
                  </small>
                </label>

                <label className={styles.label}>
                  Device Type:
                  <select
                    name="device_type_id"
                    value={form.device_type_id}
                    onChange={handleFormChange}
                    className={styles.editValue}
                    required
                  >
                    <option value="">Select device type...</option>
                    {deviceTypes?.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} {type.unit && `(${type.unit})`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.label}>
                  Floorplan:
                  <select
                    name="floorplan_id"
                    value={form.floorplan_id}
                    onChange={handleFormChange}
                    className={styles.editValue}
                    required
                  >
                    <option value="">Select floorplan...</option>
                    {floorplans?.map((fp) => (
                      <option key={fp.id} value={fp.id}>
                        {fp.name}
                      </option>
                    ))}
                  </select>
                </label>

                {(() => {
                  const selectedType = deviceTypes?.find((dt) => dt.id.toString() === form.device_type_id);
                  if (selectedType && selectedType.name === 'Camera') {
                    return (
                      <label className={styles.label}>
                        Camera URL (Optional):
                        <input
                          name="path_topic"
                          value={form.path_topic}
                          onChange={handleFormChange}
                          className={styles.editValue}
                          placeholder="e.g., http://192.168.1.100:8080 or https://camera.local"
                        />
                        <small style={{ color: '#666', fontSize: '0.85em' }}>
                          Valid formats: HTTP/HTTPS URLs or IP addresses
                        </small>
                      </label>
                    );
                  }
                  return null;
                })()}

                {(() => {
                  const selectedType = deviceTypes?.find((dt) => dt.id.toString() === form.device_type_id);
                  const isCamera = selectedType && selectedType.name === 'Camera';
                  const unit = selectedType?.unit || '';

                  if (!isCamera && selectedType) {
                    return (
                      <>
                        <label className={styles.label}>
                          Min Alert Value{unit && ` (${unit})`}:
                          <input
                            name="min_alert"
                            value={form.min_alert}
                            onChange={handleFormChange}
                            type="number"
                            step="any"
                            className={styles.editValue}
                            placeholder={`Enter minimum threshold${unit ? ` in ${unit}` : ''}`}
                            required
                          />
                        </label>

                        <label className={styles.label}>
                          Max Alert Value{unit && ` (${unit})`}:
                          <input
                            name="max_alert"
                            value={form.max_alert}
                            onChange={handleFormChange}
                            type="number"
                            step="any"
                            className={styles.editValue}
                            placeholder={`Enter maximum threshold${unit ? ` in ${unit}` : ''}`}
                            required
                          />
                        </label>
                        <small style={{ color: '#666', fontSize: '0.85em' }}>
                          Device will alert when values are outside this range
                        </small>
                      </>
                    );
                  }
                  return null;
                })()}

                <div className={styles.footer}>
                  <Button type="button" variant="secondary" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!form.name.trim() || !form.device_type_id || !form.floorplan_id}
                  >
                    Add Device
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeviceDetails && (
          <div className={styles.overlay}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.headerDetail}>Device Information</h2>

              <div className={styles.detailsGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Name:</span>
                  <span className={styles.value}>{showDeviceDetails?.name}</span>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.label}>Type:</span>
                  <span className={styles.value}>
                    {deviceTypes?.find((t) => String(t.id) === String(showDeviceDetails?.device_type_id))?.name ??
                      showDeviceDetails?.device_type_id}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Floorplan:</span>
                  <span className={styles.value}>
                    {floorplans?.find((f) => String(f.id) === String(showDeviceDetails?.floorplan_id))?.name ??
                      showDeviceDetails?.floorplan_id}
                  </span>
                </div>

                {(() => {
                  const deviceType = deviceTypes?.find(
                    (t) => String(t.id) === String(showDeviceDetails?.device_type_id)
                  );
                  const isCamera = deviceType && deviceType.name === 'Camera';

                  return (
                    <>
                      <div className={styles.detailRow}>
                        <span className={styles.label}>{isCamera ? 'Camera URL:' : 'Path Topic:'}</span>
                        <span className={styles.value}>{showDeviceDetails?.path_topic}</span>
                      </div>

                      {!isCamera && (
                        <>
                          <div className={styles.detailRow}>
                            <span className={styles.label}>Min Alert:</span>
                            <span className={styles.value}>{showDeviceDetails?.min_alert}</span>
                            <b>
                              {(() => {
                                const type = deviceTypes?.find((t) => t.id === showDeviceDetails.device_type_id);
                                return type && type.unit ? ` ${type.unit}` : '';
                              })()}
                            </b>
                          </div>

                          <div className={styles.detailRow}>
                            <span className={styles.label}>Max Alert:</span>
                            <span className={styles.value}>{showDeviceDetails?.max_alert}</span>
                            <b>
                              {(() => {
                                const type = deviceTypes?.find((t) => t.id === showDeviceDetails.device_type_id);
                                return type && type.unit ? ` ${type.unit}` : '';
                              })()}
                            </b>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className={styles.footer} style={{ borderTop: 'none' }}>
                <Button variant="secondary" onClick={() => setShowDeviceDetails(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {showEditDevice && (
          <div className={styles.overlay}>
            <div className={styles.modal}>
              <h2 className={styles.headerDetail}>Edit Device</h2>

              {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitEditDevice();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <label className={styles.label}>
                  Name:
                  <input
                    name="name"
                    value={editDeviceForm.name}
                    onChange={handleEditFormChange}
                    required
                    className={`${styles.editValue}`}
                    placeholder="Device name"
                  />
                </label>

                <label className={styles.label}>
                  Device Type:
                  <input
                    value={
                      deviceTypes?.find((t) => String(t.id) === String(showEditDevice?.device_type_id))?.name ??
                      showEditDevice?.device_type_id
                    }
                    readOnly
                    disabled
                    className={`${styles.editValue}`}
                    style={{ backgroundColor: '#f8fcffff', color: '#383131ff' }}
                    placeholder="Device type (cannot be changed)"
                  />
                </label>

                <label className={styles.label}>
                  Floorplan:
                  <select
                    name="floorplan_id"
                    value={editDeviceForm.floorplan_id}
                    onChange={handleEditFormChange}
                    className={`${styles.editValue}`}
                    required
                  >
                    {floorplans?.map((fp) => (
                      <option key={fp.id} value={fp.id}>
                        {fp.name}
                      </option>
                    ))}
                  </select>
                </label>

                {(() => {
                  const deviceType = deviceTypes?.find((t) => String(t.id) === String(showEditDevice?.device_type_id));
                  const isCamera = deviceType && deviceType.name === 'Camera';
                  return (
                    <>
                      {!isCamera && (
                        <>
                          <label>
                            Min Alert:
                            <b>
                              {(() => {
                                const type = deviceTypes?.find((t) => t.id === showEditDevice.device_type_id);
                                return type && type.unit ? ` ${type.unit}` : '';
                              })()}
                            </b>
                            <input
                              name="min_alert"
                              value={editDeviceForm.min_alert}
                              onChange={handleEditFormChange}
                              type="number"
                              className={`${styles.editValue}`}
                              placeholder="Enter min alert value"
                              required
                            />
                          </label>

                          <label>
                            Max Alert:
                            <b>
                              {(() => {
                                const type = deviceTypes?.find((t) => t.id === showEditDevice.device_type_id);
                                return type && type.unit ? ` ${type.unit}` : '';
                              })()}
                            </b>
                            <input
                              name="max_alert"
                              value={editDeviceForm.max_alert}
                              onChange={handleEditFormChange}
                              type="number"
                              className={`${styles.editValue}`}
                              placeholder="Enter max alert value"
                              required
                            />
                          </label>
                        </>
                      )}
                      {isCamera && (
                        <label>
                          Camera
                          <input
                            name="path_topic"
                            value={''}
                            onChange={handleEditFormChange}
                            className={`${styles.editValue}`}
                            placeholder="Enter New path topic Here"
                          />
                        </label>
                      )}
                    </>
                  );
                })()}
              </form>

              <div className={styles.footer}>
                <Button variant="secondary" onClick={() => setShowEditDevice(null)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmitEditDevice}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className={`${styles.overlay} ${styles.deleteOverlay}`}>
            <div className={`${styles.modal} ${styles.deleteModal}`} onClick={(e) => e.stopPropagation()}>
              <div className={styles.deleteIcon}>⚠️</div>
              <h3 className={styles.deleteTitle}>Delete Device</h3>
              <p className={styles.deleteMessage}>Are you sure you want to delete "{showDeleteConfirm.name}"?</p>
              <p className={styles.deleteWarning}>This action cannot be undone.</p>

              {error && (
                <div
                  style={{
                    color: 'red',
                    marginBottom: '10px',
                    padding: '8px',
                    backgroundColor: '#ffebee',
                    borderRadius: '4px',
                  }}
                >
                  {error}
                </div>
              )}

              <div className={styles.footer}>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmDelete}
                  style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                >
                  Delete Device
                </Button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className={`${styles.overlay} ${styles.successOverlay}`} onClick={() => setSuccess('')}>
            <div className={`${styles.modal} ${styles.successModal}`} onClick={(e) => e.stopPropagation()}>
              <div className={styles.successIcon}>✓</div>
              <h3 className={styles.successTitle}>Success!</h3>
              <p className={styles.successMessage}>{success}</p>
              <Button variant="primary" onClick={() => setSuccess('')}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Devices;
