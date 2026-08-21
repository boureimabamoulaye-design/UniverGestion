-- =========================================================
-- UNIGESTION MALI - GESTION SCOLAIRE UNIVERSITAIRE COMPLÈTE
-- Base de données : universite
-- Compatible MySQL 5.7+ / 8.0+ / MariaDB (WAMP, XAMPP, LAMP)
-- =========================================================

CREATE DATABASE IF NOT EXISTS `universite` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `universite`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table: universites
DROP TABLE IF EXISTS `universites`;
CREATE TABLE `universites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `nom` VARCHAR(255) NOT NULL,
  `sigle` VARCHAR(50) NOT NULL,
  `adresse` VARCHAR(255) DEFAULT NULL,
  `ville` VARCHAR(100) DEFAULT 'Bamako',
  `pays` VARCHAR(100) DEFAULT 'Mali',
  `telephone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `logo_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: facultes
DROP TABLE IF EXISTS `facultes`;
CREATE TABLE `facultes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `universite_id` INT NOT NULL DEFAULT 1,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `nom` VARCHAR(255) NOT NULL,
  `doyen` VARCHAR(150) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`universite_id`) REFERENCES `universites`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: filieres
DROP TABLE IF EXISTS `filieres`;
CREATE TABLE `filieres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `faculte_id` INT NOT NULL DEFAULT 1,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `nom` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `domaine` VARCHAR(100) DEFAULT NULL,
  `diplome` VARCHAR(50) DEFAULT 'Licence',
  `frais_scolarite` DECIMAL(12,2) DEFAULT 350000.00,
  `duree_annees` INT DEFAULT 3,
  `statut` VARCHAR(20) DEFAULT 'Actif',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`faculte_id`) REFERENCES `facultes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: niveaux
DROP TABLE IF EXISTS `niveaux`;
CREATE TABLE `niveaux` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filiere_id` INT NOT NULL DEFAULT 1,
  `code` VARCHAR(20) NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `diplome_vise` VARCHAR(100) DEFAULT 'Licence',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: annees_academiques
DROP TABLE IF EXISTS `annees_academiques`;
CREATE TABLE `annees_academiques` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `libelle` VARCHAR(100) NOT NULL,
  `date_debut` DATE NOT NULL,
  `date_fin` DATE NOT NULL,
  `est_active` TINYINT(1) DEFAULT 0,
  `est_archivee` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table: classes
DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filiere_id` INT NOT NULL,
  `niveau_id` INT DEFAULT NULL,
  `annee_academique_id` INT DEFAULT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(150) NOT NULL,
  `niveau` VARCHAR(20) DEFAULT 'L1',
  `capacite` INT DEFAULT 60,
  `capacite_max` INT DEFAULT 60,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`niveau_id`) REFERENCES `niveaux`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`annee_academique_id`) REFERENCES `annees_academiques`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table: enseignants
DROP TABLE IF EXISTS `enseignants`;
CREATE TABLE `enseignants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `matricule` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `titre` VARCHAR(100) DEFAULT 'Docteur',
  `grade` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(100) NOT NULL,
  `telephone` VARCHAR(30) DEFAULT NULL,
  `specialite` VARCHAR(150) DEFAULT NULL,
  `universite_id` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`universite_id`) REFERENCES `universites`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Table: semestres
DROP TABLE IF EXISTS `semestres`;
CREATE TABLE `semestres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL,
  `libelle` VARCHAR(50) NOT NULL,
  `niveau_id` INT DEFAULT NULL,
  `ordre` INT DEFAULT 1,
  FOREIGN KEY (`niveau_id`) REFERENCES `niveaux`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Table: matieres
