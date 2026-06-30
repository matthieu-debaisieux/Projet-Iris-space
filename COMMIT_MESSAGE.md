# Réorganisation des pages d'administration et ajout de pages en cours

## Description

Déplacement des pages d'administration (`Abscence.html`, `Actualite.html`, `AdminAcceuil.html`, `Messages.html`, `documents.html`) depuis `src/assets/pages/` vers un nouveau dossier dédié `src/assets/pages/administration/`, afin de mieux séparer les espaces visiteur, professeur et administration.

- Mise à jour des chemins relatifs (CSS, images, liens internes) dans les pages déplacées suite au changement de profondeur de dossier.
- Mise à jour de `login.js` pour rediriger vers le nouveau chemin de `AdminAcceuil.html`.
- Ajout de `src/assets/pages/prof/WorkInProgress.html` (page temporaire pour l'espace professeur, en cours de construction).
- Ajout de `src/assets/pages/mediaschool/contact.html` (nouvelle page de contact).
- Le lien "Professeurs" dans la navigation admin pointe désormais vers la page `WorkInProgress.html`.
