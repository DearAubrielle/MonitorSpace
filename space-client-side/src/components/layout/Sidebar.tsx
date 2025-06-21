import { NavLink } from 'react-router';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const navLinks = [
    { to: "/floorplantest", label: "Floor Plan Test" },
    { to: "/sensordata", label: "Sensor Data" },

    { to: "/floorplan", label: "Floor Plan" },
    { to: "/googogaga", label: "Googogaga" },
    { to: "/watage", label: "Watage" },
    { to: "/home", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/dndkit", label: "DndKit" },
    { to: "/draggable", label: "Draggable" },
    { to: "/floorplanpage", label: "Floor Plan Page" }
  ];
  return (
    <div className={styles.sidebarContainer}>
      <aside className={styles.sidebar}>
      <ul>
        {navLinks.map((link, index) => (
          <li key={index}>
            <NavLink 
            to={link.to} 
            className={({ isActive }) => isActive ? styles.activeLink : undefined}
            >{link.label}
            </NavLink>
          </li>
  ))}
</ul>
      </aside>
    </div>
  );
};

export default Sidebar;