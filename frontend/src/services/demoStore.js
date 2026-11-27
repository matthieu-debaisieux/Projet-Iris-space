// ── Stockage de démonstration (IndexedDB) ───────────────────────────────────
// Mode mock uniquement. localStorage ne peut pas garder de vrais fichiers (limite ~5 Mo, texte seul) :
// ce stockage, lui, garde les objets `File` tels quels. Il survit au rechargement et est partagé entre
// les onglets / comptes utilisés sur CE navigateur (admin puis prof puis élève, par exemple).
// Ce n'est pas partagé entre deux ordinateurs : pour ça, il faut la vraie base de données.
// À supprimer (avec les branches « mock » des services) quand l'API gérera tous les documents.
const ouvrirDb = () => new Promise((ok, ko) => {
  const r = indexedDB.open('iris-demo', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => ok(r.result);
  r.onerror = () => ko(r.error);
});

export const lireDemo = async cle => {
  const db = await ouvrirDb();
  return new Promise((ok, ko) => {
    const q = db.transaction('kv').objectStore('kv').get(cle);
    q.onsuccess = () => ok(q.result);
    q.onerror = () => ko(q.error);
  });
};

export const ecrireDemo = async (cle, valeur) => {
  const db = await ouvrirDb();
  return new Promise((ok, ko) => {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').put(valeur, cle);
    t.oncomplete = () => ok();
    t.onerror = () => ko(t.error);
  });
};
