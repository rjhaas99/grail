import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDir = path.join(process.cwd(), "public", "badges", "collector-level");

const badges = [
  {
    key: "seeker",
    title: "SEEKER",
    range: "1–5",
    accent: "#C9CDD3",
    accentDark: "#2B2E33",
    enamel: "#16181C",
    metal: "#D7D9DC",
    darkMetal: "#34383D",
    gold: "#D8C18A",
    symbol: "seeker",
  },
  {
    key: "collector",
    title: "COLLECTOR",
    range: "6–10",
    accent: "#20A65A",
    accentDark: "#07391E",
    enamel: "#0D4F2A",
    metal: "#D9DDE0",
    darkMetal: "#2D3333",
    gold: "#D5BC78",
    symbol: "collector",
  },
  {
    key: "curator",
    title: "CURATOR",
    range: "11–15",
    accent: "#0A79C9",
    accentDark: "#07294A",
    enamel: "#0A3767",
    metal: "#D9DDE4",
    darkMetal: "#28323D",
    gold: "#D5BC78",
    symbol: "curator",
  },
  {
    key: "dealer",
    title: "DEALER",
    range: "16–20",
    accent: "#7D30C7",
    accentDark: "#271044",
    enamel: "#43167C",
    metal: "#E3C470",
    darkMetal: "#362A38",
    gold: "#F2CB62",
    symbol: "dealer",
  },
  {
    key: "veteran",
    title: "VETERAN",
    range: "21–25",
    accent: "#C5202A",
    accentDark: "#4A070C",
    enamel: "#7D1218",
    metal: "#DCDDE0",
    darkMetal: "#35292A",
    gold: "#D8C18A",
    symbol: "veteran",
  },
  {
    key: "elite",
    title: "ELITE",
    range: "26–30",
    accent: "#08A7B8",
    accentDark: "#063A42",
    enamel: "#077982",
    metal: "#E1C16D",
    darkMetal: "#2F3C3D",
    gold: "#F0C35A",
    symbol: "elite",
  },
  {
    key: "icon",
    title: "ICON",
    range: "31–35",
    accent: "#C76422",
    accentDark: "#4C2108",
    enamel: "#8A390B",
    metal: "#D9DADD",
    darkMetal: "#3A2F2A",
    gold: "#E4C174",
    symbol: "icon",
  },
  {
    key: "vault",
    title: "VAULT",
    range: "36–40",
    accent: "#C7A75D",
    accentDark: "#11100D",
    enamel: "#171614",
    metal: "#C8CDD0",
    darkMetal: "#282A2B",
    gold: "#D9B35F",
    symbol: "vault",
  },
  {
    key: "black-label",
    title: "BLACK LABEL",
    range: "41–45",
    accent: "#F4F4F5",
    accentDark: "#08090B",
    enamel: "#0A0B0E",
    metal: "#D6D7D8",
    darkMetal: "#202225",
    gold: "#C9A968",
    symbol: "blackLabel",
  },
  {
    key: "grail",
    title: "GRAIL",
    range: "46–50",
    accent: "#F3C94F",
    accentDark: "#3B2502",
    enamel: "#2A1A05",
    metal: "#F0CB61",
    darkMetal: "#5E3F0D",
    gold: "#FFE18A",
    symbol: "grail",
  },
];

function points(cx, cy, outer, inner, count, rotation = -90) {
  const values = [];
  for (let index = 0; index < count * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = ((rotation + (index * 180) / count) * Math.PI) / 180;
    values.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }
  return values.join(" ");
}

function gearPoints(cx, cy, outer, inner, teeth) {
  return points(cx, cy, outer, inner, teeth, -90);
}

