"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ANDROID = path.join(ROOT, "android");
const OUT = path.join(ROOT, "dist-android");
const wantAab = process.argv.includes("--aab");
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
  path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
const jbr = "C:\\Program Files\\Android\\Android Studio\\jbr";
const java = fs.existsSync(path.join(jbr, "bin", "java.exe"))
  ? jbr
  : (process.env.JAVA_HOME || jbr);

function run(cmd, args, cwd) {
  console.log(cmd + " " + args.join(" "));
  const r = spawnSync(cmd, args, {
    cwd: cwd || ROOT,
    stdio: "inherit",
    shell: true,
    env: Object.assign({}, process.env, {
      ANDROID_HOME: sdk,
      ANDROID_SDK_ROOT: sdk,
      JAVA_HOME: java
    })
  });
  if (r.status) process.exit(r.status);
}

function copyIf(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("-> " + dest);
}

function apksigner() {
  const tools = path.join(sdk, "build-tools");
  if (!fs.existsSync(tools)) return "";
  const vers = fs.readdirSync(tools).sort().reverse();
  for (const v of vers) {
    const bat = path.join(tools, v, process.platform === "win32" ? "apksigner.bat" : "apksigner");
    if (fs.existsSync(bat)) return bat;
  }
  return "";
}

function resignWithV1(apk) {
  const signer = apksigner();
  const propsFile = path.join(ANDROID, "keystore.properties");
  if (!signer || !fs.existsSync(apk) || !fs.existsSync(propsFile)) return;
  const props = {};
  fs.readFileSync(propsFile, "utf8").split(/\r?\n/).forEach((line) => {
    const i = line.indexOf("=");
    if (i > 0) props[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  const ks = path.join(ANDROID, props.storeFile || "keystore/petteia-upload.jks");
  if (!fs.existsSync(ks)) return;
  console.log("apksigner v1+v2+v3 " + apk);
  const r = spawnSync(signer, [
    "sign",
    "--ks", ks,
    "--ks-key-alias", props.keyAlias || "petteia",
    "--ks-pass", "pass:" + (props.storePassword || ""),
    "--key-pass", "pass:" + (props.keyPassword || ""),
    "--v1-signing-enabled", "true",
    "--v2-signing-enabled", "true",
    "--v3-signing-enabled", "true",
    "--min-sdk-version", "1",
    apk
  ], {
    stdio: "inherit",
    shell: true,
    env: Object.assign({}, process.env, { ANDROID_HOME: sdk, JAVA_HOME: java })
  });
  if (r.status) process.exit(r.status);
}

run("npm", ["run", "icons"]);
run("node", ["scripts/prepare-www.js"]);
run("npx", ["cap", "sync", "android"]);

const gw = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
run(gw, ["assembleRelease"], ANDROID);
if (wantAab) run(gw, ["bundleRelease"], ANDROID);

const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const VER = PKG.version || "0.0.0";

fs.mkdirSync(OUT, { recursive: true });
copyIf(
  path.join(ANDROID, "app", "build", "outputs", "apk", "release", "app-release.apk"),
  path.join(OUT, "Petteia-" + VER + ".apk")
);
resignWithV1(path.join(OUT, "Petteia-" + VER + ".apk"));
copyIf(
  path.join(ANDROID, "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk"),
  path.join(OUT, "Petteia-" + VER + "-unsigned.apk")
);
copyIf(
  path.join(ANDROID, "app", "build", "outputs", "bundle", "release", "app-release.aab"),
  path.join(OUT, "Petteia-" + VER + ".aab")
);
const desktopApk = path.join(process.env.USERPROFILE || "", "Desktop", "INSTALAR_PETTEIA.apk");
copyIf(path.join(OUT, "Petteia-" + VER + ".apk"), desktopApk);
console.log("Listo en " + OUT);
