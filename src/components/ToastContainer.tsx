import React, { useEffect, useState } from 'react';
import { toast, ToastItem, ToastType } from '../lib/toast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Trash2, X, Database } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((allToasts) => {
      // Mask / hide small messages when elements are added or saved to the database
      const filtered = allToasts.filter(t => {
        const titleLower = (t.title || '').toLowerCase();
        const descLower = (t.description || '').toLowerCase();
        const isDbAddMessage = 
          titleLower.includes('enregistr') || 
          titleLower.includes('ajout') || 
          titleLower.includes('sauvegard') || 
          titleLower.includes('base de données') ||
          titleLower.includes('création') ||
          titleLower.includes('créé') ||
          descLower.includes('enregistr') ||
          descLower.includes('ajout');
        
        // Hide small DB addition notifications
        if (t.type === 'success' && isDbAddMessage) {
          return false;
        }
        if (t.type === 'info' && isDbAddMessage) {
          return false;
        }
        return true;
      });
      setToasts(filtered);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-rose-500 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    }
  };

  const getBadgeStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'delete':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getBadgeText = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'Enregistré';
      case 'delete':
        return 'Supprimé';
      case 'error':
        return 'Erreur DB';
      case 'warning':
        return 'Attention';
      case 'info':
      default:
        return 'Base de données';
    }
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="pointer-events-auto bg-slate-900/95 text-white backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl p-3.5 flex items-start gap-3 relative overflow-hidden"
          >
            {/* Left Accent Icon */}
            <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              {getToastIcon(t.type)}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${getBadgeStyle(t.type)} flex items-center gap-1`}>
                  <Database className="w-2.5 h-2.5" />
                  {getBadgeText(t.type)}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-white tracking-tight leading-snug break-words">
                {t.title}
              </h4>
              {t.description && (
                <p className="text-[11px] text-slate-300 font-normal mt-0.5 leading-relaxed break-words">
                  {t.description}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Fermer la notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
