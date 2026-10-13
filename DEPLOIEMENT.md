# Mettre FitLife en ligne (application + API + base MySQL)

L'image Docker à la racine (`Dockerfile`) construit l'application en mode « API réelle » et la sert
avec l'API PHP, à la même adresse. Au premier démarrage, `backend/bin/init.php` crée les tables et
les comptes **uniquement si la base est vide** (aucune donnée n'est effacée ensuite).

## Railway (recommandé)

1. Créer un compte sur https://railway.app (connexion avec GitHub).
2. **New Project → Deploy from GitHub repo → `charly1707/FitLife`**. Railway détecte le `Dockerfile`.
3. Dans le projet : **+ New → Database → MySQL**.
4. Dans le service FitLife → **Variables** :
   - `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD` : bouton
     « Add Reference » vers le service MySQL (Railway les remplit seul) ;
   - `APP_ENV=production`
   - `JWT_SECRET`, `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD`, `SEED_ADMIN_PASSWORD`,
     `SEED_COACH_PASSWORD`, `SEED_DEMO_PASSWORD` : copier les valeurs du fichier local
     `backend/.env` (jamais versionné).
5. **Settings → Networking → Generate Domain** : l'application est en ligne à cette adresse.
6. Les journaux de déploiement (« Deploy Logs ») affichent « Schema + seeds appliqués » au premier lancement.

## Autre hébergeur (Render, Koyeb, VPS…)

Même principe : déployer le `Dockerfile` et fournir une base MySQL 8 via les variables
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` (ou `MYSQL*`), plus `APP_ENV`, `JWT_SECRET`
et les `SEED_*`.

## Hébergement mutualisé (cPanel : Hostinger, o2switch…)

1. Créer une base MySQL dans cPanel et importer `database/schema.sql` (phpMyAdmin).
2. Envoyer le dossier `backend/` et y placer un fichier `.env` (modèle : `backend/.env.example`).
3. Lancer une fois `php backend/bin/init.php` (Terminal cPanel) pour créer les comptes.
4. Construire l'interface en local (`VITE_DATA_MODE=api npx vite build` dans `frontend/`) et
   envoyer le contenu de `frontend/dist/` dans `backend/public/` (le domaine doit pointer vers
   `backend/public`) ; renommer `index.html` en `app.html` à la racine et définir `FRONTEND_INDEX`.

## Sécurité

- Changer les mots de passe des comptes après la première connexion.
- `JWT_SECRET` : 32 caractères minimum (l'API refuse de démarrer en production sinon).
- Le paiement reste simulé tant que `PAYMENT_PROVIDER` n'est pas branché (voir `README.md`).
