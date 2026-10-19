import { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMessageCount } from '@/context/MessageCountContext.jsx';
import { resetDemoData } from '@/services/storage.js';

// Emplacement (nœud DOM) où les pages injectent leurs propres boutons
const DevSlotContext = createContext(null);

// ── Panel debug / dev ───────────────────────────────────────────────────────
// À placer dans un layout autour de <Outlet /> :
//   <WithDevPanel><Outlet /></WithDevPanel>
export function WithDevPanel({ children }) {
  const [slot, setSlot] = useState(null);
  return (
    <DevSlotContext.Provider value={slot}>
      {children}
      <DevPanel slotRef={setSlot} />
    </DevSlotContext.Provider>
  );
}

// Sections propres à une page, affichées dans le panel DEV
//   <DevTools><button>…</button></DevTools>
export function DevTools({ children }) {
  const slot = useContext(DevSlotContext);
  return slot ? createPortal(children, slot) : null;
}

function DevPanel({ slotRef }) {
  const [open, setOpen] = useState(false);
  const { count, add, remove, reset } = useMessageCount();

  function resetData() {
    resetDemoData();
    window.location.reload();
  }

  return (
    <>
      {/* reste monté quand il est fermé : le slot doit toujours exister */}
      <div className={`${open ? '' : 'hidden'} fixed bottom-16 right-4 z-[200] w-64 bg-[var(--color-principal)] text-white rounded-2xl shadow-2xl p-4 border border-[var(--color-secondaire)]`}>
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-[var(--color-secondaire)] text-sm uppercase tracking-wider">🛠 Dev Tools</span>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg font-bold leading-none transition-colors">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Compteur messages</p>
          <div className="flex items-center gap-2">
            <button onClick={add} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 transition font-bold">+1</button>
            <button onClick={remove} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2 transition font-bold">-1</button>
            <button onClick={reset} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-3 py-2 transition text-xs font-medium">Reset</button>
          </div>
          <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 mt-1">
            <span className="text-gray-300 text-xs">Compteur actuel :</span>
            <span className="text-[var(--color-secondaire)] font-bold text-lg">{count}</span>
          </div>

          <div ref={slotRef} className="contents" />

          <p className="text-gray-400 text-xs uppercase tracking-wider mt-3 mb-1">Données</p>
          <button onClick={resetData} className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-3 py-2 text-left transition font-medium text-xs">
            Reset données (défaut)
          </button>
        </div>
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-[200] bg-[var(--color-principal)] border-2 border-[var(--color-secondaire)] text-[var(--color-secondaire)] font-bold text-xs px-3 py-2 rounded-full shadow-lg hover:bg-[var(--color-secondaire)] hover:text-[var(--color-principal)] transition-all duration-200"
        title="Menu développeur"
      >
        DEV
      </button>
    </>
  );
}