DROP TABLE IF EXISTS `matieres`;
CREATE TABLE `matieres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `filiere_id` INT NOT NULL,
  `niveau_id` INT DEFAULT NULL,
  `semestre_id` INT DEFAULT 1,
  `semestre` INT DEFAULT 1,
  `enseignant_id` INT DEFAULT NULL,
  `credits` INT DEFAULT 3,
  `credits_ectcs` INT DEFAULT 3,
  `coefficient` INT DEFAULT 1,
  `ue_nom` VARCHAR(150) DEFAULT NULL,
  `ue_type` VARCHAR(50) DEFAULT 'Majeure',
  `support_fichier_nom` VARCHAR(255) DEFAULT NULL,
  `support_fichier_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`niveau_id`) REFERENCES `niveaux`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`semestre_id`) REFERENCES `semestres`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`enseignant_id`) REFERENCES `enseignants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Table: etudiants
DROP TABLE IF EXISTS `etudiants`;
CREATE TABLE `etudiants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `matricule` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `date_naissance` DATE DEFAULT NULL,
  `lieu_naissance` VARCHAR(100) DEFAULT 'Bamako',
  `sexe` ENUM('M', 'F') NOT NULL DEFAULT 'M',
  `genre` ENUM('M', 'F') DEFAULT 'M',
  `nationalite` VARCHAR(50) DEFAULT 'Mali',
  `email` VARCHAR(100) DEFAULT NULL,
  `telephone` VARCHAR(30) DEFAULT NULL,
  `adresse` VARCHAR(255) DEFAULT NULL,
  `classe_id` INT NOT NULL,
  `filiere_id` INT DEFAULT NULL,
  `niveau_id` INT DEFAULT NULL,
  `statut` VARCHAR(50) DEFAULT 'Inscrit',
  `est_bloque` TINYINT(1) DEFAULT 0,
  `statut_compte` VARCHAR(20) DEFAULT 'Actif',
  `tuteur_nom` VARCHAR(100) DEFAULT NULL,
  `tuteur_prenom` VARCHAR(100) DEFAULT NULL,
  `tuteur_telephone` VARCHAR(30) DEFAULT NULL,
  `date_inscription` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `mot_de_passe` VARCHAR(255) NOT NULL DEFAULT 'etudiant123',
  `photo_url` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`classe_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Table: inscriptions
DROP TABLE IF EXISTS `inscriptions`;
CREATE TABLE `inscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `classe_id` INT NOT NULL,
  `filiere_id` INT DEFAULT NULL,
  `annee_academique_id` INT DEFAULT 1,
  `annee_academique` VARCHAR(50) DEFAULT '2025-2026',
  `date_inscription` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `statut` VARCHAR(50) DEFAULT 'Validée',
  `frais_inscription` DECIMAL(12,2) DEFAULT 150000.00,
  `type_inscription` VARCHAR(50) DEFAULT 'Inscrire',
  `statut_paiement` VARCHAR(50) DEFAULT 'Payé',
  `statut_validation` VARCHAR(50) DEFAULT 'Validé',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`classe_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`annee_academique_id`) REFERENCES `annees_academiques`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Table: paiements
DROP TABLE IF EXISTS `paiements`;
CREATE TABLE `paiements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `annee_academique_id` INT DEFAULT 1,
  `filiere_id` INT DEFAULT NULL,
  `filiere_code` VARCHAR(20) DEFAULT NULL,
  `filiere_nom` VARCHAR(150) DEFAULT NULL,
  `classe_id` INT DEFAULT NULL,
  `classe_nom` VARCHAR(100) DEFAULT NULL,
  `annee_libelle` VARCHAR(50) DEFAULT '2025 - 2026',
  `type_frais` VARCHAR(50) DEFAULT 'Scolarité',
  `montant` DECIMAL(12,2) NOT NULL,
  `montant_paye` DECIMAL(12,2) NOT NULL,
  `reste_a_payer` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `mode_paiement` VARCHAR(50) DEFAULT 'Orange Money',
  `methode` VARCHAR(50) DEFAULT 'Orange Money',
  `reference_recu` VARCHAR(100) NOT NULL UNIQUE,
  `reference_transaction` VARCHAR(100) DEFAULT NULL,
  `date_paiement` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `statut` VARCHAR(50) DEFAULT 'Complet',
  `remarque` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`annee_academique_id`) REFERENCES `annees_academiques`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Table: notes
