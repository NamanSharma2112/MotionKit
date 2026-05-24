"use client"

import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

function ModeExample({
    mode,
    icon,
    state,
}: {
    mode: "sync" | "wait" | "popLayout"
    icon: React.ReactNode
    state: boolean
}) {
    const defaultEase = [0.26, 0.02, 0.23, 0.94]

    // Translating dynamic styles to Tailwind template literals
    const dynamicClasses = state
        ? "bg-white text-black border-neutral-200 dark:border-neutral-800"
        : "bg-transparent text-white border-white"

    const motionProps = {
        className: `absolute inset-0 flex items-center justify-center rounded-full border-2 ${dynamicClasses}`,
        initial: { opacity: 0, scale: 0.6 },
        animate: {
            opacity: 1,
            scale: 1,
            ease: mode === "wait" ? [0.02, 0.35, 0.25, 0.99] : defaultEase,
        },
        exit: {
            opacity: 0,
            scale: 0.8,
            ease: mode === "wait" ? [0.46, 0.04, 0.97, 0.44] : defaultEase,
        },
        transition: { duration: 0.3 },
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-20 w-20 flex-col items-center justify-center">
                <AnimatePresence mode={mode}>
                    <motion.div key={String(state)} {...motionProps}>
                        {icon}
                    </motion.div>
                </AnimatePresence>
            </div>
            <code className="text-sm font-medium text-neutral-900 dark:text-white opacity-90">
                {mode}
            </code>
        </div>
    )
}

export default function AnimatePresenceModes() {
    const [state, setState] = useState(true)

    const switchItems = () => {
        setState((prev) => !prev)
    }

    return (
        <div className="flex flex-col items-center gap-10 rounded-xl text-neutral-900 dark:text-white">
            <div className="flex w-full items-center justify-center gap-8 sm:gap-[60px]">
                <ModeExample mode="sync" icon={<SyncIcon />} state={state} />
                <ModeExample mode="wait" icon={<WaitIcon />} state={state} />
                <ModeExample
                    mode="popLayout"
                    icon={<PopLayoutIcon />}
                    state={state}
                />
            </div>

            <motion.button
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-8 py-3 font-semibold shadow-sm text-neutral-900 dark:text-white"
                onClick={switchItems}
                whileTap={{ scale: 0.95 }}
            >
                Switch
            </motion.button>
        </div>
    )
}

function SyncIcon() {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
        </svg>
    )
}

function WaitIcon() {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 2v4" />
            <path d="m16.2 7.8 2.9-2.9" />
            <path d="M18 12h4" />
            <path d="m16.2 16.2 2.9 2.9" />
            <path d="M12 18v4" />
            <path d="m4.9 19.1 2.9-2.9" />
            <path d="M2 12h4" />
            <path d="m4.9 4.9 2.9 2.9" />
        </svg>
    )
}

function PopLayoutIcon() {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
            <path d="m21 3-9 9" />
            <path d="M15 3h6v6" />
        </svg>
    )
}
