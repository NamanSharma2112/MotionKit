"use client";

import React from 'react'
import { cn } from "./libs/utils"
import Edit from './Edit'
import BunnyIcon from './SvgIcon'

const Hero = () => {
  return (
    <div className='relative h-full w-full overflow-hidden bg-white dark:bg-[#0a0a0a] [--pattern:var(--color-neutral-200)] dark:[--pattern:var(--color-neutral-800)]'>
      
      {/* Gradient mask for the edges */}
      <div className='absolute inset-y-0 left-0 w-8 h-full bg-linear-to-r from-white dark:from-[#0a0a0a] to-transparent z-10' />
      <div className='absolute inset-y-0 right-0 w-8 h-full bg-linear-to-l from-white dark:from-[#0a0a0a] to-transparent z-10' />
      
      <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-center text-neutral-600 dark:text-neutral-400">
        <HorizontalLine className='absolute top-20 w-full mx-auto' />
        <div className='p-10 w-full h-full flex justify-center items-center gap-12'>
          <Edit />
          <BunnyIcon state="sleeping" />
        </div>
      </div>
    </div>
  )
}

export default Hero

const HorizontalLine = ({className}: {className?:string}) => {
  return <div className={cn('w-full h-px bg-[repeating-linear-gradient(90deg,var(--pattern)_0,var(--pattern)_4px,transparent_4px,transparent_8px)]', className)}></div>
}

const VerticalLine = ({className}: {className?: string}) => {
  return <div className={cn('w-px h-full bg-[repeating-linear-gradient(180deg,var(--pattern)_0,var(--pattern)_4px,transparent_4px,transparent_8px)]', className)}></div>
}