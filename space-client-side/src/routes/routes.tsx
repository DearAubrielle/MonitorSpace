import App from '../App.tsx';
import { createBrowserRouter } from 'react-router';
import Login from '../pages/Login.tsx';
import Googogaga from '../Googogaga.tsx';
import FloorPlan from '../pages/FloorPlan.tsx';
import FloorPlanPage from '../pages/FloorplanPage.tsx';
import SensorDataComponent from '../components/SensorDataComponent.tsx';
import FloorplanTest from '../pages/FloorplanTest.tsx';
import Register from '../pages/Register.tsx'; 
import DevicesDrop from '../components/DevicesDrop.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import MonitorPage from '../pages/MonitorPage.tsx';
import Member from '../pages/Member.tsx';
import Devices from '../pages/Devices.tsx';
import PrivateRoute from '../utils/PrivateRoute.tsx';
import Start from '../pages/Start.tsx';
const routes = createBrowserRouter([
  { index: true, Component: Start },
  {
    Component: App,
    children: [
      { path: "/dashboard", 
        element: (
          <PrivateRoute allowedRoles={['user', 'admin']}>
            <Dashboard />
          </PrivateRoute>
        ),
      },
      { path: '/googogaga', Component: Googogaga },
      { path: '/floorplantest', Component: FloorplanTest },
      { path: '/floorplan', Component: FloorPlan },
      { path: '/floorplanpage', Component: FloorPlanPage },
      { path: '/sensordata', Component: SensorDataComponent },
      { path: '/devicesdrop', Component: DevicesDrop },
      { path: '/monitor', Component: MonitorPage },
      { path: '/device', Component: Devices },
      { path: '/member', Component: Member },
      

    ],
  },
  { path: '/login', Component: Login },
  { path: '/register', Component: Register },
]);
export default routes;
