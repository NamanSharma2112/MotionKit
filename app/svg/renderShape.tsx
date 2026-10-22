/* Live canvas rendering of a shape (the export lives in shapes.ts). */

import { polygonPoints, rotationCenter, type Shape } from "./shapes";

export function renderShape(s: Shape, key: string, ghost = false) {
  const c = s.rotation ? rotationCenter(s) : null;
  const transform = c ? `rotate(${s.rotation} ${c.x} ${c.y})` : undefined;
  const common = {
    stroke: s.type !== "text" ? s.color : undefined,
    strokeWidth: "width" in s ? s.width : undefined,
    opacity: ghost ? s.opacity * 0.6 : s.opacity,
    transform,
  };
  const dash = ghost ? "6 4" : "dash" in s && s.dash !== "none" ? s.dash : undefined;
  switch (s.type) {
    case "path":
      return <path key={key} d={s.d} {...common} fill={s.fill} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />;
    case "rect":
      return <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...common} fill={s.fill} strokeDasharray={dash} />;
    case "circle":
      return <circle key={key} cx={s.cx} cy={s.cy} r={s.r} {...common} fill={s.fill} strokeDasharray={dash} />;
    case "ellipse":
      return <ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} fill={s.fill} strokeDasharray={dash} />;
    case "line":
      return <line key={key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...common} strokeDasharray={dash} strokeLinecap="round" />;
    case "polygon":
      return (
        <polygon
          key={key}
          points={polygonPoints(s.cx, s.cy, s.r, s.sides, s.ry)}
          {...common}
          fill={s.fill}
          strokeDasharray={dash}
          strokeLinejoin="round"
        />
      );
    case "text":
      return (
        <text
          key={key}
          x={s.x}
          y={s.y}
          fontSize={s.fontSize}
          fill={s.color}
          fontFamily="sans-serif"
          fontWeight={s.fontWeight}
          opacity={common.opacity}
          transform={transform}
        >
          {s.content}
        </text>
      );
  }
}
