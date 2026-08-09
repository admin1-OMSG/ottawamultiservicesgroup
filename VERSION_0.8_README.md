# Ottawa Multiservices Group CRM — Version 0.8

## Stripe Checkout en mode test

Cette version ajoute :

- paiement complet d'une facture depuis le portail client ;
- acompte fixe de 30 % du solde ;
- page Stripe Checkout hébergée par Stripe ;
- webhook signé et idempotent ;
- création automatique du paiement dans `payments` ;
- mise à jour automatique de `amount_paid`, `balance_due` et du statut de la facture ;
- historique Stripe visible dans l'administration existante.

## 1. Sécurité immédiate

La clé secrète Stripe a été partiellement visible dans une capture d'écran. Dans Stripe Sandbox, régénérez-la avant de l'utiliser, puis ne la placez jamais dans GitHub, Vercel ou le code React.

## 2. Appliquer la migration

Dans le dossier du projet :

```bash
npx supabase db push
```

Migration ajoutée :

```text
supabase/migrations/202607300007_crm_v08_stripe_payments.sql
```

## 3. Ajouter les secrets Supabase

Remplacez les exemples par vos vraies valeurs de test :

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_VOTRE_NOUVELLE_CLE
npx supabase secrets set SITE_URL=https://VOTRE-SITE-VERCEL.vercel.app
```

`SITE_URL` doit être l'adresse publique exacte du CRM, sans barre oblique finale.

Le secret `STRIPE_WEBHOOK_SECRET` sera ajouté après la création du webhook.

## 4. Déployer les Edge Functions

```bash
npx supabase functions deploy create-checkout-session
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

La configuration attendue est déjà dans `supabase/config.toml` :

```toml
[functions.create-checkout-session]
verify_jwt = true

[functions.stripe-webhook]
verify_jwt = false
```

## 5. Créer le webhook Stripe Sandbox

Dans Stripe Sandbox :

1. Ouvrez **Developers → Webhooks**.
2. Ajoutez un endpoint.
3. URL :

```text
https://VOTRE-PROJET.supabase.co/functions/v1/stripe-webhook
```

4. Sélectionnez ces événements :

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
```

5. Copiez le **Signing secret** commençant par `whsec_`.
6. Ajoutez-le dans Supabase :

```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET
```

Les secrets Supabase deviennent disponibles aux fonctions sans redéploiement.

## 6. Tester

1. Créez ou envoyez une facture ayant un solde supérieur à zéro.
2. Connectez-vous au portail client avec l'adresse courriel liée au client.
3. Cliquez sur **Acompte 30 %** ou **Payer le solde**.
4. Sur Stripe Checkout en mode test, utilisez la carte de test standard indiquée dans le tableau de bord Stripe.
5. Après le retour au portail, attendez quelques secondes puis actualisez.
6. Vérifiez :
   - Stripe → Transactions ;
   - Supabase → `stripe_checkout_sessions` ;
   - Supabase → `payments` ;
   - la facture passe à `partially_paid` ou `paid`.

## 7. Mise en production plus tard

Ne remplacez les clés `sk_test_...` par les clés `sk_live_...` qu'après :

- la vérification complète du compte Stripe ;
- plusieurs tests réussis ;
- la création d'un nouveau webhook dans le compte Live ;
- la configuration du nouveau secret `whsec_...` Live.

## Architecture de sécurité

- La clé secrète Stripe reste uniquement dans les secrets Supabase.
- Le navigateur n'envoie que l'identifiant de la facture et le type de paiement.
- Le montant est recalculé côté serveur à partir du solde de la facture.
- Le webhook vérifie la signature Stripe sur le corps brut.
- Les paiements sont idempotents grâce aux identifiants Stripe uniques.
