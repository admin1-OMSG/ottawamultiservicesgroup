# Ottawa Multiservices CRM — Version 0.3

## Nouveautés

- Interventions : création, liste, détail et statuts
- Conversion d’un devis accepté en intervention
- Affectation d’un employé
- Calendrier mensuel des interventions
- Registre simple des employés
- Migration Supabase `202607300002_crm_v03.sql`

## Installation

1. Copiez le contenu de cette archive dans votre projet.
2. Exécutez la migration v0.2 si elle ne l’est pas déjà.
3. Exécutez la migration v0.3 dans Supabase SQL Editor.
4. Lancez `npm install` puis `npm run dev`.
5. Vérifiez `/admin/jobs`, `/admin/schedule` et `/admin/employees`.

## Déploiement

```bash
git add .
git commit -m "Add CRM version 0.3"
git push origin main
```
