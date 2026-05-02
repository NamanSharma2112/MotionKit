import Image from "next/image";
import fs from "fs";
import path from "path";
import TextScramble from "./compoents/TextScramble";
import Hero from "./compoents/hero-with-scale";
import HeroBG from "./compoents/Background";
import BunnyIcon from "./compoents/BunnyIcon";
import SmoothButton from "./compoents/button";
import ComponentCard from "./compoents/ComponentCard";
import StaggeredList from "./compoents/StaggeredList";
import MagneticButton from "./compoents/MagneticButton";
import AnimatedCounter from "./compoents/AnimatedCounter";
import ParallaxTiltCard from "./compoents/ParallaxTiltCard";
import ScrollReveal from "./compoents/ScrollReveal";
import Typewriter from "./compoents/Typewriter";
import SpotlightCard from "./compoents/SpotlightCard";

export default function Home() {
  const readCode = (filename: string) => {
    try {
      return fs.readFileSync(path.join(process.cwd(), "app/compoents", filename), "utf8");
    } catch (e) {
      return "// Code not found";
    }
  };

  const bunnyCode = readCode("BunnyIcon.tsx");
  const textScrambleCode = readCode("TextScramble.tsx");
  const buttonCode = readCode("button.tsx");
  const heroCode = readCode("hero-with-scale.tsx");
  const staggeredCode = readCode("StaggeredList.tsx");
  const magneticCode = readCode("MagneticButton.tsx");
  const counterCode = readCode("AnimatedCounter.tsx");
  const tiltCode = readCode("ParallaxTiltCard.tsx");
  const typewriterCode = readCode("Typewriter.tsx");
  const spotlightCode = readCode("SpotlightCard.tsx");

  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Header Section */}
      <header className="max-w-6xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 transition-all duration-500 cursor-default select-none bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 animate-gradient-text animate-shadow-pulse">
          Transitions
        </h1>

        <p className="text-lg sm:text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl">
          Collection of the most essential transitions for web apps that you can just copy and paste into any project.
        </p>
        <div className="h-px w-96 mx-auto bg-neutral-300 dark:bg-neutral-800 mb-4 mt-3" />
      </header>
      {/* Grid Section */}
      <section className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ComponentCard
            title="Bunny Mascot"
            description="Interactive animated SVG character with mouse tracking."
            code={bunnyCode}
          >
            <div className="scale-75 w-full h-full flex items-center justify-center">
              <BunnyIcon />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Text Scramble"
            description="Cyberpunk-style text decoding animation effect."
            code={textScrambleCode}
            showAnimateButton={true}
          >
            <div className="scale-75 w-full h-full flex items-center justify-center">
              <TextScramble text="Transition" delay={500} />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Smooth Button"
            description="Button with elegant hover states and click animations."
            code={buttonCode}
          >
            <div className="flex items-center justify-center w-full h-full">
              <SmoothButton />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Magnetic Button"
            description="Cursor-following button with spring physics and radial highlight."
            code={magneticCode}
          >
            <div className="flex items-center justify-center w-full h-full">
              <MagneticButton />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Staggered List"
            description="Children animate in sequence with configurable direction and delay."
            code={staggeredCode}
            showAnimateButton={true}
          >
            <div className="flex items-center justify-center w-full h-full">
              <StaggeredList />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Animated Counter"
            description="Numbers count up with cubic easing when scrolled into view."
            code={counterCode}
            showAnimateButton={true}
          >
            <div className="flex items-center justify-center w-full h-full">
              <AnimatedCounter />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Parallax Tilt Card"
            description="3D perspective tilt with mouse tracking and glare effect."
            code={tiltCode}
          >
            <div className="flex items-center justify-center w-full h-full">
              <ParallaxTiltCard />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Typewriter Effect"
            description="Multi-string typewriter with configurable speed and pausing."
            code={typewriterCode}
            showAnimateButton={true}
          >
            <div className="flex items-center justify-center w-full h-full px-4 text-center">
              <Typewriter />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Spotlight Card"
            description="Radial gradient spotlight that follows the cursor."
            code={spotlightCode}
          >
            <div className="w-full h-full">
              <SpotlightCard />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Hero Scale"
            description="Attention-grabbing hero section with scale-up entrance."
            code={heroCode}
            showAnimateButton={true}
          >
            <div className="scale-[0.35] origin-center w-[250%] h-[250%] flex items-center justify-center">
              <Hero />
            </div>
          </ComponentCard>

          <ComponentCard
            title="Scroll Reveal"
            description="Elements animate in from any direction on scroll."
            code={readCode("ScrollReveal.tsx")}
          >
            <div className="flex flex-col items-center justify-center w-full h-full gap-4">
              <ScrollReveal direction="up" delay={0.1}>
                <div className="w-24 h-24 rounded-2xl bg-blue-500 shadow-xl flex items-center justify-center text-white font-bold">UP</div>
              </ScrollReveal>
              <ScrollReveal direction="down" delay={0.3}>
                <div className="w-24 h-24 rounded-2xl bg-purple-500 shadow-xl flex items-center justify-center text-white font-bold">DOWN</div>
              </ScrollReveal>
            </div>
          </ComponentCard>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="max-w-6xl mx-auto px-6 pb-24 flex flex-col items-center gap-4 text-center">
        <div className="h-px w-24 bg-neutral-200 dark:bg-neutral-800 mb-4" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
          Inspired by <a href="https://transitions.dev/" target="_blank" rel="noopener noreferrer" className="text-neutral-900 dark:text-white hover:underline underline-offset-4">transitions.dev</a>
        </p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
          Made with ❤️ by <a href="https://namansharma.com" target="_blank" rel="noopener noreferrer" className="text-neutral-900 dark:text-white font-semibold hover:underline underline-offset-4">Naman Sharma</a>
          <a href="https://x.com/NamanSharma2112" target="_blank" rel="noopener noreferrer" className="text-neutral-900 dark:text-white hover:scale-110 transition-transform ml-1" title="Follow on X">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
        </p>
      </footer>
    </main>
  );
}
