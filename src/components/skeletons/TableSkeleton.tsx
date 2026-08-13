import React from 'react';

interface TableSkeletonProps {
  title?: string;
  columns?: number;
  rows?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  title = "Chargement...",
  columns = 5,
  rows = 6
}) => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="h-6 w-48 bg-slate-200 rounded-lg mb-1.5"></div>
          <div className="h-4 w-32 bg-slate-100 rounded-md"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-36 bg-blue-200 rounded-xl"></div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="h-10 w-72 bg-slate-100 rounded-xl"></div>
        <div className="h-10 w-32 bg-slate-100 rounded-xl hidden sm:block"></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          {[...Array(Math.min(columns, 4))].map((_, i) => (
            <div key={i} className="h-4 w-24 bg-slate-200 rounded"></div>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="h-4 w-36 bg-slate-300 rounded"></div>
              <div className="h-4 w-28 bg-slate-200 rounded hidden sm:block"></div>
              <div className="h-4 w-20 bg-slate-100 rounded hidden md:block"></div>
              <div className="h-7 w-20 bg-slate-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
