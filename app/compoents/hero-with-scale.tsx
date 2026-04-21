import React from 'react'

const Hero = () => {
  return (
    <div className='relative h-screen w-full overflow-hidden [--pattern:var(--color-neutral-300)]'>
        <div className='h-14 w-full bg-[repeating-linear-gradient(315deg,var(--pattern)_0,var(--pattern)_1px,transparent_1px,transparent_50%)]'></div>
      
    </div>
  )
}

export default Hero
