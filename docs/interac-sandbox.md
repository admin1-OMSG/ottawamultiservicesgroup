# Essai Interac pour OMSG

La section Interac de l’espace professionnel permet de tester la vérification
combinée banque, pièce d’identité et selfie. Elle s’affiche après le premier
enregistrement du profil sur l’aperçu OMSG. Le résultat porte la mention
d’essai. L’examen du dossier professionnel reste une étape distincte.

## Projet à créer chez Interac

1. Créer l’organisation Ottawa Multiservices Group Inc. et un projet
   **OMSG Sandbox** dans le [portail développeur](https://portal.hub-verify.innovation.interac.ca/auth/sign-up).
2. Dans **Standard Identity Verification**, sélectionner les deux sources de
   données (**Interac verification service** et **Interac document verification
   service**) et demander leur comparaison. Sélectionner la réponse synchrone
   avec résultat de l’analyse du document et de la concordance. Utiliser
   **MyBank** et les pièces fictives du portail pour les essais.
3. Dans les paramètres d’intégration du projet, enregistrer les deux adresses
   ci-dessous. La clé publique est servie directement par la branche Supabase.

| Réglage Interac | Valeur pour cet essai |
| --- | --- |
| Redirect URL | `https://ottawamultiservicesgroup-git-codex-professional-onboarding-omsg.vercel.app/api/interac/callback` |
| JWKS URL | `https://vdeeevxpwjvztsoonuxx.supabase.co/functions/v1/interac-sandbox-bridge/jwks` |

4. Reporter **Hub Client ID** et **Scope** dans les variables Vercel
   `INTERAC_CLIENT_ID` et `INTERAC_SCOPE` réservées à la branche
   `codex/professional-onboarding`. Le scope doit contenir `openid` suivi du
   nom attribué par Interac. L’issuer accepté est celui du bac à sable du
   portail développeur. Redéployer cet aperçu, ouvrir son adresse stable,
   se connecter à `/pro` et démarrer l’essai.

Les renseignements retournés par Interac sont examinés en mémoire. La base
conserve le statut de la tentative et des données techniques limitées. Aucune
photo, donnée bancaire, pièce ni jeton Interac n’est conservé dans le profil.
Le démarrage, le retour au site et l’enregistrement du résultat sont liés à la
même tentative. L’environnement de production nécessite un accès commercial et
une configuration distincte.

Commande de validation locale : `npm run test:interac`.
[Création du projet](https://documents.hub-verify.innovation.interac.ca/docs/creating-a-project-copy) ·
[Paramètres de connexion](https://documents.hub-verify.innovation.interac.ca/docs/developer-mode)
