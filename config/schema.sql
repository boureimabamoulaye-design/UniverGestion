-- =========================================================
-- APPLICATION DE GESTION SCOLAIRE UNIVERSITAIRE DU MALI
-- Base de données : universite
-- Compatible MySQL 5.7+ / 8.0+ (WAMP, XAMPP, LAMP)
-- =========================================================

CREATE DATABASE IF NOT EXISTS `universite` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `universite`;

-- 1. Table: universites
CREATE TABLE IF NOT EXISTS `universites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `nom` VARCHAR(255) NOT NULL,
  `sigle` VARCHAR(50) NOT NULL,
  `adresse` VARCHAR(255) DEFAULT NULL,
  `ville` VARCHAR(100) DEFAULT 'Bamako',
  `pays` VARCHAR(100) DEFAULT 'Mali',
  `telephone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: facultes
CREATE TABLE IF NOT EXISTS `facultes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `universite_id` INT NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `nom` VARCHAR(255) NOT NULL,
  `doyen` VARCHAR(150) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`universite_id`) REFERENCES `universites`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: filieres
CREATE TABLE IF NOT EXISTS `filieres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `faculte_id` INT NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `nom` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `domaine` VARCHAR(100) DEFAULT NULL,
  `duree_annees` INT DEFAULT 3,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`faculte_id`) REFERENCES `facultes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: niveaux
CREATE TABLE IF NOT EXISTS `niveaux` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filiere_id` INT NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `diplome_vise` VARCHAR(100) DEFAULT 'Licence',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: annees_academiques
CREATE TABLE IF NOT EXISTS `annees_academiques` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `libelle` VARCHAR(100) NOT NULL,
  `date_debut` DATE NOT NULL,
  `date_fin` DATE NOT NULL,
  `est_active` TINYINT(1) DEFAULT 0,
  `est_archivee` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table: classes
CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `niveau_id` INT NOT NULL,
  `annee_academique_id` INT NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `capacite` INT DEFAULT 60,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`niveau_id`) REFERENCES `niveaux`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`annee_academique_id`) REFERENCES `annees_academiques`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table: enseignants
CREATE TABLE IF NOT EXISTS `enseignants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `matricule` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `titre` VARCHAR(100) DEFAULT 'Docteur',
  `email` VARCHAR(100) NOT NULL,
  `telephone` VARCHAR(30) DEFAULT NULL,
  `specialite` VARCHAR(150) DEFAULT NULL,
  `universite_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`universite_id`) REFERENCES `universites`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Table: etudiants
CREATE TABLE IF NOT EXISTS `etudiants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `matricule` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `date_naissance` DATE NOT NULL,
  `lieu_naissance` VARCHAR(100) NOT NULL,
  `sexe` ENUM('M', 'F') NOT NULL,
  `nationalite` VARCHAR(50) DEFAULT 'Mali',
  `email` VARCHAR(100) NOT NULL,
  `telephone` VARCHAR(30) DEFAULT NULL,
  `adresse` VARCHAR(255) DEFAULT NULL,
  `classe_id` INT NOT NULL,
  `date_inscription` DATE NOT NULL,
  `statut` ENUM('Régulier', 'Inscrit', 'Suspendu', 'Diplômé') DEFAULT 'Inscrit',
  `mot_de_passe` VARCHAR(255) NOT NULL,
  `photo_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`classe_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Table: semestres
CREATE TABLE IF NOT EXISTS `semestres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL,
  `libelle` VARCHAR(50) NOT NULL,
  `niveau_id` INT NOT NULL,
  `ordre` INT DEFAULT 1,
  FOREIGN KEY (`niveau_id`) REFERENCES `niveaux`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Table: matieres
CREATE TABLE IF NOT EXISTS `matieres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `filiere_id` INT NOT NULL,
  `niveau_id` INT NOT NULL,
  `semestre_id` INT NOT NULL,
  `enseignant_id` INT DEFAULT NULL,
  `credits` INT DEFAULT 3,
  `coefficient` INT DEFAULT 1,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`niveau_id`) REFERENCES `niveaux`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`semestre_id`) REFERENCES `semestres`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`enseignant_id`) REFERENCES `enseignants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Table: inscriptions
CREATE TABLE IF NOT EXISTS `inscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `classe_id` INT NOT NULL,
  `annee_academique_id` INT NOT NULL,
  `date_inscription` DATE NOT NULL,
  `statut` ENUM('Validée', 'En attente', 'Annulée') DEFAULT 'Validée',
  `frais_inscription` DECIMAL(10,2) DEFAULT 50000.00,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`classe_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`annee_academique_id`) REFERENCES `annees_academiques`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Table: notes
