import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "assets", "brand");
const OUT = path.join(ROOT, "assets", "generated");
const STORE = path.join(ROOT, "play-store-assets");

function svg(name) {
  return fs.readFileSync(path.join(BRAND, name));
}

async function png(fromSvg, dest, size, bg) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let img = sharp(fromSvg, { density: 384 });
  if (size) img = img.resize(size, size, { fit: "cover" });
  img = img.flatten({ background: bg || { r: 12, g: 28, b: 51 } });
  const tmp = dest + ".tmp.png";
  try {
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
  } catch (e) {}
  await img.png().toFile(tmp);
  try {
    fs.renameSync(tmp, dest);
  } catch (e) {
    fs.copyFileSync(tmp, dest);
    try { fs.unlinkSync(tmp); } catch (e2) {}
  }
}

async function pngSize(fromSvg, dest, w, h) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(fromSvg, { density: 384 }).resize(w, h, { fit: "cover" }).png().toFile(dest);
}

async function writeMipmap(androidRes) {
  const full = svg("icon-full.svg");
  const fg = svg("icon-foreground.svg");
  const bg = svg("icon-background.svg");
  const dens = [
    ["mdpi", 48, 108],
    ["hdpi", 72, 162],
    ["xhdpi", 96, 216],
    ["xxhdpi", 144, 324],
    ["xxxhdpi", 192, 432]
  ];
  for (const [d, lau, adapt] of dens) {
    const dir = path.join(androidRes, "mipmap-" + d);
    fs.mkdirSync(dir, { recursive: true });
    await png(full, path.join(dir, "ic_launcher.png"), lau);
    await png(full, path.join(dir, "ic_launcher_round.png"), lau);
    await png(fg, path.join(dir, "ic_launcher_foreground.png"), adapt);
    await png(bg, path.join(dir, "ic_launcher_background.png"), adapt);
  }
  const any = path.join(androidRes, "mipmap-anydpi-v26");
  fs.mkdirSync(any, { recursive: true });
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(any, "ic_launcher.xml"), adaptive);
  fs.writeFileSync(path.join(any, "ic_launcher_round.xml"), adaptive);
}

async function writeSplash(androidRes) {
  const splash = svg("splash.svg");
  const icon = svg("splash-icon.svg");
  const dens = [
    ["mdpi", 320, 240],
    ["hdpi", 480, 360],
    ["xhdpi", 720, 480],
    ["xxhdpi", 960, 720],
    ["xxxhdpi", 1280, 960]
  ];
  for (const [d, size, iconSize] of dens) {
    const dir = path.join(androidRes, "drawable-" + d);
    fs.mkdirSync(dir, { recursive: true });
    await png(splash, path.join(dir, "splash.png"), size);
    await png(icon, path.join(dir, "splash_icon.png"), iconSize, { r: 12, g: 28, b: 51 });
  }
  const port = path.join(androidRes, "drawable");
  fs.mkdirSync(port, { recursive: true });
  await png(splash, path.join(port, "splash.png"), 960);
  await png(icon, path.join(port, "splash_icon.png"), 480, { r: 12, g: 28, b: 51 });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(STORE, { recursive: true });
  const full = svg("icon-full.svg");
  await png(full, path.join(OUT, "icon-1024.png"), 1024);
  await png(full, path.join(STORE, "icon-play-store-512.png"), 512);
  await png(svg("icon-foreground.svg"), path.join(OUT, "icon-foreground-1024.png"), 1024);
  await png(svg("icon-background.svg"), path.join(OUT, "icon-background-1024.png"), 1024);
  await pngSize(svg("splash.svg"), path.join(OUT, "splash-2732.png"), 2732, 2732);
  await pngSize(svg("feature-graphic.svg"), path.join(STORE, "feature-graphic-1024x500.png"), 1024, 500);
  const androidRes = path.join(ROOT, "android", "app", "src", "main", "res");
  if (fs.existsSync(path.join(ROOT, "android", "app", "src", "main"))) {
    await writeMipmap(androidRes);
    await writeSplash(androidRes);
  }
  console.log("Iconos listos en play-store-assets/ y android/res");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
