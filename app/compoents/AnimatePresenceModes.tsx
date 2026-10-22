"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
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
    const reduceMotion = useReducedMotion()
    // Strong ease-out: quick to respond, soft to settle.
    const ease = [0.23, 1, 0.32, 1] as const

    // Two clearly different items, legible on light and dark surfaces. Both sit flat:
    // a hairline border on the neutral one, a plain accent fill on the other, no shadows.
    const dynamicClasses = state
        ? "bg-white text-neutral-900 border-black/[0.08] dark:bg-neutral-800 dark:text-white dark:border-white/10"
        : "bg-[#1f6bff] text-white border-transparent"

    const motionProps = {
        className: `absolute inset-0 flex items-center justify-center rounded-full border ${dynamicClasses}`,
        initial: { opacity: 0, scale: timing.enterScale },
        animate: { opacity: 1, scale: 1 },
        // Reduced motion keeps the crossfade and drops the scale: no shrink on exit, and the
        // entering scale settles instantly while the item is still transparent.
        exit: { opacity: 0, scale: reduceMotion ? 1 : timing.exitScale },
        // The ease lives in the transition (inside the target it was animated as a value, not used as a curve).
        transition: {
            duration: timing.duration,
            ease,
            ...(reduceMotion ? { scale: { duration: 0 } } : {}),
        },
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
            <code className="font-mono text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
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
                // Flat pill in the ink colour, like the kit's other buttons.
                className="h-10 cursor-pointer rounded-full bg-neutral-900 px-6 text-sm font-medium text-white outline-none transition-colors duration-150 ease-out hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-[#1f6bff]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:focus-visible:ring-offset-neutral-900"
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
