import './App.css';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import { Outlet } from 'react-router';
import { FloorplanProvider } from './context/FloorplanProvider';

export default function App() {
  return (
    <>
      <FloorplanProvider>
        <div>
          <Header />
          <div className="mainWrapper">
            <Sidebar />
            <main>
              <Outlet />
            </main>
          </div>
        </div>
      </FloorplanProvider>
    </>
  );
}
