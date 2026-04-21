import Image from "next/image";
import TextScramble from "./compoents/TextScramble";
import Hero from "./compoents/hero-with-scale";
export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-neutral-100 ">
    <Hero />
    </div>
  );
}
