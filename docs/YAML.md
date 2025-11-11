oici un mémo “anti‑erreur” pour rédiger tes widgets YAML dans Notion (form, prompt, quiz). Tu peux le coller dans ton doc de production ou dans ton assistant.

Règles Générales
Bloc de code Notion

Crée un /code block. Choisis “Plain text” ou “YAML” (les deux conviennent).
Colle un seul widget par bloc.
Indentation

Toujours 2 espaces pour chaque niveau. Jamais de tabulation (⇥).
Exemple :
fields:
  - name: foo
    label: Foo
Clés & valeurs

Toutes les clés sont en minuscules à l’exception de label (tu peux y mettre du texte libre).
Les champs string peuvent contenir des accents et des apostrophes.
Si un texte occupe plusieurs phrases, utilise | (bloc littéral) ou > (bloc plié) pour garder la mise en forme :
text: |
  Première ligne.
  Deuxième ligne.
Pas de caractères spéciaux non échappés (: ou ?) dans les clés.
Validation rapide

Vérifie visuellement qu’il n’y a pas de retour à la ligne “voiturer dans le vide” comme
question: Question...
?
Si tu veux un retour à la ligne dans une valeur, emploie | / > comme ci-dessus.
1. FormWidget (widget: form)
widget: form
title: (optionnel) Titre affiché en haut
outputTitle: (optionnel) Utilisé dans le template si tu mets {{outputTitle}}
fields:
  - name: identifiant_sans_espace
    label: Texte visible pour l’utilisateur
    placeholder: Texte gris (optionnel)
  - name: autreChamp
    label: ...
template: |
  Texte généré avec {{identifiant_sans_espace}} etc.
Obligatoire : fields est un tableau (- name:). Chaque name doit être unique.
Template : toutes les variables présentes doivent correspondre à un name existant (sinon laissera {{…}}).
Astuces : tu peux ajouter autant de champs que tu veux ; assure-toi de n’utiliser que des espaces.
2. PromptWidget (widget: prompt)
widget: prompt
title: (optionnel) Titre au-dessus de la textarea
template: |
  Contenu initial du prompt (tu peux mettre {{placeholders}} si tu veux montrer à l’utilisateur où éditer)
placeholders: []  # optionnel (tu peux supprimer la ligne si tu n'en as pas besoin)
placeholders n’est plus utilisé visuellement mais tu peux le laisser vide ([]) pour rester compatible.
Le texte du prompt est directement éditable par l’utilisateur ; il suffit d’écrire ton modèle dans template.
3. QuizWidget (widget: quiz)
widget: quiz
title: (optionnel) Titre du quiz
question: Ton énoncé de question sur une seule ligne
options:
  - label: A
    text: |
      Texte de l’option A (peut être multi-ligne)
    feedback: |
      Feedback si l’utilisateur clique sur A
  - label: B
    text: |
      ...
    feedback: |
      ...
  - label: C
    text: |
      ...
    feedback: |
      ...
  - label: D
    text: |
      ...
    feedback: |
      ...
    correct: true
options doit contenir au moins une entrée, et idéalement 4 (A → D).
label sert à l’affichage (A, B, C, D).
feedback est obligatoire pour chaque option (sinon le panneau restera vide).
Ajoute correct: true sur la/les bonne(s) réponse(s).
Si la question contient des sauts de ligne, utilise > ou | pour la valeur.
Checklist finale (avant sync)
Pas de tab (\t) dans le bloc ?
Chaque widget: correspond à un type existant (form, prompt, quiz).
Toutes les listes commencent par - avec deux espaces de retrait.
Pas de retour à la ligne “isolé” après une clé (ex. question:\n → corriger).
(form) : tous les name: sont uniques + le template contient les mêmes identifiants.
(quiz) : au moins un correct: true.
Si tout est OK, lance ta sync ciblée :

