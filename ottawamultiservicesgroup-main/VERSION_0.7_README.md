# Ottawa Multiservices CRM — Version 0.7

## Signature électronique des devis

Cette version remplace le projet SMS expérimental et ajoute la signature électronique dans le portail client.

### Fonctionnalités

- signature au doigt, au stylet ou à la souris;
- consentement explicite avant l’acceptation;
- nom du signataire, date et heure enregistrés;
- adresse IP disponible et navigateur enregistrés par une Edge Function;
- passage automatique du devis au statut `accepted`;
- courriel automatique à l’administrateur après signature;
- consultation de la preuve et de l’image de signature dans la fiche du devis;
- un seul enregistrement de signature autorisé par devis;
- contrôle que le devis appartient bien au client connecté.

## Déploiement

À la racine du projet :

```bash
npx supabase db push
npx supabase functions deploy sign-estimate
npm install
npm run build
git add .
git commit -m "feat: add electronic estimate signatures"
git push origin main
```

La fonction utilise automatiquement les variables Supabase intégrées :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Aucun compte Twilio et aucun numéro de téléphone ne sont requis.

## Test recommandé

1. Marquer un devis comme **Envoyé** dans l’administration.
2. Se connecter au portail avec l’adresse courriel du client.
3. Cliquer sur **Examiner et signer**.
4. Inscrire le nom, dessiner la signature et accepter la déclaration.
5. Vérifier que le devis passe à **Accepté**.
6. Ouvrir la fiche du devis dans l’administration et vérifier la preuve de signature.

## Remarque juridique

Cette fonctionnalité conserve une piste de preuve technique. Les conditions du devis et le texte de consentement doivent néanmoins être adaptés aux besoins juridiques et commerciaux de l’entreprise.
