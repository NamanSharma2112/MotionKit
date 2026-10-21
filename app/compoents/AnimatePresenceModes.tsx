"use client"

import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

type Timing = { duration: number; enterScale: number; exitScale: number }

function ModeExample({
    mode,
    icon,
    state,
    timing,
}: {
    mode: "sync" | "wait" | "popLayout"
    icon: React.ReactNode
    state: boolean
    timing: Timing
}) {
    const defaultEase = [0.26, 0.02, 0.23, 0.94]

    // Two clearly different items, legible on light and dark surfaces.
    const dynamicClasses = state
        ? "bg-white text-neutral-900 border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_-4px_rgba(0,0,0,0.1)] dark:bg-neutral-800 dark:text-white dark:border-white/10 dark:shadow-none"
        : "bg-[#1f6bff] text-white border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(31,107,255,0.5)]"

    const motionProps = {
        className: `absolute inset-0 flex items-center justify-center rounded-full border ${dynamicClasses}`,
        initial: { opacity: 0, scale: timing.enterScale },
        animate: {
            opacity: 1,
            scale: 1,
            ease: mode === "wait" ? [0.02, 0.35, 0.25, 0.99] : defaultEase,
        },
        exit: {
            opacity: 0,
            scale: timing.exitScale,
            ease: mode === "wait" ? [0.46, 0.04, 0.97, 0.44] : defaultEase,
        },
        transition: { duration: timing.duration },
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-20 w-20 flex-col items-center justify-center">
                <AnimatePresence mode={mode}>
                    <motion.div key={String(state)} {...motionProps}>
                        {icon}
                    </motion.div>
                </AnimatePresence>
            </div>
            <code className="font-mono text-[13px] font-medium text-neutral-500 dark:text-neutral-400">
                {mode}
            </code>
        </div>
    )
}

export default function AnimatePresenceModes({
    duration = 0.3,
    enterScale = 0.6,
    exitScale = 0.8,
}: {
    /** Seconds for each enter and exit. */
    duration?: number
    /** Scale an item grows from as it enters. */
    enterScale?: number
    /** Scale an item shrinks to as it exits. */
    exitScale?: number
} = {}) {
    const [state, setState] = useState(true)
    const timing = { duration, enterScale, exitScale }

    const switchItems = () => {
        setState((prev) => !prev)
    }

    return (
        <div className="flex flex-col items-center gap-10 text-neutral-900 dark:text-white">
            <div className="flex w-full items-center justify-center gap-8 sm:gap-[60px]">
                <ModeExample mode="sync" icon={<SyncIcon />} state={state} timing={timing} />
                <ModeExample mode="wait" icon={<WaitIcon />} state={state} timing={timing} />
                <ModeExample
                    mode="popLayout"
                    icon={<PopLayoutIcon />}
                    state={state}
                    timing={timing}
                />
            </div>

            <motion.button
                type="button"
                className="h-10 rounded-[10px] border border-black/[0.08] bg-white px-6 text-sm font-medium text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-colors duration-150 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#1f6bff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:ring-offset-neutral-900"
                onClick={switchItems}
                whileTap={{ scale: 0.97 }}
            >
                Switch
            </motion.button>
        </div>
    )
}

function SyncIcon() {
    return (
        <svg
            aria-hidden
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
            aria-hidden
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
            aria-hidden
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
