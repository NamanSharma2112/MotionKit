"use client";

import { motion, AnimatePresence, useAnimationFrame, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────
type Emotion = "sleeping" | "awake" | "surprised";

// ── Time helper ───────────────────────────────────────────────────────────
// Awake hours: 7:00 → 22:00
function getTimeEmotion(): "sleeping" | "awake" {
  const h = new Date().getHours();
  return h >= 7 && h < 22 ? "awake" : "sleeping";
}

// ── Eye base positions (absolute SVG viewBox coords, viewBox 0 0 40 40)
// Inner group is translate(6,8), eye cx/cy in that space + offset
const EYE_L = { x: 8.277, y: 20.466 }; // left eye center
const EYE_R = { x: 19.878, y: 20.466 }; // right eye center
const MAX_TRAVEL = 1.2;                   // max pupil offset in SVG units

// One stroke for the whole drawing: ears and face sides share weight and caps.
const STROKE = {
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

// ── Ear animation variants ────────────────────────────────────────────────
const earVariants = {
  sleeping:  { rotate: [0, 3, 0],     transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } },
  awake:     { rotate: [0, -8, -6, -8], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } },
  surprised: { rotate: [0, -14, -10], transition: { duration: 0.3, ease: "easeOut" as const } },
};
const earRVariants = {
  sleeping:  { rotate: [0, -3, 0],   transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } },
  awake:     { rotate: [0, 8, 6, 8], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } },
  surprised: { rotate: [0, 14, 10],  transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ── Body animation ────────────────────────────────────────────────────────
const bodyVariants = {
  sleeping:  { y: [0, 2, 0],          transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } },
  awake:     { y: [0,-7,2,-2,0], rotate:[0,-4,2,-1,0], transition: { duration: 0.5, ease:"easeOut" as const } },
  surprised: { y: [0,-10,3,-3,0], rotate:[0,-5,3,-1,0],transition: { duration: 0.45,ease:"easeOut" as const } },
};

// ── Floating Z particle ────────────────────────────────────────────────────
const Z_DEFS = [
  { d:"M32 5 L36 5 L32 9 L36 9",           sw:1.5, delay:0, tx:4,  ty:-14, s:[0.7,1.0] },
  { d:"M34 3 L37 3 L34 6 L37 6",           sw:1.3, delay:1, tx:6,  ty:-16, s:[0.6,0.9] },
  { d:"M36 1 L38.5 1 L36 3.5 L38.5 3.5",  sw:1.1, delay:2, tx:8,  ty:-18, s:[0.5,0.8] },
] as const;

function FloatingZ({ d, sw, delay, tx, ty, s, still }: typeof Z_DEFS[number] & { still?: boolean }) {
  return (
    <motion.path
      d={d} stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" fill="none"
      // Reduced motion: the Z's sit still instead of drifting forever.
      animate={still ? { opacity: 0.6 } : { opacity:[0,1,1,0], x:[0,tx], y:[0,ty], scale:[s[0],s[1]] }}
      transition={still ? { duration: 0 } : { duration:3, delay, repeat:Infinity, ease:"easeOut", times:[0,0.1,0.8,1] }}
    />
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────
// One accent plus the bunny's own ink, so the burst belongs to the drawing.
const CONFETTI_COLORS = ["#1f6bff", "currentColor"];
const CONFETTI_COUNT = 12;

type Particle = { x: number; y: number; size: number; color: string; duration: number; rotate: number };

function makeParticles(): Particle[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle = (i / CONFETTI_COUNT) * Math.PI * 2 + (Math.random() - 0.5);
    const distance = 20 + Math.random() * 30;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 1 + Math.random() * 2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 0.8 + Math.random() * 0.4,
      rotate: Math.random() * 360,
    };
  });
}

function Confetti() {
  // Rolled once per burst, so re-renders (the eyes update every frame) don't reshuffle the particles.
  const [particles] = useState(makeParticles);
  return (
    <g transform="translate(20, 20)">
      {particles.map((p, i) => (
        <motion.circle
          key={i}
          r={p.size}
          fill={p.color}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.9 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [0, 1, 1, 0],
            scale: [0.9, 1.2, 0.5],
            rotate: p.rotate
          }}
          transition={{
            duration: p.duration,
            ease: "easeOut" as const
          }}
        />
      ))}
    </g>
  );
}

