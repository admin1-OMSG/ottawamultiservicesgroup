# Validation V8 — quatre visites consécutives

Base : V7 publiée, commit `cd5e3ed`.

- `node scripts/test-cleaning-pricing.mjs` : 24 contrôles, dont premier cycle, écart hebdomadaire/tous les 14 jours/mensuel, suppléments exclus du crédit, minimum commercial et taxes après crédit.
- `node scripts/test-estimate-request.mjs` : 15 contrôles ; 1 080 combinaisons de forfaits/options conservées, quatre phases de visite EN/FR et Ontario/Québec, crédit séparé, conservation des anciennes demandes.
- `node scripts/test-quote-questionnaire.mjs` : 9 contrôles ; échéancier et condition lisibles, échappement HTML, exécution simulée de la fonction courriel, absence d'envoi réel et protection contre les doublons conservée.
- Compilation de production réussie. TypeScript global : les 47 diagnostics préexistants restent identiques après normalisation des numéros de ligne ; aucun nouveau diagnostic. Ces erreurs antérieures concernent les traductions, les statistiques et `navigate` sur le détail de facture.
- Navigateur local avec Supabase simulé : import réel depuis le bouton de demande, choix des quatre phases, enregistrement du crédit du devis, copie vers la facture, calcul net, conditions visibles dans le portail et téléchargement du PDF. Le scénario conserve les contrôles de chargement, d'échec des lignes, de demandes non chiffrées et de création manuelle.
- Parcours public en navigateur : prix, échéancier, sélection des options, vérification de courriel et enregistrement de la condition dans le CRM ; version commerciale française à 390 px, sans débordement ; politique et notifications EN/FR affichées.
- Exemple détaillé de test : trois chambres, quatre heures, options initiales 175 $ dont deux lits récurrents 20 $. Factures Ontario TTC : 423,75 $, 248,60 $, 248,60 $, puis 103,96 $ ; crédit de quatrième visite 96 $ avant taxes, tarif suivant 212,44 $ TTC. Facture 4 : lignes 188 $, crédit 96 $, net 92 $, TVH 11,96 $.

Les appels CRM et courriel sont simulés. Aucune intervention réelle, facture de production, migration Supabase, publication ni notification réelle n'a été effectuée. Après installation, contrôler le déploiement et le parcours avec une demande de test. L'admissibilité et l'unicité du crédit restent vérifiées par l'administrateur.

---

## Historique des validations

# Validation V7 — demande vers devis officiel

- `node scripts/test-estimate-request.mjs` : **13 contrôles réussis**, dont 1 080 combinaisons forfaits/options EN/FR, Ontario/Québec, plus chaque profil de surface.
- `node scripts/test-cleaning-pricing.mjs` : **20 contrôles réussis**.
- `node scripts/test-quote-questionnaire.mjs` : **8 contrôles réussis** ; aucun courriel réel.
- `npm run build` : compilation de production vérifiée.
- Vérification navigateur avec API simulée : bouton de la vraie demande → formulaire rempli → enregistrement du brouillon et des lignes → détail CRM → détail client ; modification des prix, première/visites suivantes, Québec, français/mobile, chargement en échec, suppression du brouillon incomplet si l’insertion des lignes échoue, demande non chiffrée, demande d’un autre métier et création manuelle.
- Les écritures de test restent locales et simulées. Aucun courriel, devis, facture, contrat ou client de production n’a été créé ou modifié.
- Le contrôle TypeScript global conserve les diagnostics préexistants du projet ; aucune erreur supplémentaire dans les fichiers modifiés. La compilation réussie n’est pas présentée comme un contrôle TypeScript global sans erreur.
- Aperçus : `docs/pricing-preview/official-draft-v7-en.png`, `official-draft-v7-mobile-fr.png`, `official-client-v7-en.png` (client et coordonnées fictifs).

Les devis déjà enregistrés et les brouillons vides antérieurs restent inchangés. Le test en production consiste à rouvrir une demande existante puis à préparer un nouveau brouillon, sans l’envoyer au client avant révision.

---

# Vérifications — fréquences des options et résumé V6

Base : `a541c38`. Version : `2026-09-20-v6`. Les prix unitaires restent inchangés.

- **20 contrôles de calcul réussis** (`node scripts/test-cleaning-pricing.mjs`) : première visite, visites récurrentes, fréquences hebdomadaire/aux deux semaines/mensuelle, Ontario/Québec, minimums, options incluses en profondeur, options ponctuelles/répétées/mixtes et remise réfrigérateur + four calculée par visite.
- L’exemple fourni par le client est reproduit sans ses coordonnées : 423,75 $ TTC initialement ; 189,84 $ ensuite sans options récurrentes, 212,44 $ avec les deux lits seulement, 387,59 $ avec toutes les options répétées. Les budgets mensuels excluent les options initiales et l’écart du tarif initial.
- **8 contrôles de présentation et notification réussis** (`node scripts/test-quote-questionnaire.mjs`) : nouveau résumé EN/FR, anciennes demandes non recalculées, JSON ancien invalide, demandes non chiffrées, échappement du texte, conservation des autres questionnaires et prévention d’un second envoi.
- Le véritable gestionnaire `send-crm-email` est exécuté dans ces essais avec Supabase, Deno et le fournisseur de courriels simulés. Les notifications restent adressées à l’administrateur et leur objet suit la langue de la demande.
- **Compilation de production réussie**. TypeScript conserve les 47 diagnostics préexistants ; aucun nouveau diagnostic. Le contrôle TypeScript global n’est pas annoncé comme entièrement réussi.
- **Parcours navigateur réel avec backend simulé** : sélection des cinq options de l’exemple, valeurs par défaut, modification des fréquences, remise commune présente puis retirée pour les visites suivantes, passage à un service ponctuel puis retour, vérification du courriel, envoi de la demande et contrôle des champs enregistrés.
- **Route réelle du CRM `/admin/quotes/:id`**, avec une session administrateur simulée : nouveau résumé rendu, aucune ligne « Selection JSON », fréquences et montants initiaux/récurrents visibles.
- **Mobile français 390 px** : fréquence des draps dans le commercial, taxes du Québec, calendrier flexible, lien direct vers la politique ; absence de débordement horizontal.
- **Courriels EN/FR inspectés visuellement**, issus du gestionnaire testé. Les blocs longs utilisent la largeur disponible ; les montants restent en tableau.

