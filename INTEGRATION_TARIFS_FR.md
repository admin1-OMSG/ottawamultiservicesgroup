# Tarifs OMSG — mise à jour V4

Version des tarifs : `2026-09-20-v4`. Cette mise à jour s’applique au dépôt existant après le commit `e3a921b` (tarifs V3 publiés). Les modifications sont préparées et vérifiées localement ; elles restent à publier avec le processus habituel du site.

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

1. Le client choisit résidentiel ou commercial, prestation, province et options.
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

Suivre `INSTALLATION_TARIFS_V4.txt`. L’archive contient uniquement les fichiers modifiés ou ajoutés, avec leurs chemins d’origine, sans dossier parent. Elle ne contient ni dépendances, ni sortie de compilation, ni clé ou configuration de test. Ne pas supprimer les autres fichiers du projet et ne pas réécrire l’historique Git.

Aucune migration Supabase, nouvelle dépendance ou modification des variables d’environnement n’est nécessaire. Les fonctions de vérification du courriel, de demande de devis et de notification existantes restent requises, ainsi que les champs d’adresse déjà installés.

Le bilan des contrôles figure dans `VALIDATION_TARIFS.md`. Après publication, vérifier les pages et effectuer une demande avec votre propre courriel pour contrôler l’arrivée réelle dans le CRM et les notifications. Les contrôles livrés utilisent un backend simulé et ne vérifient pas la configuration de votre production.
