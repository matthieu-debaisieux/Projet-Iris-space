import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';

// Protège une page : non connecté = page de connexion,
// sans le `droit` demandé = page d'accueil. Sans `droit`, être connecté suffit.
export default function RequireDroit({ droit, children }) {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (droit && !can(droit)) return <Navigate to="/accueil" replace />;
  return children;
}
