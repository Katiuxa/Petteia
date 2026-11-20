# Petteia

ΠΕΤΤΕΙΑ, the board game of classical Greece. Web and Android share the same marble board.

Pieces move like a rook and capture by pincer. You win by leaving the other side with no pieces, or with no move. A guided tutorial leads into five strengths, from Paidion to Palamedes. Online play uses a room code.

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
