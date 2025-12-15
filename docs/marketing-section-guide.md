# Guide sections marketing

## Ordre des blocs côté Notion

1. **Divider** : sépare visuellement les sections. Sans divider, le runtime fusionne les blocs avec la section précédente.
2. **Code block JSON** : premier bloc de la section. Il définit les métadonnées consommées par le front.
   ```json
   {
     "preset": "hero",         // optionnel (hero, hero-split, logos-band, etc.)
     "tone": "accent",         // optionnel (flat, accent, highlight, dark)
     "bodyVariant": "wide"     // optionnel (default, dense, wide)
   }
   ```
3. **Contenu** : headings, paragraphs, colonnes… Ce sont les blocs réellement affichés.

Sans preset/tone/bodyVariant, le bloc code peut être supprimé : le layout restera en mode “flat” avec padding par défaut.

## Clés supportées

| clé         | rôle                                                                                   |
|-------------|----------------------------------------------------------------------------------------|
| `preset`    | Injecte un composant spécifique (hero, hero-split, logos-band).                        |
| `tone`      | Choisit la tonalité de fonds (`flat`, `accent`, `highlight`, `dark`).                  |
| `bodyVariant` | Ajuste le padding interne : `dense` (compact), `wide` (air supplémentaire) ou custom. |

> Astuce : pour appliquer uniquement un ton personnalisé, mettez un code block `{"tone":"accent"}` et laissez `preset` vide.

## Conseils

- Évitez tout texte avant le code block sinon les presets ne seront pas détectés.
- Réutilisez les mêmes `tone` pour rythmer la page (ex. alterner `flat`/`accent`).
- En cas d’erreur JSON, la console serveur affiche `[marketing] preset code block JSON invalid` avec l’ID du bloc.
- Pour tester localement sans Notion, utilisez la page `/marketing-preview` qui instancie plusieurs sections factices.

