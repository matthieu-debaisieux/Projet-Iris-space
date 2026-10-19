import { Navigate } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext.jsx';

// Protège un espace : non connecté = page de connexion,
// mauvais rôle = page d'accueil de son propre rôle.
export default function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role] ?? '/'} replace />;
  return children;
}