DROP TABLE IF EXISTS `notes`;
CREATE TABLE `notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `matiere_id` INT NOT NULL,
  `semestre_id` INT DEFAULT 1,
  `annee_academique_id` INT DEFAULT 1,
  `annee_academique` VARCHAR(50) DEFAULT '2025-2026',
  `note_cc` DECIMAL(4,2) DEFAULT NULL,
  `note_examen` DECIMAL(4,2) DEFAULT NULL,
  `note_finale` DECIMAL(4,2) DEFAULT NULL,
  `moyenne` DECIMAL(4,2) DEFAULT NULL,
  `appreciation` VARCHAR(100) DEFAULT NULL,
  `modifie_par` VARCHAR(100) DEFAULT 'Enseignant',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`matiere_id`) REFERENCES `matieres`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Table: absences
DROP TABLE IF EXISTS `absences`;
CREATE TABLE `absences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `matiere_id` INT NOT NULL,
  `date_absence` DATE NOT NULL,
  `heures` INT DEFAULT 2,
  `justifiee` TINYINT(1) DEFAULT 0,
  `motif` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`matiere_id`) REFERENCES `matieres`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Table: bulletins
DROP TABLE IF EXISTS `bulletins`;
CREATE TABLE `bulletins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `classe_id` INT NOT NULL,
  `semestre_id` INT DEFAULT 1,
  `annee_academique_id` INT DEFAULT 1,
  `moyenne` DECIMAL(4,2) NOT NULL,
  `moyenne_generale` DECIMAL(4,2) DEFAULT 0.00,
  `total_credits` INT DEFAULT 0,
  `total_credits_valides` INT DEFAULT 0,
  `decision` VARCHAR(50) DEFAULT 'Admis',
  `mention` VARCHAR(50) DEFAULT 'Passable',
  `rang` INT DEFAULT 1,
  `remarques_jury` TEXT DEFAULT NULL,
  `date_generation` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`classe_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Table: utilisateurs
DROP TABLE IF EXISTS `utilisateurs`;
CREATE TABLE `utilisateurs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `mot_de_passe` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'ADMIN',
  `universite_id` INT NOT NULL DEFAULT 1,
  `dernier_acces` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`universite_id`) REFERENCES `universites`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Table: administrateurs
DROP TABLE IF EXISTS `administrateurs`;
CREATE TABLE `administrateurs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT DEFAULT 1,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `telephone` VARCHAR(30) DEFAULT NULL,
  `role_admin` VARCHAR(50) DEFAULT 'Administrateur',
  `statut` VARCHAR(20) DEFAULT 'Actif',
  `universite_id` INT DEFAULT 1,
  `date_creation` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Table: autorisations_filieres
DROP TABLE IF EXISTS `autorisations_filieres`;
CREATE TABLE `autorisations_filieres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT NOT NULL,
  `filiere_id` INT NOT NULL,
  `droit_acces` VARCHAR(50) DEFAULT 'Total',
  FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Table: supports_cours
DROP TABLE IF EXISTS `supports_cours`;
CREATE TABLE `supports_cours` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titre` VARCHAR(255) NOT NULL,
  `matiere_id` INT DEFAULT NULL,
  `filiere_id` INT DEFAULT NULL,
  `type_document` VARCHAR(50) DEFAULT 'PDF',
  `fichier_url` LONGTEXT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `publie_par` VARCHAR(150) DEFAULT 'Enseignant Titulaire',
  `date_publication` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Table: notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `destinateur_type` VARCHAR(20) DEFAULT 'ALL',
  `destinateur_id` INT DEFAULT NULL,
  `titre` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type_alerte` VARCHAR(20) DEFAULT 'INFO',
  `lu` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. Table: historique_acces
DROP TABLE IF EXISTS `historique_acces`;
CREATE TABLE `historique_acces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT DEFAULT NULL,
  `etudiant_id` INT DEFAULT NULL,
  `auteur` VARCHAR(100) DEFAULT 'Administrateur',
  `auteur_role` VARCHAR(50) DEFAULT 'ADMIN',
  `ip_adresse` VARCHAR(50) DEFAULT '127.0.0.1',
  `event_type` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. Table: corbeille
