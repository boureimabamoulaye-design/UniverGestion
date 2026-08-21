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
    email: 'contact@usttb.edu.ml',
    logo_url: '/src/assets/images/university_logo_1786282800707.jpg'
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
    duree_annees: 3,
    frais_scolarite: 350000,
    statut: 'Actif'
  },
  {
    id: 2,
    faculte_id: 1,
    code: 'FC',
    nom: 'Finance & Comptabilité',
    description: 'Formation en gestion financière, comptabilité générale et contrôle de gestion.',
    domaine: 'Gestion & Économie',
    duree_annees: 3,
    frais_scolarite: 400000,
    statut: 'Actif'
  },
  {
    id: 3,
    faculte_id: 1,
    code: 'DA',
    nom: 'Droit des Affaires',
    description: 'Formation juridique axée sur le droit des affaires, des contrats et des sociétés.',
    domaine: 'Droit & Sciences Politiques',
    duree_annees: 3,
    frais_scolarite: 300000,
    statut: 'Actif'
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
  { id: 2, code: 'L1-FC-A', nom: 'Licence 1 Finance A', filiere_id: 2, niveau_id: 1, capacite: 60, annee_academique_id: 1 },
  { id: 3, code: 'L1-DA-A', nom: 'Licence 1 Droit A', filiere_id: 3, niveau_id: 1, capacite: 50, annee_academique_id: 1 }
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
  // Filière 1: Informatique & Génie Logiciel
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
    support_fichier_nom: 'Cours_SQL_Universite_2026.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 3,
    code: 'MAT101',
    nom: 'Mathématiques Discrètes & Algèbre',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 2,
    credits: 4,
    ue_nom: 'UE3 - Mathématiques pour l\'Informatique',
    ue_type: 'Mineure',
    support_fichier_nom: 'Fiche_Exercices_Algebres.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 4,
    code: 'ENG101',
    nom: 'Anglais Technique & Communication S1',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 3,
    credits: 3,
    ue_nom: 'UE4 - Culture Générale & Langues Transversales',
    ue_type: 'Mineure',
    support_fichier_nom: 'Anglais_Informatique_S1.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 5,
    code: 'INF103',
    nom: 'Développement Web & POO (Java/TypeScript)',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 1,
    credits: 6,
    ue_nom: 'UE5 - Genie Logiciel & Web',
    ue_type: 'Majeure',
    support_fichier_nom: 'Cours_POO_Java_L1_S2.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 6,
    code: 'INF104',
    nom: 'Systèmes d\'Exploitation & Réseaux',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 1,
    credits: 5,
    ue_nom: 'UE6 - Architecture & Réseaux',
    ue_type: 'Majeure',
    support_fichier_nom: 'Reseaux_Cisco_Basics.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 7,
    code: 'MAT102',
    nom: 'Mathématiques Appliquées & Probabilités',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 2,
    credits: 4,
    ue_nom: 'UE7 - Mathématiques pour l\'Informatique S2',
    ue_type: 'Mineure',
    support_fichier_nom: 'Proba_Statistiques_S2.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 8,
    code: 'ENG102',
    nom: 'Anglais Professionnel & Expression S2',
    filiere_id: 1,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 3,
    credits: 3,
    ue_nom: 'UE8 - Langues & Communication S2',
    ue_type: 'Mineure',
    support_fichier_nom: 'Anglais_Technique_S2.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },

  // Filière 2: Finance & Comptabilité
  {
    id: 9,
    code: 'FIN101',
    nom: 'Comptabilité Générale I & SYSCOHADA',
    filiere_id: 2,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 2,
    credits: 6,
    ue_nom: 'UE1 - Comptabilité & Gestion Financière',
    ue_type: 'Majeure',
    support_fichier_nom: 'Comptabilite_Générale_SYSCOHADA.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 10,
    code: 'ECO101',
    nom: 'Microéconomie & Analyse des Marchés',
    filiere_id: 2,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 2,
    credits: 5,
    ue_nom: 'UE2 - Économie Générale & Analyse',
    ue_type: 'Majeure',
    support_fichier_nom: 'Microeconomie_Cours_L1.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 11,
    code: 'MAT201',
    nom: 'Mathématiques Financières & Emprunts',
    filiere_id: 2,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 2,
    credits: 4,
    ue_nom: 'UE3 - Quantitatif & Finance',
    ue_type: 'Mineure',
    support_fichier_nom: 'Maths_Financieres_L1.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 12,
    code: 'ENG201',
    nom: 'Anglais des Affaires & Finance S1',
    filiere_id: 2,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 3,
    credits: 3,
    ue_nom: 'UE4 - Communication Commerciale S1',
    ue_type: 'Mineure',
    support_fichier_nom: 'Business_English_Finance.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 13,
    code: 'FIN102',
    nom: 'Comptabilité Analytique & Contrôle de Gestion',
    filiere_id: 2,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 2,
    credits: 6,
    ue_nom: 'UE5 - Contrôle & Audit Financier',
    ue_type: 'Majeure',
    support_fichier_nom: 'Comptabilite_Analytique_S2.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 14,
    code: 'ECO102',
    nom: 'Macroéconomie & Systèmes Monétaires',
    filiere_id: 2,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 2,
    credits: 5,
    ue_nom: 'UE6 - Macroéconomie & Finance Internationale',
    ue_type: 'Majeure',
    support_fichier_nom: 'Macroeconomie_S2.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 15,
    code: 'STA201',
    nom: 'Statistique Descriptive & Probabilités',
    filiere_id: 2,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 2,
    credits: 4,
    ue_nom: 'UE7 - Outils Statistiques de Gestion',
    ue_type: 'Mineure',
    support_fichier_nom: 'Statistiques_Descriptives.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 16,
    code: 'ENG202',
    nom: 'Business Communication & Reporting S2',
    filiere_id: 2,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 3,
    credits: 3,
    ue_nom: 'UE8 - Langues & Negociation S2',
    ue_type: 'Mineure',
    support_fichier_nom: 'Business_Reporting_S2.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },

  // Filière 3: Droit des Affaires
  {
    id: 17,
    code: 'DRT101',
    nom: 'Introduction au Droit & Droit Civil',
    filiere_id: 3,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 3,
    credits: 6,
    ue_nom: 'UE1 - Droit Prive Fondamental',
    ue_type: 'Majeure',
    support_fichier_nom: 'Droit_Civil_Introduction.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 18,
    code: 'DRT102',
    nom: 'Droit Constitutionnel & Institutions Politiques',
    filiere_id: 3,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 3,
    credits: 5,
    ue_nom: 'UE2 - Droit Public & Institutions',
    ue_type: 'Majeure',
    support_fichier_nom: 'Droit_Constitutionnel_S1.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 19,
    code: 'HIS101',
    nom: 'Histoire du Droit & des Institutions',
    filiere_id: 3,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 3,
    credits: 4,
    ue_nom: 'UE3 - Culture & Histoire Juridique',
    ue_type: 'Mineure',
    support_fichier_nom: 'Histoire_Droit_L1.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 20,
    code: 'ENG301',
    nom: 'Anglais Juridique & Terminologie Legal S1',
    filiere_id: 3,
    niveau_id: 1,
    semestre_id: 1,
    enseignant_id: 3,
    credits: 3,
    ue_nom: 'UE4 - Langues Juridiques',
    ue_type: 'Mineure',
    support_fichier_nom: 'Legal_English_S1.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 21,
    code: 'DRT103',
    nom: 'Droit des Obligations & Régime des Contrats',
    filiere_id: 3,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 3,
    credits: 6,
    ue_nom: 'UE5 - Droit des Contrats & Obligations',
    ue_type: 'Majeure',
    support_fichier_nom: 'Droit_Obligations_Contrats.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 22,
    code: 'DRT104',
    nom: 'Droit Commercial General & Sociétés OHADA',
    filiere_id: 3,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 3,
    credits: 5,
    ue_nom: 'UE6 - Droit des Affaires OHADA',
    ue_type: 'Majeure',
    support_fichier_nom: 'Droit_Commercial_OHADA.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 23,
    code: 'DRT105',
    nom: 'Droit Administratif & Action Publique',
    filiere_id: 3,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 3,
    credits: 4,
    ue_nom: 'UE7 - Droit Administratif',
    ue_type: 'Mineure',
    support_fichier_nom: 'Droit_Administratif_S2.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 24,
    code: 'ENG302',
    nom: 'Legal English & Oral Advocacy S2',
    filiere_id: 3,
    niveau_id: 1,
    semestre_id: 2,
    enseignant_id: 3,
    credits: 3,
    ue_nom: 'UE8 - Plaidoyer & Anglais Juridique S2',
    ue_type: 'Mineure',
    support_fichier_nom: 'Legal_Advocacy_S2.pdf',
    support_fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

export const INITIAL_ETUDIANTS: Etudiant[] = [
  {
    id: 1,
    matricule: '2026-MAT-101',
    nom: 'Traoré',
    prenom: 'Mamadou',
    date_naissance: '2003-05-14',
    lieu_naissance: 'Bamako',
    sexe: 'M',
    nationalite: 'Mali',
    email: 'mamadou.traore@usttb.edu.ml',
    telephone: '+223 76 12 34 56',
    adresse: 'Badalabougou, Rue 12, Porte 45',
    classe_id: 1,
    filiere_id: 1,
    statut: 'Inscrit',
    est_bloque: false,
    statut_compte: 'Actif',
    tuteur_nom: 'Traoré',
    tuteur_prenom: 'Ousmane',
    tuteur_telephone: '+223 66 12 34 56',
    date_inscription: '2025-10-05',
    mot_de_passe: 'etudiant123'
  },
  {
    id: 2,
    matricule: '2026-MAT-102',
    nom: 'Diarra',
    prenom: 'Aïssata',
    date_naissance: '2004-02-20',
    lieu_naissance: 'Sikasso',
    sexe: 'F',
    nationalite: 'Mali',
    email: 'aissata.diarra@usttb.edu.ml',
    telephone: '+223 75 98 76 54',
    adresse: 'Faladié, Bamako',
    classe_id: 2,
    filiere_id: 2,
    statut: 'Inscrit',
    est_bloque: false,
    statut_compte: 'Actif',
    tuteur_nom: 'Diarra',
    tuteur_prenom: 'Brahima',
    tuteur_telephone: '+223 65 98 76 54',
    date_inscription: '2025-10-08',
    mot_de_passe: 'etudiant123'
  },
  {
    id: 3,
    matricule: '2026-MAT-103',
    nom: 'Sangaré',
    prenom: 'Oumar',
    date_naissance: '2003-11-10',
    lieu_naissance: 'Ségou',
    sexe: 'M',
    nationalite: 'Mali',
    email: 'oumar.sangare@usttb.edu.ml',
    telephone: '+223 70 44 55 66',
    adresse: 'Hamdallaye ACI 2000, Bamako',
    classe_id: 3,
    filiere_id: 3,
    statut: 'Inscrit',
    est_bloque: false,
    statut_compte: 'Actif',
    tuteur_nom: 'Sangaré',
    tuteur_prenom: 'Kassim',
    tuteur_telephone: '+223 60 44 55 66',
    date_inscription: '2025-10-10',
    mot_de_passe: 'etudiant123'
  }
];

export const INITIAL_INSCRIPTIONS: Inscription[] = [
  {
    id: 1,
    etudiant_id: 1,
    classe_id: 1,
    annee_academique_id: 1,
    date_inscription: '2025-10-05',
    statut: 'Validée',
    frais_inscription: 350000,
    type_inscription: 'Inscrire',
    statut_paiement: 'Payé',
    statut_validation: 'Validé'
  },
  {
    id: 2,
    etudiant_id: 2,
    classe_id: 2,
    annee_academique_id: 1,
    date_inscription: '2025-10-08',
    statut: 'Validée',
    frais_inscription: 400000,
    type_inscription: 'Inscrire',
    statut_paiement: 'Payé',
    statut_validation: 'Validé'
  },
  {
    id: 3,
    etudiant_id: 3,
    classe_id: 3,
    annee_academique_id: 1,
    date_inscription: '2025-10-10',
    statut: 'Validée',
    frais_inscription: 300000,
    type_inscription: 'Inscrire',
    statut_paiement: 'Payé',
    statut_validation: 'Validé'
  }
];

export const INITIAL_NOTES: Note[] = [];

export const INITIAL_ABSENCES: Absence[] = [
  { id: 1, etudiant_id: 1, matiere_id: 3, date_absence: '2025-11-12', heures: 2, justifiee: true, motif: 'Raison médicale certifiée' },
  { id: 2, etudiant_id: 2, matiere_id: 10, date_absence: '2025-12-01', heures: 2, justifiee: false, motif: 'Absence non justifiée' }
];

export const INITIAL_BULLETINS: Bulletin[] = [];

export const INITIAL_PAIEMENTS: Paiement[] = [
  {
    id: 1,
    etudiant_id: 1,
    annee_academique_id: 1,
    filiere_id: 1,
    filiere_code: 'IGL',
    filiere_nom: 'Informatique & Génie Logiciel',
    classe_id: 1,
    classe_nom: 'Licence 1 Informatique A',
    annee_libelle: '2025 - 2026',
    type_frais: 'Scolarité',
    montant: 350000,
    montant_paye: 350000,
    reste_a_payer: 0,
    mode_paiement: 'Orange Money',
    reference_recu: 'REC-2025-001',
    date_paiement: '2025-10-05',
    statut: 'Complet',
    remarque: 'Payé intégralement à l\'inscription'
  },
  {
    id: 2,
    etudiant_id: 2,
    annee_academique_id: 1,
    filiere_id: 2,
    filiere_code: 'FC',
    filiere_nom: 'Finance & Comptabilité',
    classe_id: 2,
    classe_nom: 'Licence 1 Finance A',
    annee_libelle: '2025 - 2026',
    type_frais: 'Scolarité',
    montant: 400000,
    montant_paye: 400000,
    reste_a_payer: 0,
    mode_paiement: 'Moov Money',
    reference_recu: 'REC-2025-002',
    date_paiement: '2025-10-08',
    statut: 'Complet',
    remarque: 'Payé intégralement à l\'inscription'
  },
  {
    id: 3,
    etudiant_id: 3,
    annee_academique_id: 1,
    filiere_id: 3,
    filiere_code: 'DA',
    filiere_nom: 'Droit des Affaires',
    classe_id: 3,
    classe_nom: 'Licence 1 Droit A',
    annee_libelle: '2025 - 2026',
    type_frais: 'Scolarité',
    montant: 300000,
    montant_paye: 300000,
    reste_a_payer: 0,
    mode_paiement: 'Espèces',
    reference_recu: 'REC-2025-003',
    date_paiement: '2025-10-10',
    statut: 'Complet',
    remarque: 'Payé intégralement à l\'inscription'
  }
];

export const INITIAL_SUPPORTS_COURS: SupportCours[] = [
  {
    id: 1,
    titre: 'Polycopié de cours : Algorithmique & Programmation en Langage C',
    matiere_id: 1,
    filiere_id: 1,
    type_document: 'PDF',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Bases de l\'algorithmique, variables, structures conditionnelles, boucles, fonctions et gestion des pointeurs.',
    publie_par: 'Dr. Sékou Konaté',
    date_publication: '2025-10-15'
  },
  {
    id: 2,
    titre: 'Fiche de Travaux Pratiques TP N°1 : Tableaux et Pointeurs en C',
    matiere_id: 1,
    filiere_id: 1,
    type_document: 'Fiche TP/TD',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Exercices pratiques sur l\'allocation dynamique de mémoire, tableaux multidimensionnels et structures.',
    publie_par: 'Dr. Sékou Konaté',
    date_publication: '2025-10-22'
  },
  {
    id: 3,
    titre: 'Guide pratique : Modélisation Entité-Association et Requêtes SQL',
    matiere_id: 2,
    filiere_id: 1,
    type_document: 'PDF',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Schéma relationnel, formes normales (1NF, 2NF, 3NF), requêtes SELECT, jointures et sous-requêtes imbriquées.',
    publie_par: 'Dr. Sékou Konaté',
    date_publication: '2025-10-20'
  },
  {
    id: 4,
    titre: 'Série d\'exercices corrigés : Algèbre Linéaire & Logique des Prédicats',
    matiere_id: 3,
    filiere_id: 1,
    type_document: 'Devoir / Exercice',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Ensembles, relations d\'équivalence, calcul matriciel et systèmes linéaires appliqués à l\'informatique.',
    publie_par: 'Prof. Mariam Coulibaly',
    date_publication: '2025-10-25'
  },
  {
    id: 5,
    titre: 'Technical English Guide for Software Engineers & IT Vocabulary',
    matiere_id: 4,
    filiere_id: 1,
    type_document: 'PDF',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Vocabulaire technique informatique, rédaction de documentation logicielle et communication professionnelle en anglais.',
    publie_par: 'Dr. Ibrahim Sangaré',
    date_publication: '2025-11-02'
  },
  {
    id: 6,
    titre: 'Support de cours : Programmation Orientée Objet (POO) & Java SE',
    matiere_id: 5,
    filiere_id: 1,
    type_document: 'PDF',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Classes, encapsulation, héritage, polymorphisme, interfaces et gestion des exceptions en Java.',
    publie_par: 'Dr. Sékou Konaté',
    date_publication: '2026-02-10'
  },
  {
    id: 7,
    titre: 'Diaporama : Architecture Réseaux & Modèle OSI / TCP-IP',
    matiere_id: 6,
    filiere_id: 1,
    type_document: 'Diaporama PPT',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Présentation des protocoles réseaux, adressage IPv4/IPv6, routage et commutation Cisco.',
    publie_par: 'Dr. Sékou Konaté',
    date_publication: '2026-02-15'
  },
  {
    id: 8,
    titre: 'Manuel de Comptabilité Générale selon le Système Comptable SYSCOHADA',
    matiere_id: 9,
    filiere_id: 2,
    type_document: 'PDF',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Principes comptables OHADA, plan des comptes, journal, grand livre, balance et états financiers de synthèse.',
    publie_par: 'Prof. Mariam Coulibaly',
    date_publication: '2025-10-18'
  },
  {
    id: 9,
    titre: 'Cours de Microéconomie : Théorie du Consommateur et du Producteur',
    matiere_id: 10,
    filiere_id: 2,
    type_document: 'PDF',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Fonctions d\'utilité, courbes d\'indifférence, maximisation du profit et équilibre sur les marchés concurrentiels.',
    publie_par: 'Prof. Mariam Coulibaly',
    date_publication: '2025-10-28'
  },
  {
    id: 10,
    titre: 'Introduction Générale à l\'Étude du Droit & Droit des Obligations',
    matiere_id: 17,
    filiere_id: 3,
    type_document: 'PDF',
    fichier_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Sources du droit, hiérarchie des normes, formation et validité des contrats en droit des affaires.',
    publie_par: 'Dr. Ibrahim Sangaré',
    date_publication: '2025-10-16'
  }
];

export const INITIAL_ADMINISTRATEURS: Administrateur[] = [
  {
    id: 1,
    nom: 'Administrateur',
    prenom: 'Principal',
    email: 'admin@unigestion.edu.ml',
    mot_de_passe: 'admin123',
    role: 'ADMIN',
    role_admin: 'Administrateur',
    telephone: '+223 70 00 00 00',
    statut: 'Actif',
    universite_id: 1,
    date_creation: '2025-01-01'
  },
  {
    id: 2,
    nom: 'Administrateur',
    prenom: 'Système',
    email: 'admin',
    mot_de_passe: 'admin123',
    role: 'ADMIN',
    role_admin: 'Administrateur',
    telephone: '+223 70 00 00 01',
    statut: 'Actif',
    universite_id: 1,
    date_creation: '2025-01-01'
  }
];

export const INITIAL_UTILISATEURS: Utilisateur[] = INITIAL_ADMINISTRATEURS;

export const INITIAL_NOTIFICATIONS: NotificationAlerte[] = [
  {
    id: 1,
    destinateur_type: 'ALL',
    titre: 'Bienvenue sur UniGestion',
    message: 'Système de gestion universitaire opérationnel.',
    type_alerte: 'INFO',
    lu: true,
    created_at: '2025-10-01'
  }
];

export const INITIAL_HISTORIQUE: HistoriqueAcces[] = [];
