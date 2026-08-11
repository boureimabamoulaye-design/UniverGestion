import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { safeFetchJson } from '../lib/api';
import { DatabaseErrorBanner } from './DatabaseErrorBanner';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Download, Server, Key, Globe } from 'lucide-react';

interface MySQLConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MySQLConfigModal: React.FC<MySQLConfigModalProps> = ({ isOpen, onClose }) => {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('universite');
  
  const [status, setStatus] = useState<{
    loading: boolean;
    connected?: boolean;
    message?: string;
    config?: any;
    hint?: string;
  }>({ loading: true });

  const [testResult, setTestResult] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
  }>({ testing: false });

  const checkStatus = async () => {
    setStatus({ loading: true });
    try {
      const data = await safeFetchJson('/api/mysql/status');
      setStatus({
        loading: false,
        connected: !!data.connected,
        message: data.message,
        config: data.config,
        hint: data.hint
      });
    } catch (err: any) {
      setStatus({
        loading: false,
        connected: false,
        message: "API backend MySQL non joignable",
        hint: "Vérifiez le serveur Node.js backend."
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const handleTestCustomConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult({ testing: true });
    try {
      const data = await safeFetchJson('/api/mysql/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database })
      });

      if (data.success) {
        setTestResult({
          testing: false,
          success: true,
          message: data.message || "Connexion MySQL réussie !"
        });
      } else {
        setTestResult({
          testing: false,
          success: false,
          message: data.error || data.message || "Impossible de se connecter au serveur MySQL"
        });
      }
    } catch (err: any) {
      setTestResult({
        testing: false,
        success: false,
        message: "Erreur lors de la tentative de connexion API"
      });
    }
  };

  const handleDownloadSchema = () => {
    window.open('/api/mysql/schema.sql', '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connexion API & Base de Données MySQL" maxWidth="max-w-3xl">
      <div className="space-y-6 text-sm text-slate-800">
        
        {/* Status Indicator Banner */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
          status.loading 
            ? 'bg-slate-50 border-slate-200'
            : status.connected 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          {status.loading ? (
            <RefreshCw className="w-5 h-5 text-slate-500 animate-spin flex-shrink-0 mt-0.5" />
          ) : status.connected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm uppercase tracking-tight">
                {status.loading ? 'Vérification du statut MySQL...' : status.connected ? 'Serveur MySQL Connecté' : 'Mode API Hybride / Test MySQL'}
              </h4>
              <button 
                onClick={checkStatus}
                className="p-1 hover:bg-black/5 rounded-lg text-slate-600 transition-colors"
                title="Actualiser le statut"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs mt-1 font-medium leading-relaxed">
              {status.message}
            </p>

            {status.config && (
              <div className="mt-2 text-[11px] font-mono bg-white/80 p-2 rounded-xl border border-black/5 flex flex-wrap gap-x-4 gap-y-1">
                <span>Hôte: <b>{status.config.host}:{status.config.port}</b></span>
                <span>Base: <b>{status.config.database}</b></span>
                <span>Utilisateur: <b>{status.config.user}</b></span>
              </div>
            )}
          </div>
        </div>

        {/* Live Test Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Tester une Connexion MySQL Directe</h3>
            </div>
            <button
              onClick={handleDownloadSchema}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger script .SQL MySQL
            </button>
          </div>

          <form onSubmit={handleTestCustomConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                Hôte MySQL (Host)
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost ou IP"
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Port MySQL
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="3306"
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Utilisateur MySQL (User)
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="root"
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                Mot de passe (Password)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe MySQL..."
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                Nom de la Base de Données
              </label>
              <input
                type="text"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="universite"
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={testResult.testing}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {testResult.testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  <span>Tester la Connexion API MySQL</span>
                </button>

                {testResult.message && testResult.success && (
                  <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    {testResult.message}
                  </div>
                )}
              </div>

              {testResult.message && !testResult.success && (
                <div className="text-xs font-semibold p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
                  {testResult.message}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Environment File Instruction */}
        <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs space-y-2 font-mono">
          <p className="font-bold text-blue-400"># Fichier d'Environnement (.env.example)</p>
          <p className="text-slate-400">Pour connecter l'application à votre serveur MySQL en permanence :</p>
          <pre className="bg-slate-950 p-3 rounded-xl text-emerald-400 overflow-x-auto border border-slate-800">
{`MYSQL_HOST=${host || 'localhost'}
MYSQL_PORT=${port || '3306'}
MYSQL_USER=${user || 'root'}
MYSQL_PASSWORD=${password || ''}
MYSQL_DATABASE=${database || 'universite'}`}
          </pre>
        </div>

      </div>
    </Modal>
  );
};
