package com.metamovidas.petteia;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private String lastInsetJs = "";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.parseColor("#0c1c33"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(true);
        }
        WindowInsetsControllerCompat bars =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setBackgroundColor(Color.parseColor("#0c1c33"));
        webView.postDelayed(this::primeAudioJs, 400);
        webView.postDelayed(this::primeAudioJs, 1200);

        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            applySystemInsets(webView, windowInsets);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(webView);
        webView.post(() -> ViewCompat.requestApplyInsets(webView));

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (lastInsetJs.length() > 0) {
                    getBridge().getWebView().evaluateJavascript(lastInsetJs, null);
                }
                getBridge().getWebView().evaluateJavascript(
                    "(function(){try{return window.petteiaConsumeBack&&window.petteiaConsumeBack()===true;}catch(e){return false;}})()",
                    value -> {
                        if (!"true".equals(value)) {
                            moveTaskToBack(true);
                        }
                    }
                );
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        primeAudioJs();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus || getBridge() == null || getBridge().getWebView() == null) return;
        ViewCompat.requestApplyInsets(getBridge().getWebView());
        if (lastInsetJs.length() > 0) {
            getBridge().getWebView().evaluateJavascript(lastInsetJs, null);
        }
        primeAudioJs();
    }

    private void primeAudioJs() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().evaluateJavascript(
            "(function(){try{if(window.petteiaPrimeAudio)window.petteiaPrimeAudio();}catch(e){}})()",
            null
        );
    }

    private void applySystemInsets(WebView webView, WindowInsetsCompat windowInsets) {
        Insets sys = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
        Insets nav = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
        Insets tap = windowInsets.getInsets(WindowInsetsCompat.Type.tappableElement());
        Insets cut = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());
        float d = getResources().getDisplayMetrics().density;
        int top = Math.round(Math.max(sys.top, cut.top) / d);
        int right = Math.round(Math.max(sys.right, cut.right) / d);
        int left = Math.round(Math.max(sys.left, cut.left) / d);
        if (top < 32) top = 32;

        int navBottomPx = Math.max(Math.max(nav.bottom, tap.bottom), sys.bottom);
        int resId = getResources().getIdentifier("navigation_bar_height", "dimen", "android");
        if (resId > 0) {
            navBottomPx = Math.max(navBottomPx, getResources().getDimensionPixelSize(resId));
        }
        int bottom = Math.round(navBottomPx / d) + 32;
        if (bottom < 80) bottom = 80;
        webView.setPadding(0, 0, 0, 0);

        lastInsetJs =
            "(function(){var s=document.documentElement&&document.documentElement.style;if(!s)return;"
            + "s.setProperty('--android-inset-top','" + top + "px');"
            + "s.setProperty('--android-inset-right','" + right + "px');"
            + "s.setProperty('--android-inset-bottom','" + bottom + "px');"
            + "s.setProperty('--android-inset-left','" + left + "px');})()";
        webView.evaluateJavascript(lastInsetJs, null);
        webView.postDelayed(() -> {
            if (lastInsetJs.length() > 0) webView.evaluateJavascript(lastInsetJs, null);
        }, 400);
    }
}
