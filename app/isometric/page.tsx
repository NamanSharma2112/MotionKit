import type { Metadata } from "next";

import PageHeader from "../compoents/ui/PageHeader";
import MorePlaygrounds from "../compoents/ui/MorePlaygrounds";
import EditorLoader from "./EditorLoader";
import "./isometric.css";

export const metadata: Metadata = {
  title: "Isometric maker — MotionKit",
  description: "Stack cubes, slabs, wedges and stairs on an isometric grid, then export SVG, PNG or scene JSON.",
};

export default function IsometricPage() {
  return (
    <main className="mk-page iso-page">
      <PageHeader
        title="Isometric maker"
        description="Stack blocks on an isometric grid, start from an example, and export crisp SVG or PNG."
      />
      <EditorLoader />
      <MorePlaygrounds current="/isometric" />
    </main>
  );
}
