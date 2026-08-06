import React, { useState, useEffect } from 'react';
import { DB } from '../lib/storage';
import { HistoriqueAcces } from '../types/database';
import { Clock, Search, Trash2, Download, Filter, Eye, RefreshCw, ShieldCheck } from 'lucide-react';

export const HistoriqueView: React.FC = () => {
  const [logs, setLogs] = useState<HistoriqueAcces[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    // Log page visit
    DB.logAccess('VISITE_PAGE', 'Consultation du Journal d\'Historique des Actions et Visites');
    setLogs(DB.getHistorique());
  }, []);

  const handleRefresh = () => {
    setLogs(DB.getHistorique());
  };

  const handleClearHistory = () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer tout le journal d\'historique ?')) {
      DB.clearHistorique();
      setLogs([]);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesType = filterType === 'ALL' || log.event_type === filterType;
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.event_type.toLowerCase().includes(search.toLowerCase()) ||
      log.ip_adresse.toLowerCase().includes(search.toLowerCase()) ||
      log.created_at.includes(search);
    return matchesType && matchesSearch;
  });

  const handleExportCSV = () => {
    let csv = 'ID;Date_Heure;Type_Evenement;Adresse_IP;Description\n';
    filteredLogs.forEach(l => {
      csv += `${l.id};"${l.created_at}";"${l.event_type}";"${l.ip_adresse}";"${l.description.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `journal_historique_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Title & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[12px] border border-gray-300 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-800" />
            <h2 className="text-lg font-bold text-slate-900">Journal d'Historique & Traçabilité</h2>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold">
              Sûreté Administrative
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enregistrement chronologique complet de chaque visite, saisie de note, modification, export et suppression effectuée.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            className="h-[36px] px-3 bg-white hover:bg-slate-50 text-slate-700 border border-gray-300 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="h-[36px] px-3 bg-white hover:bg-slate-50 text-slate-700 border border-gray-300 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exporter Journal CSV</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="h-[36px] px-3 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Vider l'historique</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-[12px] border border-gray-300 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher par action, IP, date ou description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[38px] bg-white border border-gray-300 rounded-[6px] pl-9 pr-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Type d'Événement :</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-[38px] bg-white border border-gray-300 rounded-[6px] px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-600"
          >
            <option value="ALL">Tous les événements ({logs.length})</option>
            <option value="VISITE_PAGE">Visites de Pages</option>
            <option value="NOTE_SAISIE">Saisie de Notes</option>
            <option value="MODIFICATION_NOTE">Modifications</option>
            <option value="SUPPRESSION">Suppressions</option>
            <option value="RESTAURATION">Restaurations</option>
            <option value="EXPORT">Exportations</option>
            <option value="CONNEXION">Connexions</option>
          </select>
        </div>
      </div>

      {/* Administrative Register Journal Table */}
      <div className="bg-white rounded-[12px] border border-gray-300 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-100 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-800" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Registre Officiel d'Audit & Traçabilité des Actions
            </span>
          </div>
          <span className="text-xs font-medium text-slate-600">
            {filteredLogs.length} entrée(s) affichée(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-spacing-0">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-gray-300">
                <th className="px-4 py-3 text-center w-12 border-r border-gray-300">N°</th>
                <th className="px-4 py-3 border-r border-gray-300 w-44">Date & Heure Horodatée</th>
                <th className="px-4 py-3 border-r border-gray-300 w-36 text-center">Type d'Action</th>
                <th className="px-4 py-3 border-r border-gray-300 w-32 font-mono text-center">Adresse IP</th>
                <th className="px-5 py-3">Description Complète de l'Opération</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 font-medium">
                    Aucune entrée trouvée dans l'historique d'audit.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';
                  if (log.event_type === 'VISITE_PAGE') badgeStyle = 'bg-blue-50 text-blue-900 border-blue-200';
                  if (log.event_type === 'NOTE_SAISIE' || log.event_type === 'MODIFICATION_NOTE') badgeStyle = 'bg-amber-50 text-amber-900 border-amber-200';
                  if (log.event_type === 'SUPPRESSION') badgeStyle = 'bg-red-50 text-red-900 border-red-200';
                  if (log.event_type === 'RESTAURATION') badgeStyle = 'bg-emerald-50 text-emerald-900 border-emerald-200';
                  if (log.event_type === 'EXPORT') badgeStyle = 'bg-purple-50 text-purple-900 border-purple-200';

                  return (
                    <tr key={log.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-slate-100/60 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px] font-bold border-r border-gray-200">
                        {log.id}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 border-r border-gray-200">
                        {log.created_at}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-gray-200">
                        <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600 border-r border-gray-200 text-[11px]">
                        {log.ip_adresse}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {log.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
