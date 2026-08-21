# Guide de Démarrage Rapide : MySQL + WAMP Server + VS Code

Ce projet est configuré pour fonctionner **exclusivement avec votre unique base de données locale MySQL via WAMP Server et phpMyAdmin** sur la base **`universite`**.

---

## 1. Démarrage de WAMP Server
1. Lancez **WAMP Server** sur votre ordinateur Windows.
2. Assurez-vous que l'icône WAMP dans la barre des tâches est **verte** (ce qui indique qu'Apache et MySQL sont démarrés).

---

## 2. Base de Données dans phpMyAdmin
1. Ouvrez votre navigateur et allez sur **[http://localhost/phpmyadmin](http://localhost/phpmyadmin)**.
2. Identifiez-vous (par défaut : utilisateur `root`, mot de passe vide).
3. Si la base **`universite`** existe déjà, elle est utilisée directement sans écraser vos données existantes.
4. Si vous souhaitez importer la structure initiale complète, importez le fichier **`universite.sql`** (ou `/config/schema.sql`).

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
* **Matricule** : `2026-MAT-101` (ou tout étudiant enregistré dans la base `universite`)
* **Mot de passe** : `etudiant123`

---

## 6. Vérification de la Connexion MySQL
Toutes les opérations (connexion admin/étudiant, création/modification/suppression d'étudiants, filières, matières, saisie des notes, calcul des moyennes, bulletins, années académiques, semestres, classes, inscriptions, paiements) s'exécutent et se synchronisent directement avec **MySQL WAMP (`universite`)**.
