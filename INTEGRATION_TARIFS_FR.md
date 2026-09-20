# V8 — Tarif récurrent après quatre visites consécutives

Base : V7 publiée, commit `cd5e3ed`. Version des nouvelles demandes : `2026-09-20-v8`.

La condition s'applique aux nouveaux forfaits récurrents résidentiels et commerciaux, selon la fréquence convenue (hebdomadaire, tous les 14 jours, mensuelle ou fréquence personnalisée au devis). Il s'agit de quatre visites réalisées, pas nécessairement de quatre semaines.

- Visites 1 à 3 : tarif standard complet pour le même périmètre et les mêmes heures approuvées.
- Visite 4 : tarif récurrent, diminué du cumul des écarts facturés lors des trois premières visites.
- Visite 5 et suivantes : tarif récurrent tant que la fréquence convenue est respectée. La condition ne se répète pas tous les quatre passages.
- Moins de quatre visites consécutives réalisées : aucun crédit de récurrence acquis. Les suppléments conservent leurs prix et fréquences ; ils ne donnent pas lieu à ce crédit. Les travaux spécialisés ou approfondis initiaux restent séparés.

Exemple sans options, avant taxes : trois heures hebdomadaires à 126 $ au tarif récurrent, contre 150 $ au tarif complet.

| Visite | Facture avant taxes |
| --- | ---: |
| 1 | 150 $ |
| 2 | 150 $ |
| 3 | 150 $ |
| 4 | 126 $ − 72 $ = 54 $ |
| 5 et suivantes | 126 $ |

Les quatre premières totalisent 504 $, soit 4 × 126 $. Le crédit cumulé est de 3 × (150 − 126) = 72 $. La quatrième visite bénéficie déjà de son prix récurrent ; ne pas déduire une deuxième fois son économie de 24 $.

Pour le commercial planifié, le minimum reste deux heures : 100 $ pour les trois premières visites, puis 90 $ − 30 $ = 60 $ à la quatrième, et 90 $ à partir de la cinquième, avant taxes et options. Le minimum ponctuel distinct reste trois heures.

## Ce qui change

La mention EN/FR apparaît auprès des forfaits, dans le calculateur, au formulaire de demande et dans la politique. Le résumé enregistré et le courriel affichent l'échéancier des quatre premières visites. Le budget mensuel reste une moyenne au tarif récurrent admissible, pas le montant réel des premières factures.

Le devis officiel propose quatre bases : première visite, visite 2 ou 3 au plein tarif, quatrième visite avec crédit, visite 5 et suivantes. Les montants sont repris de la demande enregistrée. Le crédit est un montant séparé dans `discount_total`, avec taxes sur le montant net. La création d'une facture depuis ce devis reprend les lignes, le crédit, les taxes, les notes et les conditions. Les conditions sont visibles dans le portail, dans le PDF de facture et dans le courriel de facture.

## Utilisation dans le CRM

Le choix de la phase reste effectué par votre équipe. Avant la quatrième facture, vérifier les quatre interventions réellement effectuées selon la fréquence convenue, leurs montants et l'absence de crédit déjà accordé. Le logiciel ne compte pas automatiquement les visites réalisées et ne bloque pas un second crédit. Le nombre de factures créées n'est pas une preuve d'admissibilité.

Pour chaque phase, préparer le devis adapté depuis la demande, puis créer la facture à partir de ce devis. Ne pas réutiliser indéfiniment le devis de quatrième visite, qui contient son crédit. Ne pas ajouter une remise de contrat en pourcentage pour simuler cette condition.

Si les heures, les prestations, la fréquence ou les prix officiels diffèrent de la demande provisoire, réviser les montants et l'échéancier dans le devis ; le crédit doit refléter les écarts réellement facturés. Les prix ne sont pas recalculés à partir d'un historique de factures.

Les demandes antérieures à V8 et les devis déjà enregistrés ne sont pas modifiés rétroactivement. Les anciennes demandes conservent leurs anciennes bases de prix. Pour tester le parcours V8, créer une nouvelle demande après publication. Pour un contrat existant, ajouter la condition et les montants convenus dans un nouveau devis à faire accepter ; ne pas modifier un devis déjà signé.

## Installation et Supabase