// ── Eyes ──────────────────────────────────────────────────────────────────
interface EyesProps {
  emotion: Emotion;
  pupil: { x: number; y: number };
}

function Eyes({ emotion, pupil }: EyesProps) {
  const fill = "currentColor";

  if (emotion === "sleeping") {
    return (
      <AnimatePresence mode="wait">
        <motion.g key="sleeping-eyes"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}>
          <rect x={5.777} y={19.666} width={5}   height={1.6} rx={0.8} fill={fill} />
          <rect x={17.378} y={19.666} width={5}  height={1.6} rx={0.8} fill={fill} />
        </motion.g>
      </AnimatePresence>
    );
  }

  if (emotion === "surprised") {
    return (
      <AnimatePresence mode="wait">
        <motion.g key="surprised-eyes"
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}>
          <circle cx={EYE_L.x} cy={EYE_L.y} r={2.3} fill={fill} />
          <circle cx={EYE_R.x} cy={EYE_R.y} r={2.3} fill={fill} />
        </motion.g>
      </AnimatePresence>
    );
  }

  // awake — iris + tracking pupil
  return (
    <AnimatePresence mode="wait">
      <motion.g key="awake-eyes"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}>
        {/* pupils — offset by lerped pupil position */}
        <circle cx={EYE_L.x + pupil.x} cy={EYE_L.y + pupil.y} r={1.1} fill={fill} />
        <circle cx={EYE_R.x + pupil.x} cy={EYE_R.y + pupil.y} r={1.1} fill={fill} />
      </motion.g>
    </AnimatePresence>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
interface BunnyIconProps {
  size?: number;
  color?: string;
  className?: string;
  /** Override time-based logic with a forced emotion */
  forceEmotion?: Emotion;
}

