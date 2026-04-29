import React from 'react';

interface ComponentCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function ComponentCard({ title, description, children }: ComponentCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      {/* Preview Area */}
      <div className="flex items-center justify-center p-8 min-h-[280px] bg-neutral-50 dark:bg-[#0a0a0a] relative border-b border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {children}
        <div className="absolute top-4 right-4 flex gap-2">
          {/* Action icon placeholders, e.g. copy or view code */}
          <button className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 dark:text-neutral-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>
      </div>
      {/* Info Area */}
      <div className="p-5 flex flex-col gap-1.5 bg-white dark:bg-[#111111]">
        <h3 className="font-medium text-[15px] text-neutral-900 dark:text-neutral-100">{title}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
    </div>
  );
}
