package com.kashani.holding;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private String serverUrl;
    private boolean firstLoad = true;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.rgb(4,4,15));
        getWindow().setNavigationBarColor(Color.rgb(4,4,15));

        serverUrl = BuildConfig.SERVER_URL == null ? "" : BuildConfig.SERVER_URL.trim();
        if (serverUrl.isEmpty()) serverUrl = "http://93.126.18.48";

        webView = new WebView(this);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
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
        settings.setLoadsImagesAutomatically(true);
        settings.setBlockNetworkImage(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setOffscreenPreRaster(true);
        settings.setUserAgentString(settings.getUserAgentString() + " HoldingKashaniAndroid/2.2-FinalTest");

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                firstLoad = false;
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) showConnectionError();
            }
        });
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        loadServer();
    }

    private void loadServer() {
        String url = serverUrl.endsWith("/") ? serverUrl : serverUrl + "/";
        if (firstLoad) Toast.makeText(this, "اتصال به سرور...", Toast.LENGTH_SHORT).show();
        webView.loadUrl(url);
    }

    private void showConnectionError() {
        if (isFinishing()) return;
        new AlertDialog.Builder(this)
            .setTitle("اتصال به سرور برقرار نشد")
            .setMessage("اتصال اینترنت یا وضعیت سرور هلدینگ کاشانی را بررسی کنید.")
            .setPositiveButton("تلاش دوباره", (d,w) -> loadServer())
            .setCancelable(false)
            .show();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
