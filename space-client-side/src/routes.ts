import App from './App.tsx';
import { createBrowserRouter } from 'react-router';
import Login from './pages/Login.tsx';
import Googogaga from './Googogaga.tsx';
import FloorPlan from './pages/FloorPlan.tsx';
import About from './pages/About.tsx';
import FloorPlanPage from './pages/FloorplanPage.tsx';
import SensorDataComponent from './components/SensorDataComponent.tsx';
import FloorplanTest from './pages/FloorplanTest.tsx';
import Register from './pages/Register.tsx'; 
import DevicesDrop from './components/DevicesDrop.tsx';
import Dashboard from './pages/Dashboard.tsx';
import DndColumns from './pages/DndColumns.tsx';
import MonitorPage from './pages/MonitorPage.tsx';
import Member from './pages/Member.tsx';
import Devices from './pages/Devices.tsx';
const routes = createBrowserRouter([
  {
    Component: App,
    children: [
      { index: true, Component: Dashboard },
      { path: '/dashboard', Component: Dashboard },
      { path: '/googogaga', Component: Googogaga },
      { path: '/floorplantest', Component: FloorplanTest },
      { path: '/floorplan', Component: FloorPlan },
      { path: '/about', Component: About },
      { path: '/floorplanpage', Component: FloorPlanPage },
      { path: '/sensordata', Component: SensorDataComponent },
      { path: '/devicesdrop', Component: DevicesDrop },
      { path: '/dndcolumns', Component: DndColumns },
      { path: '/monitor', Component: MonitorPage },
      { path: '/device', Component: Devices },
      { path: '/member', Component: Member },

    ],
  },
  { path: '/login', Component: Login },
  { path: '/register', Component: Register },
]);
export default routes;
