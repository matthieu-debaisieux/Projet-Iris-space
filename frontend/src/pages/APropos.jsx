
export default function APropos() {
  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-[var(--color-page)]">
      <div className="flex flex-col md:flex-row gap-8 md:gap-12 max-w-400 mx-auto h-full items-stretch">
        {/* carte À Propos : texte */}
        <section className="flex-1 bg-[var(--color-background)] rounded-3xl p-8 md:p-10 flex flex-col">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">À Propos</h1>
          <div className="flex flex-col gap-5 text-gray-800 text-lg leading-relaxed">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
              veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
              commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
              dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
              proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
              doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
              veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </p>
          </div>
        </section>

        {/* image (placeholder) */}
        <section className="flex-1 flex">
          <div className="w-full rounded-3xl border-4 border-blue-400 bg-gray-200 flex flex-col items-center justify-center gap-3 text-gray-500 min-h-[300px] md:min-h-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="text-lg font-medium">Image</span>
          </div>
        </section>
      </div>
    </main>
  );
}
