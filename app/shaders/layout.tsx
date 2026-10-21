import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shader playground — MotionKit",
  description: "Tune GPU shader backgrounds live, write your own GLSL, and export a ready-to-paste React component.",
};

export default function ShadersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