function leaves(side = "left") {
  const sign = side === "left" ? -1 : 1;
  return Array.from({ length: 7 }, (_, index) => {
    const y = 164 - index * 12;
    const x = 128 + sign * (43 - index * 2.8);
    const rotation = sign * (-34 + index * 6);
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.4" ry="9.2" fill="url(#brightMetal)" transform="rotate(${rotation.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join("");
}

function centralSymbol(symbol) {
  switch (symbol) {
    case "collector":
      return `
        <path d="M83 166 C88 129 101 104 118 84" fill="none" stroke="url(#brightMetal)" stroke-width="5" stroke-linecap="round"/>
        <path d="M173 166 C168 129 155 104 138 84" fill="none" stroke="url(#brightMetal)" stroke-width="5" stroke-linecap="round"/>
        ${leaves("left")}
        ${leaves("right")}
        <path d="M88 150 L128 116 L168 150 L154 162 L128 140 L102 162 Z" fill="url(#brightMetal)" stroke="#111" stroke-width="2"/>
        <path d="M95 123 L128 94 L161 123 L148 135 L128 118 L108 135 Z" fill="url(#brightMetal)" stroke="#111" stroke-width="2"/>
        <path d="M102 96 L128 72 L154 96 L142 108 L128 95 L114 108 Z" fill="url(#brightMetal)" stroke="#111" stroke-width="2"/>
      `;
    case "curator":
      return `
        <path d="M75 154 L86 95 L110 127 L128 72 L146 127 L170 95 L181 154 Z" fill="url(#brightMetal)" stroke="#0B0C0E" stroke-width="3"/>
        <path d="M88 154 H168 L160 171 H96 Z" fill="url(#goldFacet)" stroke="#0B0C0E" stroke-width="3"/>
        <path d="M102 142 L118 111 L128 142 Z M154 142 L138 111 L128 142 Z" fill="#102744" opacity="0.88"/>
        <path d="M92 177 C112 190 144 190 164 177" fill="none" stroke="url(#brightMetal)" stroke-width="5" stroke-linecap="round"/>
        ${leaves("left")}
        ${leaves("right")}
      `;
    case "dealer":
      return `
        <path d="M128 65 L180 90 L171 153 L128 190 L85 153 L76 90 Z" fill="url(#darkFacet)" stroke="url(#goldFacet)" stroke-width="7"/>
        <path d="M128 86 L160 128 L128 171 L96 128 Z" fill="url(#goldFacet)" stroke="#FFF1B8" stroke-width="2"/>
        <path d="M128 86 L128 171 L96 128 Z" fill="#9B6812" opacity="0.42"/>
        <path d="M128 86 L160 128 L128 128 Z" fill="#FFFFFF" opacity="0.24"/>
      `;
    case "veteran":
      return `
        <polygon points="${points(128, 128, 65, 27, 5, -90)}" fill="url(#brightMetal)" stroke="#0A0A0B" stroke-width="4"/>
        <polygon points="${points(128, 128, 42, 17, 5, -90)}" fill="url(#goldFacet)" opacity="0.85"/>
        <polygon points="${points(128, 128, 24, 10, 5, -90)}" fill="#F7F7F8"/>
        <polygon points="${points(77, 138, 15, 7, 5, -90)}" fill="url(#brightMetal)" opacity="0.8"/>
        <polygon points="${points(179, 138, 15, 7, 5, -90)}" fill="url(#brightMetal)" opacity="0.8"/>
      `;
    case "elite":
      return `
        <path d="M41 139 L84 95 L114 150 L128 171 L142 150 L172 95 L215 139 L181 158 L155 137 L128 196 L101 137 L75 158 Z" fill="url(#goldFacet)" stroke="#4E3308" stroke-width="4"/>
        <path d="M76 116 L104 139 L88 147 L57 135 Z M180 116 L152 139 L168 147 L199 135 Z" fill="#FFF0B1" opacity="0.36"/>
        <path d="M85 155 L128 112 L171 155 L156 169 L128 143 L100 169 Z" fill="url(#goldFacet)" stroke="#4E3308" stroke-width="4"/>
        <path d="M102 119 L128 92 L154 119 L141 133 L128 119 L115 133 Z" fill="url(#goldFacet)" stroke="#4E3308" stroke-width="3"/>
      `;
    case "icon":
      return `
        <circle cx="128" cy="128" r="61" fill="none" stroke="url(#brightMetal)" stroke-width="5"/>
        <polygon points="${points(128, 128, 67, 19, 8, -90)}" fill="url(#brightMetal)" stroke="#111" stroke-width="3"/>
        <polygon points="${points(128, 128, 45, 14, 8, -90)}" fill="url(#goldFacet)" opacity="0.85"/>
        <line x1="128" y1="55" x2="128" y2="201" stroke="url(#brightMetal)" stroke-width="2" opacity="0.8"/>
        <line x1="55" y1="128" x2="201" y2="128" stroke="url(#brightMetal)" stroke-width="2" opacity="0.8"/>
      `;
    case "vault":
      return `
        <rect x="76" y="80" width="104" height="104" rx="16" fill="url(#darkFacet)" stroke="url(#brightMetal)" stroke-width="6"/>
        <circle cx="128" cy="132" r="34" fill="#0D0D0E" stroke="url(#goldFacet)" stroke-width="5"/>
        <circle cx="128" cy="132" r="9" fill="url(#goldFacet)" stroke="#2B1B05" stroke-width="3"/>
        ${Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4;
          const x = 128 + Math.cos(angle) * 28;
          const y = 132 + Math.sin(angle) * 28;
          return `<line x1="128" y1="132" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="url(#goldFacet)" stroke-width="4" stroke-linecap="round"/>`;
        }).join("")}
        <rect x="64" y="108" width="13" height="49" rx="4" fill="url(#goldFacet)"/>
        <rect x="179" y="108" width="13" height="49" rx="4" fill="url(#goldFacet)"/>
      `;
    case "blackLabel":
      return `
        <path d="M128 68 L190 111 L166 176 L128 198 L90 176 L66 111 Z" fill="url(#darkFacet)" stroke="url(#brightMetal)" stroke-width="5"/>
        <path d="M88 115 L110 82 H146 L168 115 L128 174 Z" fill="#090A0C" stroke="url(#brightMetal)" stroke-width="4"/>
        <path d="M88 115 H168 L128 174 Z" fill="#FFFFFF" opacity="0.10"/>
        <path d="M110 82 L128 115 L146 82 Z" fill="#FFFFFF" opacity="0.26"/>
        <path d="M88 115 L110 82 L128 115 Z M168 115 L146 82 L128 115 Z" fill="#5C6066" opacity="0.62"/>
        <path d="M104 115 L128 174 L152 115 Z" fill="#1A1D21"/>
      `;
    case "grail":
      return `
        <path d="M128 49 L181 78 L190 138 C185 171 160 195 128 210 C96 195 71 171 66 138 L75 78 Z" fill="url(#goldFacet)" stroke="#FFF1A8" stroke-width="4"/>
        <path d="M128 75 L160 104 L143 104 L143 146 L128 178 L113 146 L113 104 L96 104 Z" fill="#FFFFFF" opacity="0.35"/>
        <path d="M91 137 L128 95 L165 137 L151 155 L128 128 L105 155 Z" fill="#5C3304" opacity="0.54"/>
        <path d="M79 94 L103 135 L76 148 Z M177 94 L153 135 L180 148 Z" fill="#FFE18A" opacity="0.72"/>
        <polygon points="${points(128, 58, 21, 8, 4, -90)}" fill="#FFF0B0"/>
      `;
    case "seeker":
    default:
      return `
        <circle cx="128" cy="128" r="51" fill="#101113" stroke="url(#brightMetal)" stroke-width="5"/>
        <polygon points="${points(128, 128, 58, 15, 4, -90)}" fill="url(#brightMetal)" stroke="#0B0C0E" stroke-width="4"/>
        <polygon points="${points(128, 128, 32, 9, 4, -90)}" fill="url(#darkFacet)" stroke="#C9CDD3" stroke-width="2"/>
        <circle cx="128" cy="128" r="9" fill="#F7F7F8"/>
      `;
  }
}

function svgForBadge(badge) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="${badge.key}-title ${badge.key}-desc">
  <title id="${badge.key}-title">${badge.title} Collector Level Badge</title>
  <desc id="${badge.key}-desc">GRAIL ${badge.title} collector rank medallion, levels ${badge.range}.</desc>
  <defs>
    <radialGradient id="metalBody" cx="34%" cy="22%" r="76%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="17%" stop-color="${badge.metal}"/>
      <stop offset="44%" stop-color="${badge.darkMetal}"/>
      <stop offset="68%" stop-color="#111316"/>
      <stop offset="100%" stop-color="#E7E8EA"/>
    </radialGradient>
    <radialGradient id="enamel" cx="35%" cy="22%" r="72%">
      <stop offset="0%" stop-color="${badge.accent}"/>
      <stop offset="38%" stop-color="${badge.enamel}"/>
      <stop offset="100%" stop-color="${badge.accentDark}"/>
    </radialGradient>
    <linearGradient id="brightMetal" x1="24%" y1="8%" x2="78%" y2="92%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="18%" stop-color="#D9DDE1"/>
      <stop offset="48%" stop-color="#6F747B"/>
      <stop offset="72%" stop-color="#F6F7F8"/>
      <stop offset="100%" stop-color="#23272C"/>
    </linearGradient>
    <linearGradient id="goldFacet" x1="20%" y1="8%" x2="82%" y2="94%">
      <stop offset="0%" stop-color="#FFF7BE"/>
      <stop offset="25%" stop-color="${badge.gold}"/>
      <stop offset="52%" stop-color="#9C6612"/>
      <stop offset="78%" stop-color="#FFE28C"/>
      <stop offset="100%" stop-color="#5E3A08"/>
    </linearGradient>
    <radialGradient id="darkFacet" cx="35%" cy="18%" r="72%">
      <stop offset="0%" stop-color="#5E636A"/>
      <stop offset="46%" stop-color="#17191D"/>
      <stop offset="100%" stop-color="#050506"/>
    </radialGradient>
    <filter id="shadow" x="-18%" y="-18%" width="136%" height="136%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity="0.52"/>
      <feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#FFFFFF" flood-opacity="0.18"/>
    </filter>
    <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <g filter="url(#shadow)">
    <polygon points="${gearPoints(128, 128, 112, 101, 28)}" fill="url(#metalBody)" stroke="#0A0B0D" stroke-width="3"/>
    <polygon points="${gearPoints(128, 128, 101, 94, 20)}" fill="#111316" opacity="0.52"/>
    <circle cx="128" cy="128" r="91" fill="url(#metalBody)" stroke="#F8F9FA" stroke-opacity="0.44" stroke-width="3"/>
    <circle cx="128" cy="128" r="81" fill="#050506" stroke="#1E2227" stroke-width="4"/>
    <circle cx="128" cy="128" r="73" fill="url(#enamel)" stroke="url(#brightMetal)" stroke-width="5"/>
    <circle cx="128" cy="128" r="58" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="2"/>
    <circle cx="128" cy="128" r="48" fill="none" stroke="#000000" stroke-opacity="0.30" stroke-width="2"/>
    <path d="M57 104 C79 43 170 42 199 103" fill="none" stroke="#FFFFFF" stroke-opacity="0.30" stroke-width="8" stroke-linecap="round"/>
    <path d="M59 177 C88 216 164 220 197 176" fill="none" stroke="#000000" stroke-opacity="0.36" stroke-width="9" stroke-linecap="round"/>
    <g filter="url(#innerGlow)">
      ${centralSymbol(badge.symbol)}
    </g>
    <polygon points="${points(128, 25, 14, 6, 4, -90)}" fill="url(#brightMetal)" stroke="#0A0B0D" stroke-width="2"/>
    <polygon points="${points(128, 231, 14, 6, 4, -90)}" fill="url(#brightMetal)" stroke="#0A0B0D" stroke-width="2"/>
    <polygon points="${points(25, 128, 14, 6, 4, -90)}" fill="url(#brightMetal)" stroke="#0A0B0D" stroke-width="2"/>
    <polygon points="${points(231, 128, 14, 6, 4, -90)}" fill="url(#brightMetal)" stroke="#0A0B0D" stroke-width="2"/>
  </g>
</svg>
`;
}

await mkdir(outputDir, { recursive: true });

for (const badge of badges) {
  const svg = svgForBadge(badge);
  const basePath = path.join(outputDir, badge.key);
  await writeFile(`${basePath}.svg`, svg, "utf8");

  await sharp(Buffer.from(svg)).resize(200, 200).png().toFile(`${basePath}.png`);
  await sharp(Buffer.from(svg)).resize(400, 400).png().toFile(`${basePath}@2x.png`);
  await sharp(Buffer.from(svg)).resize(600, 600).png().toFile(`${basePath}@3x.png`);
}

console.log(`Generated ${badges.length} collector badge SVGs and PNG export sets.`);
