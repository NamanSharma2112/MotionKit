import Image from "next/image";
import TextScramble from "./compoents/TextScramble";
import Hero from "./compoents/hero-with-scale";
import HeroBG from "./compoents/Background";
import BunnyMascot from "./compoents/SvgIcon";
import BunnyIcon from "./compoents/SvgIcon";
import SmoothButton from "./compoents/button";
export default function Home() {
  const isLoading = false;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-neutral-100 ">
      <BunnyIcon />
    </div>
  );
}
