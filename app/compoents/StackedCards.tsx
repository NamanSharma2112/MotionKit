"use client";
import React from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";

const INITIAL_STACK = [
  {
    title: "Japan",
    description: "Land of the rising sun",
    src: "https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "France",
    description: "City of lights and romance",
    src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Italy",
    description: "Home of art and cuisine",
    src: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Spain",
    description: "Vibrant culture and sunny coasts",
    src: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Canada",
    description: "Vast landscapes and friendly cities",
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
  },
];

type Spring = { stiffness?: number; damping?: number; mass?: number; visualDuration?: number; bounce?: number };

type StackSettings = {
  spring: Spring;
  /** Pixels a card must be dragged to send it to the back. */
  swipeThreshold: number;
  /** Vertical offset (%) between stacked cards. */
  offset: number;
  /** How much smaller each card behind gets. */
  scaleStep: number;
  /** Degrees a card tilts at full drag. */
  maxRotate: number;
};

const StackedCards = ({
  spring = { stiffness: 380, damping: 32 },
  swipeThreshold = 100,
  offset = 5,
  scaleStep = 0.05,
  maxRotate = 15,
}: Partial<StackSettings> = {}) => {
  const [stack, setStack] = React.useState(INITIAL_STACK);
  const settings = { spring, swipeThreshold, offset, scaleStep, maxRotate };

  return (
    <div className="relative flex h-96 w-80 items-center justify-center">
      {stack.map((item, index) => (
        <StackedCardItem
          key={item.title}
          item={item}
          index={index}
          total={stack.length}
          settings={settings}
          onSendToBack={() => {
            setStack((s) => [...s.slice(1), s[0]]);
          }}
        />
      ))}
    </div>
  );
};

export default StackedCards;

type StackedCardsProps = {
  item: typeof INITIAL_STACK[number];
  index: number;
  total: number;
  settings: StackSettings;
  onSendToBack: () => void;
};

const StackedCardItem: React.FC<StackedCardsProps> = ({
  item,
  index,
  total,
  settings,
  onSendToBack,
}) => {
  const STACK_SPRING = { type: "spring" as const, ...settings.spring };
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-settings.maxRotate, 0, settings.maxRotate]);
  const isTop = index === 0;

  return (
    <motion.div
      layout
      drag={isTop ? "x" : false}
      dragConstraints={{ left: -150, right: 150 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (!isTop) return;

        if (Math.abs(info.offset.x) > settings.swipeThreshold) {
          onSendToBack();
        }

        animate(x, 0, STACK_SPRING);
      }}
      style={{ zIndex: total - index, rotate, x }}
      animate={{
        y: `${-index * settings.offset}%`,
        scale: 1 - index * settings.scaleStep,
      }}
      transition={STACK_SPRING}
      className="absolute inset-0 cursor-grab overflow-hidden rounded-[20px] bg-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.3)] ring-1 ring-black/[0.06] active:cursor-grabbing dark:bg-neutral-800 dark:ring-white/10"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.src}
        alt={item.title}
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-5">
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-white">
          {item.title}
        </h3>
        <p className="text-sm text-white/75">
          {item.description}
        </p>
      </div>
    </motion.div>
  );
};