Voir `INSTALLATION_TARIFS_V8.txt`. Installation après V7. Deux publications : site habituel puis fonction Supabase `send-crm-email` et son fichier partagé. Aucune migration SQL ni modification de tables ou de droits ; les champs existants sont utilisés. Une publication GitHub seule ne met pas à jour la fonction courriel.

---

## Historique — règles des versions précédentes

Les sections ci-dessous décrivent les anciennes versions ; pour les nouvelles demandes V8, la règle des quatre visites ci-dessus prévaut.

# V7 — Préremplissage du devis officiel

Base : V6 publiée, commit `09eef47`.

Le problème venait de `estimates.new.tsx` : `serviceRequestId` était utilisé à l’enregistrement sans charger la demande. V7 charge les paramètres, le client et la demande avant d’activer le formulaire ; les paramètres généraux ne peuvent plus écraser tardivement la province et les taxes importées.

- Les données et les montants de la demande sont repris dans un brouillon modifiable, sans appliquer le catalogue actuel aux demandes anciennes.
- La première visite est proposée par défaut. Le sélecteur de visite reprend séparément le tarif d’une visite suivante et ses seuls suppléments récurrents. Le budget mensuel reste une référence provisoire dans les notes.
- La demande reste rattachée au devis par `service_request_id`. Le contact et l’adresse d’intervention sont conservés dans les notes ; la fiche client n’est pas écrasée.
- Les lignes sont compatibles avec les contraintes existantes de `estimate_items`. La remise réfrigérateur/four est intégrée à une ligne groupée au prix net enregistré.
- Les taxes québécoises sont arrondies séparément ; les taxes sont correctement nommées sur le nouveau formulaire, le détail du devis et le portail client.
- Les demandes non chiffrées conservent leur questionnaire ; les prix et la durée restent à saisir. Les erreurs de chargement n’ouvrent pas un formulaire vide lié à une demande inaccessible.
- Aucun contrat de 12 mois n’est imposé par défaut. L’enregistrement crée uniquement un brouillon ; il n’envoie aucun courriel et ne modifie pas la demande d’origine.
- Le portail client peut afficher les lignes, notes et conditions du devis grâce à `OfficialQuoteDetails`, sous les règles d’accès Supabase existantes.

Installation : `INSTALLATION_TARIFS_V7.txt`. Aucune migration SQL ni fonction Supabase à redéployer. V6 doit déjà être installée.

Les brouillons vides déjà créés ne sont pas réparés rétroactivement : repartir de la demande initiale pour créer un nouveau brouillon rempli. Les prix de facturation, interventions et signatures existantes ne sont pas modifiés par cette mise à jour.

---

# Tarifs OMSG — options et demandes lisibles V6

Base : commit publié `a541c38` (présentation V5). Version de la grille et des règles d’estimation : `2026-09-20-v6`. Les prix unitaires restent identiques ; la V6 distingue la fréquence des suppléments. Les fichiers sont préparés localement et doivent être installés puis publiés.

## Fréquence de chaque supplément

Dans les parcours résidentiel et commercial récurrents, une option sélectionnée propose :

- **Première visite seulement**, par défaut ;
- **À chaque visite**, première visite comprise, uniquement sur choix explicite du client.

Le choix apparaît seulement après sélection d’une quantité, pour conserver une page légère. Une prestation ponctuelle, approfondie ou pour options seules reste une visite unique. Le retour à une formule récurrente conserve les choix explicites dans le formulaire courant.

La première visite inclut toutes les options sélectionnées. Les visites suivantes et le budget mensuel moyen incluent seulement les options « À chaque visite ». La remise réfrigérateur + four de 5 $ se calcule pour chaque visite : si seul le four se répète, les visites suivantes comportent son prix individuel de 40 $, sans remise de 5 $.

Exemple contrôlé, Ontario : 3 chambres, 1,5 salle de bain, jusqu’à 1 500 pi², une visite hebdomadaire, quatre heures-personnes. Options : réfrigérateur + four 65 $, deux lits 20 $, plinthes 70 $, deux vitrages 20 $.

| Choix des suppléments | Première visite TTC | Visites suivantes TTC | Mois moyen avant taxes |
| --- | ---: | ---: | ---: |
| Tous pour la première visite seulement | 423,75 $ | 189,84 $ | 728,00 $ |
| Seuls les deux lits à chaque visite | 423,75 $ | 212,44 $ | 814,67 $ |
| Toutes les options à chaque visite | 423,75 $ | 387,59 $ | 1 486,33 $ |

