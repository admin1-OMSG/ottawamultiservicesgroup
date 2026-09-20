# Vérification des pages de tarifs

- Installation : `npm ci` exécuté avec le verrou de dépendances existant.
- Calculs : 10 contrôles ciblés réussis avec `node scripts/test-cleaning-pricing.mjs` : première visite, récurrence, calendrier, forfait appareils, absence de double facturation, visite spécialisée, options seules, taxes, commercial, quantités invalides et données CRM.
- TypeScript global : l’archive d’origine et la version modifiée présentent les mêmes 47 diagnostics, après normalisation des numéros de ligne. Aucun diagnostic supplémentaire n’est introduit par les pages de tarifs. Les anomalies existantes concernent notamment les clés du dictionnaire de traduction, les types des statistiques et `navigate` dans la page de facture administrateur.
- Compilation finale : `npm run build` réussit (code de sortie 0).
- Navigateur Chromium : parcours anglais résidentiel et commercial, calcul instantané, vérification de courriel, échec CRM puis nouvelle tentative avec le même identifiant, confirmation après enregistrement et conservation des choix validés.
- Champs CRM contrôlés : montant, options choisies, consentement de contact, refus des photos par défaut, absence d’inscription marketing, version de la grille et coordonnées.
- Autres parcours contrôlés : fréquence commerciale, visite spécialisée sans faux montant de 0 $, formule options seules, pages et politique françaises, sitemap.
- Affichage : aperçus inspectés sur ordinateur (1 440 px) et téléphone (390 px). Le tableau peut défiler dans son cadre sur téléphone ; la page ne déborde pas horizontalement.
- Aucun incident JavaScript détecté pendant le scénario final.
- La vérification CRM locale utilise des réponses simulées et n’envoie ni demande ni courriel réels.
