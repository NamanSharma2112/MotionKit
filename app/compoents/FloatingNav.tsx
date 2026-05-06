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
import { Home, Image, Sun, Moon, Layers } from "lucide-react";

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
    icon: <Home size={20} />,
  },
  {
    id: "background",
    label: "Backgrounds",
    path: "/background",
    icon: <Image size={20} />,
  },
  {
    id: "shadow",
    label: "Shadow Play",
    path: "/shadow",
    icon: <Layers size={20} />,
  },
  {
    id: "github",
    label: "GitHub",
    path: "https://github.com/NamanSharma2112/MotionKit",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
      0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754
      -1.089-.744.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236
      1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.76-1.605
      -2.665-.3-5.467-1.335-5.467-5.93 0-1.31.468-2.38 1.235-3.22
      -.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23
      .957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404
      2.29-1.552 3.296-1.23 3.296-1.23.653 1.653.242 2.874.118 3.176
      .77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.625-5.48 5.92
      .43.37.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293
      0 .322.216.694.825.576C20.565 21.795 24 17.295 24 12
      24 5.37 18.63 0 12 0z" />
      </svg>
    ),
  }
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

        {/* Separator */}
        <div className="w-px h-6 bg-neutral-300/50 dark:bg-neutral-700/50 mx-1" />

        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2.5 rounded-xl bg-white/40 dark:bg-neutral-800/40 border border-white/20 dark:border-white/10 text-neutral-900 dark:text-neutral-100"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
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
    if (val === 0) return Infinity;
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
    };

    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [44, 56, 44]);

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 200,
    damping: 15,
  });

  const isExternal = item.path.startsWith("http");

  const content = (
    <motion.div
      ref={ref}
      style={{ width }}
      className={`relative flex items-center justify-center aspect-square rounded-xl transition-colors duration-200 ease-out ${isActive
        ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
        : "bg-white/50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        } border border-white/20 dark:border-white/10`}
    >
      {item.icon}

      {/* Active Dot */}
      {isActive && (
        <motion.div
          layoutId="active-nav"
          className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-neutral-900 dark:bg-white"
        />
      )}

      {/* Tooltip */}
      <div className="absolute -top-10 px-2 py-1 rounded-md bg-neutral-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {item.label}
      </div>
    </motion.div>
  );

  if (isExternal) {
    return (
      <a href={item.path} target="_blank" rel="noopener noreferrer" className="group">
        {content}
      </a>
    );
  }

  return (
    <Link href={item.path} className="group">
      {content}
    </Link>
  );
}