export default function BunnyIcon({
  size = 64,
  color = "currentColor",
  className,
  forceEmotion,
  trigger,
}: BunnyIconProps & { trigger?: number }) {
  const [timeEmotion, setTimeEmotion] = useState<"sleeping" | "awake">(getTimeEmotion);
  const [isSurprised, setIsSurprised] = useState(false);
  // Bumps on every click so a second click restarts the surprise timer.
  const [surprises, setSurprises] = useState(0);
  const [prevTrigger, setPrevTrigger] = useState(trigger);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  // Surprise wins, then a forced emotion, then the clock.
  const emotion: Emotion = isSurprised ? "surprised" : (forceEmotion ?? timeEmotion);

  // Pupil tracking state (raw target + lerped current)
  const pupilTarget  = useRef({ x: 0, y: 0 });
  const pupilCurrent = useRef({ x: 0, y: 0 });
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Clock: re-check every minute ────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTimeEmotion(getTimeEmotion()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Click → surprised ────────────────────────────────────────────────────
  const handleClick = () => {
    setIsSurprised(true);
    setSurprises((n) => n + 1);
  };

  // Sync trigger to click handler
  if (trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    if (trigger && trigger > 0) handleClick();
  }

  // Settle back after 1.4s (restarted by every click).
  useEffect(() => {
    if (surprises === 0) return;
    const id = setTimeout(() => setIsSurprised(false), 1400);
    return () => clearTimeout(id);
  }, [surprises]);

  // ── Global Mouse tracking ──────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (emotion !== "awake" || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Increase tracking radius to follow throughout the page
      const radius = 1000;
      const strength = Math.min(dist / radius, 1);

      const svgScale = 40 / rect.width;
      const rawX = dx * svgScale * strength;
      const rawY = dy * svgScale * strength;
      const angle = Math.atan2(rawY, rawX);
      const mag   = Math.min(Math.sqrt(rawX * rawX + rawY * rawY), MAX_TRAVEL);

      pupilTarget.current = { x: Math.cos(angle) * mag, y: Math.sin(angle) * mag };
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [emotion]);

  // ── Lerp pupils on RAF ────────────────────────────────────────────────────
  useAnimationFrame(() => {
    if (emotion !== "awake") return;
    const lerp = 0.12;
    const cur = pupilCurrent.current;
    const dx = pupilTarget.current.x - cur.x;
    const dy = pupilTarget.current.y - cur.y;
    // Settled: skip the re-render.
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
    cur.x += dx * lerp;
    cur.y += dy * lerp;
    setPupil({ ...cur });
  });

  const sleeping = emotion === "sleeping";
  
  // Custom variants that account for hover
  const currentEarVariants = {
    ...earVariants,
    awake: isHovered 
      ? { rotate: [0, -12, -8, -12], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const } }
      : earVariants.awake,
    surprised: { rotate: [0, -25, -15], transition: { duration: 0.2, ease: "backOut" as const } }
  };

  const currentEarRVariants = {
    ...earRVariants,
    awake: isHovered 
      ? { rotate: [0, 12, 8, 12], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const } }
      : earRVariants.awake,
    surprised: { rotate: [0, 25, 15], transition: { duration: 0.2, ease: "backOut" as const } }
  };

  // Reduced motion: no endless ear wiggle or breathing; one-off reactions still play.
  const still = { rotate: 0, y: 0, transition: { duration: 0 } };
  const loops = emotion !== "surprised";
  const earE  = reduceMotion && loops ? still : currentEarVariants[emotion];
  const earRE = reduceMotion && loops ? still : currentEarRVariants[emotion];
  const bodyE = reduceMotion && emotion === "sleeping" ? still : bodyVariants[emotion];

  return (
    // Focusable wrapper lives outside the keyed SVG, so focus survives the remount on each emotion change.
    <span
      role="button"
      tabIndex={0}
      aria-label="Bunny mascot. Press to surprise it."
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="inline-flex rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1f6bff]"
    >
    <motion.svg
      ref={svgRef}
      width={size} height={size}
      viewBox="0 0 40 40" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={{ overflow: "visible", color, cursor: "pointer" }}
      // Hover wiggle is for a mouse only; a tap already plays the surprise.
      onPointerEnter={(e) => e.pointerType === "mouse" && setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      key={emotion}
      animate={bodyE}
    >
      <AnimatePresence>
        {isSurprised && <Confetti key="confetti" />}
      </AnimatePresence>
      <g transform="translate(6, 8)">
        {/* ── Left ear ── */}
        <motion.g transform="rotate(-15,7,10) translate(0,1)"
          style={{ transformOrigin: "7px 10px" }}
          animate={earE} transition={earE.transition}>
          <path d="M4.9 9.7 L8 2.5 M9.5 1.5 Q14.1 6.43 9.5 11.35" {...STROKE} />
        </motion.g>

        {/* ── Right ear ── */}
        <motion.g transform="rotate(15,19,10) translate(0,1)"
          style={{ transformOrigin: "19px 10px" }}
          animate={earRE} transition={earRE.transition}>
          <path d="M16.165 9.7 L19.265 2.5 M20.765 1.5 Q25.365 6.43 20.765 11.35" {...STROKE} />
        </motion.g>

        {/* ── Body ── */}
        <path d="M3.3 15.5 Q-1.3 20.43 3.3 25.36 M22.4 15.5 Q27 20.43 22.4 25.36" {...STROKE} />

        {/* ── Eyes ── */}
        <Eyes emotion={emotion} pupil={pupil} />
      </g>

      {/* ── Floating Z's ── */}
      <AnimatePresence>
        {sleeping && (
          <motion.g
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}>
            {Z_DEFS.map((def, i) => <FloatingZ key={i} {...def} still={!!reduceMotion} />)}
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
    </span>
  );
}

// ── Usage ──────────────────────────────────────────────────────────────────
//
// Self-managing (auto sleep/wake by time, cursor tracking, click-to-surprise):
//   <BunnyIcon />
//   <BunnyIcon size={48} />
//   <BunnyIcon size={24} color="rgba(200,184,154,0.7)" />
//
// Force an emotion (overrides time logic):
//   <BunnyIcon forceEmotion="surprised" />
//   <BunnyIcon forceEmotion={isLoading ? "sleeping" : "awake"} />
