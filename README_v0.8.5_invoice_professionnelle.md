# Patch v0.8.5 — Facture professionnelle

Ce patch améliore la fiche facture et le courriel envoyé au client.

## Affichage ajouté
- entête Ottawa Multiservices Group Inc.
- numéro et statut de facture
- client et coordonnées
- date d’émission et échéance
- détail des prestations, quantité, prix unitaire et montant
- sous-total avant taxes
- remise éventuelle
- HST avec taux calculé
- total
- montant payé
- solde
- méthode(s) de paiement, date et référence
- bouton Imprimer / PDF
- bouton Envoyer la facture / facture acquittée

## Configuration facultative recommandée
Dans Vercel (variables d’environnement du site) :

```
VITE_BUSINESS_ADDRESS=Votre adresse commerciale complète
VITE_BUSINESS_EMAIL=admin1@ottawamultiservicesgroup.com
VITE_BUSINESS_PHONE=Votre numéro professionnel
VITE_GST_HST_NUMBER=Votre numéro de compte GST/HST
```

Pour les courriels Supabase Edge Function :

```cmd
npx supabase secrets set BUSINESS_ADDRESS="Votre adresse commerciale complète"
npx supabase secrets set BUSINESS_PHONE="Votre numéro professionnel"
npx supabase secrets set GST_HST_NUMBER="Votre numéro GST/HST"
```

N’ajoutez un numéro GST/HST que si l’entreprise est réellement inscrite et autorisée à facturer cette taxe.

## Déploiement

```cmd
npx supabase functions deploy send-crm-email --no-verify-jwt
npm run build
git add .
git commit -m "feat: professional invoice layout and payment details"
git push origin main
```

Aucune migration SQL n’est nécessaire.
