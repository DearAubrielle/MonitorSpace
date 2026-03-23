import App from '../App.tsx';
import { createBrowserRouter } from 'react-router';
import Login from '../pages/Login.tsx';
import FloorPlanPage from '../pages/FloorplanPage.tsx';
import Register from '../pages/Register.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import Member from '../pages/Member.tsx';
import Devices from '../pages/Devices.tsx';
import PrivateRoute from '../utils/PrivateRoute.tsx';
import Start from '../pages/Start.tsx';
const routes = createBrowserRouter([
  { index: true, Component: Start },
  {
    Component: App,
    children: [
      {
        path: '/dashboard',
        element: (
          <PrivateRoute allowedRoles={['user', 'manager', 'admin']}>
            <Dashboard />
          </PrivateRoute>
        ),
      },
      {
        path: '/floorplan',
        element: (
          <PrivateRoute allowedRoles={['admin']}>
            <FloorPlanPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/device',
        element: (
          <PrivateRoute allowedRoles={['admin']}>
            <Devices />
          </PrivateRoute>
        ),
      },
      {
        path: '/member',
        element: (
          <PrivateRoute allowedRoles={['admin']}>
            <Member />
          </PrivateRoute>
        ),
      },
    ],
  },
  { path: '/login', Component: Login },
  { path: '/register', Component: Register },
]);
export default routes;
