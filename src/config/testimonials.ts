/**
 * Témoignages affichés sur la landing.
 * Source : Google Reviews (validés par l'auteur).
 *
 * Pour ajouter / modifier : édite ce fichier et c'est repris à la prochaine
 * compilation. Pas de DB — c'est volontaire (cohérent avec le ton "humain"
 * de la plateforme et facile à maintenir).
 */

export type Testimonial = {
  name: string;
  /** Métier ou contexte (optionnel) */
  context?: string;
  /** Note sur 5 — affichée en étoiles */
  rating: number;
  /** Citation, sans guillemets (le composant les ajoute) */
  body: string;
  /** Date / période — affichée en discret en bas */
  date: string;
  /** Source : "Google", "Site", etc. — affiché en pill */
  source?: string;
};

export const testimonials: Testimonial[] = [
  {
    name: 'Carole G.',
    rating: 5,
    body: "J'ai eu la chance de participer à une formation sur les usages de l'IA pour les entrepreneurs. Le contenu était très professionnel, le formateur dynamique, pédagogue, et il nous a transmis des outils vraiment très pertinents.",
    date: 'Février 2026',
    source: 'Google',
  },
  {
    name: 'Laura Fontanet Galeotti',
    rating: 5,
    body: "Arthur a une approche moderne et intelligente de l'IA. Sa formation permet de déconstruire certains biais et de s'approprier l'IA comme un outil.",
    date: 'Janvier 2026',
    source: 'Google',
  },
  {
    name: 'Odile ANDRAU',
    rating: 5,
    body: "Je me suis régalée pendant une semaine. Vraiment, j'ai découvert des possibilités extraordinaires.",
    date: 'Février 2026',
    source: 'Google',
  },
  {
    name: 'Nadine FERRIER',
    rating: 5,
    body: 'Très bon formateur, pédagogue et patient, qui adapte la formation à son public. Merci.',
    date: 'Février 2026',
    source: 'Google',
  },
  {
    name: 'El-Adawi Aboudou',
    rating: 5,
    body: "Arthur est super en atelier et en accompagnement. Nous avons eu la chance de le découvrir lors d'une conférence sur les avantages de la tech et de l'IA.",
    date: 'Octobre 2025',
    source: 'Google',
  },
  {
    name: 'Sophie B.',
    rating: 5,
    body: "Parfait, langage clair même pour une profane. Outils simples d'utilisation pour tous types d'activités.",
    date: 'Janvier 2026',
    source: 'Google',
  },
  {
    name: 'Amélie C.',
    rating: 5,
    body: 'Une expérience très positive. Je recommande vivement.',
    date: 'Février 2026',
    source: 'Google',
  },
];
