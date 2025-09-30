import { useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
  fname: string;
  lname: string;
  password: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Fetch users data from the backend
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/users/getall");
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Users List</h1>
      <table >
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Password</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.fname}</td>
              <td>{user.lname}</td>
              <td>{user.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
      <h1>Users List</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <strong>ID:</strong> {user.id}, <strong>Username:</strong> {user.username}, <strong>First Name:</strong> {user.fname}, <strong>Last Name:</strong> {user.lname}, <strong>Password:</strong> {user.password}
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
};

export default Users;