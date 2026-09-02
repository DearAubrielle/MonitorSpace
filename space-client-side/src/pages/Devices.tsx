import Button from '@/components/Button';
import { useFloorplan } from '@/context/useFlooplan';
import { useEffect, useRef, useState } from 'react';
import type { Device } from '../types/Device';
import { getDeviceIconUrl, handleDeviceIconError } from '../utils/deviceIcon';
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
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);
  const [isUpdatingDevice, setIsUpdatingDevice] = useState(false);
  const createRequestInFlight = useRef(false);
  const updateRequestInFlight = useRef(false);
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

  const selectedCreateType = deviceTypes?.find((type) => String(type.id) === form.device_type_id);
  const createTypeIsCamera = selectedCreateType?.name === 'Camera';

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
    if (createRequestInFlight.current) return;

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

    createRequestInFlight.current = true;
    setIsCreatingDevice(true);

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
    } finally {
      createRequestInFlight.current = false;
      setIsCreatingDevice(false);
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
    if (!showEditDevice || updateRequestInFlight.current) return;

    setError('');
    setSuccess('');

    const normalizedName = editDeviceForm.name.trim();
    if (!normalizedName) {
      setError('Device name is required');
      return;
    }

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      setError('Device name must be between 2 and 100 characters');
      return;
    }

    updateRequestInFlight.current = true;
    setIsUpdatingDevice(true);

    try {
      // Get device type to determine what fields to send
      const deviceType = deviceTypes?.find((t) => String(t.id) === String(showEditDevice.device_type_id));
      const isCamera = deviceType && deviceType.name === 'Camera';

      // Prepare payload based on device type
      const payload: Record<string, string | number | null> = {
        name: normalizedName,
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
    } finally {
      updateRequestInFlight.current = false;
      setIsUpdatingDevice(false);
    }
  };

  const handleDeleteDevice = (device: Device) => {
    setShowDeleteConfirm(device);
    console.log('Delete device with ID:', device.id);
  };

  const handleToggleAlert = async (device: Device) => {
    setError('');

    try {
      const res = await fetch(`${SERVER_URL}/api/devices/alert/${device.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert: !device.alert }),
      });

      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.status === 200) {
        // Refresh device list from backend
        fetch(`${SERVER_URL}/api/devices/getd`)
          .then((res) => res.json())
          .then((data) => setDevices(data));
      } else {
        setError(data?.message || 'Failed to update alert status');
      }
    } catch (err) {
      console.error('Error toggling alert:', err);
      setError('Network error. Please check your connection and try again.');
    }
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
                <div className={styles.right}>
                  <div className={styles.alertToggleContainer}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={device.alert ?? false}
                        onChange={() => handleToggleAlert(device)}
                        className={styles.toggleInput}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                    <span className={styles.alertLabel}>Alert</span>
                  </div>
                </div>
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
            <div className={`${styles.modal} ${styles.addDeviceModal}`} role="dialog" aria-modal="true" aria-labelledby="add-device-title">
              <div className={styles.addDeviceHeader}>
                <div>
                  <h2 id="add-device-title" className={styles.addDeviceTitle}>Add new device</h2>
                </div>
                <button className={styles.addDeviceClose} type="button" onClick={handleCloseModal} aria-label="Close" disabled={isCreatingDevice}>×</button>
              </div>

              <form onSubmit={handleFormSubmit} className={styles.addDeviceForm}>
                {error && <div className={styles.formError}>{error}</div>}

                <h3 className={styles.addDeviceSectionTitle}>Choose device type</h3>
                <div className={styles.deviceTypeGrid} role="radiogroup" aria-label="Device type">
                  {deviceTypes?.map((type) => (
                    <label key={type.id} className={styles.deviceTypeOption}>
                      <input
                        type="radio"
                        name="device_type_id"
                        value={type.id}
                        checked={form.device_type_id === String(type.id)}
                        onChange={handleFormChange}
                        required
                      />
                      <span className={styles.deviceTypeCard}>
                        <span className={styles.deviceTypeIcon}>
                          <img src={getDeviceIconUrl(type.icon_url)} onError={handleDeviceIconError} alt="" />
                        </span>
                        <strong>{type.name}</strong>
                        <small>{type.unit || (type.name === 'Camera' ? 'Video' : 'Device')}</small>
                      </span>
                    </label>
                  ))}
                </div>

                <h3 className={`${styles.addDeviceSectionTitle} ${styles.addDeviceDetailsTitle}`}>Device details</h3>
                <div className={styles.addDeviceFieldRow}>
                  <label className={styles.addDeviceField}>
                    <span className={styles.addDeviceFieldLabel}>Device name <b className={styles.requiredMark}>*</b></span>
                    <input name="name" value={form.name} onChange={handleFormChange} required className={styles.editValue} placeholder="e.g. Lobby sensor" maxLength={100} autoComplete="off" />
                    <small>Must be unique across the system.</small>
                  </label>
                  <label className={styles.addDeviceField}>
                    <span className={styles.addDeviceFieldLabel}>Assigned floor plan <b className={styles.requiredMark}>*</b></span>
                    <select name="floorplan_id" value={form.floorplan_id} onChange={handleFormChange} className={styles.editValue} required>
                      <option value="">Select a floor plan</option>
                      {floorplans?.map((fp) => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
                    </select>
                  </label>
                </div>

                {createTypeIsCamera && (
                  <div className={styles.addDeviceDynamicPanel}>
                    <label className={styles.addDeviceField}>
                      Camera URL <small className={styles.inlineHint}>· optional</small>
                      <input name="path_topic" value={form.path_topic} onChange={handleFormChange} className={styles.editValue} placeholder="https://camera.local/stream" />
                      <small>Use an HTTP or HTTPS stream address. You can add this later.</small>
                    </label>
                  </div>
                )}

                {selectedCreateType && !createTypeIsCamera && (
                  <div className={styles.addDeviceDynamicPanel}>
                    <h3 className={styles.addDeviceSectionTitle}>{selectedCreateType.name} alert range</h3>
                    <div className={styles.addDeviceFieldRow}>
                      <label className={styles.addDeviceField}>
                        <span className={styles.addDeviceFieldLabel}>Alert below <b className={styles.requiredMark}>*</b></span>
                        <span className={styles.addDeviceUnitInput}>
                          <input name="min_alert" value={form.min_alert} onChange={handleFormChange} type="number" step="any" className={styles.editValue} placeholder="Minimum" required />
                          {selectedCreateType.unit && <b>{selectedCreateType.unit}</b>}
                        </span>
                      </label>
                      <label className={styles.addDeviceField}>
                        <span className={styles.addDeviceFieldLabel}>Alert above <b className={styles.requiredMark}>*</b></span>
                        <span className={styles.addDeviceUnitInput}>
                          <input name="max_alert" value={form.max_alert} onChange={handleFormChange} type="number" step="any" className={styles.editValue} placeholder="Maximum" required />
                          {selectedCreateType.unit && <b>{selectedCreateType.unit}</b>}
                        </span>
                      </label>
                    </div>
                    <small className={styles.panelHint}>Alerts are sent when the reading falls outside this range.</small>
                  </div>
                )}

                <div className={styles.addDeviceActions}>
                  <span><b>*</b> Required fields</span>
                  <div>
                  <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isCreatingDevice}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isCreatingDevice || !form.name.trim() || !form.device_type_id || !form.floorplan_id}
                  >
                    {isCreatingDevice ? 'Adding device...' : 'Add device'}
                  </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeviceDetails && (
          <div className={styles.overlay}>
            <div className={`${styles.modal} ${styles.deviceInfoModal}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="device-information-title">
              {(() => {
                const deviceType = deviceTypes?.find(
                  (t) => String(t.id) === String(showDeviceDetails.device_type_id)
                );
                const isCamera = deviceType?.name === 'Camera';
                const unit = deviceType?.unit || '';
                const floorplanName = floorplans?.find(
                  (f) => String(f.id) === String(showDeviceDetails.floorplan_id)
                )?.name ?? String(showDeviceDetails.floorplan_id);

                return (
                  <div className={styles.deviceInfoScroll}>
                    <div className={styles.deviceInfoHeader}>
                      <span className={styles.deviceInfoIcon} aria-hidden="true">
                        <img src={getDeviceIconUrl(deviceType?.icon_url)} alt="" onError={handleDeviceIconError} />
                      </span>
                      <h2 id="device-information-title" className={styles.deviceInfoTitle}>{showDeviceDetails.name}</h2>
                    </div>
                    <p className={styles.deviceInfoSubtitle}>
                      {isCamera ? 'Device information and connection details.' : 'Device information and configured alert thresholds.'}
                    </p>

                    <h3 className={styles.deviceInfoSectionTitle}>Device details</h3>
                    <div className={styles.deviceInfoDetails}>
                      <div className={styles.deviceInfoField}>
                        <span className={styles.deviceInfoLabel}>Assigned floor plan</span>
                        <div className={styles.deviceInfoValue}>{floorplanName}</div>
                      </div>
                      <div className={styles.deviceInfoField}>
                        <span className={styles.deviceInfoLabel}>{isCamera ? 'Camera URL' : 'Path topic'}</span>
                        <div className={`${styles.deviceInfoValue} ${styles.deviceInfoTopic}`}>
                          {showDeviceDetails.path_topic || '—'}
                        </div>
                      </div>
                    </div>

                    {!isCamera && (
                      <>
                        <h3 className={`${styles.deviceInfoSectionTitle} ${styles.deviceInfoAlertTitle}`}>Alert thresholds</h3>
                        <p className={styles.deviceInfoSectionSubtitle}>An alert is sent when the reading falls outside this range.</p>
                        <div className={styles.deviceInfoThresholdBox}>
                          <div className={styles.deviceInfoThresholds}>
                            <div>
                              <span className={styles.deviceInfoLabel}>Below</span>
                              <div className={styles.deviceInfoReading}>
                                <span>{showDeviceDetails.min_alert}</span>{unit && <b>{unit}</b>}
                              </div>
                            </div>
                            <div>
                              <span className={styles.deviceInfoLabel}>Above</span>
                              <div className={styles.deviceInfoReading}>
                                <span>{showDeviceDetails.max_alert}</span>{unit && <b>{unit}</b>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className={styles.deviceInfoActions}>
                      <Button variant="secondary" onClick={() => setShowDeviceDetails(null)}>Close</Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {showEditDevice && (
          <div className={styles.overlay}>
            <div className={`${styles.modal} ${styles.editDeviceModal}`} role="dialog" aria-modal="true" aria-labelledby="edit-device-title">
              <h2 id="edit-device-title" className={styles.editDeviceTitle}>Edit device</h2>
              <p className={styles.editDeviceSubtitle}>Manage identification, location, and alert thresholds.</p>

              {error && <div className={styles.formError} role="alert">{error}</div>}
              <form
                className={styles.editDeviceForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitEditDevice();
                }}
              >
                <h3 className={styles.editSectionTitle}>Device details</h3>
                <div className={styles.editFieldRow}>
                  <label className={styles.editField}>
                    <span>Device name</span>
                    <input
                      name="name"
                      value={editDeviceForm.name}
                      onChange={handleEditFormChange}
                      required
                      className={styles.editValue}
                      placeholder="Device name"
                    />
                  </label>

                  <label className={styles.editField}>
                    <span>Device type <small>· fixed</small></span>
                    <input
                      value={
                        deviceTypes?.find((t) => String(t.id) === String(showEditDevice?.device_type_id))?.name ??
                        showEditDevice?.device_type_id
                      }
                      readOnly
                      disabled
                      className={styles.editValue}
                      placeholder="Device type"
                    />
                  </label>
                </div>

                <label className={styles.editField}>
                  <span>Assigned floor plan</span>
                  <select
                    name="floorplan_id"
                    value={editDeviceForm.floorplan_id}
                    onChange={handleEditFormChange}
                    className={styles.editValue}
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
                  const unit = deviceType?.unit || '';
                  return (
                    <>
                      {!isCamera && (
                        <>
                          <h3 className={`${styles.editSectionTitle} ${styles.alertSectionTitle}`}>Temperature alerts</h3>
                          <p className={styles.editSectionSubtitle}>Send an alert when the reading falls outside this range.</p>
                          <div className={styles.thresholdBox}>
                            <div className={styles.editFieldRow}>
                              <label className={styles.editField}>
                                <span>Below</span>
                                <span className={styles.unitInput}>
                                  <input name="min_alert" value={editDeviceForm.min_alert} onChange={handleEditFormChange} type="number" className={styles.editValue} required />
                                  {unit && <b>{unit}</b>}
                                </span>
                              </label>
                              <label className={styles.editField}>
                                <span>Above</span>
                                <span className={styles.unitInput}>
                                  <input name="max_alert" value={editDeviceForm.max_alert} onChange={handleEditFormChange} type="number" className={styles.editValue} required />
                                  {unit && <b>{unit}</b>}
                                </span>
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                      {isCamera && (
                        <label className={styles.editField}>
                          <span>Camera URL</span>
                          <input
                            name="path_topic"
                            value={editDeviceForm.path_topic}
                            onChange={handleEditFormChange}
                            className={styles.editValue}
                            placeholder="Enter camera URL"
                          />
                        </label>
                      )}
                    </>
                  );
                })()}
                <div className={styles.editActions}>
                  <Button variant="secondary" type="button" onClick={() => setShowEditDevice(null)} disabled={isUpdatingDevice}>
                    Discard
                  </Button>
                  <Button variant="primary" type="submit" disabled={isUpdatingDevice} style={{ minWidth: 138 }}>
                    {isUpdatingDevice ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className={`${styles.overlay} ${styles.deleteOverlay}`} onClick={() => setShowDeleteConfirm(null)}>
            <div className={`${styles.modal} ${styles.deleteModal}`} role="alertdialog" aria-modal="true" aria-labelledby="delete-device-title" aria-describedby="delete-device-description" onClick={(e) => e.stopPropagation()}>
              <div className={styles.deleteContent}>
                <span className={styles.deleteIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
                  </svg>
                </span>
                <div className={styles.deleteCopy}>
                  <h3 id="delete-device-title" className={styles.deleteTitle}>Delete device?</h3>
                  <p id="delete-device-description" className={styles.deleteMessage}>
                    You’re about to permanently delete <strong>{showDeleteConfirm.name}</strong>. This cannot be undone.
                  </p>
                </div>
              </div>

              {error && <div className={styles.deleteError}>{error}</div>}

              <div className={styles.deleteActions}>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmDelete}
                  style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                >
                  Delete
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
