"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const PORT = 8787;
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json"
};

function openBrowser() {
  exec('start "" "http://localhost:' + PORT + '/"', { cwd: ROOT });
}

function lanIPs() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const n of ifs[name] || []) {
      if (n.family === "IPv4" && !n.internal) out.push(n.address);
    }
  }
  return out;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const rel = urlPath.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!rel || rel.split("/").includes("..")) {
    res.writeHead(403);
    res.end();
    return;
  }
  const file = path.join(ROOT, ...rel.split("/"));
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log("Petteia ya está en http://localhost:" + PORT + "/");
    openBrowser();
    process.exit(0);
    return;
  }
  throw err;
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Petteia en http://localhost:" + PORT + "/");
  for (const ip of lanIPs()) console.log("Red local  http://" + ip + ":" + PORT + "/");
  openBrowser();
});
