import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

/**
 * ProtectedRoute — bungkus halaman yang butuh login.
 *
 * - Selama AuthContext masih restore localStorage (isLoading=true) → tampil spinner
 * - Kalau gak authenticated → redirect ke /login
 * - Kalau authenticated → render children
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
