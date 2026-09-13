package com.kashani.holding;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private SharedPreferences prefs;
    private static final String PREFS = "holding_kashani_rc1";
    private static final String KEY_URL = "server_url";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.rgb(4,4,15));
        getWindow().setNavigationBarColor(Color.rgb(4,4,15));
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(settings.getUserAgentString() + " HoldingKashaniAndroid/1.0-RC1");

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) showConnectionError();
            }
        });
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setOnLongClickListener(v -> {
            showServerDialog(true);
            return true;
        });

        String configured = BuildConfig.SERVER_URL == null ? "" : BuildConfig.SERVER_URL.trim();
        String saved = prefs.getString(KEY_URL, "");
        if (!configured.isEmpty()) {
            prefs.edit().putString(KEY_URL, configured).apply();
            loadServer(configured);
        } else if (saved != null && !saved.trim().isEmpty()) {
            loadServer(saved);
        } else {
            showServerDialog(false);
        }
    }

    private void showConnectionError() {
        if (isFinishing()) return;
        new AlertDialog.Builder(this)
            .setTitle("اتصال به سرور برقرار نشد")
            .setMessage("اینترنت یا آدرس سرور را بررسی کنید. برای تغییر آدرس سرور داخل اپ لمس طولانی انجام دهید.")
            .setPositiveButton("تلاش دوباره", (d,w) -> {
                String url=prefs.getString(KEY_URL, "");
                if (url != null && !url.isEmpty()) loadServer(url); else showServerDialog(false);
            })
            .setNegativeButton("تغییر سرور", (d,w) -> showServerDialog(false))
            .show();
    }

    private void showServerDialog(boolean allowCancel) {
        final EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setText(prefs.getString(KEY_URL, "https://"));
        input.setSelectAllOnFocus(true);
        AlertDialog.Builder b = new AlertDialog.Builder(this)
            .setTitle("آدرس سرور هلدینگ کاشانی")
            .setMessage("آدرس HTTPS سرور مرکزی را وارد کنید. این تنظیم فقط یک بار لازم است.")
            .setView(input)
            .setPositiveButton("ذخیره و اتصال", (d,w) -> {
                String url=input.getText().toString().trim();
                if (!url.startsWith("http://") && !url.startsWith("https://")) url="https://"+url;
                prefs.edit().putString(KEY_URL,url).apply();
                loadServer(url);
            });
        if (allowCancel) b.setNegativeButton("انصراف", null);
        b.setCancelable(allowCancel).show();
    }

    private void loadServer(String base) {
        String url=base.endsWith("/")?base:base+"/";
        Toast.makeText(this,"اتصال به سرور...",Toast.LENGTH_SHORT).show();
        webView.loadUrl(url);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
