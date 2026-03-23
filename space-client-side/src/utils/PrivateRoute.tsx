import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/useAuth';

interface PrivateRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { token, role } = useAuth(); // Force role to 'admin' for testingconst role = 'admin';
  // Not logged in → redirect to login
  if (!token) return <Navigate to="/login" replace />;

  // Role not allowed → redirect to unauthorized page
  if (allowedRoles && !allowedRoles.includes(role!)) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}
