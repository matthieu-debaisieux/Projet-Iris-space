// Affiche "Chargement…" / l'erreur d'un `useAsync`, sinon `children(data)`.
//   <DataState state={notes}>{liste => <Table rows={liste} />}</DataState>
export default function DataState({ state, children }) {
  if (state.error) {
    return <p className="text-red-500 text-sm text-center py-6">Impossible de charger les données.</p>;
  }
  if (state.data === undefined) {
    return <p className="text-gray-400 text-sm text-center py-6">Chargement…</p>;
  }
  return children(state.data);
}
