# Vérification de l’affichage et du bouton EN/FR — V14

22 septembre 2026. Base : votre archive `ottawamultiservicesgroup-main (44).zip`.

Le ZIP de livraison est un correctif : il contient uniquement les fichiers source modifiés,
les instructions et les éléments de vérification. Il ne remplace pas le projet complet.
Aucune publication ni modification de Supabase n’a été effectuée.

## Problèmes constatés et corrigés

| Zone | Constat dans le code ou le navigateur | Correction |
|---|---|---|
| Bouton EN/FR | Absent entre 1 024 et 1 279 px : l’en-tête et le bouton flottant avaient des seuils incompatibles. | Sélecteur visible dans l’en-tête à toutes les largeurs testées ; sélecteur de secours si la page n’a pas d’en-tête avec sélecteur. |
| Changement de langue | Préférence locale insuffisamment protégée contre un refus d’accès au stockage et l’ordre initial lecture/écriture. | Lecture avant mémorisation ; choix utilisable en mémoire si le navigateur bloque le stockage. |
| Navigation | En-tête serré, petit bouton de langue et menu pouvant dépasser une faible hauteur d’écran. | En-tête compact sur téléphone, boutons EN/FR de 44 × 44 px, menu défilable et fermeture avec Échap. |
| Demande de devis | Le bouton français dépassait 407 px dans un écran de 320 px. | Retour à la ligne et largeur adaptée ; 238 px dans ce même écran après correction. |
| Partenaires | Les deux boutons d’ouverture et les boutons d’envoi pouvaient élargir la page. | Grille bornée et boutons pouvant occuper plusieurs lignes. |
| Contact | L’adresse courriel imposait une largeur minimale trop grande à la grille. | Colonnes rétractables et adresse pouvant revenir à la ligne. |
| Pages de services | Plusieurs textes restaient en anglais ; le grand mot « déménagement » débordait à 320 px. | Traductions explicites sur la page Services et six pages spécialisées ; titre et boutons adaptés aux petits écrans. |
| Contraste | Certains petits textes blancs étaient posés sur un turquoise trop clair. | Fond turquoise foncé pour le bouton standard, le bouton de l’en-tête et les actions principales du portail ; conservation du texte foncé sur les boutons turquoise clair. |
| Portail client | En-tête avec courriel et déconnexion serré ; références de paiement longues ; calendrier trop haut en paysage. | En-tête pouvant revenir à la ligne, défilement local du tableau, fenêtre de rendez-vous avec défilement vertical. |
| Portail en français | Certains libellés dynamiques, dont l’accueil et les dates de facture, restaient anglais. | Traduction de ces libellés ; les données contractuelles enregistrées conservent leur langue d’origine. |

Le pied de page de votre archive est déjà organisé en colonnes adaptatives ; il a été
vérifié et conservé. Les règles de prix, les calculs, le stockage CRM et les modalités
de facturation n’ont pas été modifiés par ce correctif.

## Vérifications effectuées

- **460 combinaisons** : 23 pages × 2 langues × 10 largeurs (320, 375, 390, 768,
  1 024, 1 180, 1 280, 1 440, 1 536 et 1 920 px). Aucun débordement horizontal de
  page ni erreur JavaScript détectés dans cette matrice ; EN/FR présent.
- Pages : accueil, Services, tarifs généraux/résidentiels/commerciaux, estimateur,
  politique des prix, devis, FAQ, confidentialité, conditions, Contact, À propos,
  Partenaires, Carrières, accès au portail, connexion administration et six pages
  de services (automobile, paysagisme, déménagement, déneigement, pneus, petits travaux).
- **12 contrôles interactifs** : menu en portrait et paysage, bouton final du menu
  accessible, Échap et retour du focus, langue conservée après rechargement,
  absence de doublons du sélecteur, fonctionnement avec stockage bloqué.
- **15 cas portail** avec données fictives : EN/FR de 320 à 1 440 px, références
  longues, calendrier comportant 24 créneaux à 320 × 740 et 844 × 390 px.
  Un contrôle français ciblé a suivi la correction des libellés dynamiques.
- **11 contrôles complémentaires** : formulaires Partenaires ouverts, adresse de
  Contact, titre de déménagement, bouton du devis et son contraste au survol,
  chargement effectif des polices Inter et Poppins.
- `node scripts/test-contact-request.mjs` : 6 contrôles réussis, backend simulé.
- `node scripts/test-marketing-consent.mjs` : 9 contrôles réussis.
- `npm run build` : compilation de production réussie.

Ces essais utilisent Chromium et des dimensions d’écran simulées. La matrice
principale et les derniers essais de formulaires chargent les polices Inter/Poppins
à partir de copies locales des polices utilisées par le site. Les essais isolés du
portail et du menu ont également vérifié leur comportement avec les polices de repli.
Il ne s’agit pas d’une validation sur de vrais iPhone/Safari et appareils Android.
Les essais du portail n’ont envoyé ni courriel, ni réservation, ni signature réelle.
Les écrans internes du CRM autres que l’accès à l’administration ne sont pas couverts.

## Points restant à traiter

La présence du bouton ne signifie pas que chaque texte du site est déjà traduit :

| Page | Texte encore partiellement en anglais en mode FR |
|---|---|
| À propos | Titre et introduction. Les paragraphes Mission/Vision sont déjà traduits. |
| Partenaires | Introduction et explications détaillées des deux modes de partenariat. |
| Carrières | Plusieurs textes de présentation et consignes du formulaire ; certaines réponses dépendent aussi de la langue choisie dans le formulaire. |
| Blog | Introduction, titres et résumés éditoriaux. |

**Mention à confirmer avant une publicité :** la page À propos contient encore
« Insured & Bonded », « Every job is covered end-to-end » et « Certified Crews » ;
son introduction et ses métadonnées mentionnent aussi une équipe assurée.
Le code ne permet pas de vérifier ces affirmations. Si l’entreprise n’est pas
actuellement assurée/cautionnée, les mentions correspondantes doivent être retirées
ou corrigées avant de promouvoir cette page. Elles n’ont pas été reformulées
silencieusement dans un correctif d’affichage.

Les titres et descriptions de devis déjà enregistrés dans une langue restent des
données contractuelles ; le sélecteur ne les traduit pas automatiquement.

## Fichiers source modifiés

- `src/components/quote-funnel.tsx`
- `src/components/service-seo-page.tsx`
- `src/components/site-header.tsx`
- `src/components/ui/button.tsx`
- `src/lib/language.tsx`
- `src/routes/contact.tsx`
- `src/routes/handyman-ottawa.tsx`
- `src/routes/landscaping-ottawa.tsx`
- `src/routes/mobile-car-detailing-ottawa.tsx`
- `src/routes/mobile-tire-change-ottawa.tsx`
- `src/routes/moving-services-ottawa.tsx`
- `src/routes/partners.tsx`
- `src/routes/portal.tsx`
- `src/routes/services.tsx`
- `src/routes/snow-removal-ottawa.tsx`

## Captures

Les captures figurent dans `docs/affichage-v14/`. Les captures de portail sont des
exemples simulés. Le fichier `resultats-verification.json` conserve les résultats
détaillés. Les images présentent des portions de page à leur taille d’écran,
notamment le haut de page, le formulaire ou le pied de page.
