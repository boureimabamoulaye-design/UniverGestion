import React from 'react';
import {
  Etudiant,
  Note,
  Matiere,
  Classe,
  Filiere,
  Faculte,
  Universite,
  AnneeAcademique,
  Semestre
} from '../types/database';
import { DB } from '../lib/storage';
import { Award, Building2, Printer, Check, X, GraduationCap } from 'lucide-react';

interface ExcelBulletinViewProps {
  etudiant: Etudiant;
  semestre: Semestre;
  notes: Note[];
  matieres: Matiere[];
  classe?: Classe;
  filiere?: Filiere;
  faculte?: Faculte;
  universite?: Universite;
  anneeAcademique?: AnneeAcademique;
  onPrint?: () => void;
}

export const ExcelBulletinView: React.FC<ExcelBulletinViewProps> = ({
  etudiant,
  semestre,
  notes = [],
  matieres = [],
  classe,
  filiere,
  faculte,
  universite,
  anneeAcademique,
  onPrint
}) => {
  // Safe student fallback
  const safeEtudiant = etudiant || {
    id: 1,
    matricule: '2024-USTTB-001',
    nom: 'Traoré',
    prenom: 'Mamadou',
    sexe: 'M' as const,
    date_naissance: '12/05/2003',
    lieu_naissance: 'Bamako',
    nationalite: 'Malienne',
    email: 'm.traore@usttb.edu.ml',
    telephone: '+223 76 00 11 22',
    adresse: 'Bamako',
    classe_id: 1,
    date_inscription: '2025-10-01',
    statut: 'Inscrit' as const,
    mot_de_passe: 'etudiant123'
  };

  const safeSemestreId = semestre?.id || 1;
  const safeSemestreLibelle = semestre?.libelle || 'Semestre 1';

  // Filter matieres belonging to this semester & filiere
  const semesterMatieres = matieres.filter(
    m => m.semestre_id === safeSemestreId && (m.filiere_id === filiere?.id || m.filiere_id === (safeEtudiant as any)?.filiere_id || true)
  );

  // Group matieres into UE Categories (UE MAJEURES, UE MINEURES, UE LIBRES)
  interface UESectionItem {
    matiere: Matiere;
    note_cc: number | null;
    note_examen: number | null;
    moyenne_finale: number | null;
    credits: number;
    mention: string;
    statut: 'Validé' | 'Non validé';
  }

  interface UECategory {
    type: string;
    title: string;
    items: UESectionItem[];
  }

  const categoryMap = new Map<string, UECategory>();

  semesterMatieres.forEach((mat, idx) => {
    // Determine note for this student & subject
    const noteObj = notes.find(n => n.matiere_id === mat.id && n.etudiant_id === safeEtudiant.id);
    const cc = noteObj ? noteObj.note_cc : null;
    const exam = noteObj ? noteObj.note_examen : null;
    const noteFinale = noteObj ? noteObj.note_finale : (cc !== null && exam !== null ? Math.round((cc * 0.4 + exam * 0.6) * 100) / 100 : null);

    const credits = mat.credits || 3;
    const statut: 'Validé' | 'Non validé' = noteFinale !== null && noteFinale >= 10 ? 'Validé' : 'Non validé';

    let mention = 'En attente';
    if (noteFinale !== null) {
      if (noteFinale >= 16) mention = 'Très Bien';
      else if (noteFinale >= 14) mention = 'Bien';
      else if (noteFinale >= 12) mention = 'Assez Bien';
      else if (noteFinale >= 10) mention = 'Passable';
      else mention = 'Ajourné';
    }

    const typeKey = mat.ue_type || (idx < 3 ? 'Majeure' : 'Mineure');
    const categoryTitle = typeKey === 'Majeure' ? 'UE MAJEURES' : typeKey === 'Mineure' ? 'UE MINEURES' : 'UE LIBRES';

    if (!categoryMap.has(categoryTitle)) {
      categoryMap.set(categoryTitle, {
        type: typeKey,
        title: categoryTitle,
        items: []
      });
    }

    categoryMap.get(categoryTitle)!.items.push({
      matiere: mat,
      note_cc: cc,
      note_examen: exam,
      moyenne_finale: noteFinale,
      credits,
      mention,
      statut
    });
  });

  const categoryList = Array.from(categoryMap.values());

  // Calculate UE summaries and overall stats
  let totalCreditsGlobaux = 0;
  let totalCreditsValidesGlobaux = 0;
  let totalCreditsNonValidesGlobaux = 0;

  let pointsMajeures = 0;
  let creditsMajeures = 0;

  let pointsMineures = 0;
  let creditsMineures = 0;

  let pointsTotaux = 0;

  categoryList.forEach(cat => {
    cat.items.forEach(item => {
      totalCreditsGlobaux += item.credits;
      if (item.moyenne_finale !== null) {
        pointsTotaux += item.moyenne_finale * item.credits;
      }

      if (item.statut === 'Validé') {
        totalCreditsValidesGlobaux += item.credits;
      } else {
        totalCreditsNonValidesGlobaux += item.credits;
      }

      if (cat.type === 'Majeure') {
        if (item.moyenne_finale !== null) pointsMajeures += item.moyenne_finale * item.credits;
        creditsMajeures += item.credits;
      } else {
        if (item.moyenne_finale !== null) pointsMineures += item.moyenne_finale * item.credits;
        creditsMineures += item.credits;
      }
    });
  });

  const moyenneMajeures = creditsMajeures > 0 ? (pointsMajeures / creditsMajeures).toFixed(2) : '0.00';
  const moyenneMineures = creditsMineures > 0 ? (pointsMineures / creditsMineures).toFixed(2) : '0.00';
  const moyenneGenerale = totalCreditsGlobaux > 0 ? (pointsTotaux / totalCreditsGlobaux).toFixed(2) : '0.00';

  const dateEdition = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Calculate decision & mention LMD
  const avgNum = parseFloat(moyenneGenerale);
  let decisionJury = 'AJOURNÉ';
  let mentionGenerale = 'Ajourné';

  if (avgNum >= 10) {
    if (totalCreditsNonValidesGlobaux === 0) {
      decisionJury = 'ADMIS';
    } else {
      decisionJury = 'ADMIS PAR COMPENSATION';
    }

    if (avgNum >= 16) mentionGenerale = 'Mention Très Bien';
    else if (avgNum >= 14) mentionGenerale = 'Mention Bien';
    else if (avgNum >= 12) mentionGenerale = 'Mention Assez Bien';
    else mentionGenerale = 'Mention Passable';
  } else {
    decisionJury = 'AJOURNÉ';
    mentionGenerale = 'Sans Mention';
  }

  // Calculate annual stats across all semestres of the academic year for this student/filière
  const allDBSemestres = DB.getSemestres();
  const allDBNotes = DB.getNotes();
  const allDBMatieres = DB.getMatieres();
  const allDBClasses = DB.getClasses();
  const allDBFilieres = DB.getFilieres();

  const studentClasse = classe || allDBClasses.find(c => c.id === safeEtudiant.classe_id) || allDBClasses[0];
  const studentFiliere = filiere || allDBFilieres.find(f => f.id === studentClasse?.filiere_id) || allDBFilieres[0];

  // Get semestres belonging to the student's level or all semestres
  let yearSemestres = allDBSemestres.filter(s => {
    if (studentClasse?.niveau_id) {
      return s.niveau_id === studentClasse.niveau_id;
    }
    return true;
  });

  if (yearSemestres.length === 0) {
    yearSemestres = allDBSemestres.slice(0, 2);
  }

  // Ensure current active semester is included
  if (!yearSemestres.some(s => s.id === safeSemestreId) && semestre) {
    yearSemestres.push(semestre);
  }

  yearSemestres.sort((a, b) => (a.ordre || a.id) - (b.ordre || b.id));

  interface SemesterSummaryItem {
    semestre: Semestre;
    moyenne: number | null;
    totalCredits: number;
    creditsValides: number;
    statut: 'Validé' | 'Non validé' | 'En cours';
    mention: string;
  }

  let totalPointsYear = 0;
  let totalCreditsYear = 0;
  let totalCreditsValidesYear = 0;

  const annualSemestersSummary: SemesterSummaryItem[] = yearSemestres.map(s => {
    if (s.id === safeSemestreId) {
      totalPointsYear += pointsTotaux;
      totalCreditsYear += totalCreditsGlobaux;
      totalCreditsValidesYear += totalCreditsValidesGlobaux;

      return {
        semestre: s,
        moyenne: avgNum,
        totalCredits: totalCreditsGlobaux,
        creditsValides: totalCreditsValidesGlobaux,
        statut: avgNum >= 10 ? 'Validé' : 'Non validé',
        mention: mentionGenerale.replace('Mention ', '')
      };
    }

    const sMatieres = allDBMatieres.filter(
      m => m.semestre_id === s.id && (m.filiere_id === studentFiliere?.id || true)
    );

    let sPoints = 0;
    let sCredits = 0;
    let sCreditsValides = 0;
    let hasNotes = false;

    sMatieres.forEach(mat => {
      const nObj = allDBNotes.find(n => n.matiere_id === mat.id && n.etudiant_id === safeEtudiant.id);
      const cc = nObj ? nObj.note_cc : null;
      const exam = nObj ? nObj.note_examen : null;
      const noteFin = nObj ? nObj.note_finale : (cc !== null && exam !== null ? Math.round((cc * 0.4 + exam * 0.6) * 100) / 100 : null);

      const credits = mat.credits || 3;
      if (noteFin !== null) {
        hasNotes = true;
        sPoints += noteFin * credits;
        sCredits += credits;
        if (noteFin >= 10) sCreditsValides += credits;
      } else {
        sCredits += credits;
      }
    });

    const sMoyenne = hasNotes && sCredits > 0 ? parseFloat((sPoints / sCredits).toFixed(2)) : null;

    if (hasNotes) {
      totalPointsYear += sPoints;
      totalCreditsYear += sCredits;
      totalCreditsValidesYear += sCreditsValides;
    }

    let sMention = 'En attente';
    if (sMoyenne !== null) {
      if (sMoyenne >= 16) sMention = 'Très Bien';
      else if (sMoyenne >= 14) sMention = 'Bien';
      else if (sMoyenne >= 12) sMention = 'Assez Bien';
      else if (sMoyenne >= 10) sMention = 'Passable';
      else sMention = 'Ajourné';
    }

    return {
      semestre: s,
      moyenne: sMoyenne,
      totalCredits: sCredits,
      creditsValides: sCreditsValides,
      statut: sMoyenne === null ? 'En cours' : (sMoyenne >= 10 ? 'Validé' : 'Non validé'),
      mention: sMention
    };
  });

  const annualAverage = totalCreditsYear > 0 ? parseFloat((totalPointsYear / totalCreditsYear).toFixed(2)) : avgNum;

  let annualMention = 'Sans Mention';
  let annualDecision = 'AJOURNÉ';
  let annualDecisionDetail = 'Crédits ECTS insuffisants pour le passage';

  if (annualAverage >= 16) annualMention = 'Mention Très Bien';
  else if (annualAverage >= 14) annualMention = 'Mention Bien';
  else if (annualAverage >= 12) annualMention = 'Mention Assez Bien';
  else if (annualAverage >= 10) annualMention = 'Mention Passable';

  if (annualAverage >= 10 && totalCreditsValidesYear >= 54) {
    annualDecision = 'ADMIS EN NIVEAU SUPÉRIEUR';
    annualDecisionDetail = 'Passage de droit accordé par le jury d\'année';
  } else if (annualAverage >= 10) {
    annualDecision = 'ADMIS PAR COMPENSATION ANNUELLE';
    annualDecisionDetail = 'Passage accordé - Moyenne générale annuelle ≥ 10/20';
  } else if (totalCreditsValidesYear >= 30) {
    annualDecision = 'AUTORISÉ À REDOUBLER (ENJAMBEMENT LMD)';
    annualDecisionDetail = 'Crédits ECTS cumulés ≥ 30 - Autorisation d\'enjambement pédagogique';
  } else {
    annualDecision = 'AJOURNÉ (REDOUBLEMENT)';
    annualDecisionDetail = 'Crédits ECTS insuffisants (< 30 ECTS) - Redoublement requis';
  }

  return (
    <div className="space-y-4">
      {/* Main Official Printable Document Container */}
      <div className="bg-white text-slate-900 font-sans p-3.5 sm:p-6 md:p-8 border border-slate-300 rounded-sm shadow-xs max-w-4xl mx-auto print:border-none print:p-0">

        {/* UNIFIED BULLETIN TABLE + SYNTHÈSE DES RÉSULTATS COLLÉE EN BAS */}
        <div className="mb-2 border border-slate-400 rounded-xs overflow-x-auto bg-white shadow-xs">
          <table className="w-full text-xs sm:text-[13px] border-collapse min-w-[600px]">
            <colgroup><col className="w-[40%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[11%]" /><col className="w-[11%]" /></colgroup>
            <thead>
              <tr className="bg-slate-200 text-slate-800 font-bold text-[11px] sm:text-xs uppercase border-b border-slate-400">
                <th className="p-2 text-left align-middle border-r border-slate-400">ÉLÉMENTS CONSTITUTIFS (MATIÈRES)</th>
                <th className="p-1.5 text-center align-middle border-r border-slate-400">CC</th>
                <th className="p-1.5 text-center align-middle border-r border-slate-400">EX</th>
                <th className="p-1.5 text-center align-middle border-r border-slate-400 bg-slate-300 font-extrabold">MG</th>
                <th className="p-1.5 text-center align-middle border-r border-slate-400">CREDIT</th>
                <th className="p-1.5 text-center align-middle border-r border-slate-400">MENTION</th>
                <th className="p-1.5 text-center align-middle">APPRÉCIATION</th>
              </tr>
            </thead>
            <tbody>
              {categoryList.map((cat, catIdx) => {
                // Category Totals
                let totalCreditsCat = 0;
                let validesCreditsCat = 0;
                let sumWeightedNotesCat = 0;

                cat.items.forEach(i => {
                  totalCreditsCat += i.credits;
                  if (i.moyenne_finale !== null) {
                    sumWeightedNotesCat += i.moyenne_finale * i.credits;
                  }
                  if (i.statut === 'Validé') validesCreditsCat += i.credits;
                });

                const avgCatNum = totalCreditsCat > 0 ? (sumWeightedNotesCat / totalCreditsCat) : 0;
                const avgCatStr = totalCreditsCat > 0 ? avgCatNum.toFixed(2) : '0';

                return (
                  <React.Fragment key={catIdx}>
                    {/* Subject Rows */}
                    {cat.items.map((item, itemIdx) => {
                      const noteCCFormatted = item.note_cc !== null ? (Number.isInteger(item.note_cc) ? item.note_cc : item.note_cc.toFixed(1)) : '—';
                      const noteEXFormatted = item.note_examen !== null ? (Number.isInteger(item.note_examen) ? item.note_examen : item.note_examen.toFixed(1)) : '—';
                      const moyenneFormatted = item.moyenne_finale !== null ? (Number.isInteger(item.moyenne_finale) ? item.moyenne_finale : item.moyenne_finale.toFixed(1)) : '—';

                      return (
                        <tr key={itemIdx} className="hover:bg-slate-50 border-b border-slate-300 text-xs sm:text-[12px]">
                          {/* EC / Subject Name */}
                          <td className="p-2 text-left align-middle font-bold text-slate-900 border-r border-slate-300 leading-snug">
                            <span className="font-extrabold text-slate-950">{item.matiere.code}</span> : {item.matiere.nom}
                          </td>
                          {/* CC */}
                          <td className="p-1.5 text-center align-middle font-mono border-r border-slate-300 whitespace-nowrap">
                            {noteCCFormatted}
                          </td>
                          {/* EX */}
                          <td className="p-1.5 text-center align-middle font-mono border-r border-slate-300 whitespace-nowrap">
                            {noteEXFormatted}
                          </td>
                          {/* MG */}
                          <td className="p-1.5 text-center align-middle font-mono font-extrabold text-slate-900 border-r border-slate-300 bg-slate-50 whitespace-nowrap">
                            {moyenneFormatted}
                          </td>
                          {/* CREDIT */}
                          <td className="p-1.5 text-center align-middle font-mono font-semibold border-r border-slate-300 whitespace-nowrap">
                            {item.credits}
                          </td>
                          {/* MENTION */}
                          <td className="p-1.5 text-center align-middle font-medium text-slate-700 border-r border-slate-300 whitespace-nowrap">
                            {item.mention}
                          </td>
                          {/* APPRÉCIATION */}
                          <td className="p-1.5 text-center align-middle font-bold whitespace-nowrap">
                            {item.statut === 'Validé' ? (
                              <span className="text-emerald-700 font-bold">Validé</span>
                            ) : (
                              <span className="text-red-600 font-bold">Ajourné</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Category UE Summary Sub-total Row */}
                    <tr className="bg-slate-100 font-bold text-xs border-b-2 border-slate-400">
                      <td colSpan={3} className="p-2 text-center align-middle text-slate-900 uppercase font-extrabold border-r border-slate-300 tracking-wider">
                        {cat.title}
                      </td>
                      <td className="p-1.5 text-center align-middle font-mono font-extrabold text-slate-900 border-r border-slate-300 bg-slate-200 whitespace-nowrap">
                        {avgCatStr}
                      </td>
                      <td className="p-1.5 text-center align-middle font-mono font-extrabold border-r border-slate-300 whitespace-nowrap">
                        {totalCreditsCat}
                      </td>
                      <td className="p-1.5 align-middle border-r border-slate-300"></td>
                      <td className="p-1.5 text-center align-middle font-bold text-emerald-700 uppercase whitespace-nowrap">
                        Validé
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* Total Semester Row (Highlight Blue) */}
              <tr className="bg-[#dbe2f4] text-slate-900 font-extrabold text-xs sm:text-[13px] border-t-2 border-b border-slate-400">
                <td colSpan={3} className="p-2 text-center align-middle uppercase tracking-wider border-r border-slate-400">
                  Total : {safeSemestreLibelle}
                </td>
                <td className="p-1.5 text-center align-middle font-mono text-slate-900 border-r border-slate-400 whitespace-nowrap font-extrabold bg-[#cbd7f5]">
                  {moyenneGenerale}
                </td>
                <td className="p-1.5 text-center align-middle font-mono border-r border-slate-400 whitespace-nowrap">
                  {totalCreditsValidesGlobaux} / {totalCreditsGlobaux}
                </td>
                <td className="p-1.5 text-center align-middle font-semibold border-r border-slate-400 whitespace-nowrap">
                  {mentionGenerale.replace('Mention ', '')}
                </td>
                <td className="p-1.5 text-center align-middle uppercase whitespace-nowrap">
                  <span className={decisionJury.startsWith('ADMIS') ? 'text-emerald-700 font-extrabold' : 'text-red-700 font-extrabold'}>
                    {decisionJury.startsWith('ADMIS') ? 'Validé' : 'Ajourné'}
                  </span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
