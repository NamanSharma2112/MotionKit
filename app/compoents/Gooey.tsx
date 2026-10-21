"use client"
import React, { useEffect, useId } from 'react'
import { motion, LayoutGroup, SVGMotionProps } from "motion/react"

type GooeyProps = {
  placeholder?: string
  /** Width (px) of the input once expanded. */
  expandedWidth?: number
  /** Blur behind the goo; higher melts the shapes together more. */
  gooBlur?: number
  spring?: { duration?: number; visualDuration?: number; bounce?: number; stiffness?: number; damping?: number; mass?: number }
}

const Gooey = ({
  placeholder = 'Search',
  expandedWidth = 200,
  gooBlur = 5,
  spring = { duration: 0.4, bounce: 0.25 },
}: GooeyProps = {}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Unique ids so several instances on one page don't share a filter or layout animation.
  const uid = useId().replace(/:/g, '')
  const filterId = `gooey-filter-${uid}`
  const buttonVariants = { collapsed: { width: 115, marginLeft: 0 }, expanded: { width: expandedWidth, marginLeft: 50 } }
  const [searchText, setSearchText] = React.useState('')
  const iconBubbleVariants = { collapsed: { scale: 0.9, opacity: 0 }, expanded: { scale: 1, opacity: 1 } }
  const TRANSITION = { type: "spring" as const, ...spring }

  useEffect(() => {
    if (isExpanded) inputRef.current?.focus()
  }, [isExpanded])

  const collapse = () => {
    setIsExpanded(false)
    setSearchText('')
  }

  return (
    <LayoutGroup id={uid}>
      <SVGFilter id={filterId} blur={gooBlur} />
      <div style={{ filter: `url(#${filterId})` }} className='relative flex h-10 items-center justify-center'>
        <motion.div
          variants={buttonVariants}
          initial="collapsed"
          animate={isExpanded ? "expanded" : "collapsed"}
          transition={TRANSITION}
          className="flex h-10 items-center justify-center"
        >
          <div
            onClick={() => setIsExpanded(true)}
            className='flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 text-white dark:bg-white dark:text-neutral-900'
          >
            {!isExpanded && <SearchIcon className="size-[22px] shrink-0" aria-hidden />}

            <motion.input
              ref={inputRef}
              layoutId="input"
              type='text'
              aria-label={placeholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onBlur={() => !searchText && collapse()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  collapse()
                  inputRef.current?.blur()
                }
              }}
              placeholder={placeholder}
              className='h-full w-full min-w-0 cursor-pointer bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/55 focus:cursor-text dark:text-neutral-900 dark:placeholder:text-neutral-900/50'
            />
          </div>
        </motion.div>

        <motion.div
          variants={iconBubbleVariants}
          initial="collapsed"
          animate={isExpanded ? "expanded" : "collapsed"}
          transition={TRANSITION}
          className='absolute top-1/2 left-0 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
        >
          <SearchIcon className="size-[22px]" aria-hidden />
        </motion.div>
      </div>
    </LayoutGroup>
  )
}

export default Gooey


const SearchIcon = (props: SVGMotionProps<SVGSVGElement>) => {
  return (
    <motion.svg
      layoutId="search-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        d="m19.485 20.154l-6.262-6.262q-.75.639-1.725.989t-1.96.35q-2.398 0-4.064-1.666Q3.808 11.898 3.808 9.5t1.666-4.064t4.064-1.667t4.065 1.667T15.269 9.5q0 1.042-.369 2.017t-.97 1.668l6.262 6.261zM9.539 14.23q1.99 0 3.36-1.37t1.37-3.361t-1.37-3.36t-3.36-1.37t-3.361 1.37t-1.37 3.36t1.37 3.36t3.36 1.37"
      />
    </motion.svg>
  );
};

const SVGFilter = ({ id, blur }: { id: string; blur: number }) => {
  return (
    <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 20 -10"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  )
}