DROP TABLE IF EXISTS `corbeille`;
CREATE TABLE `corbeille` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type_element` VARCHAR(50) NOT NULL,
  `element_id` INT NOT NULL,
  `titre` VARCHAR(255) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `donnees_json` LONGTEXT NOT NULL,
  `supprime_par` VARCHAR(100) DEFAULT 'Administrateur',
  `supprime_le` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. Table: parametres
DROP TABLE IF EXISTS `parametres`;
CREATE TABLE `parametres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cle` VARCHAR(100) NOT NULL UNIQUE,
  `valeur` TEXT NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- JEU DE DONNÉES INITIALES COMPLET
-- =========================================================

-- 1. Universités
INSERT INTO `universites` (`id`, `code`, `nom`, `sigle`, `adresse`, `ville`, `pays`, `telephone`, `email`, `logo_url`) VALUES
(1, 'USTTB', 'Université des Sciences, des Techniques et des Technologies de Bamako', 'USTTB', 'Colline de Badalabougou', 'Bamako', 'Mali', '+223 20 22 33 44', 'contact@usttb.edu.ml', '/src/assets/images/university_logo_1786282800707.jpg')
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 2. Facultés
INSERT INTO `facultes` (`id`, `universite_id`, `code`, `nom`, `doyen`, `description`) VALUES
(1, 1, 'FST', 'Faculté des Sciences et Techniques', 'Prof. Amadou Diallo', 'Faculté principale pour les sciences appliquées, informatique et gestion.')
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 3. Filières
INSERT INTO `filieres` (`id`, `faculte_id`, `code`, `nom`, `description`, `domaine`, `diplome`, `frais_scolarite`, `duree_annees`, `statut`) VALUES
(1, 1, 'IGL', 'Informatique & Génie Logiciel', 'Formation en développement logiciel, bases de données et ingénierie informatique.', 'Sciences & Technologies', 'Licence', 350000.00, 3, 'Actif'),
(2, 1, 'FC', 'Finance & Comptabilité', 'Formation en gestion financière, comptabilité générale et contrôle de gestion.', 'Gestion & Économie', 'Licence', 400000.00, 3, 'Actif'),
(3, 1, 'DA', 'Droit des Affaires', 'Formation juridique axée sur le droit des affaires, des contrats et des sociétés.', 'Droit & Sciences Politiques', 'Licence', 300000.00, 3, 'Actif')
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 4. Niveaux
INSERT INTO `niveaux` (`id`, `filiere_id`, `code`, `nom`, `diplome_vise`) VALUES
(1, 1, 'L1', 'Licence 1', 'Licence'),
(2, 1, 'L2', 'Licence 2', 'Licence'),
(3, 1, 'L3', 'Licence 3', 'Licence')
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 5. Années Académiques
INSERT INTO `annees_academiques` (`id`, `code`, `libelle`, `date_debut`, `date_fin`, `est_active`, `est_archivee`) VALUES
(1, '2025-2026', 'Année Académique 2025 - 2026', '2025-10-01', '2026-07-31', 1, 0)
ON DUPLICATE KEY UPDATE `libelle`=VALUES(`libelle`);

-- 6. Classes
INSERT INTO `classes` (`id`, `filiere_id`, `niveau_id`, `annee_academique_id`, `code`, `nom`, `niveau`, `capacite`, `capacite_max`) VALUES
(1, 1, 1, 1, 'L1-IGL-A', 'Licence 1 Informatique A', 'L1', 50, 50),
(2, 2, 1, 1, 'L1-FC-A', 'Licence 1 Finance A', 'L1', 60, 60),
(3, 3, 1, 1, 'L1-DA-A', 'Licence 1 Droit A', 'L1', 50, 50)
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 7. Enseignants
INSERT INTO `enseignants` (`id`, `matricule`, `nom`, `prenom`, `titre`, `grade`, `email`, `telephone`, `specialite`, `universite_id`) VALUES
(1, 'ENS202601', 'Konaté', 'Sékou', 'Dr.', 'Maître de Conférences', 's.konate@usttb.edu.ml', '+223 76 11 22 33', 'Algorithmique & Génie Logiciel', 1),
(2, 'ENS202602', 'Coulibaly', 'Mariam', 'Prof.', 'Professeur Titulaire', 'm.coulibaly@usttb.edu.ml', '+223 66 44 55 66', 'Finance d\'Entreprise & Analyse', 1),
(3, 'ENS202603', 'Sangaré', 'Ibrahim', 'Dr.', 'Maître Assistant', 'i.sangare@usttb.edu.ml', '+223 70 88 99 00', 'Droit Privé & des Affaires', 1)
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 8. Semestres
INSERT INTO `semestres` (`id`, `code`, `libelle`, `niveau_id`, `ordre`) VALUES
(1, 'S1', 'Semestre 1', 1, 1),
(2, 'S2', 'Semestre 2', 1, 2),
(3, 'S3', 'Semestre 3', 2, 3),
(4, 'S4', 'Semestre 4', 2, 4)
ON DUPLICATE KEY UPDATE `libelle`=VALUES(`libelle`);

-- 9. Matières
INSERT INTO `matieres` (`id`, `code`, `nom`, `filiere_id`, `niveau_id`, `semestre_id`, `semestre`, `enseignant_id`, `credits`, `credits_ectcs`, `coefficient`, `ue_nom`, `ue_type`, `support_fichier_nom`, `support_fichier_url`) VALUES
(1, 'INF101', 'Algorithmique & Programmation C', 1, 1, 1, 1, 1, 6, 6, 1, 'UE1 - Informatique Fondamentale & Algorithmique', 'Majeure', 'Support_Cours_Algorithme_C_L1.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(2, 'INF102', 'Base de Données Relationnelles & SQL', 1, 1, 1, 1, 1, 5, 5, 1, 'UE2 - Ingénierie des Données & Systèmes', 'Majeure', 'Cours_SQL_Universite_2026.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(3, 'MAT101', 'Mathématiques Discrètes & Algèbre', 1, 1, 1, 1, 2, 4, 4, 1, 'UE3 - Mathématiques pour l\'Informatique', 'Mineure', 'Fiche_Exercices_Algebres.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(4, 'ENG101', 'Anglais Technique & Communication S1', 1, 1, 1, 1, 3, 3, 3, 1, 'UE4 - Culture Générale & Langues Transversales', 'Mineure', 'Anglais_Informatique_S1.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(5, 'INF103', 'Développement Web & POO (Java/TypeScript)', 1, 1, 2, 2, 1, 6, 6, 1, 'UE5 - Genie Logiciel & Web', 'Majeure', 'Cours_POO_Java_L1_S2.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(6, 'INF104', 'Systèmes d\'Exploitation & Réseaux', 1, 1, 2, 2, 1, 5, 5, 1, 'UE6 - Architecture & Réseaux', 'Majeure', 'Reseaux_Cisco_Basics.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(7, 'MAT102', 'Mathématiques Appliquées & Probabilités', 1, 1, 2, 2, 2, 4, 4, 1, 'UE7 - Mathématiques pour l\'Informatique S2', 'Mineure', 'Proba_Statistiques_S2.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(8, 'ENG102', 'Anglais Professionnel & Expression S2', 1, 1, 2, 2, 3, 3, 3, 1, 'UE8 - Langues & Communication S2', 'Mineure', 'Anglais_Technique_S2.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(9, 'FIN101', 'Comptabilité Générale I & SYSCOHADA', 2, 1, 1, 1, 2, 6, 6, 1, 'UE1 - Comptabilité & Gestion Financière', 'Majeure', 'Comptabilite_Générale_SYSCOHADA.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(10, 'ECO101', 'Microéconomie & Analyse des Marchés', 2, 1, 1, 1, 2, 5, 5, 1, 'UE2 - Économie Générale & Analyse', 'Majeure', 'Microeconomie_Cours_L1.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(11, 'MAT201', 'Mathématiques Financières & Emprunts', 2, 1, 1, 1, 2, 4, 4, 1, 'UE3 - Quantitatif & Finance', 'Mineure', 'Maths_Financieres_L1.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(12, 'ENG201', 'Anglais des Affaires & Finance S1', 2, 1, 1, 1, 3, 3, 3, 1, 'UE4 - Communication Commerciale S1', 'Mineure', 'Business_English_Finance.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(13, 'FIN102', 'Comptabilité Analytique & Contrôle de Gestion', 2, 1, 2, 2, 2, 6, 6, 1, 'UE5 - Contrôle & Audit Financier', 'Majeure', 'Comptabilite_Analytique_S2.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(14, 'ECO102', 'Macroéconomie & Systèmes Monétaires', 2, 1, 2, 2, 2, 5, 5, 1, 'UE6 - Macroéconomie & Finance Internationale', 'Majeure', 'Macroeconomie_S2.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(15, 'STA201', 'Statistique Descriptive & Probabilités', 2, 1, 2, 2, 2, 4, 4, 1, 'UE7 - Outils Statistiques de Gestion', 'Mineure', 'Statistiques_Descriptives.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(16, 'ENG202', 'Business Communication & Reporting S2', 2, 1, 2, 2, 3, 3, 3, 1, 'UE8 - Langues & Negociation S2', 'Mineure', 'Business_Reporting_S2.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(17, 'DRT101', 'Introduction au Droit & Droit Civil', 3, 1, 1, 1, 3, 6, 6, 1, 'UE1 - Droit Prive Fondamental', 'Majeure', 'Droit_Civil_Introduction.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(18, 'DRT102', 'Droit Constitutionnel & Institutions Politiques', 3, 1, 1, 1, 3, 5, 5, 1, 'UE2 - Droit Public & Institutions', 'Majeure', 'Droit_Constitutionnel_S1.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(19, 'HIS101', 'Histoire du Droit & des Institutions', 3, 1, 1, 1, 3, 4, 4, 1, 'UE3 - Culture & Histoire Juridique', 'Mineure', 'Histoire_Droit_L1.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(20, 'ENG301', 'Anglais Juridique & Terminologie Legal S1', 3, 1, 1, 1, 3, 3, 3, 1, 'UE4 - Langues Juridiques', 'Mineure', 'Legal_English_S1.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(21, 'DRT103', 'Droit des Obligations & Régime des Contrats', 3, 1, 2, 2, 3, 6, 6, 1, 'UE5 - Droit des Contrats & Obligations', 'Majeure', 'Droit_Obligations_Contrats.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(22, 'DRT104', 'Droit Commercial General & Sociétés OHADA', 3, 1, 2, 2, 3, 5, 5, 1, 'UE6 - Droit des Affaires OHADA', 'Majeure', 'Droit_Commercial_OHADA.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(23, 'DRT105', 'Droit Administratif & Action Publique', 3, 1, 2, 2, 3, 4, 4, 1, 'UE7 - Droit Administratif', 'Mineure', 'Droit_Administratif_S2.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
(24, 'ENG302', 'Legal English & Oral Advocacy S2', 3, 1, 2, 2, 3, 3, 3, 1, 'UE8 - Plaidoyer & Anglais Juridique S2', 'Mineure', 'Legal_Advocacy_S2.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 10. Étudiants
INSERT INTO `etudiants` (`id`, `matricule`, `nom`, `prenom`, `date_naissance`, `lieu_naissance`, `sexe`, `genre`, `nationalite`, `email`, `telephone`, `adresse`, `classe_id`, `filiere_id`, `statut`, `est_bloque`, `statut_compte`, `tuteur_nom`, `tuteur_prenom`, `tuteur_telephone`, `date_inscription`, `mot_de_passe`) VALUES
(1, '2026-MAT-101', 'Traoré', 'Mamadou', '2003-05-14', 'Bamako', 'M', 'M', 'Mali', 'mamadou.traore@usttb.edu.ml', '+223 76 12 34 56', 'Badalabougou, Rue 12, Porte 45', 1, 1, 'Inscrit', 0, 'Actif', 'Traoré', 'Ousmane', '+223 66 12 34 56', '2025-10-05 00:00:00', 'etudiant123'),
(2, '2026-MAT-102', 'Diarra', 'Aïssata', '2004-02-20', 'Sikasso', 'F', 'F', 'Mali', 'aissata.diarra@usttb.edu.ml', '+223 75 98 76 54', 'Faladié, Bamako', 2, 2, 'Inscrit', 0, 'Actif', 'Diarra', 'Brahima', '+223 65 98 76 54', '2025-10-08 00:00:00', 'etudiant123'),
(3, '2026-MAT-103', 'Sangaré', 'Oumar', '2003-11-10', 'Ségou', 'M', 'M', 'Mali', 'oumar.sangare@usttb.edu.ml', '+223 70 44 55 66', 'Hamdallaye ACI 2000, Bamako', 3, 3, 'Inscrit', 0, 'Actif', 'Sangaré', 'Kassim', '+223 60 44 55 66', '2025-10-10 00:00:00', 'etudiant123')
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 11. Inscriptions
INSERT INTO `inscriptions` (`id`, `etudiant_id`, `classe_id`, `filiere_id`, `annee_academique_id`, `annee_academique`, `date_inscription`, `statut`, `frais_inscription`, `type_inscription`, `statut_paiement`, `statut_validation`) VALUES
(1, 1, 1, 1, 1, '2025-2026', '2025-10-05 00:00:00', 'Validée', 350000.00, 'Inscrire', 'Payé', 'Validé'),
(2, 2, 2, 2, 1, '2025-2026', '2025-10-08 00:00:00', 'Validée', 400000.00, 'Inscrire', 'Payé', 'Validé'),
(3, 3, 3, 3, 1, '2025-2026', '2025-10-10 00:00:00', 'Validée', 300000.00, 'Inscrire', 'Payé', 'Validé')
ON DUPLICATE KEY UPDATE `statut`=VALUES(`statut`);

-- 12. Paiements
INSERT INTO `paiements` (`id`, `etudiant_id`, `annee_academique_id`, `filiere_id`, `filiere_code`, `filiere_nom`, `classe_id`, `classe_nom`, `annee_libelle`, `type_frais`, `montant`, `montant_paye`, `reste_a_payer`, `mode_paiement`, `methode`, `reference_recu`, `date_paiement`, `statut`, `remarque`) VALUES
(1, 1, 1, 1, 'IGL', 'Informatique & Génie Logiciel', 1, 'Licence 1 Informatique A', '2025 - 2026', 'Scolarité', 350000.00, 350000.00, 0.00, 'Orange Money', 'Orange Money', 'REC-2025-001', '2025-10-05 00:00:00', 'Complet', 'Payé intégralement à l\'inscription'),
(2, 2, 1, 2, 'FC', 'Finance & Comptabilité', 2, 'Licence 1 Finance A', '2025 - 2026', 'Scolarité', 400000.00, 400000.00, 0.00, 'Moov Money', 'Moov Money', 'REC-2025-002', '2025-10-08 00:00:00', 'Complet', 'Payé intégralement à l\'inscription'),
(3, 3, 1, 3, 'DA', 'Droit des Affaires', 3, 'Licence 1 Droit A', '2025 - 2026', 'Scolarité', 300000.00, 300000.00, 0.00, 'Espèces', 'Espèces', 'REC-2025-003', '2025-10-10 00:00:00', 'Complet', 'Payé intégralement à l\'inscription')
ON DUPLICATE KEY UPDATE `montant_paye`=VALUES(`montant_paye`);

-- 14. Absences
INSERT INTO `absences` (`id`, `etudiant_id`, `matiere_id`, `date_absence`, `heures`, `justifiee`, `motif`) VALUES
(1, 1, 3, '2025-11-12', 2, 1, 'Raison médicale certifiée'),
(2, 2, 10, '2025-12-01', 2, 0, 'Absence non justifiée')
ON DUPLICATE KEY UPDATE `motif`=VALUES(`motif`);

-- 16. Utilisateurs & Administrateurs
INSERT INTO `utilisateurs` (`id`, `nom`, `prenom`, `email`, `mot_de_passe`, `role`, `universite_id`) VALUES
(1, 'Administrateur', 'Principal', 'admin@unigestion.edu.ml', 'admin123', 'ADMIN', 1),
(2, 'Administrateur', 'Système', 'admin', 'admin123', 'ADMIN', 1)
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

INSERT INTO `administrateurs` (`id`, `utilisateur_id`, `nom`, `prenom`, `email`, `telephone`, `role_admin`, `statut`, `universite_id`, `date_creation`) VALUES
(1, 1, 'Administrateur', 'Principal', 'admin@unigestion.edu.ml', '+223 70 00 00 00', 'Administrateur', 'Actif', 1, '2025-01-01'),
(2, 2, 'Administrateur', 'Système', 'admin', '+223 70 00 00 01', 'Administrateur', 'Actif', 1, '2025-01-01')
ON DUPLICATE KEY UPDATE `nom`=VALUES(`nom`);

-- 19. Supports de Cours
INSERT INTO `supports_cours` (`id`, `titre`, `matiere_id`, `filiere_id`, `type_document`, `fichier_url`, `description`, `publie_par`, `date_publication`) VALUES
(1, 'Support de cours Algorithmique & Programmation C', 1, 1, 'PDF', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Bases de l\'algorithmique, boucles, fonctions et pointeurs C.', 'Dr. Sékou Konaté', '2025-10-15'),
(2, 'Guide pratique des requêtes SQL & Modélisation BDD', 2, 1, 'PDF', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Création de tables, requêtes SELECT, JOIN et sous-requêtes SQL.', 'Dr. Sékou Konaté', '2025-10-20')
ON DUPLICATE KEY UPDATE `titre`=VALUES(`titre`);

-- 20. Notifications
INSERT INTO `notifications` (`id`, `destinateur_type`, `destinateur_id`, `titre`, `message`, `type_alerte`, `lu`) VALUES
(1, 'ALL', NULL, 'Bienvenue sur UniGestion', 'Système de gestion universitaire opérationnel.', 'INFO', 1)
ON DUPLICATE KEY UPDATE `titre`=VALUES(`titre`);

-- 23. Paramètres
INSERT INTO `parametres` (`cle`, `valeur`, `description`) VALUES
('global_student_lock', 'false', 'Verrouille totalement l\'accès à l\'espace étudiant')
ON DUPLICATE KEY UPDATE `valeur`=VALUES(`valeur`);

SET FOREIGN_KEY_CHECKS = 1;
