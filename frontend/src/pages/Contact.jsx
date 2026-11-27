import { useState } from 'react';
import { envoyerContact } from '@/services/contact.js';

// ─────────────────────────────────────────────────────────────────────────────
// Page visiteur « Nous contacter » (maquette Figma).
// TODO : remplacer les coordonnées et les liens ci-dessous par les vrais.
// ─────────────────────────────────────────────────────────────────────────────
const COORDONNEES = [
  { service: 'Secrétariat', email: 'exemple.mail@mail.com', tel: '01 23 45 67 89' },
  { service: 'Direction',   email: 'exemple.mail@gmail.com', tel: '01 23 45 67 89' },
];

const LIENS_INFO = [
  { label: 'Site IRIS Nice',    href: 'https://www.iris-nice.fr/' }, // TODO : vérifier l'URL
  { label: 'Campus MédiaSchool', href: 'https://mediaschool.eu/' },
];

const card = 'bg-white rounded-2xl border border-[#E1E5EE] p-6 shadow-[0_1px_2px_rgba(0,18,87,0.04)]';
const cardTitle = 'text-base font-bold text-[#001257] mb-4';
const etiquette = 'block mb-1.5 text-sm font-semibold text-[#001257]';
const champ = invalide =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#1A1D2E] placeholder:text-[#6B7185] focus:outline-none focus:border-[#001257] transition ${invalide ? 'border-[#B23A3A] bg-[#FBE6E6]' : 'border-[#E1E5EE]'}`;

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', message: '' });
  const [erreurs, setErreurs] = useState({});
  const [envoye, setEnvoye] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurMessage, setErreurMessage] = useState(null);

  const modifier = nom => e => {
    setForm(f => ({ ...f, [nom]: e.target.value }));
    setErreurs(er => ({ ...er, [nom]: false }));
    setEnvoye(false);
    setErreurMessage(null);
  };

  const envoyer = async e => {
    e.preventDefault();
    setErreurMessage(null);
    setEnvoye(false);

    const errs = {
      nom: !form.nom.trim(),
      email: !EMAIL_VALIDE.test(form.email.trim()),
      message: !form.message.trim(),
    };
    setErreurs(errs);
    if (Object.values(errs).some(Boolean)) return;

    setEnvoiEnCours(true);
    try {
      await envoyerContact({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setForm({ nom: '', prenom: '', email: '', message: '' });
      setEnvoye(true);
    } catch (err) {
      setErreurMessage(err?.message || "Une erreur est survenue lors de l'envoi.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#F7F8FB]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold text-[#001257]">Nous contacter</h1>
          <p className="mt-1 text-sm text-[#6B7185]">
            Une question sur l'école ou les formations informatiques ? Écrivez-nous.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Colonne gauche : coordonnées + liens */}
          <div className="flex flex-col gap-6">
            <section className={card}>
              <h2 className={cardTitle}>Coordonnées</h2>
              <ul className="flex flex-col gap-4">
                {COORDONNEES.map(c => (
                  <li key={c.service}>
                    <p className="text-xs text-[#6B7185]">{c.service}</p>
                    <p className="text-sm font-semibold text-[#1A1D2E] break-words">
                      <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>
                      {' · '}
                      <a href={`tel:${c.tel.replace(/\s/g, '')}`} className="hover:underline">{c.tel}</a>
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className={card}>
              <h2 className={cardTitle}>Intéressé par l'informatique ?</h2>
              <div className="flex flex-wrap gap-3">
                {LIENS_INFO.map(l => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border-2 border-[#001257] px-5 py-2.5 text-sm font-bold text-[#001257] hover:bg-[#001257] hover:text-white transition-colors duration-200"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </section>
          </div>

          {/* Colonne droite : formulaire */}
          <section className={card}>
            <h2 className={cardTitle}>Formulaire de contact</h2>
            <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-nom" className={etiquette}>Nom</label>
                  <input
                    id="contact-nom"
                    type="text"
                    autoComplete="family-name"
                    maxLength={100}
                    value={form.nom}
                    onChange={modifier('nom')}
                    placeholder="Votre nom"
                    className={champ(erreurs.nom)}
                  />
                </div>
                <div>
                  <label htmlFor="contact-prenom" className={etiquette}>Prénom</label>
                  <input
                    id="contact-prenom"
                    type="text"
                    autoComplete="given-name"
                    maxLength={100}
                    value={form.prenom}
                    onChange={modifier('prenom')}
                    placeholder="Votre prénom"
                    className={champ(erreurs.prenom)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-email" className={etiquette}>E-mail</label>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={form.email}
                  onChange={modifier('email')}
                  placeholder="vous@exemple.fr"
                  className={champ(erreurs.email)}
                />
              </div>

              <div>
                <label htmlFor="contact-message" className={etiquette}>Message</label>
                <textarea
                  id="contact-message"
                  rows={4}
                  maxLength={5000}
                  value={form.message}
                  onChange={modifier('message')}
                  placeholder="Votre message…"
                  className={`${champ(erreurs.message)} resize-none`}
                />
              </div>

              {Object.values(erreurs).some(Boolean) && (
                <p role="alert" className="text-xs font-medium text-[#B23A3A]">
                  Veuillez remplir tous les champs obligatoires avec une adresse e-mail valide.
                </p>
              )}
              {erreurMessage && (
                <p role="alert" className="rounded-lg bg-[#FBE6E6] px-4 py-3 text-sm font-semibold text-[#B23A3A]">
                  {erreurMessage}
                </p>
              )}
              {envoye && (
                <p role="status" className="rounded-lg bg-[#E3F5EC] px-4 py-3 text-sm font-semibold text-[#1E7F55]">
                  Merci ! Votre message a bien été envoyé.
                </p>
              )}

              <button
                type="submit"
                disabled={envoiEnCours}
                className="w-full rounded-xl bg-[var(--color-button)] px-4 py-3 text-sm font-bold text-[#001257] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {envoiEnCours ? 'Envoi en cours…' : 'Envoyer'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
