# OMSG — Pages et confidentialité V13

Base : `f14bf1a` (Accueil V12). Préparé le 21 septembre 2026.

## Contenu

- Conditions générales et FAQ entièrement bilingues, cohérentes avec les devis officiels et la remise initiale après quatre visites.
- Politique de confidentialité et page de suppression des données harmonisées.
- Choix facultatif du suivi publicitaire Meta ; préférences accessibles depuis le pied de page et la politique.
- Formulaire Contact réellement enregistré dans le CRM après vérification du courriel.
- Notices de confidentialité aux formulaires de devis, de partenariat et de candidature.
- Aucun changement aux grilles tarifaires, aux calculs de taxes, aux contrats déjà acceptés ou aux données existantes.

## Fonctionnement du formulaire Contact

Le formulaire utilise le circuit vérifié déjà installé : `request-email-verification`, `verify-email-code`, puis `submit_verified_quote_request`.
Le message est classé dans les demandes du CRM avec le service **Contact message / Message de contact**, ainsi que `requestType: contact_message` et `source: contact_page` dans le questionnaire. La colonne technique source du CRM reste `website`.
Aucun devis officiel, facture, contrat ou rendez-vous n'est créé par ce formulaire.
La notification administrateur réutilise le circuit de notification des demandes de devis. Son intitulé générique peut donc mentionner une demande de devis ; le service indique clairement qu'il s'agit d'un message de contact. Aucun devis n'est envoyé automatiquement au visiteur.
Le message reste enregistré même si la notification par courriel échoue. En cas de réponse de sauvegarde incertaine, le formulaire conserve le texte et réutilise la même référence pour la tentative suivante.

## Suivi publicitaire

Le Pixel Meta n'est chargé qu'après acceptation explicite sur les pages publiques autorisées. Refuser n'empêche pas les demandes de devis ou de contact.
Les deux choix sont conservés 180 jours dans ce navigateur. Ils peuvent être modifiés dans le pied de page ou la politique de confidentialité. Le retrait bloque les nouveaux événements ; il ne supprime pas rétroactivement les données déjà reçues par Meta.
Le portail, l'administration, les candidatures, les partenaires et les URL non autorisées sont exclus du suivi. Les événements de demande de devis ne contiennent que la catégorie de service reconnue ; pas de coordonnées, de prix, de photos ni de texte libre.
L'acceptation des témoins publicitaires ne constitue pas un abonnement aux courriels promotionnels.

## Points d'exploitation à respecter

Les textes reprennent vos engagements existants concernant la formation, les vérifications d'antécédents et l'envoi de la checklist après chaque nettoyage. Vérifiez que ces engagements sont effectivement appliqués à tous les employés concernés.
Les promesses de cautionnement systématique (« bonded »), d'assurance « complète » et de paiement commercial automatique à 30 jours sont retirées des pages révisées. Communiquez les renseignements d'assurance correspondant réellement au service lorsqu'un client les demande.
La politique de 24 heures pour les prestations ponctuelles est conservée. Un report convenu avec le client ou décidé par OMSG ne rompt pas, à lui seul, l'admissibilité au programme des quatre visites.
Aucun frais d'annulation tardive, taux d'intérêt ou droit de modifier un prix accepté n'a été inventé. Les conditions particulières doivent être communiquées et acceptées avant l'engagement, sous réserve des droits impératifs.
Le courriel principal `info@ottawamultiservicesgroup.com` reçoit les demandes de confidentialité ; la direction doit les orienter vers la personne responsable et assurer leur traitement.
Les pays d'hébergement, durées légales propres aux dossiers et configurations réelles des fournisseurs doivent être gérés selon vos pratiques effectives. Les textes ne prétendent pas que tous les renseignements sont hébergés au Canada.

## Portée de la vérification

La vérification porte sur le code et des essais locaux. Aucun message client, courriel réel, paiement ou écriture sur votre base Supabase de production n'a été déclenché.
Les clauses publiées ne constituent pas une certification juridique. Les modalités particulières de contrats importants et la couverture d'assurance doivent correspondre aux prestations réellement proposées.

Références utilisées lors de la révision :
- Commissariat à la protection de la vie privée : https://www.priv.gc.ca/en/privacy-topics/technology/online-privacy-tracking-cookies/tracking-and-ads/gl_ba_1112/
- Loi québécoise sur la protection du consommateur : https://www.legisquebec.gouv.qc.ca/fr/pdf/lc/P-40.1.pdf
- Loi sur l'intérêt : https://laws-lois.justice.gc.ca/eng/acts/I-15/FullText.html

## Résultats des essais

- `npm run build` : réussi (client, serveur et configuration Nitro générés).
- `node scripts/test-contact-request.mjs` : 6 vérifications réussies, appels simulés.
- `node scripts/test-marketing-consent.mjs` : 9 vérifications réussies, notamment retrait pendant le chargement, navigation privée, expiration et stockage indisponible.
- `node scripts/test-cleaning-pricing.mjs` : 24 vérifications réussies ; tarifs, taxes et crédit de la quatrième visite conservés.
- Navigateur Chromium : les cinq pages Conditions, Confidentialité, FAQ, Suppression des données et Contact sont contrôlées en EN/FR et à 390 px, sans débordement horizontal ni erreur JavaScript.
- Contact : vérification du courriel, échec simulé de sauvegarde, conservation du message, nouvelle tentative avec le même identifiant, confirmation et notification administrateur simulées.
- Meta : aucun appel avant choix/après refus, chargement après accord, arrêt après retrait, exclusion des accès directs au portail et à l'administration.
- Les requêtes vers le CRM, les notifications et Meta ont été interceptées dans les essais : aucune donnée réelle transmise.
- `git diff --check` : réussi.
- `tsc --noEmit` : le contrôle global reste en échec sur des erreurs préexistantes dans le tableau de bord (`count`/`requestCount`), des clés répétées dans `language.tsx` et la variable `navigate` de la page de facture. Aucun diagnostic ne concerne les fichiers ajoutés ou modifiés par V13. Ces fichiers hors périmètre n'ont pas été modifiés.

Des aperçus sont inclus dans `docs/pages-preview-v13/`.
