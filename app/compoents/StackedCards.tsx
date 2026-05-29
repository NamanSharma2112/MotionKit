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

const STACK_SPRING = { type: "spring" as const, stiffness: 380, damping: 32 };

const StackedCards = () => {
  const [stack, setStack] = React.useState(INITIAL_STACK);

  return (
    <div className="relative flex h-96 w-80 items-center justify-center">
      {stack.map((item, index) => (
        <StackedCardItem
          key={item.title}
          item={item}
          index={index}
          total={stack.length}
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
  onSendToBack: () => void;
};

const StackedCardItem: React.FC<StackedCardsProps> = ({
  item,
  index,
  total,
  onSendToBack,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-15, 0, 15]);
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

        if (Math.abs(info.offset.x) > 100) {
          onSendToBack();
        }

        animate(x, 0, STACK_SPRING);
      }}
      style={{ zIndex: total - index, rotate, x }}
      animate={{
        y: `${-index * 5}%`,
        scale: 1 - index * 0.05,
      }}
      transition={STACK_SPRING}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.src}
        alt={item.title}
        className="h-full w-full object-cover rounded-xl pointer-events-none"
      />
      <h2 className="absolute bottom-8 left-4 text-white text-lg font-bold z-20">
        {item.title}
      </h2>
      <p className="absolute bottom-4 left-4 text-white text-sm z-20">
        {item.description}
      </p>
      <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-xl pointer-events-none" />
    </motion.div>
  );
};
