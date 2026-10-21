"use client";

import { LayoutGroup } from "framer-motion";
import { catalog } from "./catalog";
import ShowcaseCard from "./ShowcaseCard";

export default function ComponentGrid() {
  return (
    <LayoutGroup id="grid">
      <div className="mk-grid">
        {catalog.map((item, i) => (
          <ShowcaseCard key={item.slug} item={item} index={i} />
        ))}
      </div>
    </LayoutGroup>
  );
}