CREATE TABLE IF NOT EXISTS `notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `matiere_id` INT NOT NULL,
  `semestre_id` INT NOT NULL,
  `annee_academique_id` INT NOT NULL,
  `note_cc` DECIMAL(4,2) DEFAULT 0.00,
  `note_examen` DECIMAL(4,2) DEFAULT 0.00,
  `note_finale` DECIMAL(4,2) DEFAULT 0.00,
  `appreciation` VARCHAR(100) DEFAULT NULL,
  `modifie_par` VARCHAR(100) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`matiere_id`) REFERENCES `matieres`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`semestre_id`) REFERENCES `semestres`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`annee_academique_id`) REFERENCES `annees_academiques`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Table: absences
CREATE TABLE IF NOT EXISTS `absences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `matiere_id` INT NOT NULL,
  `date_absence` DATE NOT NULL,
  `heures` INT DEFAULT 2,
  `justifiee` TINYINT(1) DEFAULT 0,
  `motif` TEXT DEFAULT NULL,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`matiere_id`) REFERENCES `matieres`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Table: bulletins
CREATE TABLE IF NOT EXISTS `bulletins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `classe_id` INT NOT NULL,
  `semestre_id` INT NOT NULL,
  `annee_academique_id` INT NOT NULL,
  `moyenne` DECIMAL(4,2) NOT NULL,
  `total_credits` INT DEFAULT 0,
  `decision` ENUM('Admis', 'Ajourné', 'Compensé', 'En attente') DEFAULT 'Admis',
  `mention` ENUM('Passable', 'Assez Bien', 'Bien', 'Très Bien', 'N/A') DEFAULT 'Passable',
  `rang` INT DEFAULT 1,
  `date_generation` DATE NOT NULL,
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`classe_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`semestre_id`) REFERENCES `semestres`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`annee_academique_id`) REFERENCES `annees_academiques`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Table: paiements
CREATE TABLE IF NOT EXISTS `paiements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `etudiant_id` INT NOT NULL,
  `annee_academique_id` INT NOT NULL,
  `type_frais` ENUM('Inscription', 'Scolarité', 'Examen', 'Autre') DEFAULT 'Scolarité',
  `montant` DECIMAL(12,2) NOT NULL,
  `montant_paye` DECIMAL(12,2) NOT NULL,
  `reste_a_payer` DECIMAL(12,2) NOT NULL,
  `mode_paiement` ENUM('Espèces', 'Orange Money', 'Moov Money', 'Virement', 'Chèque') DEFAULT 'Orange Money',
  `reference_recu` VARCHAR(100) NOT NULL UNIQUE,
  `date_paiement` DATE NOT NULL,
  `statut` ENUM('Complet', 'Partiel', 'En retard', 'En attente') DEFAULT 'Complet',
  FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`annee_academique_id`) REFERENCES `annees_academiques`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Table: utilisateurs
CREATE TABLE IF NOT EXISTS `utilisateurs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `mot_de_passe` VARCHAR(255) NOT NULL,
  `role` ENUM('Administrateur', 'Gestionnaire', 'Comptable', 'Enseignant', 'Étudiant') DEFAULT 'Administrateur',
  `universite_id` INT NOT NULL,
  `dernier_acces` DATETIME DEFAULT NULL,
  FOREIGN KEY (`universite_id`) REFERENCES `universites`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Table: administrateurs
CREATE TABLE IF NOT EXISTS `administrateurs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `telephone` VARCHAR(30) DEFAULT NULL,
  `role_admin` VARCHAR(50) DEFAULT 'Super Admin',
  FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Table: autorisations_filieres
CREATE TABLE IF NOT EXISTS `autorisations_filieres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT NOT NULL,
  `filiere_id` INT NOT NULL,
  `droit_acces` ENUM('Lecture', 'Écriture', 'Total') DEFAULT 'Total',
  FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`filiere_id`) REFERENCES `filieres`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Table: historique_acces
CREATE TABLE IF NOT EXISTS `historique_acces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT DEFAULT NULL,
  `etudiant_id` INT DEFAULT NULL,
  `ip_adresse` VARCHAR(50) DEFAULT '127.0.0.1',
  `event_type` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Table: notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `destinateur_type` ENUM('ALL', 'ETUDIANT', 'ADMIN') DEFAULT 'ALL',
  `destinateur_id` INT DEFAULT NULL,
  `titre` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type_alerte` ENUM('SUCCESS', 'WARNING', 'ERROR', 'INFO') DEFAULT 'INFO',
  `lu` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- JEU DE DONNÉES INITIALES (DEMO MALI)
-- =========================================================

