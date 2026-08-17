import React, { useState, useEffect } from 'react';
import { DB } from '../lib/storage';
import { Etudiant } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { EtudiantsSkeleton } from '../components/skeletons/EtudiantsSkeleton';
import {
  GraduationCap,
  Plus,
  Search,
  Upload,
  Download,
  Printer,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export const EtudiantsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState<Etudiant[]>(DB.getEtudiants());

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleSync = () => {
      setList(DB.getEtudiants());
    };
    window.addEventListener('unigestion_db_change', handleSync);
    return () => window.removeEventListener('unigestion_db_change', handleSync);
  }, []);

  const classes = DB.getClasses();
  const filieres = DB.getFilieres();
  const notes = DB.getNotes();
  const paiements = DB.getPaiements();
  const inscriptions = DB.getInscriptions();
  const annees = DB.getAnneesAcademiques();
  const activeAnnee = DB.getActiveAnneeAcademique();
  const semestres = DB.getSemestres();
  const facultes = DB.getFacultes();
  const universites = DB.getUniversites();
  const bulletins = DB.getBulletins();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulletinExcelOpen, setIsBulletinExcelOpen] = useState(false);
  const [bulletinStudent, setBulletinStudent] = useState<Etudiant | null>(null);
  const [selectedBulletinSemestre, setSelectedBulletinSemestre] = useState<number>(semestres[0]?.id || 1);
  const [selectedBulletinAnnee, setSelectedBulletinAnnee] = useState<number>(activeAnnee?.id || 1);

  const [editingItem, setEditingItem] = useState<Etudiant | null>(null);
  const [viewingItem, setViewingItem] = useState<Etudiant | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Etudiant | null>(null);

  // Search & Filters - Filter by Academic Year by default
  const [search, setSearch] = useState('');
  const [filterAnnee, setFilterAnnee] = useState<string>(activeAnnee ? String(activeAnnee.id) : 'all');
  const [filterFiliere, setFilterFiliere] = useState<string>('all');
  const [filterClasse, setFilterClasse] = useState<string>('all');

  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    date_naissance: '',
    lieu_naissance: '',
    sexe: 'M' as 'M' | 'F',
    nationalite: '',
    adresse: '',
    telephone: '',
    email: '',
    classe_id: classes[0]?.id || 1,
    annee_academique_id: activeAnnee?.id || 1,
    statut: 'Inscrit' as 'Régulier' | 'Inscrit' | 'Suspendu' | 'Diplômé',
    // Tutor info (Requirement 1)
    tuteur_nom: '',
    tuteur_prenom: '',
    tuteur_telephone: '',
    // Account lock status (Requirement 7)
    statut_compte: 'Actif' as 'Actif' | 'Inactif' | 'Bloqué',
    est_bloque: false,
    mot_de_passe: 'etudiant123'
  });

  const handleOpenModal = (item?: Etudiant) => {
    if (item) {
      setEditingItem(item);
      const studentInsc = inscriptions.find(i => i.etudiant_id === item.id);
      setFormData({
        matricule: item.matricule,
        nom: item.nom,
        prenom: item.prenom,
        date_naissance: item.date_naissance,
        lieu_naissance: item.lieu_naissance || '',
        sexe: item.sexe,
        nationalite: item.nationalite || '',
        adresse: item.adresse || '',
        telephone: item.telephone || '',
        email: item.email,
        classe_id: item.classe_id,
        annee_academique_id: studentInsc?.annee_academique_id || activeAnnee?.id || 1,
        statut: item.statut as any,
        tuteur_nom: item.tuteur_nom || '',
        tuteur_prenom: item.tuteur_prenom || '',
        tuteur_telephone: item.tuteur_telephone || '',
        statut_compte: (item.statut_compte || (item.est_bloque ? 'Bloqué' : 'Actif')) as any,
        est_bloque: item.est_bloque || item.statut_compte === 'Bloqué',
        mot_de_passe: item.mot_de_passe || 'etudiant123'
      });
    } else {
      setEditingItem(null);
      const randomMat = `2024-USTTB-${String(list.length + 1).padStart(3, '0')}`;
      setFormData({
        matricule: randomMat,
        nom: '',
        prenom: '',
        date_naissance: '',
        lieu_naissance: '',
        sexe: 'M',
        nationalite: '',
        adresse: '',
        telephone: '',
        email: '',
        classe_id: classes[0]?.id || 1,
        annee_academique_id: activeAnnee?.id || 1,
        statut: 'Inscrit',
        tuteur_nom: '',
        tuteur_prenom: '',
        tuteur_telephone: '',
        statut_compte: 'Actif',
        est_bloque: false,
        mot_de_passe: 'etudiant123'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.matricule) return;

    const savedStudent = DB.saveEtudiant({
      ...(editingItem ? { id: editingItem.id } : {}),
      matricule: formData.matricule,
      nom: formData.nom,
      prenom: formData.prenom,
      date_naissance: formData.date_naissance,
      lieu_naissance: formData.lieu_naissance,
      sexe: formData.sexe,
      nationalite: formData.nationalite,
      adresse: formData.adresse,
      telephone: formData.telephone,
      email: formData.email,
      classe_id: Number(formData.classe_id),
      statut: formData.statut,
      tuteur_nom: formData.tuteur_nom,
      tuteur_prenom: formData.tuteur_prenom,
      tuteur_telephone: formData.tuteur_telephone,
      statut_compte: formData.statut_compte,
      mot_de_passe: formData.mot_de_passe || 'etudiant123',
      date_inscription: editingItem ? editingItem.date_inscription : new Date().toISOString().split('T')[0],
      est_bloque: formData.statut_compte === 'Bloqué'
    });

    // Ensure inscription record exists for the selected academic year
    const existingInscriptions = DB.getInscriptions();
    const targetAnneeId = Number(formData.annee_academique_id) || activeAnnee?.id || 1;
    const hasInsc = existingInscriptions.some(
      i => i.etudiant_id === savedStudent.id && Number(i.annee_academique_id) === targetAnneeId
    );

    if (!hasInsc) {
      DB.saveInscription({
        etudiant_id: savedStudent.id,
        classe_id: Number(formData.classe_id),
        annee_academique_id: targetAnneeId,
        date_inscription: new Date().toISOString().split('T')[0],
        statut: 'Validée',
        frais_inscription: 150000,
        type_inscription: editingItem ? 'Réinscrire' : 'Inscrire',
        statut_paiement: 'Payé',
        statut_validation: 'Validé'
      });
    }

    setList(DB.getEtudiants());
    setIsModalOpen(false);
  };

  // Quick toggle student account lock (Requirement 7)
  const handleToggleStudentLock = (student: Etudiant, newStatus: 'Actif' | 'Inactif' | 'Bloqué') => {
    DB.saveEtudiant({
      ...student,
      statut_compte: newStatus,
      est_bloque: newStatus === 'Bloqué'
    });
    DB.logAccess('SECURITE', `Modification statut compte étudiant ${student.prenom} ${student.nom} (#${student.matricule}) -> ${newStatus}`);
    setList(DB.getEtudiants());
  };

  const handleDelete = (id: number) => {
    const student = list.find(e => e.id === id);
    if (!student) return;
    setDeleteConfirmStudent(student);
  };

  const executeDeleteStudent = () => {
    if (!deleteConfirmStudent) return;
    DB.moveToCorbeille(
      'ETUDIANT',
      deleteConfirmStudent.id,
      `${deleteConfirmStudent.prenom} ${deleteConfirmStudent.nom} (${deleteConfirmStudent.matricule})`,
      `Étudiant ${deleteConfirmStudent.statut} - Classe ID #${deleteConfirmStudent.classe_id}`,
      deleteConfirmStudent,
      'Administrateur'
    );
    DB.deleteEtudiant(deleteConfirmStudent.id);
    setList(DB.getEtudiants());
    setDeleteConfirmStudent(null);
  };

  // Export List
  const handleExportCSV = () => {
    const headers = ["ID", "Matricule", "Nom", "Prénom", "Sexe", "Email", "Téléphone", "Tuteur Nom", "Tuteur Téléphone", "Statut Compte"];
    const rows = filtered.map(e => [
      e.id,
      `"${e.matricule}"`,
      `"${(e.nom || '').replace(/"/g, '""')}"`,
      `"${(e.prenom || '').replace(/"/g, '""')}"`,
      `"${e.sexe || 'M'}"`,
      `"${(e.email || '').replace(/"/g, '""')}"`,
      `"${(e.telephone || '').replace(/"/g, '""')}"`,
      `"${(e.tuteur_nom || '').replace(/"/g, '""')}"`,
      `"${(e.tuteur_telephone || '').replace(/"/g, '""')}"`,
      `"${(e.statut_compte || (e.est_bloque ? 'Bloqué' : 'Actif')).replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `liste_etudiants_mali_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Open Excel Green Bulletin
  const handleOpenBulletinExcel = (student: Etudiant) => {
    setBulletinStudent(student);
    const studentInsc = inscriptions.find(i => Number(i.etudiant_id) === Number(student.id));
    if (studentInsc?.annee_academique_id) {
      setSelectedBulletinAnnee(Number(studentInsc.annee_academique_id));
    } else if (activeAnnee?.id) {
      setSelectedBulletinAnnee(activeAnnee.id);
    }
    const studentClass = classes.find(c => c.id === student.classe_id);
    const studentFiliere = filieres.find(f => f.id === (student as any).filiere_id || f.id === studentClass?.filiere_id) || filieres[0];
    const availableSemestres = semestres.filter(s => !studentClass?.niveau_id || Number(s.niveau_id) === Number(studentClass.niveau_id));
    if (availableSemestres.length > 0) {
      setSelectedBulletinSemestre(availableSemestres[0].id);
    } else if (semestres.length > 0) {
      setSelectedBulletinSemestre(semestres[0].id);
    }
    setIsBulletinExcelOpen(true);
  };

  // Helper to compute details for the Excel Bulletin
  const getBulletinData = (student: Etudiant | null, semestreId: number, anneeId: number) => {
    if (!student) return null;

    const studentClass = classes.find(c => c.id === student.classe_id);
    const studentFiliere = filieres.find(f => f.id === (student as any).filiere_id || f.id === studentClass?.filiere_id) || filieres[0];
    const faculte = studentFiliere ? facultes.find(f => f.id === studentFiliere.faculte_id) : facultes[0];
    const universite = universites[0] || { nom: 'UNIVERSITÉ DES SCIENCES, DES TECHNIQUES ET DES TECHNOLOGIES DE BAMAKO (USTTB)', code: 'USTTB' };
    const semestre = semestres.find(s => s.id === semestreId) || semestres[0] || { id: 1, code: 'S1', libelle: 'Semestre 1' };
    const annee = annees.find(a => a.id === anneeId) || activeAnnee || { id: 1, code: '2024-2025', libelle: 'Année 2024-2025' };

    // Get authorized subjects for this filière & semestre
    const matieres = DB.getMatieres().filter(
      m => Number(m.semestre_id) === Number(semestre.id) &&
           (!studentFiliere?.id || Number(m.filiere_id) === Number(studentFiliere.id))
    );

    const studentNotes = DB.getNotes().filter(
      n => Number(n.etudiant_id) === Number(student.id) &&
           Number(n.semestre_id) === Number(semestre.id) &&
           Number(n.annee_academique_id) === Number(annee.id)
    );

    let totalPoints = 0;
    let totalCreditsInscrits = 0;
    let totalCreditsValides = 0;

    const rows = matieres.map(m => {
      const noteObj = studentNotes.find(n => Number(n.matiere_id) === Number(m.id));
      const noteCc = noteObj?.note_cc !== undefined && noteObj?.note_cc !== null 
        ? Number(noteObj.note_cc) 
        : 0;
      const noteExam = noteObj?.note_examen !== undefined && noteObj?.note_examen !== null 
        ? Number(noteObj.note_examen) 
        : noteCc;
      const noteFinale = noteObj?.note_finale !== undefined && noteObj?.note_finale !== null
        ? Number(noteObj.note_finale)
        : Number(((noteCc * 0.4) + (noteExam * 0.6)).toFixed(2));
      const credits = Number(m.credits) || 3;
      const pointsPonderes = Number((noteFinale * credits).toFixed(2));
      const isValidated = noteFinale >= 10.0;

      totalPoints += pointsPonderes;
      totalCreditsInscrits += credits;
      if (isValidated) totalCreditsValides += credits;

      let mentionMatiere = 'Ajourné';
      if (noteFinale >= 16) mentionMatiere = 'Très Bien';
      else if (noteFinale >= 14) mentionMatiere = 'Bien';
      else if (noteFinale >= 12) mentionMatiere = 'Assez Bien';
      else if (noteFinale >= 10) mentionMatiere = 'Passable';

      return {
        matiere: m,
        noteCc,
        noteExam,
        noteFinale,
        credits,
        pointsPonderes,
        isValidated,
        mentionMatiere
      };
    });

    const moyenneGenerale = totalCreditsInscrits > 0 
      ? Number((totalPoints / totalCreditsInscrits).toFixed(2)) 
      : 0;
    const isAdmis = moyenneGenerale >= 10.0;
    const decision: 'Admis' | 'Compensé' | 'Ajourné' = isAdmis ? 'Admis' : (moyenneGenerale >= 9.0 ? 'Compensé' : 'Ajourné');

    let mention: 'Très Bien' | 'Bien' | 'Assez Bien' | 'Passable' | 'Ajourné' | 'N/A' = 'N/A';
    if (moyenneGenerale >= 16) mention = 'Très Bien';
    else if (moyenneGenerale >= 14) mention = 'Bien';
    else if (moyenneGenerale >= 12) mention = 'Assez Bien';
    else if (moyenneGenerale >= 10) mention = 'Passable';
    else mention = 'Ajourné';

    const existingBulletin = bulletins.find(
      b => Number(b.etudiant_id) === Number(student.id) &&
           Number(b.semestre_id) === Number(semestre.id) &&
           Number(b.annee_academique_id) === Number(annee.id)
    );

    return {
      student,
      studentClass,
      studentFiliere,
      faculte,
      universite,
      semestre,
      annee,
      rows,
      totalPoints: Number(totalPoints.toFixed(2)),
      totalCreditsInscrits,
      totalCreditsValides,
      moyenneGenerale,
      isAdmis,
      decision,
      mention,
      rang: existingBulletin?.rang || 1
    };
  };

  const handleExportIndividualBulletinExcel = (data: NonNullable<ReturnType<typeof getBulletinData>>) => {
    let csv = `UNIVERSITE DES SCIENCES DES TECHNIQUES ET DES TECHNOLOGIES DE BAMAKO (USTTB)\n`;
    csv += `BULLETIN OFFICIEL DE NOTES & RELEVE DE DELIBERATION (FORMAT TABLEUR EXCEL)\n\n`;
    csv += `Matricule;${data.student.matricule};Nom & Prenom;${data.student.prenom} ${data.student.nom}\n`;
    csv += `Filiere;${data.studentFiliere?.nom || 'Tronc Commun'} (${data.studentFiliere?.code || ''});Classe;${data.studentClass?.nom || 'L1'}\n`;
    csv += `Semestre;${data.semestre.libelle};Annee Academique;${data.annee.code || data.annee.libelle}\n\n`;
    csv += `Code UE/Matiere;Intitule de la Matiere;Credits ECTS;Note CC (40%);Note Examen (60%);Note Finale /20;Points Ponderes;Statut Validation;Mention\n`;

    data.rows.forEach(r => {
      csv += `"${r.matiere.code}";"${r.matiere.nom}";${r.credits};${r.noteCc};${r.noteExam};${r.noteFinale};${r.pointsPonderes};"${r.isValidated ? 'Validee' : 'Non Validee'}";"${r.mentionMatiere}"\n`;
    });

    csv += `\nTOTAL CREDITS INSCRITS;${data.totalCreditsInscrits};TOTAL CREDITS VALIDES;${data.totalCreditsValides};TOTAL POINTS;${data.totalPoints}\n`;
    csv += `MOYENNE GENERALE PONDEREE;${data.moyenneGenerale.toFixed(2)}/20;DECISION DU JURY;${data.decision};MENTION;${data.mention};RANG;#${data.rang}\n`;

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bulletin_Excel_${data.student.matricule}_${data.semestre.code || 'S1'}_${data.annee.code || '2024'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter Logic
  const filtered = list.filter(e => {
    const matchesSearch =
      !search.trim() ||
      e.nom.toLowerCase().includes(search.toLowerCase().trim()) ||
      e.prenom.toLowerCase().includes(search.toLowerCase().trim()) ||
      e.matricule.toLowerCase().includes(search.toLowerCase().trim()) ||
      e.email.toLowerCase().includes(search.toLowerCase().trim()) ||
      `${e.prenom} ${e.nom}`.toLowerCase().includes(search.toLowerCase().trim());

    const studentClass = classes.find(c => c.id === e.classe_id);
    const matchesFiliere = filterFiliere === 'all' || studentClass?.filiere_id === Number(filterFiliere);
    const matchesClasse = filterClasse === 'all' || e.classe_id === Number(filterClasse);

    const matchesAnnee = filterAnnee === 'all' || 
      inscriptions.some(i => i.etudiant_id === e.id && Number(i.annee_academique_id) === Number(filterAnnee)) ||
      (inscriptions.filter(i => i.etudiant_id === e.id).length === 0 && Number(filterAnnee) === (activeAnnee?.id || 1));

    return matchesSearch && matchesAnnee && matchesFiliere && matchesClasse;
  });

  if (isLoading) {
    return <EtudiantsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A]">Gestion des Étudiants</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Effectif affiché : <span className="font-bold text-[#0066FF]">{filtered.length} étudiants</span> {filterAnnee !== 'all' && `(Année ${annees.find(a => a.id === Number(filterAnnee))?.libelle || ''})`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="h-[40px] sm:h-[44px] px-3 sm:px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[12px] sm:rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors w-full sm:w-auto"
          >
            <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Importer (Excel)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="h-[40px] sm:h-[44px] px-3 sm:px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[12px] sm:rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors w-full sm:w-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Exporter Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="h-[40px] sm:h-[44px] px-3 sm:px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[12px] sm:rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors w-full sm:w-auto"
          >
            <Printer className="w-4 h-4 text-gray-600 shrink-0" />
            <span>Imprimer</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="h-[40px] sm:h-[44px] px-4 sm:px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[12px] sm:rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors shadow-xs w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nouveau Étudiant</span>
          </button>
        </div>
      </div>

      {/* Multicriteria Search & Filters Bar (Année, Filière, Classe) */}
      <div className="bg-white p-3 sm:p-4 rounded-[16px] sm:rounded-[20px] border border-[#E5E7EB] shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="relative sm:col-span-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un étudiant (nom, matricule)..."
            className="w-full h-[40px] sm:h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] sm:rounded-[14px] pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:border-[#0066FF]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div>
          <select
            value={filterAnnee}
            onChange={(e) => setFilterAnnee(e.target.value)}
            className="w-full h-[40px] sm:h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] sm:rounded-[14px] px-3 text-xs font-semibold text-blue-800 focus:outline-none focus:border-[#0066FF]"
          >
            <option value="all">Toutes les années académiques</option>
            {annees.map(a => (
              <option key={a.id} value={a.id}>
                {a.libelle} {a.est_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="w-full h-[40px] sm:h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] sm:rounded-[14px] px-3 text-xs font-medium focus:outline-none focus:border-[#0066FF]"
          >
            <option value="all">Toutes les filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.nom} ({f.code})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="w-full h-[40px] sm:h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] sm:rounded-[14px] px-3 text-xs font-medium focus:outline-none focus:border-[#0066FF]"
          >
            <option value="all">Toutes les classes</option>
            {classes
              .filter(c => filterFiliere === 'all' || c.filiere_id === Number(filterFiliere))
              .map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[16px] sm:rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-4 sm:px-6 py-3.5">Matricule</th>
                <th className="px-4 sm:px-6 py-3.5">Nom & Prénom</th>
                <th className="px-4 sm:px-6 py-3.5">Classe</th>
                <th className="px-4 sm:px-6 py-3.5">Tuteur</th>
                <th className="px-4 sm:px-6 py-3.5">Statut Compte</th>
                <th className="px-4 sm:px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Aucun étudiant ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const cls = classes.find(c => c.id === item.classe_id);
                  const isBlocked = item.est_bloque || item.statut_compte === 'Bloqué';
                  const isInactive = item.statut_compte === 'Inactif';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-[#0066FF] whitespace-nowrap">{item.matricule}</td>
                      <td className="px-4 sm:px-6 py-3.5 font-semibold text-[#1A1A1A]">
                        <div className="truncate max-w-[160px] sm:max-w-none">{item.prenom} {item.nom}</div>
                        <div className="text-[10px] text-gray-400">{item.email}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 font-medium text-gray-700 whitespace-nowrap">{cls?.nom || 'Section A'}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-gray-600">
                        {item.tuteur_nom ? (
                          <div>
                            <span className="font-semibold">{item.tuteur_prenom} {item.tuteur_nom}</span>
                            <div className="text-[10px] text-gray-400 font-mono">{item.tuteur_telephone}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isBlocked
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isInactive
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isBlocked ? (
                            <>
                              <Lock className="w-3 h-3 text-red-600" />
                              Accès Bloqué
                            </>
                          ) : isInactive ? (
                            <>
                              <XCircle className="w-3 h-3 text-amber-600" />
                              Désactivé
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Compte Actif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap space-x-1">
                        {/* Quick Lock / Unlock Buttons */}
                        {isBlocked ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStudentLock(item, 'Actif')}
                            title="Débloquer le compte étudiant"
                            className="p-1.5 bg-emerald-50 text-emerald-700 rounded-[8px] hover:bg-emerald-100 transition-colors inline-flex items-center justify-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStudentLock(item, 'Bloqué')}
                            title="Bloquer l'accès étudiant"
                            className="p-1.5 bg-red-50 text-red-600 rounded-[8px] hover:bg-red-100 transition-colors inline-flex items-center justify-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenBulletinExcel(item)}
                          title="Consulter le Bulletin Officiel (Format Excel Vert)"
                          className="p-1.5 bg-emerald-50 text-emerald-700 rounded-[8px] hover:bg-emerald-100 transition-colors inline-flex items-center justify-center"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        </button>

                        <button
                          type="button"
                          onClick={() => { setViewingItem(item); setIsDetailModalOpen(true); }}
                          title="Consulter la fiche complète"
                          className="p-1.5 bg-blue-50 text-[#0066FF] rounded-[8px] hover:bg-blue-100 transition-colors inline-flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(item)}
                          title="Modifier"
                          className="p-1.5 bg-gray-100 text-gray-700 rounded-[8px] hover:bg-gray-200 transition-colors inline-flex items-center justify-center"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Supprimer"
                          className="p-1.5 bg-red-50 text-red-600 rounded-[8px] hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Student (Requirements 1 & 7) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Modifier la Fiche Étudiant' : 'Inscrire un Nouvel Étudiant'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Matricule Unique *</label>
              <input
                type="text"
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Année Académique *</label>
              <select
                value={formData.annee_academique_id}
                onChange={(e) => setFormData({ ...formData, annee_academique_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium text-blue-700"
              >
                {annees.map(a => (
                  <option key={a.id} value={a.id}>{a.libelle} {a.est_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Classe / Promotion *</label>
              <select
                value={formData.classe_id}
                onChange={(e) => setFormData({ ...formData, classe_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Ex: Modibo"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Sidibé"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Sexe *</label>
              <select
                value={formData.sexe}
                onChange={(e) => setFormData({ ...formData, sexe: e.target.value as 'M' | 'F' })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white"
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Date de Naissance *</label>
              <input
                type="date"
                value={formData.date_naissance}
                onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Lieu de Naissance</label>
              <input
                type="text"
                value={formData.lieu_naissance}
                onChange={(e) => setFormData({ ...formData, lieu_naissance: e.target.value })}
                placeholder="Bamako, Mali"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nationalité</label>
              <input
                type="text"
                value={formData.nationalite}
                onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                placeholder="Malienne"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email Personnel *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="etudiant@usttb.edu.ml"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Téléphone Mobile</label>
              <input
                type="text"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="+223 70 00 00 00"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>
          </div>

          {/* SECTION TUTEUR DE L'ÉTUDIANT (Requirement 1) */}
          <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
            <h4 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Informations du Tuteur / Responsable Légal
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom du Tuteur</label>
                <input
                  type="text"
                  value={formData.tuteur_nom}
                  onChange={(e) => setFormData({ ...formData, tuteur_nom: e.target.value })}
                  placeholder="Nom du tuteur"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prénom du Tuteur</label>
                <input
                  type="text"
                  value={formData.tuteur_prenom}
                  onChange={(e) => setFormData({ ...formData, tuteur_prenom: e.target.value })}
                  placeholder="Prénom du tuteur"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Téléphone du Tuteur</label>
                <input
                  type="text"
                  value={formData.tuteur_telephone}
                  onChange={(e) => setFormData({ ...formData, tuteur_telephone: e.target.value })}
                  placeholder="+223 66 00 11 22"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION MOT DE PASSE DU COMPTE */}
          <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
            <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-600" />
              Mot de Passe de Connexion de l'Étudiant
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Mot de passe de l'étudiant *</label>
                <input
                  type="text"
                  value={formData.mot_de_passe || ''}
                  onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                  placeholder="Mot de passe..."
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                  required
                />
              </div>
              <div className="flex items-center">
                <p className="text-[11px] text-amber-800 leading-tight">
                  L'étudiant utilisera ce mot de passe pour se connecter à son portail avec son matricule (ex: <b>{formData.matricule}</b>) ou son email.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION STATUT ET ACCÈS DU COMPTE (Requirement 7) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="block font-bold text-xs text-slate-800">
              Statut du Compte / Accès à la Plateforme (Individuel)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, statut_compte: 'Actif', est_bloque: false })}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  formData.statut_compte === 'Actif'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Activer le Compte
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, statut_compte: 'Inactif', est_bloque: false })}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  formData.statut_compte === 'Inactif'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Désactiver le Compte
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, statut_compte: 'Bloqué', est_bloque: true })}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  formData.statut_compte === 'Bloqué'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Bloquer l'Accès
              </button>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-[44px] px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[14px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="h-[44px] px-6 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-[14px]"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Fiche Détaillée Étudiant */}
      {viewingItem && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Fiche Étudiant : ${viewingItem.prenom} ${viewingItem.nom}`}
        >
          <div className="space-y-6 text-xs text-[#1A1A1A]">
            <div className="p-4 bg-gray-50 rounded-[16px] border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-100 text-[#0066FF] rounded-full text-[10px] font-bold font-mono">
                  {viewingItem.matricule}
                </span>
                <h3 className="text-base font-bold mt-1 text-[#1A1A1A]">
                  {viewingItem.prenom} {viewingItem.nom}
                </h3>
                <p className="text-gray-500">Né(e) le {viewingItem.date_naissance} à {viewingItem.lieu_naissance}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  viewingItem.est_bloque || viewingItem.statut_compte === 'Bloqué'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Compte : {viewingItem.statut_compte || (viewingItem.est_bloque ? 'Bloqué' : 'Actif')}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block font-medium">Inscrit le {viewingItem.date_inscription}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-[16px] border border-gray-100">
              <div>
                <span className="text-gray-400 block font-semibold">Email :</span>
                <span className="font-medium text-[#1A1A1A]">{viewingItem.email}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Téléphone :</span>
                <span className="font-medium text-[#1A1A1A]">{viewingItem.telephone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Nom & Tél du Tuteur :</span>
                <span className="font-bold text-[#1A1A1A]">
                  {viewingItem.tuteur_nom ? `${viewingItem.tuteur_prenom} ${viewingItem.tuteur_nom} (${viewingItem.tuteur_telephone})` : 'Non renseigné'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Adresse :</span>
                <span className="font-medium text-[#1A1A1A]">{viewingItem.adresse}</span>
              </div>
            </div>

            {/* Financial summary */}
            <div>
              <h4 className="font-bold text-sm text-[#1A1A1A] mb-2">Historique des Paiements</h4>
              <div className="space-y-2">
                {paiements.filter(p => p.etudiant_id === viewingItem.id).map(p => (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-[12px] flex items-center justify-between border border-gray-200">
                    <div>
                      <p className="font-bold">{p.type_frais} - {p.filiere_nom || p.filiere_code || 'Scolarité'}</p>
                      <p className="text-[10px] text-gray-400">{p.mode_paiement} • Réf: {p.reference_recu}</p>
                    </div>
                    <span className="font-bold text-emerald-600">{p.montant_paye.toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenBulletinExcel(viewingItem);
                }}
                className="h-10 px-4 bg-[#107C41] hover:bg-[#0c6233] text-white font-bold rounded-[12px] flex items-center gap-2 transition-all shadow-xs text-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Consulter le Bulletin Format Excel (Vert)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[12px]"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL BULLETIN FORMAT EXCEL VERT (RELEVÉ ET PROCÈS-VERBAL LMD) */}
      {bulletinStudent && (
        <Modal
          isOpen={isBulletinExcelOpen}
          onClose={() => setIsBulletinExcelOpen(false)}
          title=""
        >
          {(() => {
            const data = getBulletinData(bulletinStudent, selectedBulletinSemestre, selectedBulletinAnnee);
            if (!data) return null;

            const studentClass = classes.find(c => c.id === bulletinStudent.classe_id);
            const availableSemestres = semestres.filter(s => !studentClass?.niveau_id || Number(s.niveau_id) === Number(studentClass.niveau_id));
            const displaySemestres = availableSemestres.length > 0 ? availableSemestres : semestres;

            return (
              <div className="space-y-4 text-xs">
                {/* Excel Ribbon Top Bar (Vert Excel #107C41) */}
                <div className="bg-gradient-to-r from-[#107C41] via-[#0E6C38] to-[#107C41] text-white p-3 sm:p-4 rounded-t-2xl -mt-6 -mx-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/15 border border-white/30 rounded-xl flex items-center justify-center shadow-inner">
                      <FileSpreadsheet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-white/20 text-emerald-100 rounded text-[10px] font-bold tracking-wider uppercase font-mono">
                          Format Tableur Excel
                        </span>
                        <span className="text-emerald-200 text-[11px] font-mono">
                          USTTB_Bulletin_{data.student.matricule}.xlsx
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black tracking-tight mt-0.5">
                        Bulletin Officiel de Notes & Délibération LMD
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportIndividualBulletinExcel(data)}
                      className="h-9 px-3 bg-white text-[#107C41] hover:bg-emerald-50 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-[#107C41]" />
                      <span>Exporter Excel (.csv)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="h-9 px-3 bg-emerald-800 hover:bg-emerald-900 text-white border border-emerald-600/60 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all text-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer / PDF</span>
                    </button>
                  </div>
                </div>

                {/* Excel Formula & Controls Bar */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="px-2 py-1 bg-white border border-emerald-300 text-emerald-900 font-mono font-bold rounded text-[11px]">
                      fx
                    </span>
                    <span className="font-mono text-[11px] text-emerald-900 bg-white/90 px-3 py-1 rounded border border-emerald-200 flex-1 truncate">
                      =SOMMEPROD(D4:D{data.rows.length + 3}*0.4 + E4:E{data.rows.length + 3}*0.6 ; C4:C{data.rows.length + 3}) / SOMME(C4:C{data.rows.length + 3})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedBulletinAnnee}
                      onChange={(e) => setSelectedBulletinAnnee(Number(e.target.value))}
                      className="h-8 px-2.5 bg-white border border-emerald-300 rounded-lg text-emerald-900 font-bold text-xs focus:outline-none"
                    >
                      {annees.map(a => (
                        <option key={a.id} value={a.id}>
                          Année : {a.libelle} {a.est_active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center bg-white border border-emerald-300 rounded-lg p-0.5">
                      {displaySemestres.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedBulletinSemestre(s.id)}
                          className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all ${
                            selectedBulletinSemestre === s.id
                              ? 'bg-[#107C41] text-white shadow-xs'
                              : 'text-emerald-900 hover:bg-emerald-100/60'
                          }`}
                        >
                          {s.code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Printable Excel Worksheet Canvas */}
                <div className="bg-white border-2 border-emerald-300 rounded-2xl shadow-sm overflow-hidden">
                  
                  {/* Administrative Header (Mali / USTTB) */}
                  <div className="p-4 bg-emerald-50/40 border-b-2 border-emerald-300 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="text-left space-y-0.5">
                      <p className="font-black text-[11px] text-emerald-950 uppercase tracking-tight">
                        RÉPUBLIQUE DU MALI
                      </p>
                      <p className="text-[10px] text-emerald-800 font-semibold italic">
                        Un Peuple - Un But - Une Foi
                      </p>
                      <p className="text-[10px] text-emerald-900 font-bold">
                        {data.universite?.nom || 'UNIVERSITÉ DES SCIENCES, DES TECHNIQUES ET DES TECHNOLOGIES DE BAMAKO'}
                      </p>
                    </div>

                    <div className="text-center space-y-1">
                      <div className="inline-block px-3 py-1 bg-[#107C41] text-white font-black rounded-lg text-xs tracking-wider uppercase shadow-xs">
                        BULLETIN OFFICIEL DE NOTES
                      </div>
                      <p className="text-[11px] font-bold text-emerald-900">
                        {data.semestre.libelle} • Année Académique {data.annee.code || data.annee.libelle}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <p className="font-bold text-[11px] text-emerald-950">
                        {data.faculte?.nom || 'Faculté des Sciences et Techniques (FST)'}
                      </p>
                      <p className="text-[10px] text-emerald-800 font-medium">
                        Système LMD (Licence - Master - Doctorat)
                      </p>
                      <p className="text-[10px] text-emerald-700 font-mono">
                        Date d'édition : {new Date().toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  {/* Student Metadata Card inside the Sheet */}
                  <div className="p-4 bg-white border-b border-emerald-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                    <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block font-semibold uppercase text-[9px]">Matricule Étudiant :</span>
                      <span className="font-mono font-black text-emerald-950 text-xs">{data.student.matricule}</span>
                    </div>

                    <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block font-semibold uppercase text-[9px]">Nom & Prénom :</span>
                      <span className="font-black text-emerald-950 text-xs truncate block">{data.student.prenom} {data.student.nom}</span>
                    </div>

                    <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block font-semibold uppercase text-[9px]">Filière :</span>
                      <span className="font-bold text-emerald-950 text-xs truncate block">{data.studentFiliere?.nom || 'Informatique'}</span>
                    </div>

                    <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block font-semibold uppercase text-[9px]">Classe / Promotion :</span>
                      <span className="font-bold text-emerald-950 text-xs truncate block">{data.studentClass?.nom || 'Licence 1'}</span>
                    </div>
                  </div>

                  {/* Excel Spreadsheet Table with Green Headers and Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      {/* Excel Column Coordinates (A, B, C, D, E, F, G, H, I) */}
                      <thead>
                        <tr className="bg-emerald-100/70 text-[10px] font-mono text-emerald-800 font-bold border-b border-emerald-300">
                          <th className="px-2 py-1 text-center w-8 border-r border-emerald-300 bg-emerald-200/60">#</th>
                          <th className="px-3 py-1 border-r border-emerald-300">A</th>
                          <th className="px-4 py-1 border-r border-emerald-300">B</th>
                          <th className="px-3 py-1 text-center border-r border-emerald-300">C</th>
                          <th className="px-3 py-1 text-center border-r border-emerald-300">D</th>
                          <th className="px-3 py-1 text-center border-r border-emerald-300">E</th>
                          <th className="px-3 py-1 text-center border-r border-emerald-300 bg-emerald-200/50">F</th>
                          <th className="px-3 py-1 text-center border-r border-emerald-300">G</th>
                          <th className="px-3 py-1 text-center border-r border-emerald-300">H</th>
                          <th className="px-3 py-1 text-center">I</th>
                        </tr>
                        {/* Real Table Column Headers with Excel Green Style */}
                        <tr className="bg-[#107C41] text-white text-[11px] font-bold uppercase tracking-wider border-b-2 border-emerald-800">
                          <th className="px-2 py-2.5 text-center border-r border-emerald-600 bg-emerald-900">N°</th>
                          <th className="px-3 py-2.5 border-r border-emerald-600">Code UE</th>
                          <th className="px-4 py-2.5 border-r border-emerald-600">Intitulé de la Matière / UE</th>
                          <th className="px-3 py-2.5 text-center border-r border-emerald-600">Crédits ECTS</th>
                          <th className="px-3 py-2.5 text-center border-r border-emerald-600">CC (40%)</th>
                          <th className="px-3 py-2.5 text-center border-r border-emerald-600">Examen (60%)</th>
                          <th className="px-3 py-2.5 text-center border-r border-emerald-600 bg-emerald-800">Note /20</th>
                          <th className="px-3 py-2.5 text-center border-r border-emerald-600">Points</th>
                          <th className="px-3 py-2.5 text-center border-r border-emerald-600">Validation</th>
                          <th className="px-3 py-2.5 text-center">Mention</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-emerald-200">
                        {data.rows.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center py-8 text-emerald-700 italic bg-emerald-50/20">
                              Aucune matière enregistrée pour ce semestre dans cette filière.
                            </td>
                          </tr>
                        ) : (
                          data.rows.map((row, idx) => (
                            <tr key={row.matiere.id} className={idx % 2 === 0 ? 'bg-white hover:bg-emerald-50/50' : 'bg-emerald-50/25 hover:bg-emerald-50/50'}>
                              <td className="px-2 py-2 text-center font-mono font-bold text-emerald-800 border-r border-emerald-200 bg-emerald-50/50">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-emerald-950 border-r border-emerald-200">
                                {row.matiere.code}
                              </td>
                              <td className="px-4 py-2 font-semibold text-gray-900 border-r border-emerald-200">
                                {row.matiere.nom}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-gray-800 border-r border-emerald-200">
                                {row.credits}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-gray-700 border-r border-emerald-200">
                                {row.noteCc.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-gray-700 border-r border-emerald-200">
                                {row.noteExam.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-black text-emerald-950 border-r border-emerald-200 bg-emerald-100/40">
                                {row.noteFinale.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-medium text-gray-800 border-r border-emerald-200">
                                {row.pointsPonderes.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center border-r border-emerald-200">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  row.isValidated ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {row.isValidated ? 'Validée' : 'Ajournée'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center font-semibold text-[11px] text-emerald-900">
                                {row.mentionMatiere}
                              </td>
                            </tr>
                          ))
                        )}

                        {/* Totals & Deliberations Row (Excel Green Highlight) */}
                        <tr className="bg-emerald-100/80 font-black text-emerald-950 border-t-2 border-emerald-400">
                          <td colSpan={3} className="px-4 py-2.5 text-right uppercase tracking-wider font-bold border-r border-emerald-300">
                            TOTAUX & BILAN SEMESTRIEL :
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono border-r border-emerald-300 text-emerald-900">
                            {data.totalCreditsInscrits} ECTS
                          </td>
                          <td colSpan={2} className="px-3 py-2.5 text-center border-r border-emerald-300 text-[10px] text-emerald-800">
                            Crédits Validés : <b className="text-emerald-950">{data.totalCreditsValides} / {data.totalCreditsInscrits}</b>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-black text-base text-[#107C41] border-r border-emerald-300 bg-emerald-200/80">
                            {data.moyenneGenerale.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono border-r border-emerald-300">
                            {data.totalPoints.toFixed(2)} pts
                          </td>
                          <td className="px-3 py-2.5 text-center border-r border-emerald-300">
                            <span className={`inline-block px-2.5 py-1 rounded text-xs font-black uppercase ${
                              data.isAdmis ? 'bg-emerald-600 text-white' : (data.decision === 'Compensé' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white')
                            }`}>
                              {data.decision}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-900">
                            {data.mention}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Deliberation KPI Summary Boxes (Excel Green Style) */}
                  <div className="p-4 bg-emerald-50/60 border-t-2 border-emerald-300 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-2xs text-center">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Moyenne Pondérée</span>
                      <span className="text-xl font-black text-[#107C41] font-mono">{data.moyenneGenerale.toFixed(2)} / 20</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-2xs text-center">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Crédits Capitalisés</span>
                      <span className="text-xl font-black text-emerald-950 font-mono">{data.totalCreditsValides} / {data.totalCreditsInscrits}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-2xs text-center">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Décision & Mention</span>
                      <span className="text-sm font-black text-emerald-900 block mt-1">{data.decision} ({data.mention})</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-2xs text-center">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Rang dans la Promotion</span>
                      <span className="text-xl font-black text-emerald-900 font-mono">#{data.rang}</span>
                    </div>
                  </div>

                  {/* Signatures & Seal Box */}
                  <div className="p-4 bg-white border-t border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-[10px]">
                    <div className="space-y-8">
                      <p className="font-bold text-gray-700">Le Chef de Département</p>
                      <p className="text-gray-400 italic font-mono">[Signature & Cachet]</p>
                    </div>

                    <div className="space-y-8">
                      <p className="font-bold text-gray-700">Le Président du Jury</p>
                      <p className="text-gray-400 italic font-mono">[Signature & Cachet]</p>
                    </div>

                    <div className="space-y-8">
                      <p className="font-bold text-gray-700">Le Doyen de la Faculté</p>
                      <p className="text-gray-400 italic font-mono">[Sceau Officiel USTTB]</p>
                    </div>
                  </div>

                  {/* Excel Sheet Footer Tab Bar */}
                  <div className="bg-emerald-100/90 border-t border-emerald-300 px-3 py-1.5 flex items-center justify-between text-[11px] text-emerald-900 font-semibold">
                    <div className="flex items-center gap-1">
                      <span className="px-3 py-1 bg-white border-t-2 border-x-2 border-[#107C41] text-[#107C41] font-bold rounded-t shadow-2xs">
                        📊 Feuille 1 - {data.semestre.code}
                      </span>
                      <span className="px-3 py-1 bg-emerald-200/60 text-emerald-800 font-medium rounded-t">
                        📈 Bilan Annuel
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-800 font-mono">
                      Prêt • Calcul automatique • ECTS LMD Conforme • 100%
                    </div>
                  </div>

                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 italic">
                    Conforme aux normes du Ministère de l'Enseignement Supérieur du Mali (LMD).
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBulletinExcelOpen(false)}
                    className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[12px] transition-colors"
                  >
                    Fermer
                  </button>
                </div>

              </div>
            );
          })()}
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmStudent}
        title="Confirmer la suppression"
        message={deleteConfirmStudent ? `Voulez-vous vraiment supprimer l'étudiant ${deleteConfirmStudent.prenom} ${deleteConfirmStudent.nom} (${deleteConfirmStudent.matricule}) ? Il sera déplacé vers la Corbeille.` : ''}
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteStudent}
        onClose={() => setDeleteConfirmStudent(null)}
      />

    </div>
  );
};
