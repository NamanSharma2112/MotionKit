"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
} from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
};

const icons: NavItem[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    id: "background",
    label: "Backgrounds",
    path: "/background",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <circle cx="9" cy="9" r="2" />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    path: "https://github.com/NamanSharma2112/MotionKit",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5" />
      </svg>
    ),
  },
];

export default function FloatingNav() {
  const mouseX = useMotionValue<number>(0);
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;

    const isDark =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    setTheme(isDark ? "dark" : "light");

    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    document.documentElement.classList.toggle("dark", newTheme === "dark");
    document.documentElement.classList.toggle("light", newTheme === "light");
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(0)}
        className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl"
      >
        {icons.map((item) => (
          <NavIcon
            key={item.id}
            mouseX={mouseX}
            item={item}
            isActive={pathname === item.path}
          />
        ))}

        <div className="w-px h-6 bg-neutral-300/50 dark:bg-neutral-700/50 mx-1" />

        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2.5 rounded-xl bg-white/40 dark:bg-neutral-800/40 border border-white/20 dark:border-white/10"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </motion.button>
      </motion.div>
    </div>
  );
}

function NavIcon({
  mouseX,
  item,
  isActive,
}: {
  mouseX: MotionValue<number>;
  item: NavItem;
  isActive: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
    };

    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [44, 64, 44]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const isExternal = item.path.startsWith("http");

  const content = (
    <motion.div
      ref={ref}
      style={{ width }}
      className={`flex items-center justify-center aspect-square rounded-xl ${isActive
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "bg-white/50 dark:bg-neutral-800/50 text-neutral-500"
        }`}
    >
      {item.icon}
    </motion.div>
  );

  if (isExternal) {
    return (
      <a href={item.path} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={item.path}>{content}</Link>;
}