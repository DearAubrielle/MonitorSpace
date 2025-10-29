import AspectRatioBox from './AspectRatioBox';
import { DndContext } from '@dnd-kit/core';
import DraggableBox from './DraggableBox';
import type { Device, DeviceType } from '../types/Device';
import type { PercentPosition } from '../utils/handleDragEnd';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

import type { DragEndEvent } from '@dnd-kit/core';

interface FloorplanProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  devices: Device[];
  deviceTypes: DeviceType[];
  devicePositions: Record<string, PercentPosition>;
  renderedSize: { width: number; height: number };
  onDragEnd: (event: DragEndEvent) => void;
  onDeviceDoubleClick?: (device: Device) => void;
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
  onDeviceDoubleClick,
  editMode = false,
}: FloorplanProps) {
  return (
    <AspectRatioBox
      originalWidth={originalWidth}
      originalHeight={originalHeight}
      backgroundImage={imageUrl}
      maxWidth="100%"
    >
      <DndContext onDragEnd={onDragEnd}>
        {devices.map((device: Device) => {
          const types = deviceTypes ?? [];
          const type = types.find((t) => t.id === device.device_type_id);
          const icon = type ? SERVER_URL + type.icon_url : '/icons/default.png';
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
              onDoubleClick={
                onDeviceDoubleClick
                  ? () => onDeviceDoubleClick(device)
                  : undefined
              }
              disabled={!editMode}
              deviceName={device.name}
              value={device.latest_value}
              unit={type?.unit}
            />
          );
        })}
      </DndContext>
    </AspectRatioBox>
  );
}
