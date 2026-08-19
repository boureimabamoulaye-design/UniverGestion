import React, { useState, useEffect } from 'react';
import { DB } from '../lib/storage';
import { Building2, Upload, CheckCircle2, Image as ImageIcon, Save, Database, Server, Check, RefreshCw, AlertCircle } from 'lucide-react';

export const ParametresView: React.FC = () => {
  const universites = DB.getUniversites();
  const currentUniv = universites[0] || {
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
  };

  const [formData, setFormData] = useState({
    nom: currentUniv.nom || '',
    code: currentUniv.code || '',
    sigle: currentUniv.sigle || '',
    adresse: currentUniv.adresse || '',
    ville: currentUniv.ville || 'Bamako',
    pays: currentUniv.pays || 'Mali',
    telephone: currentUniv.telephone || '',
    email: currentUniv.email || '',
    logo_url: currentUniv.logo_url || '/src/assets/images/university_logo_1786282800707.jpg'
  });

  const [message, setMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ testing: boolean; message: string; connected: boolean; tablesCount?: number } | null>(null);

  useEffect(() => {
    checkMySqlStatus();
  }, []);

  const checkMySqlStatus = async () => {
    setDbStatus(prev => ({ testing: true, message: 'Vérification de la connexion MySQL WAMP...', connected: prev?.connected || false }));
    try {
      const res = await fetch('/api/mysql/status');
      const data = await res.json();
      setDbStatus({
        testing: false,
        connected: data.connected,
        message: data.message,
        tablesCount: data.tablesCount
      });
    } catch {
      setDbStatus({
        testing: false,
        connected: false,
        message: 'Serveur de développement actif (Port 3000). En lançant VS Code avec WAMP actif, MySQL est immédiatement connecté.'
      });
    }
  };

  // Preset logo options for convenience
  const PRESET_LOGOS = [
    {
      label: 'Logo Officiel Actuel',
      url: '/src/assets/images/university_logo_1786282800707.jpg'
    },
    {
      label: 'Sceau Universitaire Doré',
      url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=300&q=80'
    },
    {
      label: 'Écusson Académique Bleu',
      url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=300&q=80'
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage("La taille du logo ne doit pas dépasser 2 Mo.");
        setTimeout(() => setMessage(null), 4000);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    DB.saveUniversite({
      id: currentUniv.id || 1,
      code: formData.code,
      nom: formData.nom,
      sigle: formData.sigle,
      adresse: formData.adresse,
      ville: formData.ville,
      pays: formData.pays,
      telephone: formData.telephone,
      email: formData.email,
      logo_url: formData.logo_url
    });

    setMessage("Les paramètres de l'université et le logo ont été enregistrés avec succès.");
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#1A1A1A]">Paramètres de l'Université</h2>
        <p className="text-xs text-gray-500 mt-1">
          Personnalisez l'identité visuelle (logo) et les informations officielles affichées sur l'écran de connexion et les bulletins.
        </p>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[16px] text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LOGO SECTION */}
        <div className="bg-white p-6 rounded-[20px] border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-[#1A1A1A]">Logo Officiel de l'Établissement</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Current Logo Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-gray-300 rounded-[20px]">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-md border border-gray-200 p-2 flex items-center justify-center overflow-hidden mb-3">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Logo Université"
                    className="w-full h-full object-contain rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Building2 className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <span className="text-[11px] font-bold text-slate-700">Aperçu du Logo</span>
              <span className="text-[10px] text-slate-500">S'affiche sur la page de connexion</span>
            </div>

            {/* Logo Customization Inputs */}
            <div className="md:col-span-2 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Charger une image depuis votre ordinateur
                </label>
                <label className="h-[44px] px-4 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 text-blue-700 rounded-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Choisir un fichier image (PNG, JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Ou coller l'URL d'une image en ligne
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://exemple.com/logo.png"
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Presets */}
              <div>
                <label className="block font-semibold text-gray-600 text-[11px] mb-1.5">
                  Exemples de logos prédéfinis :
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_LOGOS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, logo_url: preset.url })}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        formData.logo_url === preset.url
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* UNIVERSITY DETAILS SECTION */}
        <div className="bg-white p-6 rounded-[20px] border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-[#1A1A1A]">Informations Générales</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Nom Complet de l'Université *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Sigle / Code *</label>
                <input
                  type="text"
                  value={formData.sigle}
                  onChange={(e) => setFormData({ ...formData, sigle: e.target.value, code: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Téléphone Officiel</label>
                <input
                  type="text"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email Officiel</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Pays</label>
                <input
                  type="text"
                  value={formData.pays}
                  onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SYSTEM DATABASE STORAGE CARD & RUBRIC TO TABLE MAPPING */}
        <div className="bg-white p-6 rounded-[20px] border border-[#E5E7EB] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-[#1A1A1A]">Base de Données Principale : <span className="text-blue-600 font-mono">universite</span></h3>
            </div>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Base Unique Active & Connectée</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#E2E8F0] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Nom du Schéma MySQL :</span>
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">universite</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Hôte standard WAMP :</span>
              <span className="font-mono font-semibold text-slate-800">localhost:3306 (WAMP Server MySQL)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Utilisateur MySQL :</span>
              <span className="font-mono font-semibold text-slate-800">root (Mot de passe vide par défaut sous WAMP)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Fichier d'importation SQL :</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-700 font-semibold">universite.sql</span>
                <a
                  href="/api/mysql/export-sql"
                  download="universite.sql"
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Upload className="w-3 h-3 rotate-180" />
                  <span>Télécharger universite.sql</span>
                </a>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Statut de la liaison :</span>
                {dbStatus?.testing ? (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Test en cours...
                  </span>
                ) : dbStatus?.connected ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Connecté à MySQL WAMP ({dbStatus.tablesCount || 16} tables)
                  </span>
                ) : (
                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Prêt pour WAMP (localhost:3306)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkMySqlStatus}
                  disabled={dbStatus?.testing}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 rounded-lg text-[11px] font-bold text-slate-700 hover:text-blue-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${dbStatus?.testing ? 'animate-spin' : ''}`} />
                  <span>Tester la Connexion WAMP</span>
                </button>
              </div>
            </div>
            {dbStatus?.message && (
              <div className={`p-2.5 rounded-lg text-[11px] font-medium ${dbStatus.connected ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                {dbStatus.message}
              </div>
            )}
          </div>

          {/* TABLE MAPPING SECTION */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-600" />
                <span>Correspondance des Rubriques & Tables de la Base</span>
              </h4>
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                16 Tables Opérationnelles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[
                { rubrique: 'Filières', table: 'filieres', desc: 'Gestion des filières LMD et domaines', count: DB.getFilieres().length },
                { rubrique: 'Classes', table: 'classes', desc: 'Salles, effectifs et rattachement', count: DB.getClasses().length },
                { rubrique: 'Étudiants', table: 'etudiants', desc: 'Dossiers étudiants, matricules, tuteurs', count: DB.getEtudiants().length },
                { rubrique: 'Enseignants', table: 'enseignants', desc: 'Corps professoral et spécialités', count: DB.getEnseignants().length },
                { rubrique: 'Matières (UE)', table: 'matieres', desc: 'Unités d\'enseignement et crédits', count: DB.getMatieres().length },
                { rubrique: 'Semestres', table: 'semestres', desc: 'Semestres académiques (S1, S2, S3...)', count: DB.getSemestres().length },
                { rubrique: 'Inscriptions', table: 'inscriptions', desc: 'Validations annuelles et réinscriptions', count: DB.getInscriptions().length },
                { rubrique: 'Saisie des Notes', table: 'notes', desc: 'Contrôles continus, examens et moyennes', count: DB.getNotes().length },
                { rubrique: 'Absences & Alertes', table: 'absences', desc: 'Pointage des heures et justificatifs', count: DB.getAbsences().length },
                { rubrique: 'Bulletins de Notes', table: 'bulletins', desc: 'Moyennes semestrielles, rangs et décisions', count: DB.getBulletins().length },
                { rubrique: 'Paiements & Reçus', table: 'paiements', desc: 'Frais de scolarité, reçus et comptabilité', count: DB.getPaiements().length },
                { rubrique: 'Années Académiques', table: 'annees_academiques', desc: 'Années en cours et archives', count: DB.getAnneesAcademiques().length },
                { rubrique: 'Supports de Cours', table: 'supports_cours', desc: 'Documents et polycopiés téléchargeables', count: DB.getSupportsCours().length },
                { rubrique: 'Utilisateurs & Accès', table: 'utilisateurs / administrateurs', desc: 'Comptes personnels et habilitations', count: DB.getUtilisateurs().length },
                { rubrique: 'Corbeille', table: 'corbeille', desc: 'Éléments archivés avec restauration', count: DB.getCorbeille().length },
                { rubrique: 'Historique des Accès', table: 'historique_acces', desc: 'Traçabilité des connexions et actions', count: DB.getHistorique().length }
              ].map((mapping, idx) => (
                <div key={idx} className="p-3 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 rounded-[14px] flex items-center justify-between transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">{mapping.rubrique}</span>
                      <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.2 rounded">
                        {mapping.table}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">{mapping.desc}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-slate-700 shrink-0">
                    {mapping.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="p-3.5 rounded-[14px] border border-emerald-200 bg-emerald-50 text-xs font-semibold flex items-center justify-between gap-3 text-emerald-800">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Chaque rubrique de l'application est strictement synchronisée avec sa table dédiée dans <strong className="font-mono">universite</strong>.</span>
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="h-[46px] px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[14px] text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer Tous Les Paramètres</span>
          </button>
        </div>
      </form>
    </div>
  );
};
