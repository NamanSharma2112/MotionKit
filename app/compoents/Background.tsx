import React from 'react'
import { cn } from "./libs/utils"

const HeroBG = () => {
  return (
    <div className={cn(
      "relative h-screen w-full overflow-hidden bg-neutral-200",
      // Define the grid pattern using a background image
      "bg-[linear-gradient(to_right,#80808012_2px,transparent_2px),linear-gradient(to_bottom,#80808012_2px,transparent_2px)]",
      "bg-[size:40px_40px]" // This controls the size of the grid squares
    )}>
      
      {/* The solid dark accent line on the far left from your original code */}
  

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto w-full h-full flex items-center justify-center">
        
        {/* Horizontal Line - matches the dashed grid style */}
      

        <div className='p-10 bg-white/80 backdrop-blur-sm border border-neutral-300 text-neutral-600 rounded-xl shadow-sm'>
           hero section
        </div>
      </div>
    </div>
  )
}

const HorizontalLine = ({ className }: { className?: string }) => {
  return (
    <div className={cn(
      'w-full h-px bg-neutral-200 border-t border-dashed border-neutral-300', 
      className
    )} />
  )
}

const VerticalLine = ({ className }: { className?: string }) => {
  return (
    <div className={cn(
      'h-full w-px bg-neutral-200 border-l border-dashed border-neutral-300', 
      className
    )} />
  )
}

export default HeroBG