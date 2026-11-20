# Petteia

Greek board game. Web and Android live in the same repo, in separate folders.

## Web

https://petteiagame.vercel.app

Code is in `docs/`. That folder is what Vercel publishes.

```bash
node server.js
```

## Android

Capacitor. Version **1.0.59**. Native code is in `android/`. The app HTML is generated with `npm run prepare:www` (do not use `docs/` for the APK).

```bash
npm ci
npm run apk
```

The Play Store keystore stays outside git.

The Android navigation bar is kept clear with native insets in `MainActivity`.
