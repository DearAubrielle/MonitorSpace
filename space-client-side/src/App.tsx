import './App.css'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import { Outlet, Navigate } from 'react-router'
import { ReactNode } from "react";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const isAuthenticated = localStorage.getItem("token"); // Example auth check
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };
  
export default function App() {
  
    return (
    <>
    <ProtectedRoute>
      <div>
        <Header />
        <div className='mainWrapper'>
          <Sidebar />
          <main>
            <Outlet/>
          </main>
        </div>
      </div>
    </ProtectedRoute>
    </>
  )
}