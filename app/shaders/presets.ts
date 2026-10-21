/* Shader presets and starter templates for the playground.

   Every source is a complete, copy-pasteable GLSL ES fragment shader.
   Uniforms followed by an annotation comment become controls in the UI:
     uniform float u_scale;  // @range min max default Label
     uniform vec3  u_color;  // @color #rrggbb Label
   u_time, u_resolution and u_mouse are supplied by the renderer. */

export type ShaderPreset = {
  id: string;
  name: string;
  description: string;
  source: string;
  /** Time (seconds) used for the static thumbnail. */
  thumbTime: number;
};

export type ShaderTemplate = {
  id: string;
  name: string;
  description: string;
  source: string;
};

const HEAD = `precision highp float;

uniform float u_time;       // seconds
uniform vec2 u_resolution;  // canvas size in pixels`;

const MOUSE = `uniform vec2 u_mouse;       // pointer, 0–1, smoothed`;

// Hash without sine (Dave Hoskins, MIT): stable on mobile GPUs.
const HASH = `float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}`;

const HASH2 = `vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}`;

const NOISE = `${HASH}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

const FBM = `${NOISE}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = r * p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}`;

export const presets: ShaderPreset[] = [
  {
    id: "mesh",
    name: "Mesh gradient",
    description: "Soft colours drifting together",
    thumbTime: 9,
    source: `${HEAD}
${MOUSE}

uniform vec3 u_color1;  // @color #ffb38a Colour 1
uniform vec3 u_color2;  // @color #ff4f8b Colour 2
uniform vec3 u_color3;  // @color #6b5bff Colour 3
uniform vec3 u_color4;  // @color #22c3ff Colour 4
uniform float u_warp;   // @range 0 1 0.55 Warp
uniform float u_grain;  // @range 0 0.15 0.035 Grain

${NOISE}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.12;

  // Bend space with slow noise so the blend never looks radial.
  vec2 w = vec2(noise(p * 1.4 + t), noise(p * 1.4 - t + 4.7)) - 0.5;
  p += w * u_warp * 0.7;

  // Four drifting anchors; the last one leans toward the pointer.
  vec2 a1 = vec2(0.12 * aspect + 0.12 * sin(t * 1.7), 0.18 + 0.14 * cos(t * 1.3));
  vec2 a2 = vec2(0.88 * aspect + 0.12 * cos(t * 1.1), 0.22 + 0.18 * sin(t * 1.9));
  vec2 a3 = vec2(0.22 * aspect + 0.16 * cos(t * 1.4), 0.86 + 0.12 * sin(t * 1.2));
  vec2 a4 = vec2(0.80 * aspect + 0.12 * sin(t * 1.5), 0.80 + 0.12 * cos(t * 1.6));
  a4 = mix(a4, vec2(u_mouse.x * aspect, u_mouse.y), 0.3);

  // Inverse-distance weights give the soft mesh falloff.
  float w1 = 1.0 / (0.03 + pow(distance(p, a1), 2.4));
  float w2 = 1.0 / (0.03 + pow(distance(p, a2), 2.4));
  float w3 = 1.0 / (0.03 + pow(distance(p, a3), 2.4));
  float w4 = 1.0 / (0.03 + pow(distance(p, a4), 2.4));
  vec3 col = (u_color1 * w1 + u_color2 * w2 + u_color3 * w3 + u_color4 * w4) / (w1 + w2 + w3 + w4);

  col += (hash(gl_FragCoord.xy) - 0.5) * u_grain;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Light curtains over a ridge",
    thumbTime: 14,
    source: `${HEAD}

uniform vec3 u_color1;      // @color #3dffb5 Glow
uniform vec3 u_color2;      // @color #8a5cff Fringe
uniform vec3 u_sky;         // @color #050b1c Sky
uniform float u_intensity;  // @range 0.2 2 1 Intensity

${FBM}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.1;

  // Night sky, brighter toward the horizon.
  vec3 col = u_sky * (1.7 - uv.y);

  // Stars
  vec2 sp = p * 90.0;
  vec2 id = floor(sp);
  float h = hash(id);
  vec2 off = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
  float star = step(0.94, h) * smoothstep(0.14, 0.0, length(fract(sp) - 0.5 - off * 0.6));
  star *= 0.6 + 0.4 * sin(u_time * (1.0 + h * 3.0) + h * 40.0);
  col += star * smoothstep(-0.2, 0.5, p.y) * 0.9;

  // Curtains: sharp lower edge, long soft fade upward, fine vertical rays.
  vec3 aur = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float x = p.x * (1.0 + fi * 0.25) + fi * 3.1;
    float base = -0.08 + fi * 0.07 + 0.4 * (fbm(vec2(x * 0.7 + t * (1.0 + fi * 0.3), fi * 2.3 + t * 0.4)) - 0.5);
    float d = p.y - base;
    float curtain = smoothstep(-0.015, 0.02, d) * exp(-max(d, 0.0) * (3.5 + fi * 1.5));
    float rays = 0.5 + 0.5 * noise(vec2(x * 24.0, t * 6.0 + fi));
    vec3 c = mix(u_color1, u_color2, smoothstep(0.0, 0.3, d));
    aur += c * curtain * rays * (1.0 - fi * 0.18);
  }
  col += aur * 0.6 * u_intensity;

  // Mountain silhouette catches a little of the glow.
  float ridge = -0.3 + 0.12 * fbm(vec2(p.x * 2.2, 3.0)) + 0.02 * noise(vec2(p.x * 14.0, 1.0));
  float m = smoothstep(ridge + 0.003, ridge - 0.003, p.y);
  col = mix(col, u_sky * 0.3 + aur * 0.04, m);

  col = 1.0 - exp(-col * 1.6);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "chrome",
    name: "Liquid chrome",
    description: "Rippling mirror-finish metal",
    thumbTime: 4,
    source: `${HEAD}

