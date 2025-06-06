import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  DndContext,
  useDraggable,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
} from '@dnd-kit/core';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
type Device = {
  sensor_id: number;
  sensor_name: string;
  sensor_type: string;
  location: string;
  floorplan_id: number; // Allow null for items not associated with a floorplan
  x_position: number | null; // Allow null for items not associated with a floorplan
  y_position: number | null; // Allow null for items not associated with a floorplan
};

// Reusable draggable device component
function DraggableDevice({
  device,
  onDragEnd,
}: {
  device: Device;
  onDragEnd: (id: number, x: number, y: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: device.sensor_id,
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    top: device.y_position,
    left: device.x_position,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    //backgroundColor: device.status === 'online' ? 'green' : 'red',
    color: 'white',
    padding: '2px 5px',
    borderRadius: '4px',
    cursor: 'grab',
    transformOrigin: 'top left',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {device.sensor_name}
    </div>
  );
}
type FloorPlan = {
  floorplan_id: number;
  name: string;
  image_url: string;
  description: string;
}

export default function FloorPlanPage() {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<FloorPlan | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
  fetch(`${SERVER_URL}/api/floorplans`)
    .then((res) => res.json())
    .then((data) => {
      console.log('floorPlans API response:', data);
      setFloorPlans(data.floorPlans); // adjust if your API returns a different structure
    });
}, []);

  const handleSelectFloor = (floorId: number) => {
    axios.get(`/api/floor/${floorId}`).then((res) => {
      setSelectedFloor(res.data.floor);
      setDevices(res.data.devices);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const id = event.active.id;
    const device = devices.find((d) => d.sensor_id === id);
    if (!device || !event.delta) return;

    // Update local state
    const updatedDevices = devices.map((d) =>
      d.sensor_id === id
        ? {
            ...d,
            x: d.x + event.delta.x,
            y: d.y + event.delta.y,
          }
        : d
    );
    setDevices(updatedDevices);

    // Optional: send update to backend
    const movedDevice = updatedDevices.find((d) => d.sensor_id === id);
    axios.post('/api/device/update-position', {
      id,
      x: movedDevice?.x,
      y: movedDevice?.y,
    });
  };

  return (
    <div style={{ display: 'flex' }}>
      <div
        style={{
          width: '200px',
          padding: '1rem',
          borderRight: '1px solid #ccc',
        }}
      >
        <h3>Floor Plans</h3>
        <ul>
          {Array.isArray(floorPlans) ? (
            floorPlans.map((floor) => (
              <li key={floor.floorplan_id}>
                <button onClick={() => handleSelectFloor(floor.floorplan_id)}>
                  {floor.name}
                </button>
              </li>
            ))
          ) : (
            <p>No floor plans found</p>
          )}
        </ul>
      </div>

      <div style={{ flex: 1, position: 'relative', padding: '1rem' }}>
        {selectedFloor ? (
          <div style={{ position: 'relative' }}>
            <h2>{selectedFloor.name}</h2>
            <img
              src={selectedFloor.image_url}
              alt={selectedFloor.name}
              style={{ width: '100%', maxWidth: '800px' }}
            />

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {devices.map((device) => (
                <DraggableDevice
                  key={device.sensor_id}
                  device={device}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </DndContext>
          </div>
        ) : (
          <p>Select a floor to view it.</p>
        )}
      </div>
    </div>
  );
}
