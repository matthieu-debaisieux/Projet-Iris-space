import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEscape } from '@/hooks/useEscape.js';
import { useNotifications } from '@/hooks/useNotifications.js';
import { TYPES_NOTIFICATION, dateComplete, dateRelative, lireDate } from '@/services/notifications.js';

const texteNonLues = n => `${n} notification${n > 1 ? 's' : ''} non lue${n > 1 ? 's' : ''}`;

// Un lien interne du front ('/devoirs') ou externe (http…)
const estExterne = lien => /^https?:\/\//i.test(lien);

// Cloche de la navbar : pastille du nombre de non lues et liste déroulante des dernières
// notifications. Au clavier : Entrée ou Espace ouvre, Tab parcourt la liste, Échap ferme et
// rend le focus à la cloche. À afficher seulement avec le droit `notifications`.
export default function NotificationBell() {
  const { notifications, nonLues, charge, erreur, marquerLue, toutMarquerLu, recharger } = useNotifications();
  const [ouvert, setOuvert] = useState(false);
  const [annonce, setAnnonce] = useState('');
  const conteneur = useRef(null);
  const bouton = useRef(null);
  const precedent = useRef(null);

  const fermer = useCallback(() => setOuvert(false), []);
  const fermerEtRendreLeFocus = useCallback(() => {
    setOuvert(false);
    bouton.current?.focus();
  }, []);
  useEscape(fermerEtRendreLeFocus, ouvert);

  // Clic en dehors : on ferme
  useEffect(() => {
    if (!ouvert) return undefined;
    const dehors = e => { if (!conteneur.current?.contains(e.target)) setOuvert(false); };
    document.addEventListener('pointerdown', dehors);
    return () => document.removeEventListener('pointerdown', dehors);
  }, [ouvert]);

  // Annonce aux lecteurs d'écran quand de nouvelles notifications arrivent (pas au premier chargement)
  useEffect(() => {
    if (!charge) return;
    if (precedent.current !== null && nonLues > precedent.current) setAnnonce(`Nouvelle notification : ${texteNonLues(nonLues)}`);
    precedent.current = nonLues;
  }, [charge, nonLues]);

  function basculer() {
    if (!ouvert) recharger();
    setOuvert(o => !o);
  }

  // Tab hors du composant (le focus part ailleurs) : on ferme
  function surPerteDeFocus(e) {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOuvert(false);
  }

  function ouvrir(notification) {
    if (!notification.lue) marquerLue(notification.id);
    fermer();
  }

  const libelle = nonLues > 0 ? `Notifications, ${texteNonLues(nonLues)}` : 'Notifications';

  return (
    <div ref={conteneur} className="md:relative" onBlur={surPerteDeFocus}>
      <button
        ref={bouton}
        type="button"
        onClick={basculer}
        aria-label={libelle}
        aria-haspopup="true"
        aria-expanded={ouvert}
        aria-controls={ouvert ? 'panneau-notifications' : undefined}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8B005] ${ouvert ? 'text-[#F8B005]' : 'text-white'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {nonLues > 0 && (
          <span aria-hidden="true" className="flex absolute -top-1 right-0 min-w-[20px] h-5 bg-red-600 text-white text-xs font-bold rounded-full items-center justify-center px-1 leading-none pointer-events-none">
            {nonLues > 99 ? '99+' : nonLues}
          </span>
        )}
      </button>

      <span role="status" className="sr-only">{annonce}</span>

      {ouvert && (
        <section
          id="panneau-notifications"
          aria-labelledby="titre-notifications"
          className="absolute left-2 right-2 top-full mt-1 md:left-auto md:right-0 md:w-96 md:mt-2 z-50 bg-white text-[#001257] rounded-xl shadow-2xl border border-[#E1E5EE] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E1E5EE]">
            <h2 id="titre-notifications" className="text-base font-semibold">Notifications</h2>
            <button
              type="button"
              onClick={toutMarquerLu}
              disabled={nonLues === 0}
              className="text-sm font-medium text-[#11004A] underline underline-offset-2 hover:text-[#EC6F6F] disabled:no-underline disabled:text-gray-400 disabled:cursor-default rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#11004A]"
            >
              Tout marquer comme lu
            </button>
          </div>

          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {erreur && (
              <p role="alert" className="px-4 py-3 text-sm text-red-600 bg-[#FBE6E6]">
                Impossible de rafraîchir les notifications.
              </p>
            )}

            {!charge && <p className="px-4 py-6 text-sm text-center text-gray-500">Chargement…</p>}

            {charge && notifications.length === 0 && !erreur && (
              <p className="px-4 py-6 text-sm text-center text-gray-500">Aucune notification pour le moment.</p>
            )}

            {notifications.length > 0 && (
              <ul className="divide-y divide-[#EEF1F7]">
                {notifications.map(n => (
                  <Notification key={n.id} notification={n} onOuvrir={() => ouvrir(n)} onLire={() => marquerLue(n.id)} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Notification({ notification: n, onOuvrir, onLire }) {
  const date = lireDate(n.created_at);
  const dateIso = Number.isNaN(date.getTime()) ? undefined : date.toISOString();

  const contenu = (
    <>
      <span className="flex items-center gap-2 text-xs text-gray-500">
        {!n.lue && <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-[#EC6F6F] shrink-0" />}
        {!n.lue && <span className="sr-only">Non lue. </span>}
        <span>{TYPES_NOTIFICATION[n.type] ?? 'Notification'}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={dateIso} title={dateComplete(n.created_at) || undefined}>
          {dateRelative(n.created_at)}
        </time>
      </span>
      <span className={`block mt-0.5 text-sm ${n.lue ? 'font-normal text-gray-700' : 'font-semibold'}`}>{n.titre}</span>
    </>
  );

  const classeContenu = 'block flex-1 min-w-0 px-4 py-3 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#11004A] hover:bg-[#EEF1F7]';

  let element;
  if (!n.lien) {
    element = <div className="flex-1 min-w-0 px-4 py-3">{contenu}</div>;
  } else if (estExterne(n.lien)) {
    element = <a href={n.lien} target="_blank" rel="noopener noreferrer" onClick={onOuvrir} className={classeContenu}>{contenu}</a>;
  } else {
    element = <Link to={n.lien} onClick={onOuvrir} className={classeContenu}>{contenu}</Link>;
  }

  return (
    <li className={`flex items-start ${n.lue ? '' : 'bg-[#F7F8FC]'}`}>
      {element}
      {!n.lue && (
        <button
          type="button"
          onClick={onLire}
          aria-label={`Marquer comme lue : ${n.titre}`}
          title="Marquer comme lue"
          className="shrink-0 mt-2 mr-2 w-8 h-8 rounded-full flex items-center justify-center text-[#11004A] hover:bg-[#E1E5EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#11004A] cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
      )}
    </li>
  );
}
