"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const WWW = path.join(ROOT, "www");
const FONT_DIR = path.join(WWW, "fonts");
const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap";

function fetchBuf(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: headers || {} }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuf(res.headers.location, headers).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(url + " -> " + res.statusCode));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
  });
}

function familyFile(family, weight, italic) {
  const slug = family.toLowerCase().replace(/\s+/g, "-");
  return slug + "-" + weight + (italic ? "-italic" : "") + ".woff2";
}

async function downloadFonts() {
  fs.mkdirSync(FONT_DIR, { recursive: true });
  const css = (await fetchBuf(CSS_URL, {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  })).toString("utf8");

  const faces = [];
  const re = /\/\*([^*]+)\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(css))) {
    const subset = m[1].trim();
    const ok = /^(latin|latin-ext|cyrillic|cyrillic-ext|greek|greek-ext)$/.test(subset);
    if (!ok) continue;
    const block = m[2];
    const family = (block.match(/font-family:\s*'([^']+)'/) || [])[1];
    const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1];
    const style = /font-style:\s*italic/.test(block) ? "italic" : "normal";
    const url = (block.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    const range = (block.match(/unicode-range:\s*([^;]+)/) || [])[1];
    if (!family || !weight || !url) continue;
    const file = familyFile(family, weight, style === "italic");
    const key = file + "|" + subset;
    if (seen.has(key)) continue;
    seen.add(key);
    const localName = subset + "-" + file;
    const dest = path.join(FONT_DIR, localName);
    if (!fs.existsSync(dest)) {
      process.stdout.write("font " + localName + "\n");
      fs.writeFileSync(dest, await fetchBuf(url, { "User-Agent": "Mozilla/5.0" }));
    }
    faces.push({ family, weight, style, file: localName, range: range || "" });
  }
  if (!faces.length) throw new Error("No se pudieron descargar las fuentes");

  const cssOut = faces.map((f) => `@font-face {
  font-family: "${f.family}";
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: swap;
  src: url("./${f.file}") format("woff2");${f.range ? `\n  unicode-range: ${f.range.trim()};` : ""}
}`).join("\n\n");
  fs.writeFileSync(path.join(FONT_DIR, "fonts.css"), cssOut + "\n");
}

function patchHtml(html) {
  html = html.replace(
    /<meta name="viewport"[^>]*>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />'
  );
  html = html.replace(
    /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin \/>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+" rel="stylesheet" \/>/,
    '<link rel="stylesheet" href="fonts/fonts.css" />\n  <link rel="stylesheet" href="css/android.css" />\n  <link rel="stylesheet" href="css/ads.css" />'
  );
  if (!html.includes("js/android-bridge.js")) {
    html = html.replace(
      "</body>",
      '  <script src="js/ads-config.js"></script>\n  <script src="js/ads-manager.js"></script>\n  <script src="js/android-bridge.js"></script>\n</body>'
    );
  }
  html = html.replace("<html lang=\"es\">", '<html lang="es" class="is-native android-app">');
  html = html.replace(
    /<link rel="icon" href="favicon\.ico"[^>]*>\s*/g,
    ""
  );
  html = html.replace(
    /<link rel="icon" type="image\/png"[^>]*>\s*/g,
    ""
  );
  html = html.replace(
    /<link rel="apple-touch-icon"[^>]*>\s*/g,
    ""
  );
  html = html.replace(
    /<link rel="manifest" href="manifest\.webmanifest" \/>\s*/g,
    ""
  );
  if (!html.includes('href="favicon.svg"')) {
    html = html.replace(
      "</title>",
      '</title>\n  <link rel="icon" href="favicon.svg" type="image/svg+xml" />'
    );
  }
  return html;
}

async function main() {
  fs.mkdirSync(path.join(WWW, "js"), { recursive: true });
  fs.mkdirSync(path.join(WWW, "css"), { recursive: true });
  await downloadFonts();
  const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  fs.writeFileSync(path.join(WWW, "index.html"), patchHtml(src));
  fs.copyFileSync(path.join(ROOT, "favicon.svg"), path.join(WWW, "favicon.svg"));
  const brandSrc = path.join(ROOT, "assets", "brand");
  const brandDest = path.join(WWW, "brand");
  fs.mkdirSync(brandDest, { recursive: true });
  for (const name of ["boot-tile.png", "icon-full.png"]) {
    const p = path.join(brandSrc, name);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(brandDest, name));
  }
  const ads = path.join(ROOT, "ads");
  fs.copyFileSync(path.join(ads, "ads-config.js"), path.join(WWW, "js", "ads-config.js"));
  fs.copyFileSync(path.join(ads, "ads-manager.js"), path.join(WWW, "js", "ads-manager.js"));
  fs.copyFileSync(path.join(ads, "ads.css"), path.join(WWW, "css", "ads.css"));
  console.log("www listo");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
