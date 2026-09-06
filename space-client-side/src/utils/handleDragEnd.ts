import { DragEndEvent } from '@dnd-kit/core';

export const BOX_SIZE_PERCENT = 0.07;
export const MIN_BOX_SIZE = 20;
export const MAX_BOX_SIZE = 40;

// Marker size follows the available floorplan width, not its aspect ratio.
// This keeps markers consistent when switching between tall and wide plans.
export const getDeviceBoxSize = (containerWidth: number) =>
  Math.max(MIN_BOX_SIZE, Math.min(containerWidth * BOX_SIZE_PERCENT, MAX_BOX_SIZE));

export type PercentPosition = {
  x: number;
  y: number;
};

export interface HandleDragEndOptions {
  devicePositions: Record<string, PercentPosition>;
  setDevicePositions: React.Dispatch<React.SetStateAction<Record<string, PercentPosition>>>;
  renderedSize: { width: number; height: number };
}

export function handleDragEndFactory(options: HandleDragEndOptions) {
  return function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event;
    const id = active.id as string;
    const containerWidth = options.renderedSize.width;
    const containerHeight = options.renderedSize.height;

    const boxSize = getDeviceBoxSize(containerWidth);

    const current = options.devicePositions[id];
    if (!current) return;

    const currentX = current.x * (containerWidth - boxSize);
    const currentY = current.y * (containerHeight - boxSize);

    let newX = currentX + delta.x;
    let newY = currentY + delta.y;

    newX = Math.max(0, Math.min(newX, containerWidth - boxSize));
    newY = Math.max(0, Math.min(newY, containerHeight - boxSize));

    const percentX = containerWidth - boxSize === 0 ? 0 : newX / (containerWidth - boxSize);
    const percentY = containerHeight - boxSize === 0 ? 0 : newY / (containerHeight - boxSize);

    options.setDevicePositions((prev) => ({
      ...prev,
      [id]: { x: percentX, y: percentY },
    }));
  };
}
