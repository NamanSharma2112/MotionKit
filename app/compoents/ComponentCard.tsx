"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComponentCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  code?: string;
}

export default function ComponentCard({ title, description, children, code = "" }: ComponentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    if (isModalOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex flex-col h-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
        
        {/* Top Bar for Action */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0a0a0a]/50">
          <div className="flex gap-2">
            <span className="px-3 py-1.5 text-sm font-medium rounded-md text-neutral-900 dark:text-white">
              Preview
            </span>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-1.5"
            title="View Code"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            Code
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 items-center justify-center p-8 min-h-[280px] bg-neutral-50 dark:bg-[#0a0a0a] relative overflow-hidden">
          {children}
        </div>

        {/* Info Area */}
        <div className="p-5 flex flex-col gap-1.5 bg-white dark:bg-[#111111] border-t border-neutral-200 dark:border-neutral-800 mt-auto">
          <h3 className="font-medium text-[15px] text-neutral-900 dark:text-neutral-100">{title}</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>

      {/* Code Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-full flex flex-col rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
                <h3 className="text-lg font-medium text-neutral-100">{title} - Code</h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleCopy}
                    className="p-2 rounded-md hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white flex items-center gap-1.5"
                    title="Copy code"
                  >
                    {copied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    )}
                    {copied && <span className="text-xs text-green-500 font-medium">Copied!</span>}
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-md hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-[#0d0d0d] text-neutral-300 text-[13px] sm:text-sm font-mono leading-relaxed">
                <pre><code>{code || "No code available."}</code></pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
