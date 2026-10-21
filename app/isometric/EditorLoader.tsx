"use client";

import dynamic from "next/dynamic";

/* The editor reads the saved scene from localStorage on first render, so it
   only renders on the client. The skeleton reserves the same space. */
function EditorSkeleton() {
  return (
    <div className="mk-workspace" aria-busy="true">
      <div className="mk-stack-col">
        <div className="mk-toolbar h-[46px]" />
        <div className="mk-canvas iso-stage" />
      </div>
      <div className="mk-stack-col">
        <div className="mk-panel h-[360px]" />
        <div className="mk-panel h-[300px]" />
      </div>
    </div>
  );
}

const Editor = dynamic(() => import("./Editor"), { ssr: false, loading: EditorSkeleton });

export default function EditorLoader() {
  return <Editor />;
}
