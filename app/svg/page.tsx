"use client";

import { useState } from "react";
import { Image as ImageIcon, PenTool, Terminal } from "lucide-react";
import PageHeader from "../compoents/ui/PageHeader";
import SegmentedTabs from "../compoents/ui/SegmentedTabs";
import MorePlaygrounds from "../compoents/ui/MorePlaygrounds";
import CanvasEditor from "./CanvasEditor";
import ImageModes from "./ImageModes";
import "./svg.css";

type Mode = "canvas" | "vectorizer" | "ascii";

/* Both studios stay mounted so switching modes keeps the drawing and the uploaded image. */
export default function SvgStudioPage() {
  const [mode, setMode] = useState<Mode>("canvas");

  return (
    <main className="mk-page svg-page">
      <PageHeader
        title="SVG studio"
        description="Draw and edit shapes on an artboard, vectorize an image or turn it into an ASCII pattern, then copy clean JSX, a React component or the SVG."
      >
        <SegmentedTabs
          label="Studio mode"
          value={mode}
          onChange={setMode}
          items={[
            { value: "canvas", label: "Canvas editor", icon: <PenTool size={14} className="hidden sm:block" /> },
            { value: "vectorizer", label: "Image to SVG", icon: <ImageIcon size={14} className="hidden sm:block" /> },
            { value: "ascii", label: "ASCII pattern", icon: <Terminal size={14} className="hidden sm:block" /> },
          ]}
        />
      </PageHeader>

      <CanvasEditor active={mode === "canvas"} />
      <ImageModes mode={mode === "ascii" ? "ascii" : "vectorizer"} active={mode !== "canvas"} />

      <MorePlaygrounds current="/svg" />
    </main>
  );
}
