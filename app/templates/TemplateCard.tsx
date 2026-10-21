"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* A large homepage-style card: live preview on top, title, description and a
   copy button underneath. */
export default function TemplateCard({
  id,
  title,
  description,
  code,
  tags,
  previewClassName = "",
  children,
}: {
  id: string;
  title: string;
  description: string;
  code: string;
  tags?: string[];
  previewClassName?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <motion.article
      id={id}
      className="mk-card"
      initial={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(12px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-60px 0px" }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      <div className={`mk-card-preview ${previewClassName}`} style={{ height: "auto" }}>
        {children}
      </div>

      <div className="mk-card-body flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="mk-card-title" style={{ fontSize: 16 }}>{title}</h2>
          <p className="mk-card-desc max-w-[560px]">{description}</p>
          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="mk-badge">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="mk-btn mk-btn-ghost mk-btn-sm shrink-0 self-start sm:self-auto"
          onClick={copy}
          aria-label={copied ? "Copied" : `Copy ${title} code`}
        >
          <span className="mk-swap" data-state={copied ? "b" : "a"}>
            <Copy size={14} className="mk-swap-a" />
            <Check size={14} className="mk-swap-b" />
          </span>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
    </motion.article>
  );
}
