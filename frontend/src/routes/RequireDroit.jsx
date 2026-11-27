import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';

// Protège une page : non connecté = page de connexion,
// sans le `droit` demandé = page d'accueil. Sans `droit`, être connecté suffit.
export default function RequireDroit({ droit, children }) {
  const { user, loading, can } = useAuth();
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-500">
        Vérification de la session…
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (droit && !can(droit)) return <Navigate to="/accueil" replace />;
  return children;
}
