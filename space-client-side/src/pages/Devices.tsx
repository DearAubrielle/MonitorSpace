import { useState, useEffect } from 'react';
import styles from './Devices.module.css';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

interface Device {
  id: string;
  name: string;
  device_type_id: number;
  floorplan_id: number;
  path_topic: string;
  min_alert: number;
  max_alert: number;
}

interface DeviceType {
  id: number;
  name: string;
}

interface Floorplan {
  id: number;
  name: string;
}

const Devices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // const selectedDeviceType = deviceTypes.find(dt => dt.id.toString() === form.devicetype); // Moved inline where needed
  const [form, setForm] = useState({
    name: '',
    device_type_id: '',
    floorplan_id: '',
    path_topic: '',
    min_alert: '',
    max_alert: '',
  });

  // Fetch floorplans from backend
  useEffect(() => {
    fetch(`${SERVER_URL}/api/floorplans/getf`)
      .then((res) => res.json())
      .then((data) => {
        setFloorplans(data);
        if (data.length > 0) {
          setForm((f) => ({ ...f, floorplan_id: data[0].id.toString() }));
        }
      });
  }, []);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/devices/getd`)
      .then((res) => res.json())
      .then((data) => setDevices(data));
  }, []);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/devices/gettypes`)
      .then((res) => res.json())
      .then((data) => {
        setDeviceTypes(data);
        if (data.length > 0) {
          setForm((f) => ({ ...f, device_type_id: data[0].id.toString() }));
        }
      });
  }, []);

  const handleAddDevice = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({
      name: '',
      device_type_id:
        deviceTypes.length > 0 ? deviceTypes[0].id.toString() : '',
      floorplan_id: floorplans.length > 0 ? floorplans[0].id.toString() : '',
      path_topic: '',
      min_alert: '',
      max_alert: '',
    });
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Prepare payload matching backend expectations
    const payload = {
      name: form.name,
      device_type_id: Number(form.device_type_id),
      floorplan_id: Number(form.floorplan_id),
      path_topic: form.path_topic,
      min_alert: Number(form.min_alert),
      max_alert: Number(form.max_alert),
    };

    try {
      const res = await fetch(`${SERVER_URL}/api/devices/postd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('Response status:', res.status);
      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }
      if (res.status === 201) {
        setSuccess('Device added successfully!');
        // Refresh device list from backend
        fetch(`${SERVER_URL}/api/devices/getd`)
          .then((res) => res.json())
          .then((data) => setDevices(data));
        handleCloseModal();
      } else {
        setError(data && data.message ? data.message : 'Failed to add device');
      }
    } catch (err) {
      console.error('Caught error in handleFormSubmit:', err);
      setError('Network error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Devices</h1>
        <button className={styles.addButton} onClick={handleAddDevice}>
          Add New Device
        </button>
      </div>
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
      )}
      {success && (
        <div style={{ color: 'green', marginBottom: '10px' }}>{success}</div>
      )}

      <div className={styles.deviceGrid}>
        {devices.map((device) => (
          <div key={device.id} className={styles.deviceCard}>
            <div className={styles.Wrapper}>
              <div className={styles.left}>
                <h3 className={styles.deviceName}>{device.name}</h3>
                <p className={styles.deviceType}>{device.device_type_id}</p>
              </div>
              <div className={styles.right}></div>
            </div>
            <div className={styles.deviceActions}>
              <button className={styles.actionButton}>View</button>
              <button className={styles.actionButton}>Edit</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
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
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={handleFormSubmit}
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              minWidth: 320,
              boxShadow: '0 2px 12px #0002',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h2>Add Device</h2>
            <label>
              Name:
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                required
                style={{ width: '100%' }}
                placeholder="Device name"
              />
            </label>
            <label>
              Device Type:
              <select
                name="device_type_id"
                value={form.device_type_id}
                onChange={handleFormChange}
                style={{ width: '100%' }}
                required
              >
                {deviceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Floorplan:
              <select
                name="floorplan_id"
                value={form.floorplan_id}
                onChange={handleFormChange}
                style={{ width: '100%' }}
                required
              >
                {floorplans.map((fp) => (
                  <option key={fp.id} value={fp.id}>
                    {fp.name}
                  </option>
                ))}
              </select>
            </label>
            {(() => {
              const selectedType = deviceTypes.find(
                (dt) => dt.id.toString() === form.device_type_id
              );
              if (selectedType && selectedType.name === 'Camera') {
                return (
                  <label>
                    Ip Address
                    <input
                      name="path_topic"
                      value={form.path_topic}
                      onChange={handleFormChange}
                      style={{ width: '100%' }}
                      placeholder="Enter Camera path here"
                    />
                  </label>
                );
              }
              return null;
            })()}
            <label>
              Min Alert:
              <input
                name="min_alert"
                value={form.min_alert}
                onChange={handleFormChange}
                type="number"
                style={{ width: '100%' }}
                placeholder="Enter min alert value"
                required
              />
            </label>
            <label>
              Max Alert:
              <input
                name="max_alert"
                value={form.max_alert}
                onChange={handleFormChange}
                type="number"
                style={{ width: '100%' }}
                placeholder="Enter max alert value"
                required
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className={styles.addButton}>
                Add
              </button>
              <button
                type="button"
                className={styles.addButton}
                style={{ background: '#ccc', color: '#222' }}
                onClick={handleCloseModal}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Devices;
