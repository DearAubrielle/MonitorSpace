import { NavLink } from 'react-router';

export default function Start() {
    return (
        <>
        <div style={{ flex: 1, padding: '20px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <h1>Welcome to the Start Page</h1>
            <div style={{ marginBottom: 'auto' }}>
                <NavLink to="/register">Register</NavLink>
            </div>
            <div style={{ marginBottom: 'auto' }}>
                <NavLink to="/login">Login</NavLink>
            </div>
        </div>
        </>
    );
}