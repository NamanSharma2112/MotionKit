"use client";

import { motion, AnimatePresence, useAnimationFrame } from "motion/react";
import { useEffect, useRef, useState, useCallback } from "react";

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

// ── Ear animation variants ────────────────────────────────────────────────
const earVariants = {
  sleeping:  { rotate: [0, 3, 0],     transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } },
  awake:     { rotate: [0, -8, -5],   transition: { duration: 0.4, ease: "easeOut" as const } },
  surprised: { rotate: [0, -14, -10], transition: { duration: 0.3, ease: "easeOut" as const } },
};
const earRVariants = {
  sleeping:  { rotate: [0, -3, 0],   transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } },
  awake:     { rotate: [0, 8, 5],    transition: { duration: 0.4, ease: "easeOut" as const } },
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

function FloatingZ({ d, sw, delay, tx, ty, s }: typeof Z_DEFS[number]) {
  return (
    <motion.path
      d={d} stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" fill="none"
      animate={{ opacity:[0,1,1,0], x:[0,tx], y:[0,ty], scale:[s[0],s[1]] }}
      transition={{ duration:3, delay, repeat:Infinity, ease:"easeOut", times:[0,0.1,0.8,1] }}
    />
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
          <rect x={5.777} y={19.766} width={5}   height={1.4} rx={0.7} fill={fill} opacity={0.4} />
          <rect x={17.378} y={19.766} width={5}  height={1.4} rx={0.7} fill={fill} opacity={0.4} />
        </motion.g>
      </AnimatePresence>
    );
  }

  if (emotion === "surprised") {
    return (
      <AnimatePresence mode="wait">
        <motion.g key="surprised-eyes"
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}>
          <circle cx={EYE_L.x} cy={EYE_L.y} r={2.3} fill={fill} opacity={0.4} />
          <circle cx={EYE_R.x} cy={EYE_R.y} r={2.3} fill={fill} opacity={0.4} />
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
        {/* iris */}
        <circle cx={EYE_L.x} cy={EYE_L.y} r={1.8} fill={fill} opacity={0.15} />
        <circle cx={EYE_R.x} cy={EYE_R.y} r={1.8} fill={fill} opacity={0.15} />
        {/* pupils — offset by lerped pupil position */}
        <circle cx={EYE_L.x + pupil.x} cy={EYE_L.y + pupil.y} r={0.9} fill={fill} opacity={0.55} />
        <circle cx={EYE_R.x + pupil.x} cy={EYE_R.y + pupil.y} r={0.9} fill={fill} opacity={0.55} />
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
}: BunnyIconProps) {
  const [timeEmotion, setTimeEmotion] = useState<"sleeping" | "awake">(getTimeEmotion);
  const [emotion, setEmotion] = useState<Emotion>(forceEmotion ?? getTimeEmotion());
  const [isSurprised, setIsSurprised] = useState(false);

  // Pupil tracking state (raw target + lerped current)
  const pupilTarget  = useRef({ x: 0, y: 0 });
  const pupilCurrent = useRef({ x: 0, y: 0 });
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const surpriseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Clock: re-check every minute ────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const next = getTimeEmotion();
      setTimeEmotion(next);
      if (!isSurprised && !forceEmotion) setEmotion(next);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [isSurprised, forceEmotion]);

  // Sync forceEmotion prop
  useEffect(() => {
    if (forceEmotion) setEmotion(forceEmotion);
  }, [forceEmotion]);

  // ── Click → surprised ────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    if (surpriseTimer.current) clearTimeout(surpriseTimer.current);
    setIsSurprised(true);
    setEmotion("surprised");
    surpriseTimer.current = setTimeout(() => {
      setIsSurprised(false);
      setEmotion(forceEmotion ?? timeEmotion);
    }, 1400);
  }, [forceEmotion, timeEmotion]);

  // ── Mouse tracking ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (emotion !== "awake" || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.max(rect.width, 80);
    const strength = Math.min(dist / radius, 1);
    const svgScale = 40 / rect.width;
    const rawX = dx * svgScale * strength;
    const rawY = dy * svgScale * strength;
    const angle = Math.atan2(rawY, rawX);
    const mag   = Math.min(Math.sqrt(rawX * rawX + rawY * rawY), MAX_TRAVEL);
    pupilTarget.current = { x: Math.cos(angle) * mag, y: Math.sin(angle) * mag };
  }, [emotion]);

  const handleMouseLeave = useCallback(() => {
    pupilTarget.current = { x: 0, y: 0 };
  }, []);

  // ── Lerp pupils on RAF ────────────────────────────────────────────────────
  useAnimationFrame(() => {
    if (emotion !== "awake") return;
    const lerp = 0.12;
    pupilCurrent.current.x += (pupilTarget.current.x - pupilCurrent.current.x) * lerp;
    pupilCurrent.current.y += (pupilTarget.current.y - pupilCurrent.current.y) * lerp;
    setPupil({ ...pupilCurrent.current });
  });

  const sleeping = emotion === "sleeping";
  const earE  = earVariants[emotion];
  const earRE = earRVariants[emotion];
  const bodyE = bodyVariants[emotion];

  return (
    <motion.svg
      ref={svgRef}
      width={size} height={size}
      viewBox="0 0 40 40" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible", color, cursor: "pointer" }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      key={emotion}
      animate={bodyE}
    >
      <g transform="translate(6, 8)">
        {/* ── Left ear ── */}
        <motion.g transform="rotate(-15,7,10) translate(0,1)"
          style={{ transformOrigin: "7px 10px" }}
          animate={earE} transition={earVariants[emotion].transition}>
          <path
            d="M3.738 10.2164L7.224 2.007H9.167L5.676 10.2164H3.738ZM10.791 6.427C10.791 5.903 10.726 5.428 10.596 5C10.47 4.572 10.292 4.166 10.063 3.784C9.833 3.398 9.56 3.018 9.243 2.643C8.926 2.265 8.767 2.076 8.767 2.076L10.24 0.958C10.24 0.958 10.433 1.172 10.819 1.6C11.209 2.024 11.559 2.491 11.869 2.999C12.178 3.507 12.413 4.042 12.574 4.604C12.734 5.166 12.814 5.774 12.814 6.427C12.814 7.107 12.73 7.73 12.562 8.296C12.394 8.858 12.153 9.397 11.84 9.913C11.526 10.425 11.181 10.883 10.802 11.288C10.428 11.697 10.24 11.902 10.24 11.902L8.767 10.784C8.767 10.784 8.924 10.595 9.237 10.216C9.554 9.842 9.83 9.46 10.063 9.07C10.3 8.676 10.479 8.267 10.602 7.843C10.728 7.415 10.791 6.943 10.791 6.427Z"
            fill="currentColor" opacity={0.4} />
        </motion.g>

        {/* ── Right ear ── */}
        <motion.g transform="rotate(15,19,10) translate(0,1)"
          style={{ transformOrigin: "19px 10px" }}
          animate={earRE} transition={earRVariants[emotion].transition}>
          <path
            d="M15.003 10.2164L18.489 2.007H20.432L16.941 10.2164H15.003ZM22.056 6.427C22.056 5.903 21.991 5.428 21.861 5C21.735 4.572 21.557 4.166 21.328 3.784C21.098 3.398 20.825 3.018 20.508 2.643C20.191 2.265 20.032 2.076 20.032 2.076L21.505 0.958C21.505 0.958 21.698 1.172 22.084 1.6C22.474 2.024 22.824 2.491 23.133 2.999C23.443 3.507 23.678 4.042 23.839 4.604C23.999 5.166 24.079 5.774 24.079 6.427C24.079 7.107 23.995 7.73 23.827 8.296C23.659 8.858 23.418 9.397 23.105 9.913C22.791 10.425 22.445 10.883 22.067 11.288C21.693 11.697 21.505 11.902 21.505 11.902L20.032 10.784C20.032 10.784 20.189 10.595 20.502 10.216C20.819 9.842 21.094 9.46 21.328 9.07C21.565 8.676 21.744 8.267 21.866 7.843C21.993 7.415 22.056 6.943 22.056 6.427Z"
            fill="currentColor" opacity={0.4} />
        </motion.g>

        {/* ── Body ── */}
        <path
          d="M2.03 20.433C2.03 20.956 2.093 21.432 2.219 21.86C2.345 22.288 2.523 22.695 2.752 23.081C2.981 23.464 3.254 23.842 3.572 24.216C3.889 24.595 4.047 24.784 4.047 24.784L2.574 25.902C2.574 25.902 2.379 25.688 1.989 25.26C1.603 24.836 1.256 24.369 0.946 23.861C0.636 23.353 0.401 22.818 0.241 22.256C0.08 21.694 0 21.086 0 20.433C0 19.753 0.084 19.131 0.252 18.57C0.421 18.004 0.661 17.465 0.975 16.953C1.288 16.437 1.632 15.977 2.007 15.571C2.385 15.163 2.574 14.958 2.574 14.958L4.047 16.076C4.047 16.076 3.889 16.265 3.572 16.643C3.258 17.018 2.983 17.402 2.746 17.796C2.513 18.186 2.335 18.595 2.213 19.023C2.091 19.447 2.03 19.917 2.03 20.433ZM23.687 20.427C23.687 19.904 23.622 19.428 23.492 19C23.366 18.572 23.188 18.166 22.959 17.784C22.729 17.398 22.456 17.018 22.139 16.643C21.822 16.265 21.663 16.076 21.663 16.076L23.136 14.958C23.136 14.958 23.329 15.172 23.715 15.6C24.105 16.024 24.455 16.491 24.765 16.999C25.074 17.507 25.309 18.042 25.47 18.604C25.63 19.166 25.71 19.774 25.71 20.427C25.71 21.107 25.626 21.73 25.458 22.296C25.29 22.858 25.049 23.397 24.736 23.913C24.422 24.425 24.077 24.883 23.698 25.288C23.324 25.697 23.136 25.902 23.136 25.902L21.663 24.784C21.663 24.784 21.82 24.595 22.133 24.216C22.45 23.842 22.726 23.46 22.959 23.07C23.196 22.676 23.375 22.267 23.498 21.843C23.624 21.415 23.687 20.943 23.687 20.427Z"
          fill="currentColor" opacity={0.4} />

        {/* ── Eyes ── */}
        <Eyes emotion={emotion} pupil={pupil} />
      </g>

      {/* ── Floating Z's ── */}
      <AnimatePresence>
        {sleeping && (
          <motion.g
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}>
            {Z_DEFS.map((def, i) => <FloatingZ key={i} {...def} />)}
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
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
