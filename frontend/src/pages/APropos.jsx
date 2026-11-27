// Page visiteur « À propos » : une carte de présentation daisyUI avec image.
// TODO : remplacer le Lorem Ipsum par le vrai texte, et IMAGE par la vraie photo
//   import photo from '@/assets/img/a-propos.jpg';  puis  const IMAGE = photo;
const IMAGE = ''; // vide → affiche le placeholder « Image »

export default function APropos() {
  return (
    <main className="flex-1 overflow-y-auto bg-[#F7F8FB] p-6 md:p-10">
      <div className="mx-auto w-full max-w-5xl">
        <article className="card lg:card-side bg-base-100 border border-base-300 shadow-xl overflow-hidden">
          {/* emplacement image */}
          <figure className="lg:w-2/5 min-h-64 bg-base-200">
            {IMAGE ? (
              <img src={IMAGE} alt="Présentation de l'école" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-base-content/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span className="text-lg font-medium">Image</span>
              </div>
            )}
          </figure>

          {/* texte */}
          <div className="card-body gap-4 p-8 lg:p-12">
            <span className="badge badge-soft border-0 bg-[#07A6A6]/15 font-bold uppercase tracking-widest text-[#07A6A6]">
              Qui sommes-nous ?
            </span>
            <h1 className="card-title text-3xl md:text-4xl font-bold text-[#001257]">À propos</h1>
            <span className="h-1 w-16 rounded-full bg-[#F8B005]" aria-hidden="true" />

            <p className="text-base md:text-lg leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
              veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
              commodo consequat.
            </p>
            <p className="text-base md:text-lg leading-relaxed text-base-content/70">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
              dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
              proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}