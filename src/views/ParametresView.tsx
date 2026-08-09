import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Building2, Upload, CheckCircle2, Image as ImageIcon, Save, RefreshCw } from 'lucide-react';

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
        alert("La taille de l'image ne doit pas dépasser 2 Mo.");
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
