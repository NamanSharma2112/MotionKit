import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

export default function ParallaxTilt() {
  const ref = useRef<HTMLDivElement>(null);

  // 1. Initialize Motion Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate mouse position relative to center (range -0.5 to 0.5)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // 2. Map values to rotation (Milestone 2 logic)
  // Note: rotateX uses -y to ensure the card tilts TOWARD the mouse
  const rotateX = useTransform(y, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-15, 15]);

  return (
    // THE PERSPECTIVE WRAPPER (Crucial!)
    <div 
      style={{ perspective: "1000px" }} 
      className="flex items-center justify-center h-screen bg-zinc-950"
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d", // Allows children to have their own Z-depth
        }}
        className="relative h-96 w-72 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 shadow-2xl"
      >
        {/* Milestone 4: Add a parallax child later */}
        <div 
          style={{ transform: "translateZ(50px)" }}
          className="absolute inset-4 grid place-content-center rounded-xl border border-white/10 bg-white/5 text-white font-bold text-2xl"
        >
          PARALLAX
        </div>
      </motion.div>
    </div>
  );
}