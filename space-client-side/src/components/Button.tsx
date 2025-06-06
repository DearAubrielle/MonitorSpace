import { useState, useEffect } from 'react';
import axios from 'axios';
function Button() {
  const [count, setCount] = useState(0);
  const [array, setArray] = useState([]);

  const fetchAPI = async () => {
    const response = await axios.get('http://localhost:8080/api');
    setArray(response.data.fruits);
    console.log(response.data.fruits);
  };

  useEffect(() => {
    fetchAPI();
  }, []);

  return (
    <>
      <h1>Welcome</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>

        {array.map((fruit, index) => (
          <div key={index}>
            <p>{fruit}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default Button;
