"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const VERSION_NAME = PKG.version || "1.0.30";
const VERSION_PARTS = String(VERSION_NAME).split(".").map(function (n) { return parseInt(n, 10) || 0; });
const VERSION_CODE = Number(PKG.androidVersionCode) || 31;
const ANDROID = path.join(ROOT, "android");
const APP = path.join(ANDROID, "app");
const SRC = path.join(APP, "src", "main");

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.replace(/\n/g, "\n"));
  console.log("patch " + path.relative(ROOT, file));
}

function replaceIn(file, search, repl) {
  let s = fs.readFileSync(file, "utf8");
  if (!s.includes(search)) {
    console.warn("skip (not found): " + search.slice(0, 80) + " in " + file);
    return;
  }
  fs.writeFileSync(file, s.replace(search, repl));
  console.log("edit " + path.relative(ROOT, file));
}

function ensureKeystore() {
  const dir = path.join(ANDROID, "keystore");
  fs.mkdirSync(dir, { recursive: true });
  const jks = path.join(dir, "petteia-upload.jks");
  const props = path.join(ANDROID, "keystore.properties");
  const readme = path.join(dir, "LEEEME.txt");
  if (fs.existsSync(jks) && fs.existsSync(props)) return;

  const pass = "PetteiaMetamovidas2026!";
  const keytool = path.join(
    process.env.JAVA_HOME || "C:\\Program Files\\Android\\Android Studio\\jbr",
    "bin",
    "keytool.exe"
  );
  const r = spawnSync(keytool, [
    "-genkeypair", "-v",
    "-keystore", jks,
    "-storetype", "JKS",
    "-alias", "petteia",
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", "10000",
    "-storepass", pass,
    "-keypass", pass,
    "-dname", "CN=Petteia, OU=Metamovidas, O=Metamovidas, L=Madrid, C=ES"
  ], { stdio: "inherit" });
  if (r.status) throw new Error("keytool falló");
  write(props, `storeFile=keystore/petteia-upload.jks
storePassword=${pass}
keyAlias=petteia
keyPassword=${pass}
`);
  write(readme, `GUARDA ESTE ARCHIVO Y petteia-upload.jks EN UN SITIO SEGURO.
Sin esta clave no podrás actualizar la app en Google Play.

Alias: petteia
Contraseña del almacén y de la clave: ${pass}
Paquete: com.metamovidas.petteia
`);
}

function patchGradle() {
  const appGradle = path.join(APP, "build.gradle");
  let s = fs.readFileSync(appGradle, "utf8");
  if (!s.includes("keystore.properties")) {
    s = s.replace(
      "android {",
      `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new java.io.FileInputStream(keystorePropertiesFile))
}

android {`
    );
  }
  if (!s.includes("signingConfigs")) {
    s = s.replace(
      "    buildTypes {",
      `    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties["keyAlias"]
                keyPassword keystoreProperties["keyPassword"]
                storeFile rootProject.file(keystoreProperties["storeFile"])
                storePassword keystoreProperties["storePassword"]
                enableV1Signing true
                enableV2Signing true
                enableV3Signing true
            }
        }
    }
    buildTypes {`
    );
  }
  if (!s.includes("signingConfig signingConfigs.release")) {
    s = s.replace(
      /release \{\s*minifyEnabled false/,
      `release {
            minifyEnabled false
            signingConfig signingConfigs.release`
    );
  }
  s = s.replace(/versionCode \d+/, "versionCode " + VERSION_CODE);
  s = s.replace(/versionName "[^"]+"/, 'versionName "' + VERSION_NAME + '"');
  if (!s.includes("vectorDrawables.useSupportLibrary")) {
    s = s.replace(
      "defaultConfig {",
      `defaultConfig {
        vectorDrawables.useSupportLibrary true`
    );
  }
  if (!s.includes("useLegacyPackaging")) {
    s = s.replace(
      "    buildTypes {",
      `    packaging {
        jniLibs {
            useLegacyPackaging false
        }
    }
    buildTypes {`
    );
  }
  fs.writeFileSync(appGradle, s);
  console.log("edit android/app/build.gradle");
}

function patchManifest() {
  const file = path.join(SRC, "AndroidManifest.xml");
  write(file, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <uses-feature android:name="android.hardware.touchscreen" android:required="true" />
    <uses-feature android:name="android.hardware.wifi" android:required="false" />

    <supports-screens
        android:anyDensity="true"
        android:largeScreens="true"
        android:normalScreens="true"
        android:smallScreens="true"
        android:xlargeScreens="true" />

    <application
        android:allowBackup="true"
        android:fullBackupContent="true"
        android:hardwareAccelerated="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:largeHeap="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="false">

        <!-- AdMob App ID (strings.xml → admob_app_id). Must use "~", not "/". -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="@string/admob_app_id" />

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
            android:exported="true"
            android:label="@string/title_activity_main"
            android:launchMode="singleTask"
            android:screenOrientation="fullUser"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
`);
}

function extraXml() {
  write(path.join(SRC, "res", "xml", "network_security_config.xml"), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">broker.emqx.io</domain>
        <domain includeSubdomains="true">broker.hivemq.com</domain>
    </domain-config>
</network-security-config>
`);
}

function patchStrings() {
  const file = path.join(SRC, "res", "values", "strings.xml");
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, "utf8");
  s = s.replace(/<string name="app_name">[^<]+<\/string>/, '<string name="app_name">Petteia</string>');
  s = s.replace(/<string name="title_activity_main">[^<]+<\/string>/, '<string name="title_activity_main">Petteia</string>');
  s = s.replace(/<string name="package_name">[^<]+<\/string>/, '<string name="package_name">com.metamovidas.petteia</string>');
  s = s.replace(/<string name="custom_url_scheme">[^<]+<\/string>/, '<string name="custom_url_scheme">com.metamovidas.petteia</string>');
  if (!s.includes("admob_app_id")) {
    s = s.replace(
      "</resources>",
      '    <string name="admob_app_id">ca-app-pub-8973581015975783~3084353510</string>\n</resources>'
    );
  } else {
    s = s.replace(
      /<string name="admob_app_id">[^<]+<\/string>/,
      '<string name="admob_app_id">ca-app-pub-8973581015975783~3084353510</string>'
    );
  }
  fs.writeFileSync(file, s);
  console.log("edit strings.xml");
}

