# Vérifications — Tarifs V3 : ajustement de quatre options

Base : commit publié `91a9c1c`. Grille : `2026-09-20-v3`.

- Prix centralisés : armoires 15 $, draps 10 $ par lit, garage 20 $, balcon 20 $, avant taxes.
- Les quatre options sont proposées en résidentiel et en commercial. La restriction résidentielle du changement de draps a été retirée.
- Les 13 contrôles existants de `node scripts/test-cleaning-pricing.mjs` réussissent. Le contrôle commercial a été adapté à la disponibilité des draps : trois lits coûtent désormais 30 $ ; les chambres supplémentaires restent réservées au résidentiel.
- Contrôle ciblé du module de calcul et des données destinées au CRM en anglais et en français : armoires + deux lits + garage + balcon donnent 75 $ de suppléments, puis 225 $ avant taxes et 254,25 $ avec TVH pour une visite standard ponctuelle de trois heures. Les deux parcours produisent ces mêmes montants et la version V3 de la grille.
- `npm run build` réussit. Aucun changement de dépendance ou de base de données n’est nécessaire.
- Aucun envoi réel au CRM, courriel ou déploiement de production n’a été effectué pour cette livraison. L’interface utilise directement la grille centrale pour afficher les montants ; les captures du dossier de prévisualisation proviennent de la V2.

## Historique : contrôles de la V2


Base : commit `6103ade`. Version de la grille : `2026-09-20-v2`.

- **Calculs : 13 contrôles ciblés réussis** avec `node scripts/test-cleaning-pricing.mjs`. Ils couvrent les prix initiaux et récurrents, budgets hebdomadaires et tous les 14 jours, économies en dollars à durée comparable, minimums commerciaux, options, taxes québécoises, prestations spécialisées et données de demande CRM.
- **Fréquences personnalisées** : les demandes de 2 à 7 passages par semaine nécessitent une révision du prix. Aucun total fixe n’est inventé. La fréquence seule n’impose pas de visite sur site ; un état des lieux ou des travaux spécialisés continue de l’exiger.
- **Comparaisons de prix** : aucune remise en pourcentage ni prix barré à côté du tarif horaire. Les forfaits de trois heures montrent 15 $ d’économie, ou 6 $ pour le mensuel résidentiel. Le minimum commercial de deux heures reste à 90 $ et n’est pas comparé à un forfait ponctuel fictif de deux heures.
- **TypeScript global** : les 47 diagnostics existants sont identiques à ceux de la base, après normalisation des numéros de ligne. Ils concernent notamment les clés du dictionnaire de traduction, les types des statistiques et `navigate` dans la facture administrateur. Aucun nouveau diagnostic dans les modifications de tarifs.
- **Compilation de production** : `npm run build` réussit.
- **Navigateur Chromium** : zones desservies, tableau de forfaits, budgets hebdomadaires et tous les 14 jours, passage Ontario/Québec, total de 247,20 $ pour une première visite avec réfrigérateur et four au Québec, fréquences commerciales 1/2/4/6/7, formulaire de devis personnalisé, validation du calendrier libre, vérification du courriel, échec d’enregistrement puis nouvelle tentative et confirmation après succès.
- **Données CRM contrôlées avec réponses simulées** : ville Gatineau, province Québec, fréquence libre, besoin de révision tarifaire, options, absence de montant avant révision, consentement de contact, photos décochées par défaut et identifiant de demande conservé lors d’une nouvelle tentative.
- **Formulaire général `/quote`** : choix « Other schedule », saisie du calendrier et conservation des précisions après passage aux coordonnées puis retour aux détails ; libellé du sélecteur associé au champ pour l’accessibilité. Aucun incident JavaScript détecté dans le scénario final.
- **Pages liées** : versions françaises des tarifs, de la politique, des pages de services et de la FAQ ; liens vers les parcours résidentiel et commercial.
- **Affichage** : rendu sur ordinateur 1 440 px et téléphone 390 px. Le tableau défile dans son cadre ; les pages contrôlées ne débordent pas horizontalement. Les captures figurent dans `docs/pricing-preview/`.

Les appels CRM, de vérification du courriel et de notification ont été simulés localement. Aucun courriel ni demande réelle n’a été envoyé. L’intégration Supabase de production doit être contrôlée après publication avec une demande utilisant votre propre adresse courriel.
