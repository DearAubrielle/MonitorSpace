import { useContext } from 'react';
import { FloorplanContext } from './FloorplanContext';

export const useFloorplan = () => {
  const context = useContext(FloorplanContext);
  if (!context) throw new Error('useFloorplan must be used within a FloorplanProvider');
  return context;
};