uniform vec3 u_tint;      // @color #d9e6ff Sky
uniform vec3 u_ground;    // @color #2b211c Ground
uniform float u_scale;    // @range 0.4 3 1.1 Scale
uniform float u_relief;   // @range 0.1 1.5 0.55 Relief

float height(vec2 p, float t) {
  vec2 q = p;
  q += 0.6 * vec2(sin(q.y * 1.3 + t), cos(q.x * 1.1 - t * 0.8));
  q += 0.3 * vec2(sin(q.y * 2.7 - t * 1.3), cos(q.x * 2.3 + t));
  return sin(q.x * 1.4) * cos(q.y * 1.2) + 0.5 * sin((q.x + q.y) * 2.1 + t * 0.6);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * 3.0 * u_scale;
  float t = u_time * 0.3;

  // Surface normal from the height field.
  float e = 0.01;
  float h = height(p, t);
  vec2 g = vec2(height(p + vec2(e, 0.0), t) - h, height(p + vec2(0.0, e), t) - h) / e;
  vec3 n = normalize(vec3(-g * u_relief, 1.0));

  // Reflect a studio environment: bright sky, dark ground, crisp horizon.
  vec3 r = reflect(normalize(vec3(0.0, -0.35, -1.0)), n);
  float y = r.y + 0.1 * r.x;
  vec3 sky = mix(u_tint * 0.7, vec3(1.0), smoothstep(0.0, 0.8, y));
  vec3 ground = u_ground * (0.35 + 0.9 * smoothstep(-0.8, 0.0, y));
  vec3 col = mix(ground, sky, smoothstep(-0.02, 0.02, y));

  // Specular hotspot and a little edge darkening.
  col += pow(max(dot(r, normalize(vec3(-0.5, 0.6, 0.6))), 0.0), 50.0) * 0.8;
  col *= 0.7 + 0.3 * n.z;
  col *= 1.0 - 0.35 * pow(length(uv - 0.5) * 1.3, 2.0);

  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "grain",
    name: "Grain gradient",
    description: "Glowing blobs, printed grain",
    thumbTime: 3,
    source: `${HEAD}

uniform vec3 u_bg;      // @color #0d0b14 Background
uniform vec3 u_color1;  // @color #ff5a36 Colour 1
uniform vec3 u_color2;  // @color #ffb547 Colour 2
uniform vec3 u_color3;  // @color #6d4bff Colour 3
uniform float u_grain;  // @range 0 0.6 0.28 Grain

${HASH}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.25;

  vec2 b1 = vec2(-0.45 + 0.18 * sin(t), -0.25 + 0.12 * cos(t * 1.3));
  vec2 b2 = vec2(0.10 + 0.20 * cos(t * 0.7), 0.30 + 0.10 * sin(t * 1.1));
  vec2 b3 = vec2(0.55 + 0.15 * sin(t * 0.9 + 2.0), -0.30 + 0.15 * cos(t * 0.8));
  float f1 = exp(-dot(p - b1, p - b1) * 2.5);
  float f2 = exp(-dot(p - b2, p - b2) * 3.5);
  float f3 = exp(-dot(p - b3, p - b3) * 3.0);

  vec3 col = u_bg;
  col = mix(col, u_color3, f3);
  col = mix(col, u_color1, f1);
  col = mix(col, u_color2, f2 * 0.85);

  // Stipple toward the background, then add fine noise, like risograph print.
  float n = hash(gl_FragCoord.xy);
  float glow = max(f1, max(f2, f3));
  col = mix(col, u_bg, step(n, u_grain * 0.6 * (1.0 - glow)));
  col += (hash(gl_FragCoord.xy + 17.0) - 0.5) * u_grain * 0.25;

  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "plasma",
    name: "Plasma",
    description: "Demoscene waves with bands",
    thumbTime: 5,
    source: `${HEAD}

uniform float u_scale;  // @range 1 14 7 Scale
uniform float u_hue;    // @range 0 1 0.62 Hue
uniform float u_bands;  // @range 0 12 0 Bands

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * u_scale;
  float t = u_time * 0.6;

  float v = sin(p.x + t);
  v += sin((p.y + t) * 0.5);
  v += sin((p.x + p.y + t) * 0.5);
  vec2 c = p + u_scale * 0.5 * vec2(sin(t * 0.33), cos(t * 0.5));
  v += sin(sqrt(dot(c, c) + 1.0) + t);
  v = v * 0.125 + 0.5;

  // Posterise into flat bands when u_bands >= 1.
  if (u_bands >= 1.0) v = floor(v * u_bands) / u_bands;

  // Cosine palette (Inigo Quilez): two cycles across the range, deep shadows.
  vec3 col = 0.5 + 0.5 * cos(6.28318 * (2.0 * v + u_hue + vec3(0.0, 0.15, 0.3)));
  col *= 0.75 + 0.25 * sin(v * 18.0);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "voronoi",
    name: "Voronoi glass",
    description: "Drifting cells, glowing seams",
    thumbTime: 6,
    source: `${HEAD}

uniform vec3 u_color1;  // @color #0b1440 Cells
uniform vec3 u_color2;  // @color #4fd8ff Seams
uniform float u_scale;  // @range 2 12 5 Scale
uniform float u_glow;   // @range 0 1 0.5 Glow

${HASH2}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * u_scale;
  float t = u_time * 0.4;
  vec2 ip = floor(p);
  vec2 fp = fract(p);

  // Track nearest (f1) and second-nearest (f2) feature points.
  float f1 = 8.0;
  float f2 = 8.0;
  vec2 cell = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 nb = vec2(float(i), float(j));
      vec2 o = 0.5 + 0.45 * sin(t + 6.2831 * hash2(ip + nb));
      float d = length(nb + o - fp);
      if (d < f1) { f2 = f1; f1 = d; cell = ip + nb; }
      else if (d < f2) { f2 = d; }
    }
  }

  float edge = f2 - f1;
  float px = u_scale / u_resolution.y;
  vec3 col = u_color1 * (0.6 + 0.9 * hash2(cell).x) * (1.15 - 0.5 * f1);
  col = mix(col, u_color2, smoothstep(0.03 + px, 0.03 - px, edge));
  col += u_color2 * exp(-edge * 10.0) * u_glow * 0.6;

  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "warp",
    name: "Nebula warp",
    description: "Noise folded through itself",
    thumbTime: 20,
    source: `${HEAD}

uniform vec3 u_color1;  // @color #060d24 Deep
uniform vec3 u_color2;  // @color #e0533d Warm
uniform vec3 u_color3;  // @color #a6ecff Highlight
uniform float u_warp;   // @range 0 6 4 Warp
uniform float u_scale;  // @range 1 6 2.5 Scale

${FBM}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * u_scale;
  float t = u_time * 0.05;

  // Domain warping: feed fbm back into its own coordinates twice.
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + u_warp * q + vec2(1.7, 9.2) + 0.6 * t),
                fbm(p + u_warp * q + vec2(8.3, 2.8) - 0.5 * t));
  float f = fbm(p + u_warp * r);

  vec3 col = mix(u_color1, u_color2, clamp(f * f * 3.0, 0.0, 1.0));
  col = mix(col, u_color1 * 1.4, clamp(length(q) - 0.4, 0.0, 1.0));
  col = mix(col, u_color3, clamp(r.x * r.x * 1.6 - 0.2, 0.0, 1.0) * 0.7);
  col *= 0.4 + 1.8 * f * f;

  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "stars",
    name: "Starfield",
    description: "Fly through stars; steer it",
    thumbTime: 7,
    source: `${HEAD}
${MOUSE}

uniform vec3 u_color1;     // @color #a9c8ff Stars
uniform vec3 u_color2;     // @color #ff9ad5 Accent
uniform float u_density;   // @range 0.1 1 0.55 Density
uniform float u_glow;      // @range 0 1 0.35 Core glow

${HASH}

vec3 layer(vec2 p, float seed) {
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = hash(id + seed);
  if (h > u_density) return vec3(0.0);
  vec2 o = vec2(hash(id + seed + 3.1), hash(id + seed + 7.7)) - 0.5;
  // Keep each star's glow inside its own cell so no seams show.
  float d = length(f - o * 0.5);
  float size = 0.012 + 0.03 * fract(h * 17.0);
  float star = size / d * smoothstep(0.25, 0.02, d);
  vec3 c = mix(u_color1, u_color2, step(0.8, fract(h * 31.0)));
  return c * star;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  p -= (u_mouse - 0.5) * 0.2;
  float t = u_time * 0.08;

  vec3 col = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i) / 6.0;
    float depth = fract(fi + t);
    float scale = mix(18.0, 0.6, depth);
    float fade = depth * smoothstep(1.0, 0.85, depth);
    col += layer(p * scale + fi * 113.7, fi * 51.3) * fade;
  }
  col += mix(u_color1, u_color2, 0.5) * u_glow * 0.06 / (length(p) + 0.08);

  col = 1.0 - exp(-col * 1.2);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "caustics",
    name: "Caustics",
    description: "Sunlight on a pool floor",
    thumbTime: 8,
    source: `${HEAD}