Le budget mensuel moyen exclut les options de première visite et l’écart du tarif initial. Il ne constitue pas une facture mensuelle fixe.

## Résumé lisible dans le CRM et le courriel

Les nouvelles demandes remplacent `Selection JSON` par `Selection summary` (affiché « Résumé des choix » en français), complété par la fréquence de chaque option, le détail de la première visite et celui des suivantes. Les demandes non chiffrées conservent les prestations et fréquences sans afficher de total fictif.

Le CRM et la notification utilisent le même module de présentation `supabase/functions/_shared/quote-questionnaire.ts`. Les textes du client sont échappés dans le HTML. Les demandes antérieures restent enregistrées telles quelles ; le module affiche leurs détails lisibles et leurs montants sauvegardés, sans appliquer rétroactivement le nouveau comportement. Les courriels déjà envoyés ne sont pas modifiés.

La notification reste destinée à l’administrateur OMSG. Aucun devis officiel, rendez-vous, facture ou envoi automatique au client n’est créé par cette mise à jour. Les devis officiels restent vérifiés et établis par votre équipe.

**Deux publications sont nécessaires** : le site via GitHub/Vercel et la fonction Supabase `send-crm-email`, avec son fichier partagé. Aucune migration SQL ni modification des tables n’est requise. Un push GitHub seul ne remplace pas le déploiement de cette fonction dans votre configuration actuelle. Le guide `INSTALLATION_TARIFS_V6.txt` détaille les deux étapes.

## Une présentation plus visuelle

- `/pricing` : deux grandes cartes illustrées pour choisir résidentiel ou commercial.
- `/pricing/residential` et `/pricing/commercial` : photo du service, trois forfaits principaux et boutons vers l’estimation. Le tableau complet, les tâches incluses et chaque supplément sont accessibles dans des rubriques dépliables.
- `/pricing/estimate?audience=residential&plan=weekly` : calculateur sur une page dédiée. Le forfait choisi est transmis automatiquement. Les valeurs de l’adresse sont validées ; un forfait incompatible est remplacé par le forfait par défaut du parcours.
- `/pricing-policy` : les engagements restent identiques, dans des rubriques dépliables. La première est ouverte ; les liens directs vers une rubrique ouvrent son contenu.
- Deux visuels d’illustration créés avec l’IA sont intégrés au projet au format WebP (environ 106 et 104 Kio). Ils ne représentent pas des employés ou réalisations réels d’OMSG. Les descriptions et prompts figurent dans `docs/cleaning-images-v5.md`.
- Versions anglaise et française, images avec texte alternatif, rubriques accessibles au clavier, largeur adaptée au mobile. Le calculateur ne s’affiche plus au bas des longues pages commerciales.

## Tarif hebdomadaire réduit

Le résidentiel hebdomadaire est désormais à **42 $ par heure-personne**, contre **45 $ pour une visite tous les 14 jours**. À tâches et durée identiques, une visite récurrente de trois heures coûte 126 $ chaque semaine ou 135 $ tous les 14 jours : 9 $ de moins par visite hebdomadaire. La comparaison avec le forfait ponctuel de 150 $ affiche une économie de 24 $ pour l’hebdomadaire et de 15 $ pour celui tous les 14 jours.

Ces tarifs récurrents s’appliquent dès la deuxième visite. La première visite standard reste à 50 $ par heure-personne, soit 150 $ pour trois heures avant taxes et options. Le calculateur distingue les deux montants.

## Options ajustées en V3

Les mêmes prix s’appliquent aux parcours résidentiel et commercial, en anglais et en français :

| Option | Nouveau prix avant taxes | Périmètre |
| --- | ---: | --- |
| Intérieur des armoires | 15 $ par forfait | Armoires et tiroirs vidés, jusqu’à 20 ouvertures de porte ou de tiroir au total |
| Changer les draps | 10 $ par lit | Linge propre fourni par le client |
| Balayage du garage vide | 20 $ par unité | Jusqu’à 300 pi², balayage à sec sans dégraissage, pression ni évacuation |
| Balcon | 20 $ par unité | Jusqu’à 100 pi², balayage et garde-corps accessibles, sans pression |

