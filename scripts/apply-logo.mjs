/**
 * Apply the Gemini/master raster logo across brand assets + boot tile.
 * Source: assets/brand/logo-master.jpg (or .png)
 * Does not invent a new wreath — uses the provided image.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "assets", "brand");
const BG = { r: 12, g: 28, b: 51 };

function findMaster() {
  for (const name of ["logo-master.png", "logo-master.jpg", "logo-master.jpeg", "logo-master.webp"]) {
    const p = path.join(BRAND, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Missing assets/brand/logo-master.(png|jpg)");
}

async function squareLogo(src, size) {
  return sharp(src)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function onNavy(logoBuf, canvas, logoSize) {
  const left = Math.round((canvas - logoSize) / 2);
  return sharp({
    create: { width: canvas, height: canvas, channels: 3, background: BG }
  })
    .composite([{ input: logoBuf, left, top: left }])
    .png()
    .toBuffer();
}

function svgWrapPng(pngBuf, view) {
  const b64 = pngBuf.toString("base64");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}">
  <image href="data:image/png;base64,${b64}" width="${view}" height="${view}" preserveAspectRatio="xMidYMid slice"/>
</svg>
`;
}

async function featureGraphic(logo1024) {
  const logo = await sharp(logo1024).resize(360, 360).png().toBuffer();
  const svgText = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
  <rect width="1024" height="500" fill="#0c1c33"/>
  <rect x="0" y="0" width="1024" height="8" fill="#16324f"/>
  <rect x="0" y="492" width="1024" height="8" fill="#16324f"/>
  <rect x="0" y="8" width="1024" height="3" fill="#c9a227"/>
  <rect x="0" y="489" width="1024" height="3" fill="#c9a227"/>
  <g fill="#edd089">
    <text x="430" y="220" font-family="Times New Roman, serif" font-size="58" letter-spacing="12" font-weight="500">PETTEIA</text>
    <text x="430" y="278" font-family="Times New Roman, serif" font-size="20" letter-spacing="5" fill="#e8cc6a" opacity="0.92">ΠΕΤΤΕΙΑ</text>
    <text x="430" y="330" font-family="Times New Roman, serif" font-size="18" letter-spacing="2" fill="#f3ead6" opacity="0.78">El juego griego de la pinza</text>
  </g>
</svg>`);
  return sharp(svgText)
    .composite([{ input: logo, left: 48, top: 70 }])
    .png()
    .toBuffer();
}

function patchBootTile(file, imgTag) {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  if (html.includes('src="brand/boot-tile.png"')) {
    if (!html.includes(".boot-tile img")) {
      html = html.replace(
        ".boot-tile svg { display: block; width: 100%; height: 100%; }",
        ".boot-tile svg, .boot-tile img { display: block; width: 100%; height: 100%; object-fit: cover; }"
      );
      fs.writeFileSync(file, html);
    }
    console.log("already has boot img " + path.relative(ROOT, file));
    return;
  }
  const patched = html.replace(
    /<div class="boot-tile">[\s\S]*?<\/div>\s*(?=<h1 class="boot-title"|<p class="boot-title"|<div class="boot-title")/,
    `<div class="boot-tile">\n        ${imgTag}\n      </div>\n      `
  );
  if (patched === html) {
    const patched2 = html.replace(
      /<div class="boot-tile">[\s\S]*?<\/svg>\s*<\/div>/,
      `<div class="boot-tile">\n        ${imgTag}\n      </div>`
    );
    if (patched2 === html) {
      console.warn("no boot-tile in " + path.relative(ROOT, file));
      return;
    }
    html = patched2;
  } else {
    html = patched;
  }
  if (!html.includes(".boot-tile img")) {
    html = html.replace(
      ".boot-tile svg { display: block; width: 100%; height: 100%; }",
      ".boot-tile svg, .boot-tile img { display: block; width: 100%; height: 100%; object-fit: cover; }"
    );
  }
  fs.writeFileSync(file, html);
  console.log("updated " + path.relative(ROOT, file) + " boot-tile");
}

async function main() {
  fs.mkdirSync(BRAND, { recursive: true });
  const master = findMaster();
  console.log("master:", path.relative(ROOT, master));

  const full1024 = await squareLogo(master, 1024);
  const boot512 = await squareLogo(master, 512);
  const fav64 = await squareLogo(master, 64);
  const fg = await onNavy(await sharp(full1024).resize(680, 680).png().toBuffer(), 1024, 680);
  const splashIcon = await onNavy(await sharp(full1024).resize(520, 520).png().toBuffer(), 1024, 520);
  const splashBig = await onNavy(await sharp(full1024).resize(1100, 1100).png().toBuffer(), 2732, 1100);
  const feature = await featureGraphic(full1024);

  fs.writeFileSync(path.join(BRAND, "icon-full.png"), full1024);
  fs.writeFileSync(path.join(BRAND, "boot-tile.png"), boot512);
  const brandPublic = path.join(ROOT, "brand");
  fs.mkdirSync(brandPublic, { recursive: true });
  fs.copyFileSync(path.join(BRAND, "boot-tile.png"), path.join(brandPublic, "boot-tile.png"));
  fs.copyFileSync(path.join(BRAND, "icon-full.png"), path.join(brandPublic, "icon-full.png"));
  fs.writeFileSync(path.join(BRAND, "icon-full.svg"), svgWrapPng(full1024, 1024));
  fs.writeFileSync(path.join(BRAND, "boot-tile.svg"), svgWrapPng(full1024, 1024));
  fs.writeFileSync(path.join(BRAND, "icon-foreground.svg"), svgWrapPng(fg, 1024));
  fs.writeFileSync(
    path.join(BRAND, "icon-background.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#0c1c33"/></svg>\n`
  );
  fs.writeFileSync(path.join(BRAND, "splash-icon.svg"), svgWrapPng(splashIcon, 1024));
  fs.writeFileSync(path.join(BRAND, "splash.svg"), svgWrapPng(splashBig, 2732));
  fs.writeFileSync(path.join(BRAND, "feature-graphic.png"), feature);
  /* SVG wrapper so build-icons feature path still works if it reads SVG */
  fs.writeFileSync(
    path.join(BRAND, "feature-graphic.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500">
  <image href="data:image/png;base64,${feature.toString("base64")}" width="1024" height="500"/>
</svg>
`
  );

  const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <image href="data:image/png;base64,${fav64.toString("base64")}" width="64" height="64"/>
</svg>
`;
  fs.writeFileSync(path.join(ROOT, "favicon.svg"), favSvg);
  const netFav = path.join(ROOT, "netlify-upload", "favicon.svg");
  if (fs.existsSync(path.dirname(netFav))) fs.writeFileSync(netFav, favSvg);

  const imgTag = '<img src="brand/boot-tile.png" alt="" width="512" height="512" decoding="async" />';
  patchBootTile(path.join(ROOT, "index.html"), imgTag);
  patchBootTile(path.join(ROOT, "netlify-upload", "index.html"), imgTag);

  console.log("logo aplicado en assets/brand + boot-tile");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
