(function () {
  "use strict";
  document.documentElement.classList.add("is-native", "android-app");

  function cap() {
    return window.Capacitor || null;
  }
  function plugin(name) {
    var C = cap();
    if (!C || !C.Plugins) return null;
    return C.Plugins[name] || null;
  }
  function whenReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  (function applyAndroidInsets() {
    var root = document.documentElement.style;
    /* Nav bar is reserved natively. Never invent an 80px CSS gap (it lifts ads over the board). */
    if (!root.getPropertyValue("--android-inset-bottom")) {
      root.setProperty("--android-inset-bottom", "0px");
    }
    if (!root.getPropertyValue("--android-inset-top") || root.getPropertyValue("--android-inset-top") === "0px") {
      root.setProperty("--android-inset-top", "36px");
    }
  })();

  async function bootNative() {
    var StatusBar = plugin("StatusBar");
    var SplashScreen = plugin("SplashScreen");
    var Keyboard = plugin("Keyboard");
    var App = plugin("App");
    var Haptics = plugin("Haptics");
    var Clipboard = plugin("Clipboard");

    try {
      if (StatusBar) {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: "LIGHT" });
        if (StatusBar.setBackgroundColor) await StatusBar.setBackgroundColor({ color: "#00000000" });
      }
    } catch (e) {}

    try {
      if (SplashScreen) await SplashScreen.hide({ fadeOutDuration: 280 });
    } catch (e) {}
    try { if (window.petteiaPrimeAudio) window.petteiaPrimeAudio(); } catch (e) {}

    try {
      if (Keyboard && Keyboard.setAccessoryBarVisible) {
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
      }
    } catch (e) {}

    if (App && App.addListener) {
      App.addListener("backButton", function () {
        if (window.GameAds && window.GameAds.consumeBack && window.GameAds.consumeBack()) return;
        if (window.petteiaConsumeBack && window.petteiaConsumeBack()) return;
        if (App.minimizeApp) App.minimizeApp();
      });
      App.addListener("appStateChange", function (s) {
        if (s && s.isActive && window.petteiaPrimeAudio) {
          try { window.petteiaPrimeAudio(); } catch (e) {}
        }
      });
    }

    if (Haptics && Haptics.impact && typeof navigator.vibrate !== "function") {
      navigator.vibrate = function () {
        try { Haptics.impact({ style: "Light" }); } catch (e) {}
        return true;
      };
    }

    if (Clipboard && Clipboard.write) {
      var orig = navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText.bind(navigator.clipboard)
        : null;
      if (!navigator.clipboard) navigator.clipboard = {};
      navigator.clipboard.writeText = function (text) {
        return Clipboard.write({ string: String(text || "") }).catch(function () {
          return orig ? orig(text) : Promise.reject();
        });
      };
    }
  }

  whenReady(function () {
    var slot = document.createElement("div");
    slot.id = "petteia-ad-slot";
    slot.hidden = true;
    slot.setAttribute("aria-hidden", "true");
    document.body.appendChild(slot);
  });

  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  if (cap() && cap().whenPluginReady) {
    cap().whenPluginReady().then(bootNative).catch(bootNative);
  } else {
    document.addEventListener("deviceready", bootNative);
    window.addEventListener("DOMContentLoaded", function () {
      setTimeout(bootNative, 40);
    });
  }
})();
