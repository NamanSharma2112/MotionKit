import Image from "next/image";
import TextScramble from "./compoents/TextScramble";
import Hero from "./compoents/hero-with-scale";
import HeroBG from "./compoents/Background";
import BunnyMascot from "./compoents/SvgIcon";
import BunnyIcon from "./compoents/SvgIcon";
export default function Home() {
  const isLoading = false;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-neutral-100 ">
    <HeroBG/>
<BunnyIcon state="sleeping" />    // z's float, ears sway, body breathes
<BunnyIcon state="awake" />       // eyes snap open, ears perk
<BunnyIcon state="surprised" />   // wide eyes
<BunnyIcon state="success" />     // wink

// as a loading indicator:
<BunnyIcon state={isLoading ? "sleeping" : "success"} size={24} color="rgba(200,184,154,0.7)" />
    </div>
  );
}
