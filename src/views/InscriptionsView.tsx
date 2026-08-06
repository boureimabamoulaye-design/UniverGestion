import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Inscription } from '../types/database';
import { Modal } from '../components/Modal';
import { StudentSearchSelect } from '../components/StudentSearchSelect';
import { UserPlus, Users, Search, CheckCircle, Clock } from 'lucide-react';

export const InscriptionsView: React.FC = () => {
  const [list, setList] = useState<Inscription[]>(DB.getInscriptions());
  const etudiants = DB.getEtudiants();
  const classes = DB.getClasses();
  const activeAnnee = DB.getActiveAnneeAcademique();

  const [isIndivModalOpen, setIsIndivModalOpen] = useState(false);
  const [isCollectiveModalOpen, setIsCollectiveModalOpen] = useState(false);

  // Single Inscription Form
  const [indivForm, setIndivForm] = useState({
    etudiant_id: etudiants[0]?.id || 1,
    classe_id: classes[0]?.id || 1,
    type_inscription: 'Inscrire' as 'Inscrire' | 'Réinscrire',
    statut_paiement: 'Payé' as 'Non payé' | 'Partiel' | 'Payé',
    statut_validation: 'Validé' as 'En attente' | 'Validé' | 'Rejeté'
  });

  // Collective Inscription Form
  const [collectiveForm, setCollectiveForm] = useState({
    source_classe_id: classes[0]?.id || 1,
    target_classe_id: classes[1]?.id || classes[0]?.id || 1,
    type_inscription: 'Réinscrire' as 'Inscrire' | 'Réinscrire'
  });

  const handleIndivSave = (e: React.FormEvent) => {
    e.preventDefault();
    const etudiant = etudiants.find(e => e.id === Number(indivForm.etudiant_id));
    if (!etudiant) return;

    DB.saveInscription({
      etudiant_id: Number(indivForm.etudiant_id),
      classe_id: Number(indivForm.classe_id),
      annee_academique_id: activeAnnee.id,
      date_inscription: new Date().toISOString().split('T')[0],
      statut: 'Validée',
      frais_inscription: 500000
    });

    // Update student status & class
    DB.saveEtudiant({
      ...etudiant,
      classe_id: Number(indivForm.classe_id),
      statut: 'Inscrit'
    });

    setList(DB.getInscriptions());
    setIsIndivModalOpen(false);
  };

  const handleCollectiveSave = (e: React.FormEvent) => {
    e.preventDefault();
    const studentsInSourceClass = etudiants.filter(e => e.classe_id === Number(collectiveForm.source_classe_id));
    
    studentsInSourceClass.forEach(st => {
      DB.saveInscription({
        etudiant_id: st.id,
        classe_id: Number(collectiveForm.target_classe_id),
        annee_academique_id: activeAnnee.id,
        date_inscription: new Date().toISOString().split('T')[0],
        statut: 'Validée',
        frais_inscription: 50000
      });

      DB.saveEtudiant({
        ...st,
        classe_id: Number(collectiveForm.target_classe_id),
        statut: 'Inscrit'
      });
    });

    setList(DB.getInscriptions());
    setIsCollectiveModalOpen(false);
    alert(`Passage collectif réussi pour ${studentsInSourceClass.length} étudiants !`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Inscriptions & Réinscriptions</h2>
          <p className="text-xs text-gray-500 mt-1">Validation des dossiers d'inscription pour l'année {activeAnnee.code}.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollectiveModalOpen(true)}
            className="h-[44px] px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4 text-[#0066FF]" />
            <span>Passage Collective par Classe</span>
          </button>

          <button
            onClick={() => setIsIndivModalOpen(true)}
            className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Inscription Individuelle</span>
          </button>
        </div>
      </div>

      {/* Inscriptions Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Matricule</th>
                <th className="px-6 py-4">Étudiant</th>
                <th className="px-6 py-4">Classe Attribuée</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Paiement Frais</th>
                <th className="px-6 py-4 text-right">Statut Validation</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {list.map((item) => {
                const st = etudiants.find(e => e.id === item.etudiant_id);
                const cls = classes.find(c => c.id === item.classe_id);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{st?.matricule || 'N/A'}</td>
                    <td className="px-6 py-4 font-semibold text-[#1A1A1A]">
                      {st ? `${st.prenom} ${st.nom}` : 'Étudiant Inconnu'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{cls?.nom || 'Licence 1'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md font-semibold text-[10px]">
                        {item.type_inscription}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{item.statut_paiement}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {item.statut_validation}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Inscription Individuelle */}
      <Modal
        isOpen={isIndivModalOpen}
        onClose={() => setIsIndivModalOpen(false)}
        title="Nouvelle Inscription Individuelle"
      >
        <form onSubmit={handleIndivSave} className="space-y-4 text-xs">
          <div>
            <StudentSearchSelect
              etudiants={etudiants}
              selectedStudentId={indivForm.etudiant_id}
              onSelectStudent={(id) => setIndivForm({ ...indivForm, etudiant_id: id })}
              label="Sélectionner l'Étudiant (Saisie directe / Recherche) *"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Classe de Destination *</label>
              <select
                value={indivForm.classe_id}
                onChange={(e) => setIndivForm({ ...indivForm, classe_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Type d'Acte *</label>
              <select
                value={indivForm.type_inscription}
                onChange={(e) => setIndivForm({ ...indivForm, type_inscription: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white"
              >
                <option value="Inscrire">Première Inscription</option>
                <option value="Réinscrire">Réinscription / Passage</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Statut des Frais</label>
              <select
                value={indivForm.statut_paiement}
                onChange={(e) => setIndivForm({ ...indivForm, statut_paiement: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white"
              >
                <option value="Payé">Totalement Payé</option>
                <option value="Partiel">Paiement Partiel</option>
                <option value="Non payé">Exonéré / En Attente</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Validation Administrative</label>
              <select
                value={indivForm.statut_validation}
                onChange={(e) => setIndivForm({ ...indivForm, statut_validation: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-bold text-emerald-700"
              >
                <option value="Validé">Dossier Validé</option>
                <option value="En attente">En Attente de Pièces</option>
                <option value="Rejeté">Dossier Rejeté</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsIndivModalOpen(false)}
              className="h-[44px] px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[14px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="h-[44px] px-6 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-[14px]"
            >
              Valider l'Inscription
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Inscription Collective */}
      <Modal
        isOpen={isCollectiveModalOpen}
        onClose={() => setIsCollectiveModalOpen(false)}
        title="Passage / Réinscription Collective par Classe"
      >
        <form onSubmit={handleCollectiveSave} className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-100 text-[#0066FF] rounded-[12px]">
            Cette action va inscrire automatiquement tous les étudiants de la classe source vers la classe de destination pour l'année académique active ({activeAnnee.code}).
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Classe Source (Départ) *</label>
              <select
                value={collectiveForm.source_classe_id}
                onChange={(e) => setCollectiveForm({ ...collectiveForm, source_classe_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Classe de Destination (Passage) *</label>
              <select
                value={collectiveForm.target_classe_id}
                onChange={(e) => setCollectiveForm({ ...collectiveForm, target_classe_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCollectiveModalOpen(false)}
              className="h-[44px] px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[14px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="h-[44px] px-6 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-[14px]"
            >
              Valider le Passage Collectif
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
