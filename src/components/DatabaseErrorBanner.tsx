import React from 'react';

interface DatabaseErrorBannerProps {
  databaseName?: string;
  errorMessage?: string;
  className?: string;
}

export const DatabaseErrorBanner: React.FC<DatabaseErrorBannerProps> = ({
  databaseName = 'universite',
  errorMessage = "SQLSTATE[HY000] [1698] Access denied for user 'root'@'localhost'",
  className = ''
}) => {
  return (
    <div className={`w-full bg-[#FFF5F5] border border-red-200/80 rounded-2xl p-6 shadow-xs ${className}`}>
      <h3 className="text-lg sm:text-xl font-bold text-[#B91C1C] tracking-tight mb-2">
        Erreur de Connexion à la Base de Données
      </h3>
      
      <p className="text-sm sm:text-base text-[#DC2626] font-medium leading-snug mb-2">
        Impossible de se connecter à MySQL pour la base <strong className="font-extrabold text-[#991B1B]">{databaseName}</strong>.
      </p>

      {errorMessage && (
        <div className="font-mono text-xs sm:text-sm text-[#991B1B] my-2 leading-relaxed break-words bg-red-100/50 p-2.5 rounded-lg border border-red-200/50">
          {errorMessage}
        </div>
      )}

      <hr className="border-t border-slate-300/80 my-4" />

      <p className="text-xs sm:text-sm text-[#B91C1C] italic font-serif">
        Vérifiez que le service MySQL / MariaDB est bien démarré sur WAMP / XAMPP.
      </p>
    </div>
  );
};
