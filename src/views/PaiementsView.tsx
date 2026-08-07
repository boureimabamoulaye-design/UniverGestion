import React, { useState, useEffect } from 'react';
import { DB } from '../lib/storage';
import { Paiement } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { CreditCard, Plus, Printer, Edit2, Trash2, Eye, ShieldCheck } from 'lucide-react';
import { StudentSearchSelect } from '../components/StudentSearchSelect';

export const PaiementsView: React.FC = () => {
  const [list, setList] = useState<Paiement[]>(DB.getPaiements());

  useEffect(() => {
    const handleSync = () => setList(DB.getPaiements());
    window.addEventListener('unigestion_db_change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('unigestion_db_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);
  const etudiants = DB.getEtudiants();
  const filieres = DB.getFilieres();
  const annees = DB.getAnneesAcademiques();
  const activeAnnee = DB.getActiveAnneeAcademique();
  const universiteNom = "USTTB - Université de Bamako";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Paiement | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Delete confirmation modal state
  const [deletingPaiement, setDeletingPaiement] = useState<Paiement | null>(null);

  const [formData, setFormData] = useState({
    etudiant_id: etudiants[0]?.id || 1,
    type_frais: 'Scolarité' as 'Inscription' | 'Scolarité' | 'Rattrapage' | 'Diplôme' | 'Examen' | 'Autre',
    filiere_code: 'IG1',
    annee_academique_id: activeAnnee?.id || 1,
    montant_total: 150000,
    montant_paye: 150000,
    mode_paiement: 'Orange Money' as 'Espèces' | 'Chèque' | 'Virement' | 'Orange Money' | 'Wave',
    date_paiement: new Date().toISOString().split('T')[0],
    statut: 'Complet' as 'Complet' | 'Partiel' | 'En retard' | 'En attente'
  });

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      etudiant_id: etudiants[0]?.id || 1,
      type_frais: 'Scolarité',
      filiere_code: 'IG1',
      annee_academique_id: activeAnnee?.id || 1,
      montant_total: 150000,
      montant_paye: 150000,
      mode_paiement: 'Orange Money',
      date_paiement: new Date().toISOString().split('T')[0],
      statut: 'Complet'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Paiement) => {
    setEditingId(item.id);
    setFormData({
      etudiant_id: item.etudiant_id,
      type_frais: item.type_frais,
      filiere_code: item.filiere_code || 'IG1',
      annee_academique_id: item.annee_academique_id || activeAnnee?.id || 1,
      montant_total: item.montant || item.montant_paye,
      montant_paye: item.montant_paye,
      mode_paiement: item.mode_paiement,
      date_paiement: item.date_paiement || new Date().toISOString().split('T')[0],
      statut: item.statut as any || 'Complet'
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const existingItem = editingId ? list.find(p => p.id === editingId) : null;
    const randomRef = existingItem?.reference_recu || `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const montant = Number(formData.montant_total);
    const montantPaye = Number(formData.montant_paye);

    const selectedAnneeObj = annees.find(a => a.id === Number(formData.annee_academique_id));
    const anneeLibelle = selectedAnneeObj ? selectedAnneeObj.code.replace('-', ' - ') : '2025 - 2026';

    const savedPaiement = DB.savePaiement({
      id: editingId || undefined,
      etudiant_id: Number(formData.etudiant_id),
      annee_academique_id: Number(formData.annee_academique_id),
      filiere_code: formData.filiere_code,
      annee_libelle: anneeLibelle,
      type_frais: formData.type_frais,
      montant,
      montant_paye: montantPaye,
      reste_a_payer: Math.max(0, montant - montantPaye),
      mode_paiement: formData.mode_paiement,
      reference_recu: randomRef,
      date_paiement: formData.date_paiement,
      statut: formData.statut as any
    });

    setList(DB.getPaiements());
    setIsModalOpen(false);

    if (!editingId) {
      setViewingReceipt(savedPaiement);
      setIsReceiptModalOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingPaiement) {
      DB.deletePaiement(deletingPaiement.id);
      setList(DB.getPaiements());
      setDeletingPaiement(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion Financière & Recouvrement des Frais</h2>
          <p className="text-xs text-gray-500 mt-1">Scolarité, frais d'inscription, règlements par Orange Money, Wave ou Virement.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Enregistrer un Règlement</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Réf. Reçu</th>
                <th className="px-6 py-4">Étudiant</th>
                <th className="px-6 py-4">Filière</th>
                <th className="px-6 py-4">Année Académique</th>
                <th className="px-6 py-4">Type de Frais</th>
                <th className="px-6 py-4 text-[#0066FF]">Montant Encaissé</th>
                <th className="px-6 py-4">Mode de Règlement</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-400 font-medium">
                    Aucun paiement enregistré.
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const st = etudiants.find(e => e.id === item.etudiant_id);
                  const anneeObj = annees.find(a => a.id === item.annee_academique_id);
                  const anneeText = item.annee_libelle || (anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026');
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-gray-700">{item.reference_recu}</td>
                      <td className="px-6 py-4 font-semibold text-[#1A1A1A]">{st?.prenom} {st?.nom}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{item.filiere_code || 'IG1'}</td>
                      <td className="px-6 py-4 font-medium text-slate-600">{anneeText}</td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{item.type_frais}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600 font-mono text-sm">
                        {item.montant_paye.toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md font-semibold text-[10px]">
                          {item.mode_paiement}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono">{item.date_paiement}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setViewingReceipt(item); setIsReceiptModalOpen(true); }}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-[#0066FF] rounded-[10px] text-xs font-bold transition-colors"
                            title="Consulter / Imprimer le reçu"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-[10px] text-xs font-bold transition-colors"
                            title="Modifier le paiement"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingPaiement(item)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-[10px] text-xs font-bold transition-colors"
                            title="Supprimer le paiement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nouveau / Modification Règlement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Modifier le Règlement de Frais" : "Enregistrer un Règlement de Frais Scolaires"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <StudentSearchSelect
              etudiants={etudiants}
              selectedStudentId={formData.etudiant_id}
              onSelectStudent={(id) => setFormData({ ...formData, etudiant_id: id })}
              label="Étudiant Débiteur *"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Filière / Niveau *</label>
              <select
                value={formData.filiere_code}
                onChange={(e) => setFormData({ ...formData, filiere_code: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {filieres.length > 0 ? (
                  filieres.map(f => (
                    <option key={f.id} value={f.code}>{f.code} - {f.nom}</option>
                  ))
                ) : (
                  <>
                    <option value="IG1">IG1 - Informatique de Gestion 1</option>
                    <option value="IG2">IG2 - Informatique de Gestion 2</option>
                    <option value="IG3">IG3 - Informatique de Gestion 3</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Année Académique *</label>
              <select
                value={formData.annee_academique_id}
                onChange={(e) => setFormData({ ...formData, annee_academique_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {annees.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code.replace('-', ' - ')} {a.est_active ? '(Actuelle)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Type de Frais *</label>
              <select
                value={formData.type_frais}
                onChange={(e) => setFormData({ ...formData, type_frais: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                <option value="Scolarité">Frais de Scolarité Annuelle</option>
                <option value="Inscription">Frais d'Inscription / Dossier</option>
                <option value="Rattrapage">Frais de Session de Rattrapage</option>
                <option value="Diplôme">Frais d'Édition Diplôme / Attestation</option>
                <option value="Examen">Frais d'Examen</option>
                <option value="Autre">Autre Frais</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mode de Règlement *</label>
              <select
                value={formData.mode_paiement}
                onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-semibold text-[#0066FF]"
              >
                <option value="Orange Money">Orange Money Mali</option>
                <option value="Wave">Wave Mali</option>
                <option value="Espèces">Espèces (Caisse Comptable)</option>
                <option value="Virement">Virement BDM / BOA</option>
                <option value="Chèque">Chèque Bancaire</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Date de Paiement *</label>
            <input
              type="date"
              value={formData.date_paiement}
              onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Montant Total Dû (FCFA) *</label>
              <input
                type="number"
                step="5000"
                value={formData.montant_total}
                onChange={(e) => setFormData({ ...formData, montant_total: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Montant Versé (FCFA) *</label>
              <input
                type="number"
                step="5000"
                value={formData.montant_paye}
                onChange={(e) => setFormData({ ...formData, montant_paye: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-mono font-bold text-emerald-600"
                required
              />
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
              {editingId ? "Enregistrer les modifications" : "Valider le Paiement & Éditer le Reçu"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal Suppression */}
      <Modal
        isOpen={deletingPaiement !== null}
        onClose={() => setDeletingPaiement(null)}
        title="Supprimer le Règlement"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700 font-medium">
            Êtes-vous sûr de vouloir supprimer définitivement le paiement <strong className="font-mono text-slate-900">{deletingPaiement?.reference_recu}</strong> d'un montant de <strong className="text-emerald-600">{deletingPaiement?.montant_paye.toLocaleString()} FCFA</strong> ?
          </p>
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDeletingPaiement(null)}
              className="h-[40px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[12px]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="h-[40px] px-5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-[12px]"
            >
              Confirmer la suppression
            </button>
          </div>
        </div>
      </Modal>

      {/* Printable Receipt Modal */}
      {viewingReceipt && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Reçu de Paiement Officiel"
        >
          <div className="space-y-6 text-xs text-[#1A1A1A] p-6 bg-white rounded-[16px] border border-gray-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-[#0066FF] uppercase">{universiteNom}</h3>
                <p className="text-[10px] text-gray-500">Service de la Comptabilité et du Recouvrement</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-gray-800 text-sm block">{viewingReceipt.reference_recu}</span>
                <span className="text-[10px] text-gray-400 font-mono">{viewingReceipt.date_paiement}</span>
              </div>
            </div>

            {(() => {
              const st = etudiants.find(e => e.id === viewingReceipt.etudiant_id);
              const anneeObj = annees.find(a => a.id === viewingReceipt.annee_academique_id);
              const anneeText = viewingReceipt.annee_libelle || (anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026');
              return (
                <div className="space-y-3 bg-gray-50 p-4 rounded-[14px]">
                  <p><span className="font-bold">Étudiant :</span> {st?.prenom} {st?.nom} ({st?.matricule})</p>
                  <p><span className="font-bold">Filière :</span> {viewingReceipt.filiere_code || 'IG1'}</p>
                  <p><span className="font-bold">Année Académique :</span> {anneeText}</p>
                  <p><span className="font-bold">Objet du Règlement :</span> {viewingReceipt.type_frais}</p>
                  <p><span className="font-bold">Mode de Paiement :</span> {viewingReceipt.mode_paiement}</p>
                  <p className="text-base font-bold text-emerald-600 font-mono mt-2 pt-2 border-t border-gray-200">
                    Montant Encaissé : {viewingReceipt.montant_paye.toLocaleString()} FCFA
                  </p>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-4 border-t">
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 font-semibold rounded-[12px]"
              >
                Fermer
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-[12px] flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le Reçu</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={!!deletingPaiement}
        title="Confirmer la suppression du paiement"
        message={deletingPaiement ? `Voulez-vous vraiment supprimer le paiement de ${deletingPaiement.montant_paye.toLocaleString()} FCFA (Réf: ${deletingPaiement.reference_recu}) ?` : ''}
        confirmLabel="Oui, supprimer"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingPaiement(null)}
      />

    </div>
  );
};

