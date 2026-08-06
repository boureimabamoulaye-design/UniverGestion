import React, { useState, useEffect } from 'react';
import { DB } from '../lib/storage';
import { CorbeilleItem } from '../types/database';
import { Trash2, RotateCcw, AlertTriangle, RefreshCw, Archive, Search, CheckCircle } from 'lucide-react';

export const CorbeilleView: React.FC = () => {
  const [items, setItems] = useState<CorbeilleItem[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadCorbeille = () => {
    setItems(DB.getCorbeille());
  };

  useEffect(() => {
    DB.logAccess('VISITE_PAGE', 'Consultation de la Corbeille et éléments supprimés');
    loadCorbeille();
  }, []);

  const handleRestore = (id: number, titre: string) => {
    const success = DB.restoreFromCorbeille(id);
    if (success) {
      setMessage(`"${titre}" a été restauré avec succès !`);
      setTimeout(() => setMessage(null), 4000);
      loadCorbeille();
    } else {
      alert('Impossible de restaurer cet élément.');
    }
  };

  const handleDeletePermanent = (id: number, titre: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer définitivement "${titre}" ? Cette action est irréversible.`)) {
      DB.deletePermanentlyFromCorbeille(id);
      loadCorbeille();
    }
  };

  const handleEmptyTrash = () => {
    if (window.confirm('Voulez-vous vraiment vider intégralement la corbeille ? Tous les éléments seront définitivement effacés.')) {
      DB.clearCorbeille();
      loadCorbeille();
    }
  };

  const filteredItems = items.filter(item =>
    item.titre.toLowerCase().includes(search.toLowerCase()) ||
    item.type_element.toLowerCase().includes(search.toLowerCase()) ||
    item.details.toLowerCase().includes(search.toLowerCase()) ||
    item.supprime_le.includes(search)
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[12px] border border-gray-300 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-700" />
            <h2 className="text-lg font-bold text-slate-900">Corbeille & Éléments Supprimés</h2>
            <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded text-[10px] font-bold">
              Poubelle Sécurisée
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Les éléments mis en corbeille (étudiants, notes, matières, etc.) peuvent être restaurés à tout moment dans les registres actifs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadCorbeille}
            className="h-[36px] px-3 bg-white hover:bg-slate-50 text-slate-700 border border-gray-300 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Actualiser</span>
          </button>

          {items.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="h-[36px] px-4 bg-red-700 hover:bg-red-800 text-white rounded-[6px] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vider la corbeille</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-[8px] text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700" />
          <span>{message}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-[12px] border border-gray-300 shadow-xs">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Rechercher dans la corbeille..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[38px] bg-white border border-gray-300 rounded-[6px] pl-9 pr-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Administrative Trash Table */}
      <div className="bg-white rounded-[12px] border border-gray-300 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-100 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-slate-800" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Registre des Objets Archivés en Corbeille
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-700">
            {filteredItems.length} élément(s) en attente
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-spacing-0">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-gray-300">
                <th className="px-4 py-3 text-center w-12 border-r border-gray-300">N°</th>
                <th className="px-4 py-3 border-r border-gray-300 w-36 text-center">Type d'Élément</th>
                <th className="px-5 py-3 border-r border-gray-300">Intitulé / Nom de l'Élément</th>
                <th className="px-5 py-3 border-r border-gray-300">Détails de l'Objet</th>
                <th className="px-4 py-3 border-r border-gray-300 w-40 font-mono text-center">Date de Suppression</th>
                <th className="px-4 py-3 text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                    La corbeille est vide. Aucun élément supprimé.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-slate-100/60 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px] font-bold border-r border-gray-200">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200">
                      <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-800 rounded border border-slate-300 text-[10px] font-bold uppercase">
                        {item.type_element}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 border-r border-gray-200">
                      {item.titre}
                    </td>
                    <td className="px-5 py-3 text-slate-600 border-r border-gray-200">
                      {item.details}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700 border-r border-gray-200 text-[11px]">
                      {item.supprime_le}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleRestore(item.id, item.titre)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-[5px] text-[11px] font-bold flex items-center gap-1 transition-colors"
                          title="Restaurer cet élément"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurer</span>
                        </button>
                        <button
                          onClick={() => handleDeletePermanent(item.id, item.titre)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-[5px] text-[11px] font-bold flex items-center gap-1 transition-colors"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Purger</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
