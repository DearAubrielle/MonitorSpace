import { useEffect, useState } from "react";

const Fruits: React.FC = () => {
  const [fruits, setFruits] = useState<string[]>([]);

  useEffect(() => {
    // Fetch the fruits array from the backend API
    const fetchFruits = async () => {
      try {
        const response = await fetch("http://localhost:8080/api");
        if (!response.ok) {
          throw new Error("Failed to fetch fruits");
        }
        const data = await response.json();
        setFruits(data.fruits); // Set the fruits array in state
      } catch (error) {
        console.error("Error fetching fruits:", error);
      }
    };

    fetchFruits();
  }, []);

  return (
    <div>
      <h1>Fruits</h1>
      <ul>
        {fruits.map((fruit, index) => (
          <li key={index}>{fruit}</li>
        ))}
      </ul>
    </div>
  );
};

export default Fruits;