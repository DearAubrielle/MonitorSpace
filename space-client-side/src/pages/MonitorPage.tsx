import MonitorComponent from '../components/MonitorComponent';

const demoCameras = [
  {
    id: '1',
    name: 'Front Entrance',
    streamUrl: 'http://192.168.100.101/videostream.cgi?user=admin&pwd=888888',
    details: 'Covers the main entrance area. 1080p, 30fps.',
  },
  {
    id: '2',
    name: 'Warehouse',
    streamUrl: 'http://192.168.100.101/videostream.cgi?user=admin&pwd=888888',
    details: 'Monitors the warehouse floor. Night vision enabled.',
  },
  {
    id: '3',
    name: 'Parking Lot',
    streamUrl: 'http://192.168.100.101/videostream.cgi?user=admin&pwd=888888',
    details: 'Outdoor camera for parking lot surveillance.',
  },
];

export default function MonitorPage() {
  return <MonitorComponent cameras={demoCameras} />;
}