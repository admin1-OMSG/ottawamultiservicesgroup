# Paiements professionnels OMSG

Les trois packs sont libellés en CAD. L’administrateur configure les crédits par pack, les tarifs par service, le prix mensuel et les crédits mensuels dans l’espace Marketplace. Les montants et crédits de chaque commande sont enregistrés au moment de l’achat. Le coût d’un contact est enregistré sur la demande. Une réduction attribuée à un partenaire approuvé s’applique à ses nouveaux achats.

## Aperçu

Le mode de simulation des packs nécessite le projet Supabase d’essai `vdeeevxpwjvztsoonuxx` et le réglage privé `market_billing.settings.preview_checkout_enabled`. La migration laisse ce réglage désactivé et les offres non configurées. Les crédits simulés sont enregistrés dans le registre du projet d’essai. Les abonnements utilisent Stripe, y compris en mode test.

## Stripe

Déployer les fonctions Supabase `market-checkout` et `market-stripe-webhook`. Utiliser des secrets réservés au marketplace, distincts de ceux des factures du CRM. Pour un test Stripe, régler `MARKET_STRIPE_SECRET_KEY` sur une clé de test et `MARKET_STRIPE_WEBHOOK_SECRET` sur le secret de signature du nouvel endpoint. Pour tester les packs par Stripe sur la branche d’essai, désactiver la simulation.

Enregistrer l’endpoint `https://<projet>.supabase.co/functions/v1/market-stripe-webhook` dans le même environnement Stripe que la clé. Sélectionner les événements suivants.

- `checkout.session.completed`, `checkout.session.async_payment_succeeded` et `checkout.session.expired`
- `invoice.payment_succeeded`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused` et `customer.subscription.resumed`

Activer le portail client Stripe avec gestion du moyen de paiement et résiliation de l’abonnement. L’abonnement conserve son prix et son nombre de crédits convenus à l’achat. Un paiement mensuel réussi crédite une fois la facture correspondante.

Pour la mise en service ultérieure, le projet de production utilise `MARKET_SITE_ORIGIN` (origine HTTPS du site), `MARKET_BILLING_MODE=live`, une clé de paiement en production et le secret de signature de l’endpoint de production. L’aperçu accepte uniquement des identifiants Stripe de test.

## Validation

`node scripts/test-marketplace-billing.mjs` vérifie les montants capturés, les droits, les retries, les remboursements et le renouvellement des abonnements dans une base PostgreSQL isolée. Un test complet avec carte de test Stripe nécessite les identifiants du compte Stripe et l’enregistrement du webhook.
