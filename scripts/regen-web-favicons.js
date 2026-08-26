"use strict";

const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const ROOT = path.join(__dirname, "..");
const svgPath = path.join(ROOT, "favicon.svg");
const svg = fs.readFileSync(svgPath);
const svgInner = fs.readFileSync(svgPath, "utf8")
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>/, "");

function pngFromSvg(buf, size) {
  return new Resvg(buf, { fitTo: { mode: "width", value: size } }).render().asPng();
}

function writeIco(file, png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png32.length, 8);
  entry.writeUInt32LE(6 + 16, 12);
  fs.writeFileSync(file, Buffer.concat([header, entry, png32]));
}

const outs = {
  "favicon-32.png": 32,
  "apple-touch-icon.png": 180,
  "icon-192.png": 192,
  "icon-512.png": 512
};

for (const [name, size] of Object.entries(outs)) {
  const buf = pngFromSvg(svg, size);
  fs.writeFileSync(path.join(ROOT, name), buf);
  console.log(name, buf.length);
}

const maskSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0c1c33"/>
  <g transform="translate(56 56) scale(6.25)">${svgInner}</g>
</svg>`
);
const mask = pngFromSvg(maskSvg, 512);
fs.writeFileSync(path.join(ROOT, "icon-maskable-512.png"), mask);
console.log("icon-maskable-512.png", mask.length);

const p32 = pngFromSvg(svg, 32);
writeIco(path.join(ROOT, "favicon.ico"), p32);
console.log("favicon.ico ok");