Le changement des draps est désormais sélectionnable dans le parcours commercial également. Les tarifs affichés, les calculs et le détail envoyé au CRM utilisent la même grille centrale. Ces montants sont des options ajoutées à une prestation ; la formule « options seules » conserve son minimum total de visite de 150 $.

## Parcours de tarification

- Ottawa **et Gatineau** figurent sur les pages de tarifs, dans la politique et dans les pages de nettoyage résidentiel et commercial. L’accueil, le contact et le pied de page mentionnaient déjà Gatineau.
- Les prix barrés et les économies concernent le **forfait**, et non le tarif horaire. Les économies promotionnelles sont exprimées en dollars, sans pourcentage.
- « 1 visite par semaine » et « 1 visite toutes les 2 semaines » sont explicitement distinguées : un passage tous les 7 jours ou tous les 14 jours. Il ne s’agit pas de deux passages par semaine.
- Plusieurs visites par semaine et les autres calendriers peuvent être demandés dans les parcours résidentiel et commercial. Leur tarif sera révisé selon la fréquence, les tâches et la durée. Le calculateur n’attribue pas de montant fixe avant cette révision.
- Le formulaire général `/quote`, la FAQ, les pages de services, les descriptions de référencement et la politique reprennent ces explications en anglais et en français.

## Tarifs en vigueur

Montants en CAD avant taxes. Produits et matériel courant inclus ; déplacement urbain habituel à Ottawa et Gatineau inclus. Aucune majoration destinée aux partenaires n’est ajoutée.

| Prestation | Tarif par heure-personne | Minimum / forfait de référence |
| --- | ---: | --- |
| Résidentiel : 1 visite par semaine | 42 $ | 3 h : 126 $ |
| Résidentiel : 1 visite tous les 14 jours | 45 $ | 3 h : 135 $ |
| Résidentiel : 1 visite par mois | 48 $ | 3 h : 144 $ |
| Commercial : 1 visite par semaine | 45 $ | Minimum 2 h : 90 $ ; exemple comparable de 3 h : 135 $ |
| Plusieurs visites par semaine / autre calendrier | Tarif à réviser au devis | Forfait personnalisé |
| Standard ponctuel résidentiel ou commercial | 50 $ | 3 h : 150 $ |
| Nettoyage en profondeur | 55 $ | 4,5 h : 247,50 $ |
| Options seules | Prix des tâches choisies | Minimum total 150 $, options comprises |
| Travaux spécialisés / hors grille | Sur devis | Visite gratuite obligatoire |

Le résidentiel récurrent est facturé au tarif ponctuel pour la première visite, puis au tarif récurrent dès la deuxième. Le calculateur affiche ces deux montants. Pour un forfait courant de trois heures sans options, le budget mensuel moyen est de 546 $ avec une visite par semaine, contre 292,50 $ avec une visite tous les 14 jours. Ces budgets avant taxes reposent sur 52 ou 26 visites par an et excluent l’écart de la première visite.

Les prix des options restent centralisés dans `src/lib/cleaning-pricing.ts` : réfrigérateur 30 $, four 40 $, ensemble 65 $. Les tâches comprises en nettoyage en profondeur ne sont pas facturées une deuxième fois. La formule « options seules » complète le total des tâches jusqu’au minimum de 150 $, sans y ajouter un forfait standard.

## Économies affichées

| Même visite standard de trois heures-personnes | Ponctuel comparable | Forfait récurrent | Économie par visite |
| --- | ---: | ---: | ---: |
| Résidentiel chaque semaine | 150 $ | 126 $ | 24 $ dès la deuxième visite |
| Résidentiel tous les 14 jours | 150 $ | 135 $ | 15 $ dès la deuxième visite |
| Résidentiel chaque mois | 150 $ | 144 $ | 6 $ dès la deuxième visite |
| Commercial chaque semaine | 150 $ | 135 $ | 15 $ |

Comparaisons avant taxes et options, à tâches et durée identiques. Les références sont les prix ponctuels OMSG affichés, pas d’anciens prix inventés ni un maximum supposé du marché. Le commercial conserve un minimum de deux heures à 90 $ ; aucune économie n’est calculée face à un forfait ponctuel de deux heures inexistant. L’exemple comparatif commercial utilise donc trois heures. Le forfait réfrigérateur + four conserve son économie de 5 $ par rapport aux deux prestations séparées lors de la même visite.

