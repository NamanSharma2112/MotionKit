/* Code output for the canvas editor: JSX, raw SVG and a typed React component.
   Only visible shapes are exported, inside the artboard's viewBox. */

import { round, shapeToSvg, type Shape } from "./shapes";
import type { Board } from "./history";

export type CodeFormat = "jsx" | "svg" | "react";

const indent = (lines: string[], pad: string) => lines.map((l) => pad + l).join("\n");

export function exportCanvas(shapes: Shape[], board: Board) {
  const visible = shapes.filter((s) => !s.hidden);
  const viewBox = `0 0 ${round(board.w)} ${round(board.h)}`;
  const open = `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg"`;
  const body = (jsx: boolean, pad: string) => (visible.length ? `${indent(visible.map((s) => shapeToSvg(s, jsx)), pad)}\n` : "");

  const svg = `${open} width="${round(board.w)}" height="${round(board.h)}" fill="none">\n${body(false, "  ")}</svg>`;

  const jsx = `export default function CustomSvg() {\n  return (\n    ${open} fill="none" className="h-full w-full">\n${body(true, "      ")}    </svg>\n  );\n}`;

  const square = Math.abs(board.w - board.h) < 1e-6;
  const ratio = round(board.h / board.w);
  const height = square ? "size" : `size * ${ratio}`;
  const react = [
    `import type { SVGProps } from "react";`,
    ``,
    `type Props = SVGProps<SVGSVGElement> & {`,
    `  /** Rendered width in px${square ? " (and height)" : `; height follows the ${round(board.w)}×${round(board.h)} artboard`}. */`,
    `  size?: number;`,
    `};`,
    ``,
    `export default function CustomSvg({ size = ${round(board.w)}, className, ...props }: Props) {`,
    `  return (`,
    `    <svg`,
    `      viewBox="${viewBox}"`,
    `      width={size}`,
    `      height={${height}}`,
    `      fill="none"`,
    `      xmlns="http://www.w3.org/2000/svg"`,
    `      className={className}`,
    `      {...props}`,
    `    >`,
    ...(visible.length ? [body(true, "      ").trimEnd()] : []),
    `    </svg>`,
    `  );`,
    `}`,
  ].join("\n");

  return { svg, jsx, react, count: visible.length };
}

/* Markup for just these shapes (the system clipboard gets this on copy). */
export function snippetSvg(shapes: Shape[], board: Board) {
  return exportCanvas(shapes, board).svg;
}