uniform vec3 u_water;       // @color #0a5d8a Water
uniform vec3 u_light;       // @color #d9fbff Light
uniform float u_scale;      // @range 1 8 3.2 Scale
uniform float u_sharpness;  // @range 1 6 3 Sharpness

${HASH2}

// Distance to the nearest Voronoi seam: thin bright lines form the caustic net.
float seams(vec2 p, float t) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 nb = vec2(float(i), float(j));
      vec2 o = 0.5 + 0.4 * sin(t + 6.2831 * hash2(ip + nb));
      float d = length(nb + o - fp);
      if (d < f1) { f2 = f1; f1 = d; }
      else if (d < f2) { f2 = d; }
    }
  }
  return f2 - f1;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * u_scale;
  float t = u_time * 0.6;

  vec2 w = p + 0.3 * vec2(sin(p.y * 1.3 + t * 0.7), cos(p.x * 1.1 - t * 0.6));
  float a = seams(w, t);
  float b = seams(w * 1.4 + 4.0, -t * 0.8);
  float k = u_sharpness * 2.0;
  float light = pow(max(1.0 - a * 2.4, 0.0), k) + 0.6 * pow(max(1.0 - b * 2.4, 0.0), k);

  vec3 col = u_water * (0.55 + 0.6 * uv.y);
  col += u_light * light * 0.8;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "dots",
    name: "Dot matrix",
    description: "Halftone that ripples to you",
    thumbTime: 4,
    source: `${HEAD}
${MOUSE}

uniform vec3 u_bg;         // @color #09090b Background
uniform vec3 u_dot;        // @color #3b7dff Dots
uniform float u_density;   // @range 12 80 38 Density
uniform float u_ripple;    // @range 0 1 0.7 Ripple

${NOISE}

void main() {
  float cells = u_density;
  vec2 p = gl_FragCoord.xy / u_resolution.y * cells;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  vec2 c = (id + 0.5) / cells;

  float aspect = u_resolution.x / u_resolution.y;
  vec2 m = vec2(u_mouse.x * aspect, u_mouse.y);
  float t = u_time;

  float field = noise(c * 3.0 + vec2(t * 0.3, -t * 0.2));
  float dm = distance(c, m);
  float ring = 0.5 + 0.5 * sin(dm * 22.0 - t * 3.0);
  float v = mix(field, ring, u_ripple * exp(-dm * 2.2));

  float r = 0.06 + 0.36 * v;
  float aa = cells / u_resolution.y;
  float a = smoothstep(r + aa, r - aa, length(f));
  vec3 col = mix(u_bg, u_dot * (0.35 + 0.9 * v), a);

  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "fire",
    name: "Fire",
    description: "Flames with rising embers",
    thumbTime: 3,
    source: `${HEAD}

