"use client";

/* "Image to SVG" and "ASCII pattern" modes. They share the uploaded image and
   the large stage; each has its own controls and code output. */

import { useDeferredValue, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Dropzone, RangeField } from "./controls";
import CodePanel from "./CodePanel";
import { VIEW_H, VIEW_W } from "./shapes";
import { ASCII_FILTER_DEFS, imageToAscii, vectorizeImage, type AsciiFilter, type VecStyle } from "./imageToSvg";

type ImageMode = "vectorizer" | "ascii";
type CodeMode = "jsx" | "svg";

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

export default function ImageModes({ mode, active }: { mode: ImageMode; active: boolean }) {
  const [codeMode, setCodeMode] = useState<CodeMode>("jsx");
  const [image, setImage] = useState<{ img: HTMLImageElement; name: string } | null>(null);
  const [vecStyle, setVecStyle] = useState<VecStyle>("pixel");
  const [vecResolution, setVecResolution] = useState(50);
  const [vecQuantize, setVecQuantize] = useState(32);
  const [asciiFilter, setAsciiFilter] = useState<AsciiFilter>("none");
  const [asciiRounding, setAsciiRounding] = useState(0);
  const [asciiOpacity, setAsciiOpacity] = useState(100);

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result !== "string") return;
      const img = new window.Image();
      img.onload = () => setImage({ img, name: file.name });
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Heavy re-sampling follows the sliders without blocking them.
  const deferredRes = useDeferredValue(vecResolution);
  const deferredQuant = useDeferredValue(vecQuantize);
  const vecData = useMemo(
    () => (active && mode === "vectorizer" && image ? vectorizeImage(image.img, { style: vecStyle, resolution: deferredRes, quantize: deferredQuant }) : ""),
    [active, mode, image, vecStyle, deferredRes, deferredQuant],
  );
  const asciiData = useMemo(() => (active && mode === "ascii" && image ? imageToAscii(image.img) : ""), [active, mode, image]);

  const { code, rawSvg, elementCount } = useMemo(() => {
    const jsx = codeMode === "jsx";
    const open = `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg"`;
    if (mode === "vectorizer") {
      if (!vecData) return { code: "// Upload an image to generate a vector SVG", rawSvg: "", elementCount: 0 };
      const raw = `${open}>\n${vecData}</svg>`;
      const jsxCode = `export default function VectorSvg() {\n  return (\n    ${open} className="h-full w-full">\n${vecData.replace(/^/gm, "    ").trimEnd()}\n    </svg>\n  );\n}`;
      return { code: jsx ? jsxCode : raw, rawSvg: raw, elementCount: vecData.split("\n").length - 1 };
    }
    if (!asciiData) return { code: "// Upload an image to generate an ASCII SVG pattern", rawSvg: "", elementCount: 0 };
    const filterDef = asciiFilter !== "none" ? `<filter id="ascii-filter">${ASCII_FILTER_DEFS[asciiFilter]}</filter>` : "";
    const clipDef = asciiRounding > 0 ? `<clipPath id="ascii-clip"><rect width="100%" height="100%" rx="${asciiRounding}" /></clipPath>` : "";
    const defs = filterDef || clipDef ? `\n  <defs>${[filterDef, clipDef].filter(Boolean).map((d) => `\n    ${d}`).join("")}\n  </defs>` : "";
    const gAttrs = (j: boolean) =>
      (asciiFilter !== "none" ? ` filter="url(#ascii-filter)"` : "") +
      (asciiRounding > 0 ? (j ? ` clipPath="url(#ascii-clip)"` : ` clip-path="url(#ascii-clip)"`) : "") +
      (asciiOpacity < 100 ? ` opacity="${(asciiOpacity / 100).toFixed(2)}"` : "");
    const raw = `${open} style="color: currentColor;">${defs}\n  <g${gAttrs(false)}>\n${asciiData}  </g>\n</svg>`;
    const jsxCode = `export default function AsciiSvg() {\n  return (\n    ${open} className="h-full w-full text-black dark:text-white">${defs.replace(/\n/g, "\n    ")}\n      <g${gAttrs(true)}>\n${asciiData.replace(/^/gm, "  ").trimEnd()}\n      </g>\n    </svg>\n  );\n}`;
    return { code: jsx ? jsxCode : raw, rawSvg: raw, elementCount: asciiData.split("\n").length - 1 };
  }, [mode, codeMode, vecData, asciiData, asciiFilter, asciiRounding, asciiOpacity]);

  return (
    <div hidden={!active}>
      <div className="svg-workspace">
        <div className="mk-canvas svg-stage w-full select-none">
          {mode === "vectorizer" && vecData && (
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="pointer-events-none absolute inset-0 h-full w-full p-4 sm:p-8">
              <g dangerouslySetInnerHTML={{ __html: vecData }} />
            </svg>
          )}
          {mode === "ascii" && asciiData && (
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="pointer-events-none absolute inset-0 h-full w-full p-4 text-mk-text sm:p-8">
              <defs>
                {asciiFilter !== "none" && <filter id="ascii-preview-filter" dangerouslySetInnerHTML={{ __html: ASCII_FILTER_DEFS[asciiFilter] }} />}
                {asciiRounding > 0 && (
                  <clipPath id="ascii-preview-clip">
                    <rect width="100%" height="100%" rx={asciiRounding} />
                  </clipPath>
                )}
              </defs>
              <g
                dangerouslySetInnerHTML={{ __html: asciiData }}
                filter={asciiFilter !== "none" ? "url(#ascii-preview-filter)" : undefined}
                clipPath={asciiRounding > 0 ? "url(#ascii-preview-clip)" : undefined}
                opacity={asciiOpacity / 100}
              />
            </svg>
          )}
          {!image && (
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="w-full max-w-[380px]">
                <Dropzone onFile={loadImage} hint="PNG, JPG, GIF or WebP. Drop it here or click." />
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
            {image && (
              <span className="mk-badge max-w-[220px]">
                <span className="min-w-0 truncate">{image.name}</span>
              </span>
            )}
          </div>
          <div className="pointer-events-none absolute right-3 top-3">
            {mode === "vectorizer" && vecData && <span className="mk-badge">{plural(elementCount, "element")}</span>}
            {mode === "ascii" && asciiData && <span className="mk-badge">{plural(elementCount, "glyph")}</span>}
          </div>
        </div>

        <div className="svg-side">
          {mode === "vectorizer" ? (
            <section className="mk-panel flex flex-col gap-5">
              <h2 className="mk-panel-title">Vectorizer</h2>
              <Dropzone onFile={loadImage} fileName={image?.name} hint="Turns pixels into real SVG shapes" />
              <div className="mk-field">
                <p className="mk-section-label mb-0!">Style</p>
                <div className="mk-chips">
                  {(["pixel", "halftone", "triangle"] as const).map((s) => (
                    <button key={s} type="button" className="mk-chip flex-1 capitalize" data-active={vecStyle === s} onClick={() => setVecStyle(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <RangeField label="Resolution" value={vecResolution} onChange={setVecResolution} min={10} max={100} unit=" blocks" />
              <RangeField label="Colour quantization" value={vecQuantize} onChange={setVecQuantize} min={1} max={64} unit=" steps" />
            </section>
          ) : (
            <section className="mk-panel flex flex-col gap-5">
              <h2 className="mk-panel-title">ASCII pattern</h2>
              <Dropzone onFile={loadImage} fileName={image?.name} hint="Brightness becomes characters" />
              <div className="mk-field">
                <p className="mk-section-label mb-0!">SVG filter</p>
                <div className="mk-chips">
                  {(["none", "grayscale", "sepia", "blur", "invert"] as const).map((f) => (
                    <button key={f} type="button" className="mk-chip capitalize" data-active={asciiFilter === f} onClick={() => setAsciiFilter(f)}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <RangeField label="Corner radius" value={asciiRounding} onChange={setAsciiRounding} min={0} max={200} unit="px" />
              <RangeField label="Opacity" value={asciiOpacity} onChange={setAsciiOpacity} min={10} max={100} unit="%" />
            </section>
          )}
          <div className="mk-tip">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-mk-accent" />
            <p className="m-0">
              {mode === "vectorizer" ? (
                <>
                  <strong>Real vectors.</strong> The vectorizer redraws your image from hundreds of {"<rect>"}, {"<circle>"} or {"<polygon>"} elements.
                  Lower the resolution for a smaller file.
                </>
              ) : (
                <>
                  <strong>Text as texture.</strong> Each pixel becomes a {"<text>"} glyph using currentColor, so the pattern follows your text colour
                  in light and dark themes.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <CodePanel
        formats={[
          { value: "jsx", label: "JSX" },
          { value: "svg", label: "SVG" },
        ]}
        format={codeMode}
        onFormat={setCodeMode}
        code={code}
        rawSvg={rawSvg}
        fileName={`motionkit-${mode}.svg`}
      />
    </div>
  );
}
