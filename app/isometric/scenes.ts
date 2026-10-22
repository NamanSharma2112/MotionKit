import type { Block, Dir, Scene, ShapeType } from "./iso";
import { newId } from "./iso";

/* Built-in example scenes. Each is generated so it stays small in source and
   always matches the current block format (0-based z, optional facing). */

class Builder {
  blocks: Block[] = [];
  private key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  private index = new Map<string, number>();

  add(x: number, y: number, z: number, color: string, shape: ShapeType = "cube", dir?: Dir) {
    const k = this.key(x, y, z);
    const b: Block = { id: newId(), x, y, z, color, shape };
    if (dir) b.dir = dir;
    const at = this.index.get(k);
    if (at !== undefined) this.blocks[at] = b;
    else {
      this.index.set(k, this.blocks.length);
      this.blocks.push(b);
    }
    return this;
  }

  fill(x0: number, x1: number, y0: number, y1: number, z: number, color: string | ((x: number, y: number) => string), shape: ShapeType = "cube") {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) this.add(x, y, z, typeof color === "string" ? color : color(x, y), shape);
    return this;
  }

  remove(x: number, y: number, z: number) {
    const at = this.index.get(this.key(x, y, z));
    if (at === undefined) return this;
    this.blocks.splice(at, 1);
    this.index.clear();
    this.blocks.forEach((b, i) => this.index.set(this.key(b.x, b.y, b.z), i));
    return this;
  }
}

const checker = (a: string, b: string) => (x: number, y: number) => ((x + y) % 2 ? a : b);

function cottage(): Scene {
  const s = new Builder();
  const grass = checker("#86c95f", "#7dc057");
  s.fill(0, 9, 0, 9, 0, grass, "slab");
  // stone path from the door
  for (let y = 6; y <= 9; y++) s.add(4, y, 0, y % 2 ? "#d8cdb9" : "#cfc3ad", "slab");
  // pond
  s.fill(0, 1, 8, 9, 0, "#7cc8ef", "slab");
  const wall = "#f4ead8";
  const z0 = 0.5;
  for (let z = z0; z <= z0 + 1; z++) {
    for (let x = 2; x <= 6; x++) {
      s.add(x, 2, z, wall);
      s.add(x, 5, z, wall);
    }
    for (let y = 3; y <= 4; y++) {
      s.add(2, y, z, wall);
      s.add(6, y, z, wall);
    }
  }
  // door + windows
  s.add(4, 5, 0.5, "#8a5a3b").add(4, 5, 1.5, "#8a5a3b");
  s.add(3, 5, 1.5, "#9ed5f5").add(5, 5, 1.5, "#9ed5f5");
  s.add(6, 3, 1.5, "#9ed5f5").add(6, 4, 1.5, "#9ed5f5");
  // gable
  s.fill(2, 6, 3, 4, 2.5, wall);
  const roof = "#cf5b3f";
  const roofDark = "#bf4f35";
  for (let x = 2; x <= 6; x++) {
    s.add(x, 5, 2.5, roof, "wedge", 0);
    s.add(x, 4, 3.5, roofDark, "wedge", 0);
    s.add(x, 3, 3.5, roofDark, "wedge", 2);
    s.add(x, 2, 2.5, roof, "wedge", 2);
  }
  s.add(5, 3, 3.5, "#8f8f96").add(5, 3, 4.5, "#8f8f96");
  // tree
  s.add(8, 2, 0.5, "#7a4b2a", "cylinder").add(8, 2, 1.5, "#7a4b2a", "cylinder");
  s.fill(7, 9, 1, 3, 2.5, checker("#4fae58", "#45a04f"));
  for (const [x, y] of [[8, 1], [7, 2], [8, 2], [9, 2], [8, 3]]) s.add(x, y, 3.5, "#5bbd63");
  s.add(8, 2, 4.5, "#5bbd63", "pyramid");
  // flowers + bushes
  s.add(2, 7, 0.5, "#f48fb1", "pyramid").add(6, 7, 0.5, "#ffd23f", "pyramid").add(1, 4, 0.5, "#f48fb1", "pyramid");
  s.add(3, 6, 0.5, "#5aa84f", "slab").add(5, 6, 0.5, "#5aa84f", "slab");
  return { version: 2, grid: 10, ground: true, blocks: s.blocks };
}

