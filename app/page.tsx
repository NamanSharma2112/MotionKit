import Image from "next/image";
import fs from "fs";
import path from "path";
import TextScramble from "./compoents/TextScramble";
import Hero from "./compoents/hero-with-scale";
import HeroBG from "./compoents/Background";
import BunnyIcon from "./compoents/BunnyIcon";
import SmoothButton from "./compoents/button";
import ComponentCard from "./compoents/ComponentCard";

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

  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Header Section */}
      <header className="max-w-6xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white mb-6">
          Transitions
        </h1>
        <p className="text-lg sm:text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl">
          Collection of the most essential transitions for web apps that you can just copy and paste into any project.
        </p>
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
          >
            <div className="scale-75 w-full h-full flex items-center justify-center">
              <TextScramble text="Transaction processing..." delay={500} />
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
            title="Hero Scale" 
            description="Attention-grabbing hero section with scale-up entrance."
            code={heroCode}
          >
            <div className="scale-[0.35] origin-center w-[250%] h-[250%] flex items-center justify-center pointer-events-none">
              <Hero />
            </div>
          </ComponentCard>
        </div>
      </section>
    </main>
  );
}
