# Validation du correctif V15 — Prix initiaux et récurrence

Date : 22 septembre 2026.

## Périmètre

Deux fichiers du site sont modifiés :

- `src/components/cleaning-pricing-overview.tsx` : page générale des tarifs, cartes résidentielle et commerciale, tableaux comparatifs, échéancier et calcul dépliable en anglais et français.
- `src/routes/pricing-policy.tsx` : explication des économies sur quatre visites et du minimum commercial, conforme à l’affichage.

Le catalogue des prix, le calculateur, les taxes, les formulaires CRM et les
fonctions Supabase restent inchangés. Aucun déploiement Supabase n’est requis.
Les nouveaux montants d’affichage sont calculés à partir des tarifs existants.

## Montants vérifiés

Exemples de trois heures-personnes, prestations identiques, CAD avant taxes et options :

| Fréquence | Visites 1–3, chacune | Visite 4 | Visite 5 et suivantes | Économie totale sur 4 visites |
|---|---:|---:|---:|---:|
| Hebdomadaire | 150 $ | 54 $ | 126 $ | 96 $ |
| Aux deux semaines | 150 $ | 90 $ | 135 $ | 60 $ |
| Mensuelle | 150 $ | 126 $ | 144 $ | 24 $ |
| Commercial planifié, exemple 3 h | 150 $ | 90 $ | 135 $ | 60 $ |

Le minimum commercial de deux heures-personnes est présenté séparément :
100 $ pour chacune des visites 1–3, 60 $ à la visite 4, puis 90 $ par visite.
Il n’est pas comparé à un forfait ponctuel de deux heures inexistant.

Le crédit hebdomadaire de la quatrième facture est de 72 $, tandis que
l’économie totale sur les quatre visites est de 96 $. La différence correspond
à la réduction propre à la quatrième visite. Aucun crédit supplémentaire n’est
ajouté à ces montants.

## Contrôles effectués

- Les 24 contrôles existants de `scripts/test-cleaning-pricing.mjs` réussissent.
- `npm run build` termine avec succès.
- 40 combinaisons vérifiées dans Chromium : quatre pages (`/pricing`,
  `/pricing/residential`, `/pricing/commercial`, `/pricing-policy`), deux langues,
  cinq largeurs (320, 390, 768, 1280 et 1440 px).
- Aucun débordement horizontal global détecté ; boutons EN et FR visibles.
- Conditions visibles dans chaque carte récurrente ; anciens montants barrés
  retirés des cartes et de leur comparaison.
- Échéanciers chiffrés et économies vérifiés sur les cartes ; ouverture et fermeture
  du détail de calcul vérifiées.
- Comparaisons développées vérifiées à 320 px en français sur les deux pages :
  leur défilement horizontal reste interne au tableau.
- Bouton du forfait hebdomadaire testé : la sélection est conservée à l’arrivée
  dans le calculateur. Exemple Ontario de trois heures sans options : première
  facture 169,50 $, quatrième 61,02 $, puis 142,38 $, taxes comprises.
- Aucun message d’erreur JavaScript pendant les parcours vérifiés.
- Contrôle visuel des cartes sur ordinateur et téléphone simulé.

## Limites

Les contrôles visuels ont été effectués sur des tailles d’écran simulées dans
Chromium, pas sur des appareils physiques ni dans Safari. Les requêtes de devis
n’ont pas été envoyées et aucune donnée client n’a été créée. Le correctif est
préparé pour installation ; la mise en production dépend de votre copie des
fichiers, de votre envoi Git et du déploiement de l’hébergeur.

Les aperçus joints montrent la version locale vérifiée. L’en-tête flottant a été
masqué uniquement pour la capture recadrée de la carte mobile afin de ne pas
cacher son titre ; le site conserve son en-tête et son sélecteur EN/FR.
