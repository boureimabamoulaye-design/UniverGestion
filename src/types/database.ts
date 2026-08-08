export interface Universite {
  id: number;
  code: string;
  nom: string;
  sigle: string;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string;
  email: string;
  logo_url?: string;
  created_at?: string;
}

export interface Faculte {
  id: number;
  universite_id: number;
  code: string;
  nom: string;
  doyen: string;
  description: string;
  created_at?: string;
}

export interface Filiere {
  id: number;
  faculte_id: number;
  code: string;
  nom: string;
  description: string;
  domaine: string;
  duree_annees: number;
  created_at?: string;
}

export interface Niveau {
  id: number;
  filiere_id: number;
  code: string;
  nom: string;
  diplome_vise: string;
  created_at?: string;
}

export interface Classe {
  id: number;
  filiere_id: number;
  niveau_id: number;
  annee_academique_id: number;
  code: string;
  nom: string;
  capacite: number;
  created_at?: string;
}

export interface AnneeAcademique {
  id: number;
  code: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  est_active: boolean;
  est_archivee?: boolean;
}

export interface Etudiant {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  sexe: 'M' | 'F';
  nationalite: string;
  email: string;
  telephone: string;
  adresse: string;
  classe_id: number;
  filiere_id?: number;
  date_inscription: string;
  statut: 'Régulier' | 'Inscrit' | 'Suspendu' | 'Diplômé';
  mot_de_passe: string;
  photo_url?: string;
  // Tuteur Information
  tuteur_nom?: string;
  tuteur_prenom?: string;
  tuteur_telephone?: string;
  // Compte & Accès
  statut_compte?: 'Actif' | 'Inactif' | 'Bloqué';
  est_bloque?: boolean;
}

export interface Enseignant {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  titre: string; // Dr, Prof, Maître de Conférences, etc.
  email: string;
  telephone: string;
  specialite: string;
  universite_id: number;
}

export interface Semestre {
  id: number;
  code: string;
  libelle: string;
  niveau_id: number;
  ordre: number;
}

export interface Matiere {
  id: number;
  code: string;
  nom: string;
  filiere_id: number;
  niveau_id: number;
  semestre_id: number;
  enseignant_id: number;
  credits: number;
  ue_nom?: string;
  ue_type?: 'Majeure' | 'Mineure';
  support_fichier_url?: string;
  support_fichier_nom?: string;
}

export interface Inscription {
  id: number;
  etudiant_id: number;
  classe_id: number;
  annee_academique_id: number;
  date_inscription: string;
  statut: 'Validée' | 'En attente' | 'Annulée';
  frais_inscription: number;
  type_inscription?: 'Inscrire' | 'Réinscrire' | 'Passage';
  statut_paiement?: 'Non payé' | 'Partiel' | 'Payé';
  statut_validation?: 'En attente' | 'Validé' | 'Rejeté';
}

export interface Note {
  id: number;
  etudiant_id: number;
  matiere_id: number;
  semestre_id: number;
  annee_academique_id: number;
  note_cc: number; // Contrôle Continu (30%)
  note_examen: number; // Examen (70%)
  note_finale: number; // Note calculée
  appreciation: string;
  modifie_par?: string;
  updated_at?: string;
}

export interface Absence {
  id: number;
  etudiant_id: number;
  matiere_id: number;
  date_absence: string;
  heures: number;
  justifiee: boolean;
  motif?: string;
}

export interface Bulletin {
  id: number;
  etudiant_id: number;
  classe_id: number;
  semestre_id: number;
  annee_academique_id: number;
  moyenne: number;
  moyenne_generale?: number;
  total_credits: number;
  total_credits_valides?: number;
  decision: 'Admis' | 'Ajourné' | 'Compensé' | 'En attente' | 'Passage sous réserve' | 'Exclu' | string;
  mention: 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien' | 'N/A' | string;
  rang: number;
  date_generation: string;
  remarques_jury?: string;
}

export interface Paiement {
  id: number;
  etudiant_id: number;
  annee_academique_id: number;
  filiere_id?: number;
  filiere_code?: string;
  filiere_nom?: string;
  classe_id?: number;
  classe_nom?: string;
  annee_libelle?: string;
  type_frais: 'Inscription' | 'Scolarité' | 'Examen' | 'Autre';
  montant: number;
  montant_paye: number;
  reste_a_payer: number;
  reduction_pct?: number;
  reduction_montant?: number;
  mode_paiement: 'Espèces' | 'Orange Money' | 'Moov Money' | 'Virement' | 'Chèque' | 'Wave';
  reference_recu: string;
  date_paiement: string;
  statut: 'Complet' | 'Partiel' | 'En retard' | 'En attente';
  remarque?: string;
}

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe: string;
  role: 'Administrateur' | 'Gestionnaire' | 'Comptable' | 'Enseignant' | 'Étudiant';
  universite_id: number;
  statut?: 'Actif' | 'Inactif' | string;
  dernier_acces?: string;
}

export interface Administrateur {
  id: number;
  utilisateur_id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role_admin: 'Super Admin' | 'Admin Faculté' | 'Agent Saisie';
}

export interface AutorisationFiliere {
  id: number;
  utilisateur_id: number;
  filiere_id: number;
  droit_acces: 'Lecture' | 'Écriture' | 'Total';
}

export interface HistoriqueAcces {
  id: number;
  utilisateur_id?: number;
  etudiant_id?: number;
  ip_adresse: string;
  event_type: 'CONNEXION' | 'DECONNEXION' | 'MODIFICATION_NOTE' | 'INSCRIPTION' | 'PAIEMENT' | 'EXPORT' | 'VISITE_PAGE' | 'SUPPRESSION' | 'RESTAURATION' | string;
  description: string;
  created_at: string;
}

export interface CorbeilleItem {
  id: number;
  type_element: 'ETUDIANT' | 'NOTE' | 'MATIERE' | 'PAIEMENT' | 'INSCRIPTION' | 'ENSEIGNANT' | 'CLASSE' | 'FILIERE' | 'SEMESTRE' | 'UTILISATEUR';
  element_id: number;
  titre: string;
  details: string;
  donnees_json: string; // serialized item for full restoration
  supprime_par: string;
  supprime_le: string;
}

export interface NotificationAlerte {
  id: number;
  destinateur_type: 'ALL' | 'ETUDIANT' | 'ADMIN';
  destinateur_id?: number;
  titre: string;
  message: string;
  type_alerte: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  lu: boolean;
  created_at: string;
}

export interface SupportCours {
  id: number;
  titre: string;
  matiere_id?: number;
  filiere_id?: number;
  type_document: 'PDF' | 'Diaporama PPT' | 'Fiche TP/TD' | 'Devoir / Exercice' | 'Autre';
  fichier_url?: string;
  description?: string;
  publie_par?: string;
  date_publication: string;
}

// User Auth Session State
export interface AuthUser {
  id: number;
  nom: string;
  prenom: string;
  email_or_matricule: string;
  role: 'ADMIN' | 'ETUDIANT';
  adminDetail?: Administrateur;
  etudiantDetail?: Etudiant;
  universite_nom?: string;
}