Aucun courriel réel, écriture dans la base de production ou déploiement n’a été effectué pendant cette préparation. Les essais ne remplacent pas une demande de contrôle après publication du site et de la fonction Supabase. Les anciennes notifications déjà reçues ne changent pas.

## Historique de la présentation V5

# Vérifications — présentation V5

Base : commit publié `0a9db75`. Grille conservée : `2026-09-20-v4`.

## Contrôles réalisés

- Les 13 contrôles de `node scripts/test-cleaning-pricing.mjs` réussissent, sans modification du module de calcul : tarifs hebdomadaires, visite tous les 14 jours, options, minimums, économies, taxes Ontario/Québec et demandes sur mesure.
- `npm run build` réussit, y compris la génération de la route `/pricing/estimate`.
- TypeScript global : 47 diagnostics préexistants, identiques à la référence après normalisation des numéros de ligne ; aucun nouveau diagnostic. Le contrôle global n’est donc pas annoncé comme entièrement vert.
- Navigateur Chromium, ordinateur 1 440 px et mobile 390 px : images chargées, pages EN/FR, choix résidentiel/commercial, détails dépliables, absence de débordement horizontal de la page. Le tableau complet défile dans son cadre.
- Le forfait « 1 visite par semaine » sélectionné sur la page de services ouvre le calculateur avec ce choix. Forfaits de 3 heures : 126 $ / 135 $ / 144 $ ; économies : 24 $ / 15 $ / 6 $. Minimum commercial de 90 $ et exemple commercial de 135 $ conservés.
- Les liens de tous les forfaits transmettent leur audience et leur prestation. Les paramètres inconnus ou incompatibles sont remplacés par un choix valide.
- Estimation hebdomadaire Ontario : première visite 169,50 $ TTC, suivantes 142,38 $ TTC, budget mensuel moyen 546 $ avant taxes. Avec réfrigérateur + four et adresse au Québec, la première visite atteint 247,20 $ TTC.
- Parcours complet résidentiel : coordonnées, vérification du courriel, consentement de contact, photos de suivi décochées par défaut, demande enregistrée et confirmation. Montants, ville Gatineau et version V4 présents dans les données envoyées.
- Parcours commercial personnalisé : fréquence libre conservée, demande de révision du tarif, aucun total inventé ni visite obligatoire du seul fait de cette fréquence.
- Prestation spécialisée : proposition de visite gratuite et formulaire commercial présents.
- Politique : rubriques dépliables, texte conservé sur la formation et la vérification des antécédents, suivi et consentements ; lien direct vers une rubrique testé. Navigation des rubriques au clavier contrôlée.
- Deux visuels WebP locaux : 108 438 et 105 940 octets. Dimensions 1 536 × 1 024, textes alternatifs et chargement adapté.

Les appels Supabase, de vérification du courriel et de notification ont été **simulés localement**. Aucune demande ni aucun courriel réels n’a été envoyé. Aucune modification Supabase de production ni publication du site n’a été réalisée pendant cette préparation.

Les captures actualisées figurent dans `docs/pricing-preview/`. Après installation et déploiement, effectuer une demande avec votre propre adresse pour vérifier l’arrivée réelle dans le CRM.

## Historique V4

Base : commit publié `e3a921b`. Version de la grille : `2026-09-20-v4`.

- Tarif hebdomadaire : 42 $ par heure-personne, contre 45 $ pour une visite tous les 14 jours. Pour trois heures : 126 $ contre 135 $ avant taxes et options, dès la deuxième visite.
- Économies sur le forfait ponctuel comparable de 150 $ : 24 $ pour l’hebdomadaire et 15 $ pour celui tous les 14 jours. Différence entre les deux forfaits récurrents : 9 $ par visite de trois heures.
- Les 13 contrôles existants de `node scripts/test-cleaning-pricing.mjs` réussissent. Le contrôle des fréquences exige désormais que le forfait hebdomadaire soit moins cher. Les données destinées au CRM enregistrent le sous-total récurrent de 126 $ et l’économie de 24 $.
- Budget mensuel moyen hebdomadaire de trois heures : 546 $ avant taxes et options (52 visites / 12 mois), hors différence de première visite. Visites tous les 14 jours : 292,50 $ (26 visites / 12 mois).
- Compilation `npm run build` réussie.
- Contrôle navigateur : page de choix résidentiel à 42 $ / heure-personne et dès 126 $ ; carte commerciale à 45 $ et dès 90 $ ; tableau des forfaits 126 $ / 135 $ ; économies 24 $ / 15 $ ; changement de fréquence et budgets mensuels ; visite récurrente avec TVH à 142,38 $ / 152,55 $. La première visite standard de trois heures reste à 169,50 $ avec TVH.
- Affichage français des forfaits et de la politique contrôlé. Rendu inspecté sur ordinateur et téléphone de 390 px ; aucun débordement horizontal ni incident JavaScript pendant le scénario. Quatre captures de prévisualisation sont actualisées.
- Aucun devis réel, courriel ou déploiement de production n’a été effectué pendant cette préparation.

## Historique des versions précédentes

### V3 : ajustement de quatre options

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
