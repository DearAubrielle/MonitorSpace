import App from './App.tsx';
import { createBrowserRouter } from 'react-router';
import Home from './pages/Home.tsx';
import Login from './pages/Login.tsx';
import Googogaga from './Googogaga.tsx';
import Watage from './pages/Watage.tsx';
import FloorPlan from './pages/FloorPlan.tsx';
import About from './pages/About.tsx';
import DndKit from './pages/DndKit.tsx';
import Draggable from './pages/Draggable.tsx';
import FloorPlanPage from './pages/FloorplanPage.tsx';
import SensorDataComponent from './pages/SensorDataComponent.tsx';

const routes = createBrowserRouter([
  {
    Component: App,
    children: [
      { index: true, Component: FloorPlan },
      { path: '/home', Component: Home },
      { path: '/googogaga', Component: Googogaga },
      { path: '/watage', Component: Watage },
      { path: '/floorplan', Component: FloorPlan },
      { path: '/about', Component: About },
      { path: '/dndkit', Component: DndKit },
      { path: '/draggable', Component: Draggable },
      { path: '/floorplanpage', Component: FloorPlanPage },
      { path: '/sensordata', Component: SensorDataComponent },
    ],
  },
  { path: '/login', Component: Login },
]);
export default routes;