function city(): Scene {
  const s = new Builder();
  const road = (x: number, y: number) => x === 5 || x === 6 || y === 5 || y === 6;
  for (let x = 0; x < 12; x++)
    for (let y = 0; y < 12; y++) s.add(x, y, 0, road(x, y) ? "#3e4049" : (x + y) % 2 ? "#d4d6dc" : "#cdd0d6", "slab");
  // park
  s.fill(0, 4, 7, 11, 0, checker("#86c95f", "#7dc057"), "slab");
  for (const [x, y] of [[1, 8], [3, 10], [3, 8]]) {
    s.add(x, y, 0.5, "#7a4b2a", "cylinder").add(x, y, 1.5, "#4fae58", "pyramid");
  }
  s.add(1, 10, 0.5, "#7cc8ef", "slab");
  // tower
  for (let z = 0.5; z < 6.5; z++) s.fill(1, 3, 1, 3, z, z % 2 > 1 ? "#8fb3ff" : "#83a9fb");
  s.fill(1, 3, 1, 3, 6.5, "#e6ecff", "slab");
  s.add(2, 2, 7, "#9aa3b5", "cylinder");
  // twin blocks
  for (let z = 0.5; z < 4.5; z++) s.fill(7, 8, 1, 2, z, "#ffcf7d");
  s.fill(7, 8, 1, 2, 4.5, "#f2b65c", "slab");
  for (let z = 0.5; z < 3.5; z++) s.fill(9, 10, 1, 3, z, "#f4a3a3");
  s.fill(9, 10, 1, 3, 3.5, "#e9887f", "slab");
  // low building with rooftop tank
  for (let z = 0.5; z < 2.5; z++) s.fill(7, 10, 7, 10, z, "#a8dccd");
  s.fill(8, 9, 8, 9, 2.5, "#8ccdbb");
  s.add(8, 8, 3.5, "#9aa3b5", "cylinder");
  // cars
  s.add(5, 2, 0.5, "#e5484d", "slab").add(6, 9, 0.5, "#3b82f6", "slab").add(9, 5, 0.5, "#ffd23f", "slab");
  return { version: 2, grid: 12, ground: true, blocks: s.blocks };
}

function ziggurat(): Scene {
  const s = new Builder();
  const tones = ["#e8c98f", "#e0bb7c", "#d8ad6a", "#cf9f59"];
  [
    [1, 9],
    [2, 8],
    [3, 7],
    [4, 6],
  ].forEach(([a, b], z) => s.fill(a, b, a, b, z, tones[z]));
  s.add(5, 5, 4, "#f5b82e", "pyramid");
  const step = "#f2deb2";
  s.add(5, 10, 0, step, "stairs", 0);
  s.add(5, 9, 1, step, "stairs", 0);
  s.add(5, 8, 2, step, "stairs", 0);
  s.add(5, 7, 3, step, "stairs", 0);
  s.add(10, 5, 0, step, "stairs", 3);
  s.add(9, 5, 1, step, "stairs", 3);
  s.add(8, 5, 2, step, "stairs", 3);
  s.add(7, 5, 3, step, "stairs", 3);
  for (const [x, y] of [[4, 4], [6, 4], [4, 6], [6, 6]]) s.add(x, y, 4, "#c2672e", "slab");
  // palms
  for (const [x, y] of [[0, 10], [10, 0]]) {
    s.add(x, y, 0, "#9a6a44", "cylinder").add(x, y, 1, "#9a6a44", "cylinder").add(x, y, 2, "#4fae58", "pyramid");
  }
  return { version: 2, grid: 11, ground: true, blocks: s.blocks };
}

