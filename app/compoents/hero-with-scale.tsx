import React from 'react'
import { cn } from "./libs/utils"
const Hero = () => {
  return (
    <div className='relative h-screen w-full overflow-hidden [--pattern:var(--color-neutral-300)]'>
      <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-center ">
      <HorizontalLine className='absolute  top-0 w-screen mx-auto' />
      <HorizontalLine className='absolute  bottom-0 w-screen mx-auto' />
       <VerticalLine className='absolute left-0 h-screen mx-auto' />
        <VerticalLine className='absolute right-0 h-screen mx-auto' />
      <div className='p-10 size-full'>hero section</div>
      </div>
    </div>
  )
}

export default Hero

const HorizontalLine = ({className}: {className?:string}) => {
    return <div className={cn('h-10 w-full bg-[repeating-linear-gradient(315deg,var(--pattern)_0,var(--pattern)_1px,transparent_1px,transparent_50%)] bg-[size:10px_10px] border-y border-[var(--pattern)]', className)}></div>
}


const VerticalLine = ({className}: {className?: string}) => {
    return <div className={cn('w-10 h-full bg-[repeating-linear-gradient(45deg,var(--pattern)_0,var(--pattern)_1px,transparent_1px,transparent_50%)] bg-[size:10px_10px] border-x border-[var(--pattern)]', className)}></div>
}