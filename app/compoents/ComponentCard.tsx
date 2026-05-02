"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComponentCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  code?: string;
  showAnimateButton?: boolean;
}

export default function ComponentCard({ 
  title, 
  description, 
  children, 
  code = "", 
  showAnimateButton = false 
}: ComponentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reanimateKey, setReanimateKey] = useState(0);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    if (isModalOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnimate = () => {
    setReanimateKey(prev => prev + 1);
  };

  return (
    <>
      <div className="group flex flex-col h-full rounded-[2rem] border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111111] p-2 overflow-hidden transition-all duration-300 hover:shadow-xl dark:hover:shadow-neutral-900/50">
        
        {/* Playground Area */}
        <div className="relative flex flex-1 items-center justify-center min-h-[300px] bg-neutral-50 dark:bg-[#0a0a0a] rounded-[1.5rem] overflow-hidden border border-neutral-100/50 dark:border-neutral-800/50">
          <AnimatePresence mode="popLayout">
            <motion.div 
              key={reanimateKey} 
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full flex items-center justify-center p-8"
            >
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  // @ts-ignore
                  return React.cloneElement(child, { trigger: reanimateKey });
                }
                return child;
              })}
            </motion.div>
          </AnimatePresence>

          {/* Animate Button */}
          {showAnimateButton && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <button 
                onClick={handleAnimate}
                className="px-5 py-2 text-sm font-medium rounded-full bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm transition-all hover:scale-105 active:scale-95 hover:bg-white dark:hover:bg-neutral-700 cursor-pointer"
              >
                Animate
              </button>
            </div>
          )}
        </div>
        
        {/* Divider Line */}
        <div className="h-px w-[calc(100%-2.5rem)] mx-auto bg-neutral-200/50 dark:bg-neutral-800/50" />

        {/* Info Area */}
        <div className="px-5 py-5 flex items-center justify-between gap-4 min-h-[90px]">
          <div className="flex flex-col gap-1 overflow-hidden">
            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-neutral-100 truncate">{title}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-tight">{description}</p>
          </div>
          
          <button 
            onClick={handleCopy}
            className="flex-shrink-0 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all hover:scale-110 active:scale-90"
            title="Copy Code"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Keep the Modal for those who want to see the full code by clicking title maybe? 
          Actually, the blueprint doesn't show a way to see code, just copy. 
          I'll remove the modal for now to keep it lean as per blueprint, 
          but I'll keep the logic if the user asks for it back. */}
    </>
  );
}
