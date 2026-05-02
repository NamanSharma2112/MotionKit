"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";

const items = [
  { id: 1, title: "Component Library", color: "bg-blue-500" },
  { id: 2, title: "Animation Guide", color: "bg-purple-500" },
  { id: 3, title: "Design System", color: "bg-pink-500" },
  { id: 4, title: "Motion Kit", color: "bg-indigo-500" },
];

export default function StaggeredList({ trigger }: { trigger?: number }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (trigger && trigger > 0) {
      setShow(false);
      setTimeout(() => setShow(true), 100);
    }
  }, [trigger]);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const item: Variants = {
    hidden: {
      opacity: 0,
      x: -20,
      filter: "blur(10px)",
    },
    show: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring", // ✅ now correctly inferred
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <div className="w-full max-w-xs space-y-3">
      <AnimatePresence mode="wait">
        {show && (
          <motion.ul
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-2"
          >
            {items.map((i) => (
              <motion.li
                key={i.id}
                variants={item}
                className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow cursor-default"
              >
                <div
                  className={`w-2 h-2 rounded-full ${i.color} group-hover:scale-150 transition-transform`}
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {i.title}
                </span>
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-neutral-400"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}