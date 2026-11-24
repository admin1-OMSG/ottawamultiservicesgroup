# Paiements professionnels OMSG

Les trois packs sont libellés en CAD. L’administrateur gère les offres et les tarifs par service dans l’espace Marketplace. Les formules de fidélité à 208 CAD ont un montant et un nombre de crédits fixes. Les montants et crédits de chaque commande sont enregistrés au moment de l’achat. Le coût d’un contact est enregistré sur la demande. Une réduction attribuée à un partenaire approuvé s’applique à ses nouveaux achats.

## Fidélité des offres de 208 CAD

Le pack ponctuel et l’abonnement mensuel à 208 CAD ont des compteurs indépendants. Chaque offre accorde 240 crédits aux deux premiers paiements admissibles, puis 260 à partir du troisième.

- Pour le pack, les achats payés de cette offre se cumulent par professionnel, même dans le même mois. Les achats des autres packs ne font pas avancer le compteur.
- Pour l’abonnement, trois périodes mensuelles consécutives payées du même abonnement déclenchent le premier bonus. Une interruption des périodes payées ou un nouvel abonnement ouvre une nouvelle série. Les renouvellements utilisent les périodes facturées par Stripe. Une nouvelle tentative de paiement de la même facture conserve sa période.

Le calcul utilise les conditions enregistrées à la création de la commande. Les partenaires bénéficiant d’une réduction cumulent les crédits de l’offre achetée. Une nouvelle livraison du même événement Stripe conserve le crédit déjà attribué.

## Aperçu

Le mode de simulation des packs nécessite le projet Supabase d’essai `vdeeevxpwjvztsoonuxx` et le réglage privé `market_billing.settings.preview_checkout_enabled`. La simulation et les achats sont désactivés par défaut à la création du projet. Les crédits simulés sont enregistrés dans le registre du projet d’essai. Les abonnements utilisent Stripe, y compris en mode test.

## Stripe

Déployer les fonctions Supabase `market-checkout` et `market-stripe-webhook`. Utiliser des secrets réservés au marketplace, distincts de ceux des factures du CRM. Pour un test Stripe, régler `MARKET_STRIPE_SECRET_KEY` sur une clé de test et `MARKET_STRIPE_WEBHOOK_SECRET` sur le secret de signature du nouvel endpoint. Pour tester les packs par Stripe sur la branche d’essai, désactiver la simulation.

Enregistrer l’endpoint `https://<projet>.supabase.co/functions/v1/market-stripe-webhook` dans le même environnement Stripe que la clé. Sélectionner les événements suivants.

- `checkout.session.completed`, `checkout.session.async_payment_succeeded` et `checkout.session.expired`
- `invoice.payment_succeeded`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused` et `customer.subscription.resumed`

Activer le portail client Stripe avec gestion du moyen de paiement et résiliation de l’abonnement. Sur la branche d’essai, la configuration active du portail porte les métadonnées `omsg_market_portal=v1` et `omsg_project=vdeeevxpwjvztsoonuxx`. La résiliation est réglée sur la fin de la période payée. L’abonnement conserve son prix et son nombre de crédits convenus à l’achat. Un paiement mensuel réussi crédite une fois la facture correspondante.

Pour la mise en service ultérieure, le projet de production utilise `MARKET_SITE_ORIGIN` (origine HTTPS du site), `MARKET_BILLING_MODE=live`, une clé de paiement en production et le secret de signature de l’endpoint de production. L’aperçu accepte uniquement des identifiants Stripe de test.

## Validation

`node scripts/test-marketplace-billing.mjs` vérifie les montants capturés, les droits, les retries, les remboursements et le renouvellement des abonnements dans une base PostgreSQL isolée. Un test complet avec carte de test Stripe nécessite les identifiants du compte Stripe et l’enregistrement du webhook.