INSERT INTO `universites` (`id`, `code`, `nom`, `sigle`, `adresse`, `ville`, `pays`, `telephone`, `email`) VALUES
(1, 'USTTB', 'Université des Sciences, des Techniques et des Technologies de Bamako', 'USTTB', 'Colline de Badalabougou', 'Bamako', 'Mali', '+223 20 22 32 44', 'contact@usttb.edu.ml'),
(2, 'ULSHB', 'Université des Lettres et des Sciences Humaines de Bamako', 'ULSHB', 'Kabala', 'Bamako', 'Mali', '+223 20 23 11 00', 'info@ulshb.edu.ml'),
(3, 'USJPB', 'Université des Sciences Juridiques et Politiques de Bamako', 'USJPB', 'Badalabougou', 'Bamako', 'Mali', '+223 20 21 88 55', 'contact@usjpb.edu.ml');

INSERT INTO `facultes` (`id`, `universite_id`, `code`, `nom`, `doyen`, `description`) VALUES
(1, 1, 'FST', 'Faculté des Sciences et Techniques', 'Prof. Mahamadou Traoré', 'Informatique, mathématiques et sciences appliquées'),
(2, 1, 'FMOS', 'Faculté de Médecine et d’Odontostomatologie', 'Prof. Seydou Coulibaly', 'Santé et médecine'),
(3, 3, 'FSJP', 'Faculté de Droit Privé', 'Dr. Ousmane Diarra', 'Droit civil et des affaires');

INSERT INTO `filieres` (`id`, `faculte_id`, `code`, `nom`, `description`, `domaine`, `duree_annees`) VALUES
(1, 1, 'INFO', 'Génie Informatique & Systèmes', 'Développement logiciel, réseaux et sécurité', 'Sciences & Technologies', 3),
(2, 1, 'MATH', 'Mathématiques Appliquées', 'Statistiques et modélisation', 'Sciences Exactes', 3),
(3, 3, 'DROIT-PRIV', 'Droit Privé & des Affaires', 'Droit commercial et contentieux', 'Droit & Politique', 3);

INSERT INTO `niveaux` (`id`, `filiere_id`, `code`, `nom`, `diplome_vise`) VALUES
(1, 1, 'L1', 'Licence 1 - Informatique', 'Licence'),
(2, 1, 'L2', 'Licence 2 - Informatique', 'Licence'),
(3, 1, 'L3', 'Licence 3 - Informatique', 'Licence');

INSERT INTO `annees_academiques` (`id`, `code`, `libelle`, `date_debut`, `date_fin`, `est_active`, `est_archivee`) VALUES
(1, '2023-2024', 'Année Académique 2023 - 2024', '2023-10-01', '2024-07-31', 0, 1),
(2, '2024-2025', 'Année Académique 2024 - 2025', '2024-10-01', '2025-07-31', 1, 0);

INSERT INTO `classes` (`id`, `niveau_id`, `annee_academique_id`, `code`, `nom`, `capacite`) VALUES
(1, 1, 2, 'L1-INFO-A', 'Licence 1 Informatique - Section A', 60),
(2, 2, 2, 'L2-INFO-A', 'Licence 2 Informatique - Section A', 50);

INSERT INTO `utilisateurs` (`id`, `nom`, `prenom`, `email`, `mot_de_passe`, `role`, `universite_id`) VALUES
(1, 'Diakité', 'Sékou', 'admin@unigestion.edu.ml', '$2y$10$e.PqM6v0NqI5aJkM4f/eSuJ9x.A.kG3M1iJ.f9yN1j/4k2m.3b.2u', 'Administrateur', 1);

INSERT INTO `administrateurs` (`id`, `utilisateur_id`, `nom`, `prenom`, `email`, `telephone`, `role_admin`) VALUES
(1, 1, 'Diakité', 'Sékou', 'admin@unigestion.edu.ml', '+223 70 00 11 22', 'Super Admin');

INSERT INTO `etudiants` (`id`, `matricule`, `nom`, `prenom`, `date_naissance`, `lieu_naissance`, `sexe`, `nationalite`, `email`, `telephone`, `adresse`, `classe_id`, `date_inscription`, `statut`, `mot_de_passe`) VALUES
(1, '2024-USTTB-001', 'Coulibaly', 'Moussa', '2003-05-14', 'Bamako', 'M', 'Mali', 'moussa.coulibaly@etudiant.usttb.edu.ml', '+223 78 11 22 33', 'Badalabougou', 1, '2024-10-05', 'Inscrit', '$2y$10$e.PqM6v0NqI5aJkM4f/eSuJ9x.A.kG3M1iJ.f9yN1j/4k2m.3b.2u');