uniform vec3 u_color1;        // @color #ff3a00 Flame
uniform vec3 u_color2;        // @color #ffcf5c Core
uniform float u_height;       // @range 0.3 1.5 0.75 Height
uniform float u_turbulence;   // @range 0 2 1 Turbulence

${FBM}

void main() {
  vec2 p = (gl_FragCoord.xy - vec2(0.5 * u_resolution.x, 0.0)) / u_resolution.y;
  float t = u_time;

  // Noise scrolls upward and is pushed sideways by more noise.
  vec2 q = vec2(p.x * 3.0, p.y * 2.0 - t * 1.2);
  q.x += u_turbulence * (fbm(q * 0.8 + vec2(0.0, t * 0.3)) - 0.5) * 1.5;
  float n = fbm(q);
  float heat = clamp(n * 1.7 - p.y / u_height + 0.15, 0.0, 1.0);

  vec3 col = vec3(0.0);
  col = mix(col, u_color1, smoothstep(0.0, 0.35, heat));
  col = mix(col, u_color2, smoothstep(0.35, 0.7, heat));
  col = mix(col, vec3(1.0, 0.98, 0.92), smoothstep(0.75, 1.0, heat));

  // Embers
  vec2 ep = vec2(p.x * 22.0, p.y * 22.0 - t * 3.0);
  vec2 eid = floor(ep);
  float eh = hash(eid);
  vec2 ef = fract(ep) - 0.5 + 0.3 * vec2(sin(t * 2.0 + eh * 30.0), 0.0);
  float ember = step(0.965, eh) * smoothstep(0.12, 0.0, length(ef));
  col += u_color2 * ember * smoothstep(1.1, 0.1, p.y);

  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "rain",
    name: "Digital rain",
    description: "Falling glyph columns",
    thumbTime: 6,
    source: `${HEAD}

uniform vec3 u_color;       // @color #3dff8a Glyphs
uniform float u_columns;    // @range 12 90 42 Columns
uniform float u_trail;      // @range 4 40 16 Trail

${HASH}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float cols = floor(u_columns);
  float cell = 1.0 / cols;
  vec2 g = vec2(uv.x / cell, uv.y * u_resolution.y / u_resolution.x / cell);
  vec2 id = floor(g);
  vec2 f = fract(g);
  float rows = u_resolution.y / u_resolution.x * cols;

  // Each column has its own speed and phase.
  float seed = hash(vec2(id.x, 1.0));
  float speed = 4.0 + seed * 8.0;
  float head = rows - mod(u_time * speed + seed * 97.0, rows + u_trail * 2.0);
  float dist = id.y - floor(head);
  float trail = step(0.0, dist) * exp(-dist / u_trail * 3.0);

  // A 5x5 pseudo-glyph that changes now and then.
  vec2 gp = floor((f - 0.12) / 0.76 * 5.0);
  float inside = step(0.12, f.x) * step(f.x, 0.88) * step(0.12, f.y) * step(f.y, 0.88);
  float swap = floor(u_time * (1.0 + seed * 3.0) + hash(id) * 10.0);
  float bit = step(0.45, hash(gp + id * 7.0 + swap * 13.0));
  float glyph = bit * inside;

  vec3 col = u_color * glyph * trail;
  col += vec3(0.85, 1.0, 0.9) * glyph * step(abs(dist), 0.5);
  col += u_color * 0.03;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
];

export const DEFAULT_PRESET_ID = "mesh";

export const templates: ShaderTemplate[] = [
  {
    id: "gradient",
    name: "Gradient",
    description: "Two colours and a wave; shows annotated controls",
    source: `precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

// Annotate a uniform to get a control in the side panel:
uniform vec3 u_top;       // @color #1f6bff Top
uniform vec3 u_bottom;    // @color #ff7ab6 Bottom
uniform float u_waves;    // @range 0 10 3 Waves

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float wave = sin(uv.x * u_waves * 3.14159 + u_time) * 0.08;
  float k = smoothstep(0.0, 1.0, uv.y + wave);
  gl_FragColor = vec4(mix(u_bottom, u_top, k), 1.0);
}`,
  },
  {
    id: "noise",
    name: "Noise",
    description: "Value noise and fbm, ready to remix",
    source: `precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