function patchStyles() {
  write(path.join(SRC, "res", "values", "styles.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@color/colorPrimary</item>
        <item name="android:navigationBarDividerColor">@color/colorPrimary</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@color/colorPrimary</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/splash_bg</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="windowSplashScreenIconBackgroundColor">@color/splash_bg</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
`);
  write(path.join(SRC, "res", "values", "colors.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#0C1C33</color>
    <color name="colorPrimaryDark">#0C1C33</color>
    <color name="colorAccent">#D4AF37</color>
    <color name="splash_bg">#0C1C33</color>
</resources>
`);
}

function copyIcons() {
  if (fs.existsSync(path.join(ROOT, "assets", "brand", "icon-full.svg"))) {
    console.log("skip copyIcons (brand logo pipeline)");
    return;
  }
  const png = path.join(ROOT, "resources", "icon.png");
  if (!fs.existsSync(png)) {
    console.warn("falta resources/icon.png");
    return;
  }
  const { Resvg } = require("@resvg/resvg-js");
  const svg = fs.readFileSync(path.join(ROOT, "favicon.svg"), "utf8");

  function raster(size, pad) {
    if (pad) {
      const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 108 108">
        <g transform="translate(14 14) scale(1.25)">
          ${svg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
        </g>
      </svg>`;
      return new Resvg(out, {
        fitTo: { mode: "width", value: size },
        background: "rgba(0,0,0,0)"
      }).render().asPng();
    }
    const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
      ${svg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
    </svg>`;
    return new Resvg(out, { fitTo: { mode: "width", value: size } }).render().asPng();
  }

  const dens = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
  };
  for (const [folder, size] of Object.entries(dens)) {
    const dir = path.join(SRC, "res", folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "ic_launcher.png"), raster(size, false));
    fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), raster(size, false));
    fs.writeFileSync(path.join(dir, "ic_launcher_foreground.png"), raster(Math.round(size * 1.5), true));
  }

  const anyDpi = path.join(SRC, "res", "mipmap-anydpi-v26");
  fs.mkdirSync(anyDpi, { recursive: true });
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anyDpi, "ic_launcher.xml"), adaptive);
  fs.writeFileSync(path.join(anyDpi, "ic_launcher_round.xml"), adaptive);
  const capacitorDefault = path.join(SRC, "res", "drawable-v24", "ic_launcher_foreground.xml");
  if (fs.existsSync(capacitorDefault)) fs.unlinkSync(capacitorDefault);
  const tealGrid = path.join(SRC, "res", "drawable", "ic_launcher_background.xml");
  if (fs.existsSync(tealGrid)) fs.unlinkSync(tealGrid);

  write(path.join(SRC, "res", "values", "ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0C1C33</color>
</resources>
`);

  function splashPng(w, h) {
    const svgSplash = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#0c1c33"/>
      <g transform="translate(${w / 2 - 160} ${h / 2 - 210}) scale(5)">
        ${svg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
      </g>
    </svg>`;
    return new Resvg(svgSplash, { fitTo: { mode: "width", value: w } }).render().asPng();
  }
  const splashMap = {
    "drawable": [480, 800],
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
    const dir = path.join(SRC, "res", folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "splash.png"), splashPng(w, h));
  }
  console.log("iconos y splash copiados");
}

function main() {
  if (!fs.existsSync(APP)) throw new Error("Primero hay que crear android/ con cap add android");
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
    path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
  write(path.join(ANDROID, "local.properties"), "sdk.dir=" + sdk.replace(/\\/g, "/") + "\n");
  ensureKeystore();
  patchGradle();
  patchManifest();
  extraXml();
  patchStrings();
  patchStyles();
  copyIcons();
  const vars = path.join(ANDROID, "variables.gradle");
  if (fs.existsSync(vars)) {
    let s = fs.readFileSync(vars, "utf8");
    s = s.replace(/minSdkVersion = \d+/, "minSdkVersion = 24");
    s = s.replace(/compileSdkVersion = \d+/, "compileSdkVersion = 36");
    s = s.replace(/targetSdkVersion = \d+/, "targetSdkVersion = 35");
    fs.writeFileSync(vars, s);
    console.log("edit variables.gradle");
  }
  const gradleProps = path.join(ANDROID, "gradle.properties");
  if (fs.existsSync(gradleProps)) {
    let s = fs.readFileSync(gradleProps, "utf8");
    if (!s.includes("org.gradle.jvmargs")) {
      s += "\norg.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\n";
    }
    if (!s.includes("android.suppressUnsupportedCompileSdk")) {
      s += "android.suppressUnsupportedCompileSdk=35\n";
    }
    fs.writeFileSync(gradleProps, s);
  }
  console.log("Android parcheado");
}

main();