function island(): Scene {
  const s = new Builder();
  s.fill(3, 5, 3, 5, 0, "#7f5434");
  s.fill(2, 6, 2, 6, 1, checker("#8f603d", "#895a38"));
  s.fill(1, 7, 1, 7, 2, checker("#79c75a", "#71bd53"));
  s.remove(1, 1, 2).remove(7, 7, 2).remove(1, 7, 2);
  s.add(1, 7, 2, "#7cc8ef", "slab");
  // trunk
  s.add(4, 4, 3, "#7a4b2a", "cylinder").add(4, 4, 4, "#7a4b2a", "cylinder");
  // canopy
  s.fill(3, 5, 3, 5, 5, checker("#3f9b4a", "#47a852"));
  for (const [x, y] of [[4, 2], [2, 4], [6, 4], [4, 6]]) s.add(x, y, 5, "#4cae57");
  for (const [x, y] of [[4, 3], [3, 4], [4, 4], [5, 4], [4, 5]]) s.add(x, y, 6, "#55b960");
  s.add(4, 4, 7, "#5fc46a", "pyramid");
  // flowers & a rock
  s.add(6, 2, 3, "#ffd23f", "pyramid").add(2, 3, 3, "#f48fb1", "pyramid").add(6, 6, 3, "#a8a8b0", "slab");
  s.add(5, 7, 3, "#ffd23f", "pyramid");
  return { version: 2, grid: 9, ground: false, blocks: s.blocks };
}

function desk(): Scene {
  const s = new Builder();
  const wood = "#c99b6a";
  // legs + top
  for (const [x, y] of [[2, 3], [7, 3], [2, 5], [7, 5]]) s.add(x, y, 0, "#5b5f6a", "cylinder");
  s.fill(2, 7, 3, 5, 1, (x, y) => ((x + y) % 2 ? wood : "#c49462"), "slab");
  // monitor
  s.add(4, 3, 1.5, "#2a2d34", "slab").add(5, 3, 1.5, "#2a2d34", "slab");
  for (const z of [2, 3]) {
    s.add(3, 3, z, "#22252b").add(6, 3, z, "#22252b");
    s.add(4, 3, z, "#3b7dff").add(5, 3, z, "#5b93ff");
  }
  // keyboard + mouse
  s.fill(3, 5, 5, 5, 1.5, "#e7e7ea", "slab");
  s.add(6, 5, 1.5, "#d4d4d8", "slab");
  // lamp, mug, plant
  s.add(2, 3, 1.5, "#2a2d34", "cylinder").add(2, 3, 2.5, "#fde68a", "pyramid");
  s.add(7, 5, 1.5, "#f97316", "cylinder");
  s.add(7, 3, 1.5, "#c2672e", "slab").add(7, 3, 2, "#4fae58", "pyramid");
  // chair
  s.add(4, 7, 0, "#5b5f6a", "cylinder").add(5, 7, 0, "#5b5f6a", "cylinder");
  s.fill(4, 5, 7, 7, 1, "#374151", "slab");
  s.fill(4, 5, 8, 8, 1, "#374151").fill(4, 5, 8, 8, 2, "#374151");
  return { version: 2, grid: 10, ground: true, blocks: s.blocks };
}

function logo(): Scene {
  const s = new Builder();
  s.fill(0, 11, 5, 7, 0, checker("#e4e4e7", "#dcdce0"), "slab");
  const M = ["X...X", "XX.XX", "X.X.X", "X...X", "X...X"];
  const K = ["X..X", "X.X.", "XX..", "X.X.", "X..X"];
  const draw = (rows: string[], x0: number, c1: string, c2: string) =>
    rows.forEach((row, r) =>
      [...row].forEach((ch, i) => {
        if (ch === "X") s.add(x0 + i, 6, 0.5 + (4 - r), (i + r) % 2 ? c1 : c2);
      }),
    );
  draw(M, 1, "#1f6bff", "#2a74ff");
  draw(K, 7, "#7aa7ff", "#85afff");
  return { version: 2, grid: 12, ground: true, blocks: s.blocks };
}

export interface Example {
  id: string;
  title: string;
  desc: string;
  make: () => Scene;
}

export const EXAMPLES: Example[] = [
  { id: "cottage", title: "Cottage", desc: "Gable roof, tree, pond", make: cottage },
  { id: "city", title: "City block", desc: "Towers, roads, park", make: city },
  { id: "ziggurat", title: "Ziggurat", desc: "Stepped pyramid, stairs", make: ziggurat },
  { id: "island", title: "Tree island", desc: "Floating, no ground", make: island },
  { id: "desk", title: "Desk setup", desc: "Monitor, lamp, chair", make: desk },
  { id: "logo", title: "MK logo", desc: "Letters in blocks", make: logo },
];

export const DEFAULT_EXAMPLE = "cottage";
