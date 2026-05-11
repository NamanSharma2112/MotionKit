"use client"
import React, { useEffect } from 'react'
import { motion, SVGMotionProps } from "motion/react"
import { SVGProps } from "react";
import { filter } from 'motion/react-client';

const Gooey = () => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const buttonVariants = { collapsed: { width: 115, marginLeft:0 }, expanded: { width: 200, marginLeft:50 } }
  const [searchText, setSearchText] = React.useState('')
  const iconBubbleVariants = { collapsed: { scale: 0, opacity: 0 }, expanded: { scale: 1, opacity: 1 } }
  const TRANSITION =  { duration:0.4, type: "spring" as const, bounce:0.25 }
  
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    } else {
        setSearchText('')
    }
  }, [isExpanded]);
 
  return (
    <>
      <SVGFilter />
      <div style={{ filter: 'url(#gooey-filter)' }} className='relative flex h-10 items-center justify-center'>
        <motion.div
            variants={buttonVariants}
            initial="collapsed"
            animate={isExpanded ? "expanded" : "collapsed"}
            transition={TRANSITION}
            className="h-10 flex items-center justify-center"
        >
            <button
                onClick={() => setIsExpanded(true)}
                className='h-10 w-full cursor-pointer rounded-full font-medium gap-2 justify-center flex items-center px-4 bg-black text-white'
            >
                {!isExpanded && <SearchIcon className="h-10 w-10" />}

                <motion.input
                    ref={inputRef}
                    layoutId="input"
                    type='text'
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onBlur={() => !searchText && setIsExpanded(false)}
                    placeholder='Search'
                    className='h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/50 font-extralight' />
            </button>
        </motion.div>

        <motion.div
            variants={iconBubbleVariants}
            initial="collapsed"
            animate={isExpanded ? "expanded" : "collapsed"}
            transition={TRANSITION}
            className='absolute top-1/2 left-0 size-10 -translate-y-1/2 bg-black items-center justify-center flex rounded-full'
        >
            <SearchIcon className="h-7 w-8 text-white" />
        </motion.div>
      </div>
    </>
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

const SVGFilter = () => {
    return (
        <svg className="absolute hidden h-0 w-0">
  <defs>
    <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
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
