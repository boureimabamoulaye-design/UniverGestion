import {
  Universite,
  Faculte,
  Filiere,
  Niveau,
  Classe,
  AnneeAcademique,
  Etudiant,
  Enseignant,
  Semestre,
  Matiere,
  Inscription,
  Note,
  Absence,
  Bulletin,
  Paiement,
  Utilisateur,
  Administrateur,
  NotificationAlerte,
  HistoriqueAcces,
  SupportCours
} from '../types/database';

export const INITIAL_UNIVERSITES: Universite[] = [
  {
    id: 1,
    code: 'USTTB',
    nom: 'Université des Sciences, des Techniques et des Technologies',
    sigle: 'USTTB',
    adresse: 'Badalabougou',
    ville: 'Bamako',
    pays: 'Mali',
    telephone: '+223 20 22 33 44',
    email: 'contact@usttb.edu.ml'
  }
];

export const INITIAL_FACULTES: Faculte[] = [
  {
    id: 1,
    universite_id: 1,
    code: 'FST',
    nom: 'Faculté des Sciences et Techniques',
    doyen: 'Prof. Amadou Diallo',
    description: 'Faculté principale pour les sciences appliquées, informatique et gestion.'
  }
];

export const INITIAL_FILIERES: Filiere[] = [
  {
    id: 1,
    faculte_id: 1,
    code: 'IGL',
    nom: 'Informatique & Génie Logiciel',
    description: 'Formation en développement logiciel, bases de données et ingénierie informatique.',
    domaine: 'Sciences & Technologies',
    duree_annees: 3
  },
  {
    id: 2,
    faculte_id: 1,
    code: 'FC',
    nom: 'Finance & Comptabilité',
    description: 'Formation en gestion financière, comptabilité générale et contrôle de gestion.',
    domaine: 'Gestion & Économie',
    duree_annees: 3
  },
  {
    id: 3,
    faculte_id: 1,
    code: 'DA',
    nom: 'Droit des Affaires',
    description: 'Formation juridique axée sur le droit des affaires, des contrats et des sociétés.',
    domaine: 'Droit & Sciences Politiques',
    duree_annees: 3
  }
];

export const INITIAL_NIVEAUX: Niveau[] = [
  { id: 1, filiere_id: 1, code: 'L1', nom: 'Licence 1', diplome_vise: 'Licence' },
  { id: 2, filiere_id: 1, code: 'L2', nom: 'Licence 2', diplome_vise: 'Licence' },
  { id: 3, filiere_id: 1, code: 'L3', nom: 'Licence 3', diplome_vise: 'Licence' }
];

export const INITIAL_ANNEES_ACADEMIQUES: AnneeAcademique[] = [
  { id: 1, code: '2025-2026', libelle: 'Année Académique 2025 - 2026', date_debut: '2025-10-01', date_fin: '2026-07-31', est_active: true, est_archivee: false }
];

export const INITIAL_CLASSES: Classe[] = [
  { id: 1, code: 'L1-IGL-A', nom: 'Licence 1 Informatique A', filiere_id: 1, niveau_id: 1, capacite: 50, annee_academique_id: 1 },
  { id: 2, code: 'L1-FC-A', nom: 'Licence 1 Finance A', filiere_id: 2, niveau_id: 1, capacite: 60, annee_academique_id: 1 }
];

export const INITIAL_ENSEIGNANTS: Enseignant[] = [
  { id: 1, matricule: 'ENS202601', nom: 'Konaté', prenom: 'Sékou', titre: 'Dr.', email: 's.konate@usttb.edu.ml', telephone: '+223 76 11 22 33', specialite: 'Algorithmique & Génie Logiciel', universite_id: 1 },
  { id: 2, matricule: 'ENS202602', nom: 'Coulibaly', prenom: 'Mariam', titre: 'Prof.', email: 'm.coulibaly@usttb.edu.ml', telephone: '+223 66 44 55 66', specialite: 'Finance d\'Entreprise & Analyse', universite_id: 1 },
  { id: 3, matricule: 'ENS202603', nom: 'Sangaré', prenom: 'Ibrahim', titre: 'Dr.', email: 'i.sangare@usttb.edu.ml', telephone: '+223 70 88 99 00', specialite: 'Droit Privé & des Affaires', universite_id: 1 }
];

