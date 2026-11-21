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

import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String CHANNEL_ID = "holding_kashani_updates";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1801;
    private WebView webView;
    private String serverUrl;
    private boolean showingOffline = false;
    private volatile boolean remotePageLoading = false;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.rgb(4,4,15));
        getWindow().setNavigationBarColor(Color.rgb(4,4,15));

        serverUrl = BuildConfig.SERVER_URL == null ? "" : BuildConfig.SERVER_URL.trim();
        if (serverUrl.isEmpty()) serverUrl = "http://93.126.18.48";
        while (serverUrl.endsWith("/")) serverUrl = serverUrl.substring(0, serverUrl.length()-1);

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
        settings.setUserAgentString(settings.getUserAgentString() + " HoldingKashaniAndroid/18.6-Test");

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith(serverUrl)) {
                    remotePageLoading = false;
                    showingOffline = false;
                }
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    remotePageLoading = false;
                    showOfflinePage("ارتباط با سرور برقرار نشد.");
                }
            }

            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request != null && request.isForMainFrame() && errorResponse != null && errorResponse.getStatusCode() >= 400) {
                    remotePageLoading = false;
                    showOfflinePage("سرور پاسخ نامعتبر داد: " + errorResponse.getStatusCode());
                }
            }
        });
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        showConnectingPage();
        checkServerAndLoad();
    }

    private void showConnectingPage() {
        final String html =
            "<!doctype html><html dir='rtl' lang='fa'><head><meta charset='utf-8'>" +
            "<meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
            "<style>*{box-sizing:border-box}body{margin:0;background:#04040F;color:#fff;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}" +
            ".box{width:min(420px,100%);background:linear-gradient(145deg,#0C2C70,#04072B);border:1px solid #4282CC55;border-radius:24px;padding:28px;text-align:center;box-shadow:0 20px 50px #0008}" +
            ".dot{width:42px;height:42px;border:4px solid #4282CC44;border-top-color:#4282CC;border-radius:50%;margin:0 auto 18px;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}" +
            "h2{font-size:20px;margin:0 0 8px}p{color:#B8CBE2;line-height:1.9;font-size:13px;margin:0}</style></head><body>" +
            "<div class='box'><div class='dot'></div><h2>Holding Kashani</h2><p>در حال بررسی اتصال به سرور...</p></div></body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private boolean pingServer() {
        HttpURLConnection c = null;
        try {
            URL u = new URL(serverUrl + "/health?ts=" + System.currentTimeMillis());
            c = (HttpURLConnection) u.openConnection();
            c.setRequestMethod("GET");
            c.setConnectTimeout(5000);
            c.setReadTimeout(5000);
            c.setUseCaches(false);
            c.setRequestProperty("Cache-Control", "no-cache");
            int code = c.getResponseCode();
            return code >= 200 && code < 400;
        } catch (Exception ignored) {
            return false;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private void checkServerAndLoad() {
        showingOffline = false;
        new Thread(() -> {
            final boolean ok = pingServer();
            runOnUiThread(() -> {
                if (isFinishing()) return;
                if (ok) loadRemotePage();
                else showOfflinePage("سرور فعلاً در دسترس نیست. اتصال اینترنت و وضعیت VPS را بررسی کنید.");
            });
        }, "HoldingKashaniServerCheck").start();
    }

    private void loadRemotePage() {
        remotePageLoading = true;
        showingOffline = false;
        webView.loadUrl(serverUrl + "/?app=18.6&ts=" + System.currentTimeMillis());
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
            runOnUiThread(() -> {
                showConnectingPage();
                checkServerAndLoad();
            });
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

    private void showOfflinePage(String detail) {
        if (isFinishing() || showingOffline) return;
        showingOffline = true;
        remotePageLoading = false;
        String safe = detail == null ? "ارتباط با سرور برقرار نشد." : detail.replace("'", "’");
        final String html =
            "<!doctype html><html dir='rtl' lang='fa'><head><meta charset='utf-8'>" +
            "<meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
            "<style>*{box-sizing:border-box}body{margin:0;background:#04040F;color:#fff;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}" +
            ".box{width:min(420px,100%);background:linear-gradient(145deg,#0C2C70,#04072B);border:1px solid #4282CC55;border-radius:24px;padding:26px;text-align:center;box-shadow:0 20px 50px #0008}" +
            "h2{font-size:20px;margin:0 0 10px}p{color:#B8CBE2;line-height:1.9;font-size:14px;margin:0 0 18px}" +
            "button{width:100%;border:0;border-radius:14px;background:#1052AB;color:#fff;font-size:15px;font-weight:700;padding:14px}small{display:block;margin-top:14px;color:#7897BC;line-height:1.8}</style></head><body>" +
            "<div class='box'><h2>اپ باز است؛ سرور پاسخ نمی‌دهد</h2><p>" + safe + "</p>" +
            "<button onclick='AndroidBridge.retry()'>تلاش دوباره</button><small>Server: 93.126.18.48<br>Holding Kashani 18.6</small></div></body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack() && !showingOffline) webView.goBack();
        else super.onBackPressed();
    }
}
