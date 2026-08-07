import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Absence } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { AlertCircle, Plus, Search, CheckCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { StudentSearchSelect } from '../components/StudentSearchSelect';

export const AbsencesView: React.FC = () => {
  const [list, setList] = useState<Absence[]>(DB.getAbsences());
  const etudiants = DB.getEtudiants();
  const matieres = DB.getMatieres();
  const activeAnnee = DB.getActiveAnneeAcademique();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    etudiant_id: etudiants[0]?.id || 1,
    matiere_id: matieres[0]?.id || 1,
    date_absence: new Date().toISOString().split('T')[0],
    heures: 2,
    justifie: false,
    motif: 'Absence non justifiée'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    DB.saveAbsence({
      etudiant_id: Number(formData.etudiant_id),
      matiere_id: Number(formData.matiere_id),
      date_absence: formData.date_absence,
      heures: Number(formData.heures),
      justifiee: formData.justifie,
      motif: formData.motif
    });

    setList(DB.getAbsences());
    setIsModalOpen(false);
  };

  const handleToggleJustify = (absence: Absence) => {
    DB.saveAbsence({
      ...absence,
      justifiee: !absence.justifiee,
      motif: !absence.justifiee ? 'Motif médical fourni' : 'Absence non justifiée'
    });
    setList(DB.getAbsences());
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteAbsence = () => {
    if (deleteConfirmId !== null) {
      DB.deleteAbsence(deleteConfirmId);
      setList(DB.getAbsences());
      setDeleteConfirmId(null);
    }
  };

  // Check students with > 3 non-justified absences
  const unjustifiedByStudent = list.reduce((acc, a) => {
    if (!a.justifie) {
      acc[a.etudiant_id] = (acc[a.etudiant_id] || 0) + 1;
    }
    return acc;
  }, {} as { [id: number]: number });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Absences & Alertes d'Assiduité</h2>
          <p className="text-xs text-gray-500 mt-1">Saisie des cours, vérification des justificatifs et avertissements d'assiduité.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Saisir une Absence</span>
        </button>
      </div>

      {/* Real-time Alerts Banner for repeat offenders (> 3 absences) */}
      {Object.keys(unjustifiedByStudent).some(id => unjustifiedByStudent[Number(id)] >= 3) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-[16px] flex items-start gap-3 text-xs text-amber-800">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Alerte d'Assiduité : Risque d'Ajournement</span>
            <p className="mt-0.5">
              Certains étudiants ont dépassé le seuil critique de 3 absences non justifiées. Des alertes administratives ont été envoyées sur leurs portails respectifs.
            </p>
          </div>
        </div>
      )}

      {/* Absences Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Matricule</th>
                <th className="px-6 py-4">Étudiant</th>
                <th className="px-6 py-4">Matière</th>
                <th className="px-6 py-4">Date & Volume</th>
                <th className="px-6 py-4">Motif</th>
                <th className="px-6 py-4 text-right">Statut Justificatif</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {list.map((item) => {
                const st = etudiants.find(e => e.id === item.etudiant_id);
                const mat = matieres.find(m => m.id === item.matiere_id);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{st?.matricule || 'N/A'}</td>
                    <td className="px-6 py-4 font-semibold text-[#1A1A1A]">
                      {st ? `${st.prenom} ${st.nom}` : 'Étudiant'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{mat?.nom || 'UE'}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono">
                      {item.date_absence} ({item.heures}h)
                    </td>
                    <td className="px-6 py-4 text-gray-500">{item.motif || 'Aucun motif'}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleJustify(item)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                          item.justifie
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {item.justifie ? 'Justifié' : 'Non Justifié (Valider)'}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[10px] text-xs font-semibold inline-flex items-center"
                        title="Supprimer la saisie d'absence"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Saisie Absence */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Saisir une Absence de Cours"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <StudentSearchSelect
              etudiants={etudiants}
              selectedStudentId={formData.etudiant_id}
              onSelectStudent={(id) => setFormData({ ...formData, etudiant_id: id })}
              label="Étudiant Concerné (Saisie directe) *"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Matière / Cours *</label>
              <select
                value={formData.matiere_id}
                onChange={(e) => setFormData({ ...formData, matiere_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {matieres.map(m => (
                  <option key={m.id} value={m.id}>{m.code} - {m.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Date d'Absence *</label>
              <input
                type="date"
                value={formData.date_absence}
                onChange={(e) => setFormData({ ...formData, date_absence: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Volume Horaire (Heures)</label>
              <input
                type="number"
                min={1}
                max={8}
                value={formData.heures}
                onChange={(e) => setFormData({ ...formData, heures: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Motif d'Absence</label>
              <input
                type="text"
                value={formData.motif}
                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                placeholder="Raison médicale, voyage, etc."
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.justifie}
                onChange={(e) => setFormData({ ...formData, justifie: e.target.checked })}
                className="w-4 h-4 text-[#0066FF] rounded"
              />
              Absence justifiée avec certificat médical ou justificatif officiel
            </label>
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
              Enregistrer l'Absence
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Confirmer la suppression d'absence"
        message="Voulez-vous vraiment supprimer cette saisie d'absence ?"
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteAbsence}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};
