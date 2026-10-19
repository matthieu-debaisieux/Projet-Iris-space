import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/img/Logo_IRIS_SPACE.svg';

const GEAR_PATH = 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M19.4 13.5a7.6 7.6 0 0 0 .1-1 7.6 7.6 0 0 0-.1-1l1.9-1.5a.5.5 0 0 0 .1-.6l-1.8-3a.5.5 0 0 0-.6-.2l-2.2.9a7.4 7.4 0 0 0-1.7-1l-.3-2.3a.5.5 0 0 0-.5-.4h-3.6a.5.5 0 0 0-.5.4l-.3 2.3a7.4 7.4 0 0 0-1.7 1l-2.2-.9a.5.5 0 0 0-.6.2l-1.8 3a.5.5 0 0 0 .1.6l1.9 1.5a7.6 7.6 0 0 0-.1 1 7.6 7.6 0 0 0 .1 1l-1.9 1.5a.5.5 0 0 0-.1.6l1.8 3a.5.5 0 0 0 .6.2l2.2-.9a7.4 7.4 0 0 0 1.7 1l.3 2.3a.5.5 0 0 0 .5.4h3.6a.5.5 0 0 0 .5-.4l.3-2.3a7.4 7.4 0 0 0 1.7-1l2.2.9a.5.5 0 0 0 .6-.2l1.8-3a.5.5 0 0 0-.1-.6l-1.9-1.5Z';

// Page temporaire de l'espace professeur (animations dans style.css)
export default function WorkInProgress() {
  const navigate = useNavigate();
  const btn = 'btn bg-[var(--color-button)] text-white border-0 mt-2 hover:-translate-y-0.5 transition-transform duration-200';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center bg-[var(--color-principal)] sticky top-0 z-50 shrink-0 pr-4 px-4 py-2">
        <div className="flex items-center gap-5">
          <div className="logo">
            <Link to="/"><img src={logo} alt="Logo IRIS SPACE" className="h-auto w-40 p-0 m-0" /></Link>
          </div>
          <div className="title text-2xl text-white tracking-wide">PROFESSEUR</div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 p-6 bg-[var(--color-page)] text-center">
        <div className="relative wip-float">
          <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondaire)" strokeWidth="1.2" className="wip-gear">
            <path strokeLinecap="round" strokeLinejoin="round" d={GEAR_PATH} />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--color-principal)" strokeWidth="1.4" className="wip-gear-rev absolute -bottom-2 -right-3">
            <path strokeLinecap="round" strokeLinejoin="round" d={GEAR_PATH} />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-titre)] mb-3">Page en construction</h1>
          <p className="text-gray-600 text-lg flex items-center justify-center gap-1">
            Cette section arrive bientôt
            <span className="flex gap-1 ml-1">
              <span className="wip-dot w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />
              <span className="wip-dot w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />
              <span className="wip-dot w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />
            </span>
          </p>
        </div>

        <div className="w-64 md:w-80 h-2.5 bg-[var(--color-background)] rounded-full overflow-hidden">
          <div className="wip-bar h-full rounded-full bg-[var(--color-secondaire)]" />
        </div>

        <button onClick={() => navigate(-1)} className={btn}>← Retour</button>
        <button onClick={() => navigate('/prof')} className={btn}>espace professeur</button>
      </main>
    </div>
  );
}