uniform vec3 u_color;     // @color #ffd27a Colour
uniform float u_scale;    // @range 1 10 4 Scale

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = gl_FragCoord.xy / u_resolution.y * u_scale;
  float n = fbm(p + vec2(u_time * 0.2, 0.0));
  gl_FragColor = vec4(u_color * n * 1.4, 1.0);
}`,
  },
  {
    id: "sdf",
    name: "Shapes",
    description: "Signed distance shapes blended smoothly",
    source: `precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

uniform vec3 u_fill;      // @color #1f6bff Fill
uniform float u_blend;    // @range 0.01 0.4 0.15 Blend

float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  vec2 m = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

  float a = sdCircle(p - vec2(0.25 * sin(u_time), 0.0), 0.18);
  float b = sdBox(p - m, vec2(0.12));
  float d = smin(a, b, u_blend);

  vec3 col = mix(u_fill, vec3(0.06), smoothstep(0.0, 0.004, d));
  col += 0.12 * cos(d * 120.0) * exp(-abs(d) * 6.0);  // contour lines
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: "raymarch",
    name: "Raymarch",
    description: "A lit 3D blob in 40 lines",
    source: `precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

uniform vec3 u_color;      // @color #ff6b4a Surface
uniform float u_wobble;    // @range 0 0.3 0.12 Wobble

float map(vec3 p) {
  float d = length(p) - 1.0;
  d += u_wobble * sin(p.x * 4.0 + u_time) * sin(p.y * 4.0 + u_time * 1.3) * sin(p.z * 4.0);
  return d;
}

vec3 normal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy),
                        map(p + e.yxy) - map(p - e.yxy),
                        map(p + e.yyx) - map(p - e.yyx)));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  vec3 ro = vec3(0.0, 0.0, 4.5);
  vec3 rd = normalize(vec3(p, -2.0));

  float t = 0.0;
  for (int i = 0; i < 80; i++) {
    float d = map(ro + rd * t);
    if (d < 0.001 || t > 10.0) break;
    t += d * 0.8;
  }

  vec3 col = vec3(0.05, 0.06, 0.09) + 0.05 * p.y;
  if (t < 10.0) {
    vec3 n = normal(ro + rd * t);
    vec3 l = normalize(vec3(0.6, 0.8, 0.5));
    float diff = max(dot(n, l), 0.0);
    float spec = pow(max(dot(reflect(rd, n), l), 0.0), 32.0);
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col = u_color * (0.15 + 0.85 * diff) + spec + rim * 0.4;
  }
  gl_FragColor = vec4(pow(col, vec3(0.4545)), 1.0);
}`,
  },
  {
    id: "shadertoy",
    name: "Shadertoy port",
    description: "Paste a mainImage() and it just runs",
    source: `precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Shadertoy names, mapped to the playground's uniforms.
#define iTime u_time
#define iResolution vec3(u_resolution, 1.0)
#define iMouse vec4(u_mouse * u_resolution, 0.0, 0.0)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0.0, 2.0, 4.0));
  fragColor = vec4(col, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}`,
  },
];
