import './App.css'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import { Outlet } from 'react-router'

export default function App() {
  
    return (
    <>
      <div>
        <Header />
        <div className='mainWrapper'>
          <Sidebar />
          <main>
            <Outlet/>
          </main>
        </div>
      </div>
    </>
  )
}