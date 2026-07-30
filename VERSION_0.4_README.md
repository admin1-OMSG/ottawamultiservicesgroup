# Ottawa Multiservices CRM — Version 0.4

## Nouveautés
- Factures avec numérotation automatique
- Création manuelle ou depuis un devis
- Lignes, HST, total, solde et échéance
- Paiements partiels et complets
- Historique global des paiements
- Mise à jour automatique du statut de facture

## Migration
Exécuter `supabase/migrations/202607300003_crm_v04.sql` dans Supabase SQL Editor.

## Routes
- `/admin/invoices`
- `/admin/invoices/new`
- `/admin/payments`
