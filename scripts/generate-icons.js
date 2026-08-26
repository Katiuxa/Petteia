"use strict";

const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const ROOT = path.join(__dirname, "..");
const RES = path.join(ROOT, "resources");
const STORE = path.join(ROOT, "store-assets");

const ICON_SVG = fs.readFileSync(path.join(ROOT, "favicon.svg"), "utf8");

function render(svg, width, height) {
  const resvg = new Resvg(svg, {
    fitTo: height ? { mode: "zoom", value: 1 } : { mode: "width", value: width },
    background: "rgba(0,0,0,0)"
  });
  return resvg.render().asPng();
}

function svgPng(svg, size) {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${svg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}</svg>`;
  return render(wrapped, size);
}

function paddedForeground(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 108 108">
    <g transform="translate(22 22) scale(1)">
      ${ICON_SVG.replace(/<svg[^>]*>/, "").replace("</svg>", "").replace(/viewBox="[^"]*"/, "")}
    </g>
  </svg>`;
  return render(svg, size);
}

function splashSvg(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="glow" cx="50%" cy="38%" r="42%">
        <stop offset="0%" stop-color="#23456f"/>
        <stop offset="100%" stop-color="#0c1c33"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#0c1c33"/>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>
    <g transform="translate(${w / 2 - 220} ${h / 2 - 300}) scale(6.875)">
      ${ICON_SVG.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
    </g>
    <text x="${w / 2}" y="${h / 2 + 280}" text-anchor="middle" fill="#e8cc6a" font-family="serif" font-size="96" letter-spacing="18">ΠΕΤΤΕΙΑ</text>
    <text x="${w / 2}" y="${h / 2 + 360}" text-anchor="middle" fill="#f3ead6" font-family="serif" font-size="36" opacity="0.78">Petteia</text>
  </svg>`;
}

function featureGraphic() {
  const w = 1024, h = 500;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="g" cx="28%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#1a365c"/>
        <stop offset="100%" stop-color="#0c1c33"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <path fill="none" stroke="#d4af37" stroke-width="10" d="M0 28h80V8h80v20h80V8h80v20h80V8h80v20h80V8h80v20h80V8h80v20h80"/>
    <path fill="none" stroke="#d4af37" stroke-width="10" d="M0 472h80v20h80v-20h80v20h80v-20h80v20h80v-20h80v20h80v-20h80v20h80"/>
    <g transform="translate(90 118) scale(4.1)">
      ${ICON_SVG.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
    </g>
    <text x="420" y="250" fill="#e8cc6a" font-family="serif" font-size="86" letter-spacing="10">ΠΕΤΤΕΙΑ</text>
    <text x="422" y="318" fill="#f3ead6" font-family="serif" font-size="32">El juego griego de la pinza</text>
  </svg>`;
}

function write(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log(path.relative(ROOT, file));
}

function innerSvg() {
  return ICON_SVG.replace(/<svg[^>]*>/, "").replace("</svg>", "");
}

function rasterIcon(size, pad) {
  // Adaptive foreground: transparent around the seal (no white halo).
  if (pad) {
    const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 108 108">
      <g transform="translate(14 14) scale(1.25)">${innerSvg()}</g>
    </svg>`;
    return new Resvg(out, {
      fitTo: { mode: "width", value: size },
      background: "rgba(0,0,0,0)"
    }).render().asPng();
  }
  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    ${innerSvg()}
  </svg>`;
  return new Resvg(out, { fitTo: { mode: "width", value: size } }).render().asPng();
}

function splashPng(w, h) {
  const svgSplash = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#0c1c33"/>
    <g transform="translate(${w / 2 - 160} ${h / 2 - 210}) scale(5)">${innerSvg()}</g>
  </svg>`;
  return new Resvg(svgSplash, { fitTo: { mode: "width", value: w } }).render().asPng();
}

function writeAndroidIcons() {
  const src = path.join(ROOT, "android", "app", "src", "main");
  if (!fs.existsSync(src)) return;

  const dens = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
  };
  for (const [folder, size] of Object.entries(dens)) {
    const dir = path.join(src, "res", folder);
    fs.mkdirSync(dir, { recursive: true });
    write(path.join(dir, "ic_launcher.png"), rasterIcon(size, false));
    write(path.join(dir, "ic_launcher_round.png"), rasterIcon(size, false));
    write(path.join(dir, "ic_launcher_foreground.png"), rasterIcon(Math.round(size * 1.5), true));
  }

  const anyDpi = path.join(src, "res", "mipmap-anydpi-v26");
  fs.mkdirSync(anyDpi, { recursive: true });
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anyDpi, "ic_launcher.xml"), adaptive);
  fs.writeFileSync(path.join(anyDpi, "ic_launcher_round.xml"), adaptive);

  const splashMap = {
    drawable: [480, 800],
    "drawable-port-mdpi": [320, 480],
    "drawable-port-hdpi": [480, 800],
    "drawable-port-xhdpi": [720, 1280],
    "drawable-port-xxhdpi": [1080, 1920],
    "drawable-port-xxxhdpi": [1440, 2560],
    "drawable-land-mdpi": [480, 320],
    "drawable-land-hdpi": [800, 480],
    "drawable-land-xhdpi": [1280, 720],
    "drawable-land-xxhdpi": [1920, 1080],
    "drawable-land-xxxhdpi": [2560, 1440]
  };
  for (const [folder, [w, h]] of Object.entries(splashMap)) {
    const dir = path.join(src, "res", folder);
    fs.mkdirSync(dir, { recursive: true });
    write(path.join(dir, "splash.png"), splashPng(w, h));
  }

  const capacitorDefault = path.join(src, "res", "drawable-v24", "ic_launcher_foreground.xml");
  if (fs.existsSync(capacitorDefault)) fs.unlinkSync(capacitorDefault);
  const tealGrid = path.join(src, "res", "drawable", "ic_launcher_background.xml");
  if (fs.existsSync(tealGrid)) fs.unlinkSync(tealGrid);
}

function main() {
  fs.mkdirSync(RES, { recursive: true });
  fs.mkdirSync(STORE, { recursive: true });
  write(path.join(RES, "icon.png"), svgPng(ICON_SVG, 1024));
  write(path.join(RES, "icon-foreground.png"), paddedForeground(1024));
  write(path.join(RES, "splash.png"), render(splashSvg(2732, 2732), 2732));
  write(path.join(STORE, "icon-512.png"), svgPng(ICON_SVG, 512));
  write(path.join(STORE, "icon-1024.png"), svgPng(ICON_SVG, 1024));
  write(path.join(STORE, "feature-graphic.png"), render(featureGraphic(), 1024));
  writeAndroidIcons();
  console.log("iconos listos");
}

main();
