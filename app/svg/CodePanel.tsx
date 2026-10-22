"use client";

import { Download } from "lucide-react";
import SegmentedTabs from "../compoents/ui/SegmentedTabs";
import { CopyButton } from "./controls";

/* Code output under each studio mode: format tabs, copy and .svg download. */
export default function CodePanel<F extends string>({
  formats,
  format,
  onFormat,
  code,
  rawSvg,
  fileName,
  note,
}: {
  formats: { value: F; label: string }[];
  format: F;
  onFormat: (f: F) => void;
  code: string;
  rawSvg: string;
  fileName: string;
  note?: string;
}) {
  const download = () => {
    if (!rawSvg) return;
    const url = URL.createObjectURL(new Blob([rawSvg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="mk-panel mt-5">
      <div className="mk-panel-head flex-wrap">
        <div className="flex flex-wrap items-center gap-3 [&_.mk-tabs-wrap]:mb-0!">
          <h2 className="mk-panel-title">Code</h2>
          <SegmentedTabs label="Output format" size="sm" value={format} onChange={onFormat} items={formats} />
          {note && <span className="text-[12px] text-mk-faint">{note}</span>}
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={code} label="Copy code" disabled={!rawSvg} />
          <button type="button" className="mk-btn mk-btn-primary mk-btn-sm" onClick={download} disabled={!rawSvg}>
            <Download size={14} /> Download .svg
          </button>
        </div>
      </div>
      <pre className="mk-code max-h-[360px]">
        <code>{code}</code>
      </pre>
    </section>
  );
}
