import styles from './FloorPlan.module.css';
import { useEffect, useState } from "react";
const SERVER_URL = import.meta.env.VITE_SERVER_URL;


interface floorplan {
  floorplan_id: number;
  name: string;
  image_url: string;
  description: string;
}

export default function Floorplan() {
  const [floorplans, setFloorplans] = useState<floorplan[]>([]);
  const [selected, setSelected] = useState<floorplan | null>(null);

  useEffect(() => {
    const fetchFloorplans = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/floorplans`);
        const data = await response.json();
        setFloorplans(data);
        setSelected(data[0] || null); // Select the first floorplan by default
      } catch (error) {
        console.error("Error fetching floorplans:", error);
      }
    };

    fetchFloorplans();
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: '1rem', marginLeft:'0.7rem' }}>Floor Plan</h2>
      <div className={styles.Wrapper}>
        {/* Floorplan List */}
        <div className={styles.FloorList}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {floorplans.map((plan) => (
              <li
                key={plan.floorplan_id}
                onClick={() => setSelected(plan)}
                className={`${styles.List} ${selected?.floorplan_id === plan.floorplan_id ? styles.Selected : styles.Unselected}`}
              >
                {plan.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Floorplan Image with Drag-and-Drop */}
        <div className={styles.FloorPlan}>
          {selected && (
  <>
    
    <img
      src={SERVER_URL + selected.image_url}
      alt={selected.description}
      className={styles.FloorPlanImage}
    />
  </>
)}
        </div>
        <div className='filler'></div>
      </div>
    </div>
  );
}