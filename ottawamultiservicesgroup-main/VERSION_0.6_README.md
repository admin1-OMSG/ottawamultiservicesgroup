# Ottawa Multiservices CRM — Version 0.6

## Notifications transactionnelles par courriel

Cette version envoie quatre notifications :

1. À l’administrateur lorsqu’un client demande un devis sur le site.
2. À l’administrateur lorsqu’un client accepte un devis dans son portail.
3. Au client lorsque l’administrateur passe le devis au statut `sent` (« Envoyé »).
4. Au client lorsqu’une intervention reçoit une nouvelle date de rendez-vous.

## Architecture

Les courriels sont envoyés côté serveur par la fonction Supabase Edge Function :

`supabase/functions/send-crm-email/index.ts`

La clé Resend n’est jamais placée dans le navigateur.

## Installation

### 1. Migration SQL

Exécuter dans Supabase SQL Editor :

`supabase/migrations/202607300005_crm_v06_email_notifications.sql`

### 2. Créer un compte Resend et vérifier le domaine

Vérifier le domaine `ottawamultiservicesgroup.com` dans Resend, puis créer une clé API.

### 3. Ajouter les secrets Supabase

Dans Supabase > Edge Functions > Secrets, ajouter :

- `RESEND_API_KEY`
- `ADMIN_NOTIFICATION_EMAIL`
- `EMAIL_FROM`
- `SITE_URL`

Exemple :

- `ADMIN_NOTIFICATION_EMAIL=adresse-administrateur@example.com`
- `EMAIL_FROM=Ottawa Multiservices <notifications@ottawamultiservicesgroup.com>`
- `SITE_URL=https://www.ottawamultiservicesgroup.com`

### 4. Déployer la fonction

Avec Supabase CLI :

```bash
supabase functions deploy send-crm-email --no-verify-jwt
```

Ou déployer le dossier `send-crm-email` depuis l’interface Supabase si cette option est disponible.

## Tests

- Envoyer une nouvelle demande de devis depuis `/quote`.
- Passer un devis au statut « Envoyé ».
- Accepter ce devis depuis `/portal`.
- Créer ou modifier une intervention avec une date.

La table `email_notifications` conserve l’historique et empêche les doublons.
