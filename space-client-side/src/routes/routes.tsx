import App from '../App.tsx';
import { createBrowserRouter } from 'react-router';
import Login from '../pages/Login.tsx';
import FloorPlanPage from '../pages/FloorplanPage.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import Member from '../pages/Member.tsx';
import Devices from '../pages/Devices.tsx';
import PrivateRoute from '../utils/PrivateRoute.tsx';
import Start from '../pages/Start.tsx';
import Unauthorized from '../pages/Unauthorized.tsx';
import Account from '../pages/Account.tsx';
import { ROLE_ACCESS } from './access.ts';
const routes = createBrowserRouter([
  { index: true, Component: Start },
  {
    Component: App,
    children: [
      {
        path: '/dashboard',
        element: (
          <PrivateRoute allowedRoles={ROLE_ACCESS.dashboard}>
            <Dashboard />
          </PrivateRoute>
        ),
      },
      {
        path: '/floorplan',
        element: (
          <PrivateRoute allowedRoles={ROLE_ACCESS.floorplan}>
            <FloorPlanPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/device',
        element: (
          <PrivateRoute allowedRoles={ROLE_ACCESS.device}>
            <Devices />
          </PrivateRoute>
        ),
      },
      {
        path: '/member',
        element: (
          <PrivateRoute allowedRoles={ROLE_ACCESS.member}>
            <Member />
          </PrivateRoute>
        ),
      },
      {
        path: '/account',
        element: (
          <PrivateRoute allowedRoles={ROLE_ACCESS.account}>
            <Account />
          </PrivateRoute>
        ),
      },
    ],
  },
  { path: '/login', Component: Login },
  {
    path: '/unauthorized',
    element: (
      <PrivateRoute>
        <Unauthorized />
      </PrivateRoute>
    ),
  },
]);
export default routes;
