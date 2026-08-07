import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { hasAdminAccess } from '../../utils/adminAccess';
import DecoratingWallLoader from './DecoratingWallLoader';

export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <DecoratingWallLoader phrase="Conferindo o acesso administrativo." />;
  }

  if (!hasAdminAccess(user)) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
