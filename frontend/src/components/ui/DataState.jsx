import { estNonDisponible, messageLisible } from '@/services/api.js';

// Message d'une erreur de chargement, pour les pages qui n'utilisent pas DataState :
//   - fonction pas encore disponible sur le serveur → message neutre (gris)
//   - autre erreur → texte générique en rouge, suivi du message du back s'il est lisible
export function MessageErreur({ error }) {
  const message = messageLisible(error);

  if (estNonDisponible(error)) {
    return <p role="status" className="text-gray-500 text-sm text-center py-6">{message}</p>;
  }
  return (
    <p role="alert" className="text-red-500 text-sm text-center py-6">
      Impossible de charger les données.
      {message && <span className="block mt-1 text-xs">{message}</span>}
    </p>
  );
}

// Affiche "Chargement…" / l'erreur d'un `useAsync`, sinon `children(data)`.
//   <DataState state={notes}>{liste => <Table rows={liste} />}</DataState>
export default function DataState({ state, children }) {
  if (state.error) return <MessageErreur error={state.error} />;
  if (state.data === undefined) {
    return <p className="text-gray-400 text-sm text-center py-6">Chargement…</p>;
  }
  return children(state.data);
}
