"use client";

import React from 'react'
import { cn } from "./libs/utils"
import Edit from './Edit'
import BunnyIcon from './SvgIcon'
const Hero = () => {
  return (
    // Added a background color to the parent so the line is visible by contrast
    <div className='relative h-screen w-full overflow-hidden bg-white [--pattern:var(--color-neutral-200)]'>
      
      {/* 1. Added z-50 to ensure it's on top 
          2. Ensure the gradient colors contrast with your background
      */}
      <div className='absolute inset-y-0 left-0 w-1 h-full bg-linear-to-b from-black to-neutral-800 z-50' />
      
      <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-center text-neutral-600">
        <HorizontalLine className='absolute top-20 w-screen mx-auto' />
        <div className='p-10 size-full flex justify-center items-center'>
          <Edit />
          <BunnyIcon state="sleeping" />    // z's float, ears sway, body breathes
<BunnyIcon state="awake" />       // eyes snap open, ears perk
<BunnyIcon state="surprised" />   // wide eyes
<BunnyIcon state="success" /> 
        </div>
      </div>
    </div>
  )
}

export default Hero

const HorizontalLine = ({className}: {className?:string}) => {
return <div className={cn('w-10 h-150 bg-[repeating-linear-gradient(45deg,var(--pattern)_0,var(--pattern)_1px,transparent_1px,transparent_50%)] bg-size-[15px_15px] outline-2 outline-dashed outline-[var(--pattern)] ', className)}></div>}


const VerticalLine = ({className}: {className?: string}) => {
return <div className={cn('w-30 h-full bg-[repeating-linear-gradient(45deg,var(--pattern)_0,var(--pattern)_1px,transparent_1px,transparent_50%)] bg-size-[15px_15px] outline-2 outline-dashed outline-[var(--pattern)] ', className)}></div>}