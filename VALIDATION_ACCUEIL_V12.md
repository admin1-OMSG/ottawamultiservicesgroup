# Validation de l’accueil V12

Base Git : `d074257`. Date : 21 septembre 2026.

- Compilation `npm run build` réussie.
- Vérification dans un navigateur local en FR et EN, aux largeurs 1440, 1024, 768, 390 et 320 px.
- Aucun débordement horizontal de la page dans ces dix configurations.
- Deux blocs de texte distincts dans le grand titre.
- Illustration du haut sans texte incrusté ; réutilisation de `omsg-hero-cleaning.jpg`.
- Bannière avec texte retirée de l'accueil ; six images de services conservées.
- Treize liens de menu et cinq liens sociaux conservés dans le pied de page.
- Hauteur des liens de menu : au moins 44 px.
- Bouton principal menant au formulaire vérifié.
- Navigation depuis le pied de page vers Services vérifiée, ainsi que le pied de page partagé en mobile.
- Traduction de la mention de droits réservés vérifiée.
- Captures françaises ordinateur/mobile inspectées visuellement.
- Aucune erreur JavaScript pendant les contrôles de navigation.

Les contrôles utilisent un serveur local avec les connexions externes bloquées :
aucune soumission réelle, écriture CRM, réservation ni envoi de courriel.
Les polices externes indisponibles sont remplacées par les polices système.
Ces vérifications ciblées ne constituent pas un audit complet du site.

Le ZIP ne contient que deux fichiers de code, les présentes instructions et cinq
aperçus. Le pied de page est commun aux pages publiques. Aucun fichier Supabase,
calcul de prix ou schéma de données n'est modifié.
