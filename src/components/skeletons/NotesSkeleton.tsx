import React from 'react';

export const NotesSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Chargement des notes et évaluations...">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="h-6 w-64 bg-slate-200 rounded-lg mb-2"></div>
          <div className="h-4 w-48 bg-slate-100 rounded-md"></div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-10 w-28 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-36 bg-blue-200 rounded-xl"></div>
        </div>
      </div>

      {/* Mandatory Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
        </div>
      </div>

      {/* Progress & Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/70 space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-6 w-16 bg-slate-300 rounded"></div>
          <div className="h-2 w-full bg-slate-100 rounded-full"></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/70 space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-6 w-16 bg-slate-300 rounded"></div>
          <div className="h-2 w-full bg-slate-100 rounded-full"></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/70 space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-6 w-16 bg-slate-300 rounded"></div>
          <div className="h-2 w-full bg-slate-100 rounded-full"></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/70 space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-6 w-16 bg-slate-300 rounded"></div>
          <div className="h-2 w-full bg-slate-100 rounded-full"></div>
        </div>
      </div>

      {/* Sub-Filters / Search bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/70">
        <div className="h-10 w-full sm:w-72 bg-slate-100 rounded-xl"></div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="h-9 w-24 bg-slate-100 rounded-lg"></div>
          <div className="h-9 w-24 bg-slate-100 rounded-lg"></div>
          <div className="h-9 w-24 bg-slate-100 rounded-lg"></div>
        </div>
      </div>

      {/* Notes Matrix Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="h-4 w-44 bg-slate-300 rounded"></div>
          <div className="flex gap-4">
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-6 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                <div className="space-y-1">
                  <div className="h-3.5 w-32 bg-slate-300 rounded"></div>
                  <div className="h-3 w-20 bg-slate-100 rounded"></div>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="h-9 w-16 bg-slate-100 rounded-lg"></div>
                <div className="h-9 w-16 bg-slate-100 rounded-lg"></div>
                <div className="h-9 w-20 bg-blue-50 border border-blue-100 rounded-lg"></div>
                <div className="h-6 w-16 bg-emerald-100/60 rounded-full hidden sm:block"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
          <div className="h-9 w-40 bg-blue-600/30 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
};