export const INITIAL_SEMESTRES: Semestre[] = [
  { id: 1, code: 'S1', libelle: 'Semestre 1', niveau_id: 1, ordre: 1 },
  { id: 2, code: 'S2', libelle: 'Semestre 2', niveau_id: 1, ordre: 2 },
  { id: 3, code: 'S3', libelle: 'Semestre 3', niveau_id: 2, ordre: 3 },
  { id: 4, code: 'S4', libelle: 'Semestre 4', niveau_id: 2, ordre: 4 }
];

export const INITIAL_MATIERES: Matiere[] = [
  {
    id: 1,
    code: 'INF101',
    nom: 'Algorithmique & Programmation C',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 1,
    credits: 6,
    ue_nom: 'UE1 - Informatique Fondamentale & Algorithmique',
    ue_type: 'Majeure',
    support_fichier_nom: 'Support_Cours_Algorithme_C_L1.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 2,
    code: 'INF102',
    nom: 'Base de Données Relationnelles & SQL',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 1,
    credits: 5,
    ue_nom: 'UE2 - Ingénierie des Données & Systèmes',
    ue_type: 'Majeure',
    support_fichier_nom: 'Cours_SQL_PostgreSQL_2026.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 3,
    code: 'FIN101',
    nom: 'Comptabilité Générale & Analyse',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 2,
    credits: 4,
    ue_nom: 'UE3 - Gestion & Économie d\'Entreprise',
    ue_type: 'Mineure',
    support_fichier_nom: 'Fiche_Exercices_Comptabilite.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 4,
    code: 'DRT101',
    nom: 'Droit du Numérique & Anglais Technique',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 3,
    credits: 3,
    ue_nom: 'UE4 - Culture Générale & Langues Transversales',
    ue_type: 'Mineure',
    support_fichier_nom: 'Manuel_Droit_Obligations.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

export const INITIAL_ETUDIANTS: Etudiant[] = [
  {
    id: 1,
    matricule: '2024-USTTB-001',
    nom: 'Traoré',
    prenom: 'Mamadou',
    email: 'm.traore@usttb.edu.ml',
    telephone: '+223 76 00 11 22',
    adresse: 'Hamdallaye ACI 2000, Bamako',
    date_naissance: '2003-05-12',
    lieu_naissance: 'Bamako',
    sexe: 'M',
    statut: 'Inscrit',
    nationalite: 'Malienne',
    classe_id: 1,
    date_inscription: '2025-10-01',
    mot_de_passe: 'etudiant123',
    tuteur_nom: 'Traoré',
    tuteur_prenom: 'Ibrahima',
    tuteur_telephone: '+223 66 12 34 56',
    statut_compte: 'Actif',
    est_bloque: false
  }
];

export const INITIAL_INSCRIPTIONS: Inscription[] = [
  {
    id: 1,
    etudiant_id: 1,
    classe_id: 1,
    annee_academique_id: 1,
    date_inscription: '2024-11-01',
    statut: 'Validée',
    frais_inscription: 550000
  },
  {
    id: 2,
    etudiant_id: 1,
    classe_id: 2,
    annee_academique_id: 1,
    date_inscription: '2025-11-14',
    statut: 'Validée',
    frais_inscription: 450000
  }
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 1,
    etudiant_id: 1,
    matiere_id: 1,
    semestre_id: 1,
    annee_academique_id: 1,
    note_cc: 14,
    note_examen: 15,
    note_finale: 14.7,
    appreciation: 'Très bon travail'
  },
  {
    id: 2,
    etudiant_id: 1,
    matiere_id: 2,
    semestre_id: 1,
    annee_academique_id: 1,
    note_cc: 13,
    note_examen: 14,
    note_finale: 13.7,
    appreciation: 'Satisfaisant'
  },
  {
    id: 3,
    etudiant_id: 1,
    matiere_id: 3,
    semestre_id: 1,
    annee_academique_id: 1,
    note_cc: 12,
    note_examen: 13,
    note_finale: 12.7,
    appreciation: 'Assez bien'
  },
  {
    id: 4,
    etudiant_id: 1,
    matiere_id: 4,
    semestre_id: 1,
    annee_academique_id: 1,
    note_cc: 15,
    note_examen: 16,
    note_finale: 15.7,
    appreciation: 'Très bien'
  }
];

export const INITIAL_ABSENCES: Absence[] = [
  {
    id: 1,
    etudiant_id: 1,
    matiere_id: 1,
    date_absence: '2026-01-18',
    heures: 2,
    justifiee: false,
    motif: 'Absence aux TP'
  }
];

export const INITIAL_BULLETINS: Bulletin[] = [
  {
    id: 1,
    etudiant_id: 1,
    classe_id: 1,
    semestre_id: 1,
    annee_academique_id: 1,
    moyenne: 14.2,
    total_credits: 18,
    decision: 'Admis',
    mention: 'Bien',
    rang: 1,
    date_generation: '2026-02-15'
  }
];

export const INITIAL_PAIEMENTS: Paiement[] = [
  {
    id: 1,
    etudiant_id: 1,
    annee_academique_id: 1,
    filiere_code: 'IG1',
    annee_libelle: '2024 - 2025',
    type_frais: 'Scolarité',
    montant: 550000,
    montant_paye: 550000,
    reste_a_payer: 0,
    mode_paiement: 'Virement',
    reference_recu: 'REC-2024-5501',
    date_paiement: '2024-11-01',
    statut: 'Complet'
  },
  {
    id: 2,
    etudiant_id: 1,
    annee_academique_id: 1,
    filiere_code: 'IG2',
    annee_libelle: '2025 - 2026',
    type_frais: 'Scolarité',
    montant: 450000,
    montant_paye: 300000,
    reste_a_payer: 150000,
    mode_paiement: 'Orange Money',
    reference_recu: 'REC-2025-3002',
    date_paiement: '14/11/2025',
    statut: 'Partiel'
  },
  {
    id: 3,
    etudiant_id: 1,
    annee_academique_id: 1,
    filiere_code: 'IG2',
    annee_libelle: '2025 - 2026',
    type_frais: 'Scolarité',
    montant: 150000,
    montant_paye: 150000,
    reste_a_payer: 0,
    mode_paiement: 'Espèces',
    reference_recu: 'REC-2026-1503',
    date_paiement: '18/06/2026',
    statut: 'Complet'
  }
];

export const INITIAL_SUPPORTS_COURS: SupportCours[] = [
  {
    id: 1,
    titre: 'Support de Cours - Algorithmique et Algorithmes Tri',
    type_document: 'PDF',
    matiere_id: 1,
    filiere_id: 1,
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Cours complet couvrant les structures conditionnelles, les boucles et les algorithmes de tri (Tri à bulles, Tri fusion).',
    publie_par: 'Dr. Sékou Konaté',
    date_publication: '2026-02-10'
  },
  {
    id: 2,
    titre: 'Diaporama - Modélisation Conceptuelle Merise & SQL',
    type_document: 'Diaporama PPT',
    matiere_id: 2,
    filiere_id: 1,
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Présentation PPT sur la conception de bases de données relationnelles, MCD/MLD et requêtes SQL d\'agrégation.',
    publie_par: 'Dr. Sékou Konaté',
    date_publication: '2026-02-15'
  },
  {
    id: 3,
    titre: 'Fiche TP - Travaux Pratiques Comptabilité SYSCOHADA',
    type_document: 'Fiche TP/TD',
    matiere_id: 3,
    filiere_id: 2,
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Exercices d\'entraînement sur la balance des comptes, le bilan annuel et le compte de résultat conformément au plan comptable.',
    publie_par: 'Prof. Mariam Coulibaly',
    date_publication: '2026-03-01'
  },
  {
    id: 4,
    titre: 'Manuel d\'Introduction au Droit des Contrats',
    type_document: 'PDF',
    matiere_id: 4,
    filiere_id: 3,
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Guide juridique synthétique récapitulant les principes fondamentaux du droit des contrats et des obligations.',
    publie_par: 'Me. Ibrahim Sangaré',
    date_publication: '2026-03-05'
  }
];

export const INITIAL_UTILISATEURS: Utilisateur[] = [
  {
    id: 1,
    nom: 'Diakité',
    prenom: 'Sékou',
    email: 'admin@unigestion.edu.ml',
    mot_de_passe: 'admin123',
    role: 'Administrateur',
    universite_id: 1,
    dernier_acces: '2026-08-05 14:00'
  }
];

export const INITIAL_ADMINISTRATEURS: Administrateur[] = [
  {
    id: 1,
    utilisateur_id: 1,
    nom: 'Diakité',
    prenom: 'Sékou',
    email: 'admin@unigestion.edu.ml',
    telephone: '+223 70 00 11 22',
    role_admin: 'Super Admin'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationAlerte[] = [];

export const INITIAL_HISTORIQUE: HistoriqueAcces[] = [];
