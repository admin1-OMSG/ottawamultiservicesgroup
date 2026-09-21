# Validation de l’accueil V11

Date : 21 septembre 2026. Base Git : `4de1f21`.

## Périmètre

- Accueil : couleurs de texte, fonds, cartes de services, étapes et boutons.
- Formulaire partagé : retours à la ligne des titres et descriptions de services.
- Dictionnaire français : 16 traductions de badges et descriptions.
- Aucun changement des calculs, du schéma Supabase ou des fonctions serveur.

## Vérifications réalisées

- `npm run build` : compilation réussie.
- Navigateur local : français en 1440, 768, 390 et 320 px ; anglais en 1440 et 390 px.
- Aucun débordement horizontal de la page dans ces configurations.
- Six cartes illustrées, quatre étapes et douze choix de services présents.
- Titres et descriptions du sélecteur affichés sans points de suspension.
- Descriptions des cartes et étapes en 16 px minimum.
- Contraste mesuré des descriptions sur fond blanc : 7,58:1 ; numéros des étapes : 7,54:1.
- Bouton principal : déplacement vers le formulaire vérifié.
- Choix résidentiel et commercial, puis retour au choix du service vérifiés.
- Liens des services, de la page partenaire et du téléphone conservés.
- Passage FR → EN après interaction vérifié ; aucune erreur JavaScript relevée.
- Captures ordinateur et mobile inspectées visuellement.

Les interactions ont été vérifiées avec les connexions externes bloquées :
aucune demande réelle, aucun courriel et aucune écriture CRM n’ont été produits.
Les captures utilisent les polices de remplacement du navigateur lorsque les
polices Google sont indisponibles. Ces contrôles portent sur les zones modifiées
et ne constituent pas un audit d’accessibilité complet du site.

## Aperçus fournis

- `docs/home-preview/hero-desktop-fr.png`
- `docs/home-preview/services-desktop-fr.png`
- `docs/home-preview/steps-desktop-fr.png`
- `docs/home-preview/steps-mobile-fr.png`
- `docs/home-preview/form-mobile-fr.png`
