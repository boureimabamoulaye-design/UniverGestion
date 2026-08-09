import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { HistoriqueAcces } from '../types/database';
import {
  History,
  Search,
  Trash2,
  RefreshCw,
  Activity,
  LogIn,
  Edit,
  PlusCircle,
  RotateCcw,
  Filter
} from 'lucide-react';

export const HistoriqueView: React.FC = () => {
  const [logs, setLogs] = useState<HistoriqueAcces[]>(() => DB.getHistorique());
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const refreshLogs = () => {
    setLogs(DB.getHistorique());
  };

  const handleClear = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vider l'historique de navigation et d'accès ?")) {
      DB.clearHistorique();
      setLogs([]);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.event_type.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === 'ALL' || log.event_type === selectedType;

    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CONNEXION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <LogIn className="w-3 h-3" />
            Connexion
          </span>
        );
      case 'CREATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="w-3 h-3" />
            Création
          </span>
        );
      case 'MODIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Edit className="w-3 h-3" />
            Modification
          </span>
        );
      case 'SUPPRESSION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <Trash2 className="w-3 h-3" />
            Suppression
          </span>
        );
      case 'RESTAURATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw className="w-3 h-3" />
            Restauration
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Activity className="w-3 h-3" />
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            <span>Historique des Activités & Journal d'Accès</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Traçabilité complète des actions, modifications, saisies de notes et connexions des utilisateurs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refreshLogs}
            className="h-[40px] px-3 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-slate-700 rounded-[12px] text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rafraîchir</span>
          </button>

          {logs.length > 0 && (
            <button
              onClick={handleClear}
              className="h-[40px] px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-[12px] text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vider l'historique</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-[16px] border border-[#E5E7EB] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher par action, description..."
            className="w-full h-[40px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-blue-600"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-slate-600">Filtrer par type :</span>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="h-[40px] bg-white border border-[#E5E7EB] rounded-[12px] px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">Tous les types ({logs.length})</option>
            <option value="CONNEXION">Connexions</option>
            <option value="CREATION">Créations</option>
            <option value="MODIFICATION">Modifications</option>
            <option value="SUPPRESSION">Suppressions</option>
            <option value="RESTAURATION">Restaurations</option>
            <option value="CONSULTATION">Consultations</option>
          </select>
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="px-6 py-4">Date & Heure</th>
                <th className="px-6 py-4">Type d'Événement</th>
                <th className="px-6 py-4">Description de l'Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800 text-xs">
                      {item.created_at}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(item.event_type)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-semibold text-xs leading-relaxed">
                        {item.description}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                    <History className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">Aucune donnée trouvée dans l'historique.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-gray-500">
            <div>
              Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredLogs.length)} sur {filteredLogs.length} entrées
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 font-semibold"
              >
                Précédent
              </button>
              <span className="px-3 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 font-semibold"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
