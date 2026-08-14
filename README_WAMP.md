# Guide de Démarrage Rapide : MySQL + WAMP Server + VS Code

Ce projet est configuré pour fonctionner **exclusivement avec votre base de données locale MySQL via WAMP Server et phpMyAdmin**.

---

## 1. Démarrage de WAMP Server
1. Lancez **WAMP Server** sur votre ordinateur Windows.
2. Assurez-vous que l'icône WAMP dans la barre des tâches est **verte** (ce qui indique qu'Apache et MySQL sont démarrés).

---

## 2. Importation de la Base de Données dans phpMyAdmin
1. Ouvrez votre navigateur et allez sur **[http://localhost/phpmyadmin](http://localhost/phpmyadmin)**.
2. Identifiez-vous (par défaut : utilisateur `root`, mot de passe vide).
3. Cliquez sur **Nouvelle base de données** à gauche.
4. Entrez le nom : **`universite`** avec l'interclassement **`utf8mb4_unicode_ci`**, puis cliquez sur **Créer**.
5. Sélectionnez la base **`universite`** nouvellement créée dans la colonne de gauche.
6. Cliquez sur l'onglet **Importer** en haut.
7. Cliquez sur **Choisir un fichier** et sélectionnez le fichier **`universite.sql`** situé à la racine du projet.
8. Cliquez sur le bouton **Exécuter** tout en bas de la page. Les 20 tables avec leurs relations et données initiales sont importées avec succès.

---

## 3. Configuration dans VS Code (`.env`)
Le projet contient un fichier **`.env`** prêt à l'emploi à la racine :

```env
# Configuration Base de Données MySQL (WAMP Server)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=universite
```

*(Si votre WAMP utilise le port MySQL alternatif `3308`, changez simplement `MYSQL_PORT=3308` dans ce fichier `.env`).*

---

## 4. Lancement de l'Application depuis VS Code
1. Ouvrez le dossier du projet dans **VS Code**.
2. Ouvrez le terminal intégré (**Terminal > Nouveau terminal** ou `Ctrl + \``).
3. Installez les dépendances si ce n'est pas déjà fait :
   ```bash
   npm install
   ```
4. Démarrez le serveur :
   ```bash
   npm run dev
   ```
5. Ouvrez votre navigateur sur **`http://localhost:3000`**.

---

## 5. Identifiants de Connexion

### Espace Administration :
* **Email / Identifiant** : `admin@unigestion.edu.ml` *(ou `admin`)*
* **Mot de passe** : `admin123`

### Espace Étudiant :
* **Filière** : Informatique & Génie Logiciel
* **Matricule** : `2026-MAT-101`
* **Mot de passe** : `etudiant123`

---

## 6. Vérification de la Synchronisation MySQL
Toutes les opérations (création d'étudiants, saisie des notes, inscriptions, paiements, suppressions) s'exécutent directement dans vos tables MySQL de WAMP. Vous pouvez vérifier les modifications en temps réel dans **phpMyAdmin**.
