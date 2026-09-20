# Pages de tarifs et devis OMSG

Cette version reprend l’archive `ottawamultiservicesgroup-main (43).zip` et ajoute le parcours de tarification au site React / TanStack Start existant. Elle utilise le CRM Supabase déjà présent. Elle n’a pas été publiée sur le domaine public.

## Pages livrées

| Adresse | Contenu |
| --- | --- |
| `/pricing` | Choix résidentiel ou commercial dès l’arrivée |
| `/pricing/residential` | Tarifs, inclusions, options, estimation et demande résidentielle |
| `/pricing/commercial` | Tarifs, fréquence, options, estimation et demande commerciale |
| `/pricing-policy` | Prix, minimums, devis, qualité, photos et consentements |

Le menu principal, le pied de page et le sitemap incluent ces pages. L’anglais est affiché par défaut ; le sélecteur EN / FR existant donne accès au français. Le menu compact reste accessible sur tablette.

## Tarifs utilisés

Tous les montants sont en CAD avant taxes. Produits et matériel courant sont inclus. Aucune majoration destinée aux partenaires n’est ajoutée.

| Prestation | Tarif par heure-personne | Minimum |
| --- | ---: | ---: |
| Résidentiel chaque semaine / toutes les deux semaines | 45 $ | 3 h, soit 135 $ |
| Résidentiel mensuel | 48 $ | 3 h, soit 144 $ |
| Commercial récurrent | 45 $ | 2 h, soit 90 $ |
| Standard ponctuel résidentiel ou commercial | 50 $ | 3 h, soit 150 $ |
| Nettoyage en profondeur | 55 $ | 4,5 h, soit 247,50 $ |
| Options seules | Par tâche sélectionnée | Total minimum de 150 $, options comprises |
| Spécialisé, gros chantier, moisissures, dégât d’eau ou configuration hors grille | Sur devis | Visite gratuite obligatoire |

Le résidentiel récurrent commence au tarif ponctuel pour la première visite, puis bénéficie du tarif récurrent à partir de la deuxième. Les deux montants sont indiqués dans l’estimation. Les durées par superficie et configuration sont des hypothèses de planification, à confirmer avant le devis officiel. Le budget mensuel moyen utilise 52 semaines, 26 visites aux deux semaines ou 12 visites mensuelles par an ; le calendrier et le montant final restent à convenir.

Les prix des options, leurs limites et les textes EN / FR sont centralisés dans `src/lib/cleaning-pricing.ts`. Réfrigérateur : 30 $ ; four : 40 $ ; les deux : 65 $. Les tâches déjà comprises dans un nettoyage en profondeur ne sont pas refacturées comme options. La visite « options seules » applique le maximum entre la valeur des options et 150 $, sans ajouter un forfait de nettoyage standard.

### Prix barrés

Les comparaisons portent sur des prix OMSG effectivement affichés dans cette grille :

- 50 $ / heure-personne ponctuelle comparé à 45 $ récurrent : 10 %.
- 50 $ / heure-personne ponctuelle comparé à 48 $ mensuel : 4 %.
- 70 $ pour le réfrigérateur et le four séparément comparé au forfait de 65 $ : économie de 5 $.

Il ne s’agit pas d’anciens prix OMSG ni d’un maximum du marché. Aucun ancien tarif fictif n’a été créé pour les prestations sans prix de comparaison. Le Bureau de la concurrence explique les règles de justification des prix habituels : https://competition-bureau.canada.ca/en/deceptive-marketing-practices/types-deceptive-marketing-practices/ordinary-selling-price

## Parcours du client et CRM

1. Le client choisit son espace, la prestation, la province, la fréquence et les options.
2. Le calculateur affiche le montant provisoire détaillé et les taxes (Ontario : TVH 13 % ; Québec : TPS 5 % et TVQ 9,975 %, chacune arrondie séparément).
3. « Book now / Réserver maintenant » ouvre le formulaire. Il ne prend aucun paiement et ne confirme aucun créneau.
4. Le client saisit ses coordonnées et peut ajouter des photos, recommandées mais facultatives. Il vérifie son courriel avec le mécanisme déjà utilisé par le site.
5. La demande est transmise à `submit_verified_quote_request`, puis à `service_requests`. Les choix, montants provisoires, langue, version des tarifs et consentements sont conservés dans `questionnaire_answers`.
6. Les pièces jointes utilisent le stockage `service-photos` et la table `service_request_photos` existants. La notification utilise `send-crm-email`.
7. La confirmation apparaît uniquement après une réponse positive du CRM. Un échec de photo n’annule pas la demande déjà enregistrée. Le client peut communiquer les photos plus tard.

Les informations arrivent dans les demandes de devis de l’administration existante. Aucun paiement, facture ni prix officiel n’est créé automatiquement à partir d’un calcul navigateur : les montants doivent être revus et le devis officiel émis par l’équipe.

### Conditions techniques existantes

Aucune nouvelle migration de base de données n’est ajoutée. Le déploiement doit conserver :

- `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans l’environnement d’hébergement ;
- la fonction SQL `submit_verified_quote_request` avec les champs d’adresse, province et code postal (migration existante `202609050002_v3_quote_location_fields.sql`) ;
- les fonctions `request-email-verification`, `verify-email-code`, `send-crm-email` et leur configuration d’envoi existante ;
- les tables et règles de stockage des photos déjà prévues dans les migrations du projet.

Aucune clé serveur ni variable de test n’est ajoutée au code livré. L’archive ne contient ni `node_modules`, ni sorties de compilation, ni fichier d’environnement de test.

## Qualité et consentements

La politique reprend vos engagements : personnel formé et vérification des antécédents judiciaires ; checklist après chaque intervention ; envoi au client de la checklist et, avec son autorisation préalable, des photos avant/après.

L’autorisation des photos pendant l’intervention est facultative, décochée par défaut et enregistrée avec sa date et son périmètre. Elle ne vaut pas autorisation publicitaire. Le consentement à être contacté pour le devis est distinct ; aucune inscription marketing n’est ajoutée.

Cette mise à jour ajoute les mentions de politique et l’enregistrement des consentements. Elle ne crée pas un nouveau module de génération ou d’envoi automatique des rapports qualité. La checklist et les photos autorisées doivent être complétées et envoyées par votre équipe dans votre processus de suivi.

## Intégration

Conserver une copie de la version actuellement publiée, puis intégrer les fichiers de cette archive dans le projet existant par un commit normal. Ne pas réécrire l’historique du dépôt connecté à Lovable.

```sh
npm ci
node scripts/test-cleaning-pricing.mjs
npm run build
```

Publier ensuite avec le déploiement habituel du projet. La configuration d’hébergement d’origine est conservée. Aucun accès de publication au domaine ou à la base de production n’a été utilisé pour cette livraison.

Les fichiers ajoutés sont les composants `cleaning-pricing-page.tsx` et `cleaning-quote-request.tsx`, le module `cleaning-pricing.ts`, les cinq fichiers de routes `pricing*.tsx`, le test de calcul et ce guide. Les fichiers existants modifiés sont le menu, le pied de page, les deux libellés de traduction, le sitemap et le fichier de routes généré.

## Vérifications

Le bilan exact des vérifications accompagne cette livraison dans `VALIDATION_TARIFS.md`. Après publication sur votre environnement de prévisualisation connecté à Supabase, envoyer une demande de contrôle avec une adresse courriel que vous possédez, puis vérifier sa présence dans le CRM et la réception des courriels. Cette vérification réelle n’a pas été exécutée depuis cet environnement.

Des captures du rendu testé sont incluses dans `docs/pricing-preview/`.
