import AspectRatioBox from './AspectRatioBox';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useState } from 'react';
import DraggableBox from './DraggableBox';
import type { Device, DeviceType } from '../types/Device';
import type { PercentPosition } from '../utils/handleDragEnd';
import { getDeviceIconUrl } from '../utils/deviceIcon';

import type { DragEndEvent } from '@dnd-kit/core';

interface FloorplanProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  devices: Device[];
  deviceTypes: DeviceType[];
  devicePositions: Record<string, PercentPosition>;
  renderedSize: { width: number; height: number };
  onDragEnd?: (event: DragEndEvent) => void;
  onDeviceClick?: (device: Device) => void;
  onDeviceDoubleClick?: (device: Device) => void;
  getDeviceValue?: (device: Device) => string | number | undefined;
  getDeviceAlert?: (device: Device) => boolean;
  editMode?: boolean;
}

export default function Floorplan({
  imageUrl,
  originalWidth,
  originalHeight,
  devices,
  devicePositions,
  renderedSize,
  deviceTypes,
  onDragEnd,
  onDeviceClick,
  onDeviceDoubleClick,
  getDeviceValue,
  getDeviceAlert,
  editMode = false,
}: FloorplanProps) {
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const activeDevice = devices.find((device) => String(device.id) === activeDeviceId);
  const activeType = activeDevice
    ? deviceTypes.find((type) => type.id === activeDevice.device_type_id)
    : undefined;
  const dragPreviewSize = Math.max(
    20,
    Math.min(Math.min(renderedSize.width, renderedSize.height) * 0.07, 40)
  );

  return (
    <AspectRatioBox
      originalWidth={originalWidth}
      originalHeight={originalHeight}
      backgroundImage={imageUrl}
      maxWidth="100%"
    >
      <DndContext
        onDragStart={({ active }) => setActiveDeviceId(String(active.id))}
        onDragCancel={() => setActiveDeviceId(null)}
        onDragEnd={(event) => {
          setActiveDeviceId(null);
          onDragEnd?.(event);
        }}
      >
        {devices.map((device: Device) => {
          const types = deviceTypes ?? [];
          const type = types.find((t) => t.id === device.device_type_id);
          const icon = getDeviceIconUrl(type?.icon_url);
          return (
            <DraggableBox
              key={device.id}
              id={String(device.id)}
              label={String(device.id)}
              iconURL={icon} // You can set an icon URL based on device type if needed
              position={
                devicePositions[device.id] || {
                  x: device.x_percent,
                  y: device.y_percent,
                }
              }
              containerWidth={renderedSize.width}
              containerHeight={renderedSize.height}
              onClick={onDeviceClick ? () => onDeviceClick(device) : undefined}
              onDoubleClick={onDeviceDoubleClick ? () => onDeviceDoubleClick(device) : undefined}
              disabled={!editMode}
              alert={getDeviceAlert?.(device) ?? device.alert}
              deviceName={device.name}
              value={getDeviceValue?.(device) ?? device.latest_value}
              unit={type?.unit}
              cameraPreviewUrl={
                type?.name.toLowerCase() === 'camera' && device.path_topic?.trim()
                  ? device.path_topic
                  : undefined
              }
              dragging={activeDeviceId === String(device.id)}
            />
          );
        })}
        <DragOverlay dropAnimation={null} zIndex={5000}>
          {activeDevice ? (
            <div
              aria-hidden="true"
              style={{
                width: dragPreviewSize,
                height: dragPreviewSize,
                boxSizing: 'border-box',
                padding: '5px',
                borderRadius: '20%',
                backgroundColor: (getDeviceAlert?.(activeDevice) ?? activeDevice.alert)
                  ? 'rgba(220, 38, 38, 0.9)'
                  : 'rgba(132, 221, 243, 0.5)',
                backgroundImage: `url(${getDeviceIconUrl(activeType?.icon_url)})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.38)',
                cursor: 'grabbing',
              }}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </AspectRatioBox>
  );
}
