import { useCallback, useEffect, useState } from 'react';

// Charge des données via une fonction asynchrone (un service).
// Les données précédentes restent affichées pendant un rechargement.
//   const { data, loading, error, setData, reload } = useAsync(getActualites);
//   const notes = useAsync(() => getEmploiDuJour(date), [date]);
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    loader().then(
      data => { if (!cancelled) setState({ data, loading: false, error: null }); },
      error => { if (!cancelled) setState(s => ({ ...s, loading: false, error })); },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  // Mise à jour locale (après une création / suppression…)
  const setData = useCallback(update => {
    setState(s => ({ ...s, data: typeof update === 'function' ? update(s.data) : update }));
  }, []);

  const reload = useCallback(() => setVersion(v => v + 1), []);

  return { ...state, setData, reload };
}