## Demande et CRM

1. Le client choisit résidentiel ou commercial, consulte les forfaits, puis clique sur « Choisir ce forfait ». La page dédiée `/pricing/estimate` reprend ce choix et permet de préciser la province et les options.
2. Pour les formules standard, le calculateur affiche l’estimation et les taxes : Ontario, TVH 13 % ; Québec, TPS 5 % et TVQ 9,975 %, arrondies séparément.
3. Pour plusieurs passages hebdomadaires ou un calendrier personnalisé, il choisit une fréquence de 2 à 7 visites par semaine ou décrit un autre rythme. Le tarif et le forfait sont à réviser au devis officiel. Aucun faux total de 0 $ n’est affiché ou enregistré.
4. « Book now / Réserver maintenant » ouvre le formulaire. Les coordonnées, la vérification du courriel et les consentements utilisent le parcours existant. Les photos sont recommandées mais facultatives.
5. La fonction `submit_verified_quote_request` reçoit la demande. `service_requests.questionnaire_answers` conserve notamment la fréquence demandée, ses précisions, le besoin de révision tarifaire, les options, la province et la version des tarifs. Les montants provisoires ne sont joints que lorsqu’une estimation chiffrée est disponible.
6. Le consentement facultatif aux photos de suivi est distinct du consentement de contact et reste décoché par défaut. Les pièces jointes utilisent `service-photos` et `service_request_photos` ; la notification utilise `send-crm-email`.
7. La confirmation s’affiche après enregistrement confirmé. L’équipe vérifie ensuite le périmètre et émet le devis officiel. Aucun paiement, facture ou rendez-vous ferme n’est créé automatiquement.

Un calendrier personnalisé seul n’impose pas de visite sur place. Une **visite gratuite demeure nécessaire** pour les gros chantiers, moisissures, dégâts d’eau, matériel spécialisé, lieux hors grille et autres travaux nécessitant une évaluation.

## Politique de qualité

Les engagements sont conservés : employés formés et vérification des antécédents judiciaires ; checklist après chaque intervention ; envoi au client de cette checklist et des photos avant/après uniquement avec son autorisation préalable. L’envoi du rapport qualité relève du processus de suivi de votre équipe ; cette mise à jour n’ajoute pas un nouveau module d’envoi automatique.

## Installation et vérifications

Suivre `INSTALLATION_TARIFS_V6.txt`. L’archive contient uniquement les fichiers modifiés ou ajoutés, avec leurs chemins d’origine, sans dossier parent. Elle ne contient ni dépendances, ni sortie de compilation, ni clé ou configuration de test. Ne pas supprimer les autres fichiers du projet et ne pas réécrire l’historique Git.

Aucune migration SQL, nouvelle dépendance du site ou modification des variables d’environnement n’est nécessaire. La fonction Supabase `send-crm-email` doit cependant être redéployée avec son module partagé pour activer le nouveau courriel. Les fonctions de vérification du courriel, de demande de devis et de notification existantes restent requises, ainsi que les champs d’adresse déjà installés.

Le bilan des 20 contrôles tarifaires, des 8 contrôles de présentation/notification et des essais navigateur figure dans `VALIDATION_TARIFS.md`. Après publication, vérifier les pages et effectuer une demande avec votre propre courriel pour contrôler l’arrivée réelle dans le CRM et les notifications. Les contrôles livrés utilisent un backend simulé et ne vérifient pas la configuration de votre production.

## Limite du devis officiel

La demande et son estimation provisoire sont enregistrées par le parcours existant. Les lignes du devis officiel du CRM restent préparées et vérifiées par votre équipe ; cette refonte ne crée pas de remplissage automatique supplémentaire. Aucune intervention directe n’a été faite sur votre base Supabase de production.

## Référence de déploiement

Le guide utilise la commande de déploiement ciblé avec `--project-ref` et `--use-api` (assemblage côté serveur, sans Docker), conformément à la [référence officielle Supabase CLI](https://supabase.com/docs/reference/cli/supabase-functions-deploy). La connexion préalable est décrite dans le [guide officiel de déploiement](https://supabase.com/docs/guides/functions/deploy). Le fichier de configuration existant et les secrets existants sont conservés.
