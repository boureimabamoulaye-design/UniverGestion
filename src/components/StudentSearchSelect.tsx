import React, { useState, useRef, useEffect } from 'react';
import { Etudiant } from '../types/database';
import { Search, UserCheck, ChevronDown, Check } from 'lucide-react';

interface StudentSearchSelectProps {
  etudiants: Etudiant[];
  selectedStudentId: number | null;
  onSelectStudent: (studentId: number) => void;
  placeholder?: string;
  label?: string;
}

export const StudentSearchSelect: React.FC<StudentSearchSelectProps> = ({
  etudiants,
  selectedStudentId,
  onSelectStudent,
  placeholder = "Saisir le nom, prénom ou matricule pour rechercher...",
  label = "Étudiant"
}) => {
  const selectedStudent = etudiants.find(e => e.id === selectedStudentId);
  const [query, setQuery] = useState(
    selectedStudent ? `${selectedStudent.matricule} - ${selectedStudent.prenom} ${selectedStudent.nom}` : ''
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedStudent) {
      setQuery(`${selectedStudent.matricule} - ${selectedStudent.prenom} ${selectedStudent.nom}`);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEtudiants = etudiants.filter(e => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      e.nom.toLowerCase().includes(q) ||
      e.prenom.toLowerCase().includes(q) ||
      e.matricule.toLowerCase().includes(q) ||
      `${e.prenom} ${e.nom}`.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && <label className="block text-xs font-bold text-slate-800 mb-1.5">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-[38px] bg-white border border-gray-300 rounded-[6px] pl-9 pr-8 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-700"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-[6px] shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100 animate-in fade-in duration-150">
          {filteredEtudiants.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 font-medium text-center">
              Aucun étudiant ne correspond à "{query}"
            </div>
          ) : (
            filteredEtudiants.map(e => {
              const isSelected = e.id === selectedStudentId;
              return (
                <div
                  key={e.id}
                  onClick={() => {
                    onSelectStudent(e.id);
                    setQuery(`${e.matricule} - ${e.prenom} ${e.nom}`);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2.5 hover:bg-slate-100 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                    isSelected ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    <div>
                      <span className="font-mono font-bold text-slate-900 mr-2">{e.matricule}</span>
                      <span className="font-semibold">{e.prenom} {e.nom}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
