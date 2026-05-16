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
  const [copied, setCopied] = useState(false);
  const [reanimateKey, setReanimateKey] = useState(0);

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
    <div className="td-card">
      {/* Preview Area */}
      <div className="td-card-preview">
        <AnimatePresence mode="popLayout">
          <motion.div 
            key={reanimateKey} 
            initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="td-card-preview-inner"
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
          <div className="td-card-animate-wrap">
            <button 
              onClick={handleAnimate}
              className="td-card-animate-btn"
            >
              Animate
            </button>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="td-card-info">
        <div className="td-card-text">
          <h3 className="td-card-title">{title}</h3>
          <p className="td-card-desc">{description}</p>
        </div>
        
        <button 
          onClick={handleCopy}
          className="td-card-copy-btn"
          title="Copy Code"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}
