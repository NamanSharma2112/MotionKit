import React from "react";
import HeroBG from "../compoents/Background";
import Link from "next/link";

export default function BackgroundPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800 flex flex-col">
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md z-50 absolute top-0 left-0">
        <Link href="/" className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors">
          &larr; Back to Home
        </Link>
        <h1 className="text-sm font-medium text-neutral-900 dark:text-white">Background Design</h1>
      </header>
      <div className="flex-1 w-full relative">
        <HeroBG />
      </div>
    </main>
  );
}
