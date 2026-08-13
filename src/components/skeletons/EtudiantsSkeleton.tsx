import React from 'react';

export const EtudiantsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Chargement des étudiants...">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="h-6 w-56 bg-slate-200 rounded-lg mb-2"></div>
          <div className="h-4 w-40 bg-slate-100 rounded-md"></div>
        </div>

        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-28 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-36 bg-blue-200 rounded-xl"></div>
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="sm:col-span-2 h-11 bg-slate-100 rounded-xl"></div>
        <div className="h-11 bg-slate-100 rounded-xl"></div>
        <div className="h-11 bg-slate-100 rounded-xl"></div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200/70 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100"></div>
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-16 bg-slate-200 rounded"></div>
              <div className="h-5 w-12 bg-slate-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-4">
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
            <div className="h-4 w-32 bg-slate-200 rounded hidden md:block"></div>
            <div className="h-4 w-24 bg-slate-200 rounded hidden lg:block"></div>
          </div>
          <div className="h-4 w-20 bg-slate-200 rounded"></div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-slate-300 rounded"></div>
                  <div className="h-3 w-24 bg-slate-100 rounded"></div>
                </div>
              </div>

              <div className="hidden sm:block min-w-[120px]">
                <div className="h-4 w-20 bg-slate-200 rounded mb-1"></div>
                <div className="h-3 w-16 bg-slate-100 rounded"></div>
              </div>

              <div className="hidden md:block min-w-[130px]">
                <div className="h-5 w-24 bg-slate-100 rounded-full"></div>
              </div>

              <div className="hidden lg:block min-w-[100px]">
                <div className="h-5 w-20 bg-emerald-100/60 rounded-full"></div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Footer / Pagination */}
        <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 rounded"></div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-slate-200 rounded-lg"></div>
            <div className="h-8 w-20 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
