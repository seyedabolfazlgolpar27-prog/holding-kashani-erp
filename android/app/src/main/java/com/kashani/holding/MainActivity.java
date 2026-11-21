package com.kashani.holding;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.Window;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String CHANNEL_ID = "holding_kashani_updates";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1801;
    private WebView webView;
    private String serverUrl;
    private boolean showingOffline = false;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.rgb(4,4,15));
        getWindow().setNavigationBarColor(Color.rgb(4,4,15));

        serverUrl = BuildConfig.SERVER_URL == null ? "" : BuildConfig.SERVER_URL.trim();
        if (serverUrl.isEmpty()) serverUrl = "http://93.126.18.48";

        createNotificationChannel();
        requestNotificationPermissionIfNeeded();

        webView = new WebView(this);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setBackgroundColor(Color.rgb(4,4,15));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setLoadsImagesAutomatically(true);
        settings.setBlockNetworkImage(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setOffscreenPreRaster(true);
        settings.setUserAgentString(settings.getUserAgentString() + " HoldingKashaniAndroid/18.5-Test");

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (url != null && url.startsWith(serverUrl)) showingOffline = false;
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) showOfflinePage();
            }

            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request != null && request.isForMainFrame() && errorResponse != null && errorResponse.getStatusCode() >= 500) {
                    showOfflinePage();
                }
            }
        });
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        loadServer();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "اعلان‌های هلدینگ کاشانی",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("وظایف، پیام‌های مدیریت و اعلان‌های داخلی");
            channel.enableVibration(true);
            nm.createNotificationChannel(channel);
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    public class AndroidBridge {
        @JavascriptInterface
        public void setToken(String token) {
            getSharedPreferences("holding_kashani", MODE_PRIVATE)
                    .edit()
                    .putString("api_token", token == null ? "" : token)
                    .apply();
        }

        @JavascriptInterface
        public void retry() {
            runOnUiThread(() -> loadServer());
        }

        @JavascriptInterface
        public void notify(String title, String body, String refId) {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
            Intent intent = new Intent(MainActivity.this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(
                    MainActivity.this, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? new Notification.Builder(MainActivity.this, CHANNEL_ID)
                    : new Notification.Builder(MainActivity.this);
            builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(title == null ? "Holding Kashani" : title)
                    .setContentText(body == null ? "" : body)
                    .setStyle(new Notification.BigTextStyle().bigText(body == null ? "" : body))
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .setPriority(Notification.PRIORITY_HIGH);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            int id = refId == null ? (int)(System.currentTimeMillis() & 0x7fffffff) : Math.abs(refId.hashCode());
            nm.notify(id, builder.build());
        }
    }

    private void loadServer() {
        showingOffline = false;
        String base = serverUrl.endsWith("/") ? serverUrl : serverUrl + "/";
        String url = base + "?app=18.5&ts=" + System.currentTimeMillis();
        Toast.makeText(this, "اتصال به سرور...", Toast.LENGTH_SHORT).show();
        webView.loadUrl(url);
    }

    private void showOfflinePage() {
        if (isFinishing() || showingOffline) return;
        showingOffline = true;
        final String html =
            "<!doctype html><html dir='rtl' lang='fa'><head><meta charset='utf-8'>" +
            "<meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
            "<style>*{box-sizing:border-box}body{margin:0;background:#04040F;color:#fff;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}" +
            ".box{width:min(420px,100%);background:linear-gradient(145deg,#0C2C70,#04072B);border:1px solid #4282CC55;border-radius:24px;padding:26px;text-align:center;box-shadow:0 20px 50px #0008}" +
            "h2{font-size:20px;margin:0 0 10px}p{color:#B8CBE2;line-height:1.9;font-size:14px;margin:0 0 18px}" +
            "button{width:100%;border:0;border-radius:14px;background:#1052AB;color:#fff;font-size:15px;font-weight:700;padding:14px}small{display:block;margin-top:14px;color:#7897BC}</style></head><body>" +
            "<div class='box'><h2>سرور هلدینگ در دسترس نیست</h2><p>خود برنامه باز شده، اما اتصال به سرور برقرار نشده است. بعد از روشن بودن سرور دوباره تلاش کنید.</p>" +
            "<button onclick='AndroidBridge.retry()'>تلاش دوباره</button><small>Holding Kashani 18.5</small></div></body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
