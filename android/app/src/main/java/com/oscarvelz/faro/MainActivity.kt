package com.oscarvelz.faro

import android.app.Activity
import android.app.AlertDialog
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.graphics.Color
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Message
import android.os.PowerManager
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.provider.Settings
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.*
import android.widget.FrameLayout
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.OutputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Faro for Android: a thin shell around the Faro web app, loaded live from GitHub Pages so every web release arrives on
 * its own (the service worker keeps it working offline after the first open). The app's WebView storage is its own,
 * separate from Chrome's: the books come back by signing in (Supabase sync) or importing a backup.
 *
 * The page talks to the app through window.FaroNative (src/spa/native.ts in the web source, feature-detected there):
 * Back (FaroBack / atRoot), bar colours, downloads into Downloads/Faro, the phone's BiometricPrompt for the fingerprint
 * lock, pictures shared from other apps, and (1.3.121) the home-screen widgets' snapshot and taps (FaroWidgets.kt).
 * Nothing in the web app changes when FaroNative is absent.
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var root: FrameLayout
    private lateinit var frame: FrameLayout
    private lateinit var statusBg: View
    private val home = "https://oscarvelz.github.io/Faro/"
    private val prefs by lazy { getSharedPreferences("faro-shell", MODE_PRIVATE) }
    private var topColor = Color.parseColor("#0E1114")
    private var bottomColor = Color.parseColor("#0E1114")
    private var topDark = true
    private var bottomDark = true
    private var fileCb: ValueCallback<Array<Uri>>? = null
    private var camUri: Uri? = null
    @Volatile private var trusted = false
    @Volatile private var pageReady = false
    private var lastBack = 0L
    /** 1.3.121: where a widget tap wants to land ("desk", "pagos", "add-out"…); the page takes it with takeOpen(). */
    @Volatile private var widgetGo: String? = null
    private val saves = ConcurrentHashMap<String, Save>()
    private val shared = java.util.Collections.synchronizedList(ArrayList<SharedPic>())

    private class Save(val uri: Uri, val out: OutputStream, val name: String)
    private class SharedPic(val file: File, val name: String, val mime: String)

    companion object {
        private const val RQ_FILES = 7
        private const val RQ_CAMERA = 8
        private const val AUTH = BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        private const val REPO_RELEASES = "https://api.github.com/repos/Oscarvelz/Faro/releases?per_page=30"
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        topColor = prefs.getInt("top", topColor); bottomColor = prefs.getInt("bottom", bottomColor)
        topDark = prefs.getBoolean("topDark", true); bottomDark = prefs.getBoolean("bottomDark", true)
        window.setDecorFitsSystemWindows(false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        window.isNavigationBarContrastEnforced = false
        window.isStatusBarContrastEnforced = false

        root = FrameLayout(this)
        frame = FrameLayout(this)
        web = WebView(this)
        statusBg = View(this)
        frame.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        root.addView(frame, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        root.addView(statusBg, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, Gravity.TOP))
        // The page sits between the system bars like the installed PWA (no content under them); the status bar shows the
        // colour at the top of the page, the navigation bar the colour at its bottom (both sent by the page).
        root.setOnApplyWindowInsetsListener { _, insets ->
            val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            val ime = insets.getInsets(WindowInsets.Type.ime())
            frame.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
            statusBg.layoutParams = (statusBg.layoutParams as FrameLayout.LayoutParams).apply { height = bars.top }
            WindowInsets.CONSUMED
        }
        setContentView(root)
        applyBars()

        web.settings.apply {
            javaScriptEnabled = true; domStorageEnabled = true; databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false; allowContentAccess = true
            setSupportMultipleWindows(true); javaScriptCanOpenWindowsAutomatically = true
            userAgentString = "$userAgentString FaroAndroid/${BuildConfig.VERSION_NAME}"
        }
        ServiceWorkerController.getInstance().serviceWorkerWebSettings.apply {
            cacheMode = WebSettings.LOAD_DEFAULT; allowContentAccess = true; allowFileAccess = false
        }
        CookieManager.getInstance().setAcceptCookie(true)
        web.addJavascriptInterface(Bridge(), "FaroNative")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                if (isFaro(r.url)) return false
                openOutside(r.url); return true
            }
            override fun onPageStarted(v: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                trusted = url != null && isFaro(Uri.parse(url)); pageReady = false
            }
            override fun onPageFinished(v: WebView, url: String?) {
                trusted = url != null && isFaro(Uri.parse(url)); pageReady = trusted
                if (pageReady && shared.isNotEmpty()) dispatch("dispatchEvent(new Event('faronative-share'))")
                if (pageReady && widgetGo != null) dispatch("dispatchEvent(new Event('faronative-open'))")
            }
            override fun onReceivedError(v: WebView, r: WebResourceRequest, e: WebResourceError) {
                if (!r.isForMainFrame) return
                val bg = String.format("#%06X", 0xFFFFFF and topColor)
                v.loadDataWithBaseURL(home, "<html><head><meta name=viewport content='width=device-width'></head>" +
                    "<body style=\"background:$bg;color:#E7EAEE;font:18px sans-serif;padding:32px;line-height:1.5\">" +
                    "<p>Faro necesita internet la primera vez que se abre; después funciona sin conexión.</p>" +
                    "<p><a style=\"color:#8EAE96\" href=\"$home\">Intentar de nuevo</a></p></body></html>", "text/html", "utf-8", null)
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(v: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
                fileCb?.onReceiveValue(null); fileCb = cb
                return try { pickFiles(p); true } catch (e: Exception) { fileCb = null; false }
            }
            // target=_blank / window.open: Faro pages stay here, everything else opens in the browser or its own app.
            override fun onCreateWindow(v: WebView, dialog: Boolean, gesture: Boolean, msg: Message): Boolean {
                val probe = WebView(this@MainActivity)
                var done = false
                fun take(pv: WebView, u: Uri?): Boolean {
                    if (u == null || u.scheme == "about" || done) return true
                    done = true
                    if (isFaro(u)) web.loadUrl(u.toString()) else openOutside(u)
                    pv.post { pv.stopLoading(); pv.destroy() }
                    return true
                }
                probe.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(pv: WebView, r: WebResourceRequest): Boolean = take(pv, r.url)
                    override fun onPageStarted(pv: WebView, url: String?, favicon: android.graphics.Bitmap?) { take(pv, url?.let { Uri.parse(it) }) }
                }
                (msg.obj as WebView.WebViewTransport).webView = probe
                msg.sendToTarget()
                return true
            }
        }
        web.setDownloadListener { url, _, _, _, _ ->
            // blob:/data: downloads are taken by the page (native.ts) and saved into Downloads/Faro; real links open outside.
            if (url.startsWith("http")) openOutside(Uri.parse(url))
        }
        takeShare(intent)
        takeWidget(intent)
        // Faro's notifications (FaroNotify.kt) need the Android 13+ permission: ask once, never nag.
        if (Build.VERSION.SDK_INT >= 33 && !prefs.getBoolean("notifyAsked", false)
            && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            prefs.edit().putBoolean("notifyAsked", true).apply()
            runCatching { requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 11) }
        }
        if (state != null) web.restoreState(state) else web.loadUrl(home)
        checkUpdate()
    }

    private fun isFaro(u: Uri): Boolean {
        val s = u.scheme ?: return false
        if (s == "blob" || s == "data" || s == "about") return true
        return s == "https" && u.host == "oscarvelz.github.io" && ((u.path ?: "") == "/Faro" || (u.path ?: "").startsWith("/Faro/"))
    }

    private fun openOutside(u: Uri) {
        try {
            val i = if (u.scheme == "intent") Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME).apply { selector = null; component = null }
                    else Intent(Intent.ACTION_VIEW, u)
            startActivity(i.addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: Exception) {
            Toast.makeText(this, "No hay una app para abrir este enlace.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun dispatch(js: String) = runOnUiThread { if (::web.isInitialized) web.evaluateJavascript(js, null) }

    private fun applyBars() {
        statusBg.setBackgroundColor(topColor)
        root.setBackgroundColor(bottomColor)
        web.setBackgroundColor(topColor)
        window.decorView.setBackgroundColor(bottomColor)
        val ls = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
        val ln = WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        window.insetsController?.setSystemBarsAppearance((if (topDark) 0 else ls) or (if (bottomDark) 0 else ln), ls or ln)
    }

    private fun parseColor(s: String): Int? = runCatching {
        val t = s.trim()
        when {
            t.startsWith("#") -> Color.parseColor(t)
            t.startsWith("rgb") -> { val n = Regex("[\\d.]+").findAll(t).map { it.value.toFloat() }.toList(); Color.rgb(n[0].toInt(), n[1].toInt(), n[2].toInt()) }
            else -> null
        }
    }.getOrNull()

    /* ---------- files: camera, pictures, any file ---------- */

    private fun pickFiles(p: WebChromeClient.FileChooserParams) {
        val accept = p.acceptTypes.flatMap { it.split(',') }.map { it.trim().lowercase() }.filter { it.isNotEmpty() }
        val imagesOnly = accept.isNotEmpty() && accept.all { it.startsWith("image/") || it in setOf(".jpg", ".jpeg", ".png", ".webp", ".heic") }
        val multiple = p.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE
        if (p.isCaptureEnabled && imagesOnly) {
            val dir = File(cacheDir, "camera").apply { mkdirs() }
            dir.listFiles()?.forEach { if (System.currentTimeMillis() - it.lastModified() > 86_400_000L) it.delete() }
            val f = File(dir, "Faro-${System.currentTimeMillis()}.jpg")
            val uri = FileProvider.getUriForFile(this, "com.oscarvelz.faro.files", f)
            camUri = uri
            val cam = Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, uri)
                .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            startActivityForResult(cam, RQ_CAMERA)
            return
        }
        val intent = if (imagesOnly && Build.VERSION.SDK_INT >= 33) {
            // The phone's photo picker (Screenshots album included), one or several pictures.
            Intent(MediaStore.ACTION_PICK_IMAGES).apply { if (multiple) putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, minOf(12, MediaStore.getPickImagesMaxLimit())) }
        } else {
            Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).apply {
                // Exact MIME filters hide .json/.vcf/.csv files that phones label oddly, so only pictures are filtered.
                type = if (imagesOnly) "image/*" else "*/*"
                if (multiple) putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            }
        }
        try { startActivityForResult(intent, RQ_FILES) }
        catch (e: ActivityNotFoundException) {
            startActivityForResult(Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType(if (imagesOnly) "image/*" else "*/*")
                .apply { if (multiple) putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true) }, RQ_FILES)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(rq: Int, rc: Int, d: Intent?) {
        when (rq) {
            RQ_CAMERA -> {
                val u = camUri; camUri = null
                val ok = rc == RESULT_OK && u != null && runCatching { contentResolver.openFileDescriptor(u, "r")?.use { it.statSize > 0 } ?: false }.getOrDefault(false)
                fileCb?.onReceiveValue(if (ok) arrayOf(u!!) else null); fileCb = null
            }
            RQ_FILES -> {
                val cd = d?.clipData
                val res: Array<Uri>? = if (rc != RESULT_OK) null
                    else if (cd != null && cd.itemCount > 0) Array(cd.itemCount) { cd.getItemAt(it).uri }
                    else d?.data?.let { arrayOf(it) }
                fileCb?.onReceiveValue(res); fileCb = null
            }
            else -> super.onActivityResult(rq, rc, d)
        }
    }

    /* ---------- pictures shared from other apps ---------- */

    private fun takeShare(i: Intent?) {
        if (i == null) return
        val uris: List<Uri> = when (i.action) {
            Intent.ACTION_SEND -> listOfNotNull(streamOne(i))
            Intent.ACTION_SEND_MULTIPLE -> streamMany(i)
            else -> return
        }
        if (uris.isEmpty()) return
        // Copy right away: the sending app's permission to read them ends with this intent.
        val dir = File(cacheDir, "shared").apply { mkdirs() }
        synchronized(shared) { shared.clear(); dir.listFiles()?.forEach { it.delete() } }
        for ((n, u) in uris.take(12).withIndex()) {
            runCatching {
                val mime = contentResolver.getType(u) ?: "image/jpeg"
                if (!mime.startsWith("image/")) return@runCatching
                var name = "captura-${n + 1}.jpg"
                contentResolver.query(u, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0)?.let { name = it } }
                val f = File(dir, "$n-" + name.replace(Regex("[^\\w.\\- ]"), "_"))
                contentResolver.openInputStream(u)?.use { inp -> f.outputStream().use { inp.copyTo(it) } }
                if (f.length() > 0) shared.add(SharedPic(f, name, mime))
            }
        }
        if (shared.isNotEmpty() && pageReady) dispatch("dispatchEvent(new Event('faronative-share'))")
    }

    private fun streamOne(i: Intent): Uri? =
        if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        else @Suppress("DEPRECATION") (i.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))

    private fun streamMany(i: Intent): List<Uri> =
        (if (Build.VERSION.SDK_INT >= 33) i.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
         else @Suppress("DEPRECATION") (i.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM))) ?: emptyList()

    /* ---------- the bridge ---------- */

    inner class Bridge {
        // Every method below answers only the Faro page (trusted = the main frame is oscarvelz.github.io/Faro, or its own
        // blob:/data:); any other page gets the same neutral answer as "nothing here" (no exception, nothing visible).
        @JavascriptInterface fun version(): String = if (trusted) BuildConfig.VERSION_NAME else ""

        // 1.3.148: the Ajustes → Avisos row. notifyState reads the phone's real permission state (never a guess);
        // requestNotify re-asks on Android 13+ (below 13 notifications need no runtime permission).
        @JavascriptInterface fun notifyState(): String {
            if (!trusted) return "denied"
            val nm = getSystemService(NotificationManager::class.java) ?: return "denied"
            return if (nm.areNotificationsEnabled()) "granted" else "denied"
        }

        @JavascriptInterface fun requestNotify() {
            if (!trusted) return
            runOnUiThread {
                if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 12)
            }
        }

        // 1.3.150: the Ajustes → battery card. battExempt reads the phone's real battery-optimisation state;
        // battAsk walks three doors in order — the direct exemption dialog, the battery-optimisation list,
        // the app's own system page. The bridge runs on a binder thread: the intents launch on the UI thread
        // and the launch is WAITED FOR with a latch (3 s) — without the wait the answer comes back before any
        // door opens and always reads "false" (the Iris 2.34 lesson). The answer is the phone's real state
        // after the ask, never a promise; the page re-reads battExempt when the user comes back.
        @JavascriptInterface fun battExempt(): String {
            if (!trusted) return "false"
            val pm = getSystemService(PowerManager::class.java) ?: return "false"
            return if (pm.isIgnoringBatteryOptimizations(packageName)) "true" else "false"
        }

        @JavascriptInterface fun battAsk(): String {
            if (!trusted) return "false"
            if (battExempt() == "true") return "true"
            val latch = CountDownLatch(1)
            runOnUiThread {
                try {
                    val doors = listOf(
                        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")),
                        Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")),
                    )
                    for (door in doors) {
                        try { startActivity(door); break } catch (e: Exception) { /* this door is shut on this phone: try the next */ }
                    }
                } finally {
                    latch.countDown()
                }
            }
            try { latch.await(3, TimeUnit.SECONDS) } catch (e: InterruptedException) { /* fall through to the real state */ }
            return battExempt()
        }

        @JavascriptInterface fun setBars(top: String, bottom: String, darkTop: Boolean, darkBottom: Boolean) {
            if (!trusted) return
            val t = parseColor(top) ?: return
            val b = parseColor(bottom) ?: t
            runOnUiThread {
                topColor = t; bottomColor = b; topDark = darkTop; bottomDark = darkBottom
                prefs.edit().putInt("top", t).putInt("bottom", b).putBoolean("topDark", darkTop).putBoolean("bottomDark", darkBottom).apply()
                applyBars()
            }
        }

        @JavascriptInterface fun atRoot(msg: String) {
            if (!trusted) return
            runOnUiThread { leaveOnSecondBack(msg.ifBlank { "Pulsa atrás otra vez para salir" }) }
        }

        /** 1.3.164 (web): the exit confirm's Salir — the user already answered the question in
         *  the web dialog, so the activity finishes at once (no press-again window). */
        @JavascriptInterface fun exitNow() {
            if (!trusted) return
            runOnUiThread { finish() }
        }

        @JavascriptInterface fun canAuth(): String {
            if (!trusted) return "no"
            val bm = getSystemService(BiometricManager::class.java) ?: return "no"
            return if (bm.canAuthenticate(AUTH) == BiometricManager.BIOMETRIC_SUCCESS) "yes" else "no"
        }

        @JavascriptInterface fun authenticate(id: String, title: String, subtitle: String) {
            if (!trusted) { authReply(id, false); return }
            runOnUiThread {
                try {
                    val prompt = BiometricPrompt.Builder(this@MainActivity)
                        .setTitle(title.ifBlank { "Desbloquear Faro" })
                        .setSubtitle(subtitle)
                        .setAllowedAuthenticators(AUTH)
                        .build()
                    prompt.authenticate(CancellationSignal(), mainExecutor, object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = authReply(id, true)
                        override fun onAuthenticationError(code: Int, msg: CharSequence) = authReply(id, false)
                        // onAuthenticationFailed (a finger not recognised) keeps the prompt open: no reply yet.
                    })
                } catch (e: Exception) { authReply(id, false) }
            }
        }

        @JavascriptInterface fun saveBegin(name: String, mime: String): String {
            if (!trusted) return "error"
            return try {
                val clean = name.replace(Regex("[\\\\/:*?\"<>|\\n\\r]"), "_").trim().ifBlank { "Faro" }.take(120)
                val v = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, clean)
                    put(MediaStore.MediaColumns.MIME_TYPE, mime.ifBlank { "application/octet-stream" })
                    put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/Faro/")
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v) ?: return "error"
                val out = contentResolver.openOutputStream(uri, "w") ?: return "error"
                var shown = clean
                contentResolver.query(uri, arrayOf(MediaStore.MediaColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) shown = c.getString(0) ?: clean }
                val id = java.util.UUID.randomUUID().toString()
                saves[id] = Save(uri, out, shown)
                id
            } catch (e: Exception) { "error" }
        }

        @JavascriptInterface fun saveChunk(id: String, b64: String): String {
            if (!trusted) return "error"
            val s = saves[id] ?: return "error"
            return try { s.out.write(Base64.decode(b64, Base64.DEFAULT)); "ok" }
            catch (e: Exception) { drop(id); "error" }
        }

        @JavascriptInterface fun saveEnd(id: String, template: String): String {
            if (!trusted) return "error"
            val s = saves.remove(id) ?: return "error"
            return try {
                s.out.close()
                contentResolver.update(s.uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
                val msg = template.ifBlank { "Guardado en Descargas › Faro: %s" }.replace("%s", s.name)
                runOnUiThread { Toast.makeText(this@MainActivity, msg, Toast.LENGTH_LONG).show() }
                "ok"
            } catch (e: Exception) { runCatching { contentResolver.delete(s.uri, null, null) }; "error" }
        }

        @JavascriptInterface fun sharedCount(): Int = if (trusted) shared.size else 0

        @JavascriptInterface fun sharedInfo(i: Int): String {
            if (!trusted) return "{}"
            val p = synchronized(shared) { shared.getOrNull(i) } ?: return "{}"
            return JSONObject().put("name", p.name).put("type", p.mime).put("size", p.file.length()).toString()
        }

        @JavascriptInterface fun sharedChunk(i: Int, offset: Double, length: Int): String {
            if (!trusted) return ""
            val p = synchronized(shared) { shared.getOrNull(i) } ?: return ""
            return runCatching {
                RandomAccessFile(p.file, "r").use { f ->
                    f.seek(offset.toLong())
                    val buf = ByteArray(minOf(length, 1 shl 20))
                    val n = f.read(buf)
                    if (n <= 0) "" else Base64.encodeToString(buf, 0, n, Base64.NO_WRAP)
                }
            }.getOrDefault("")
        }

        /** 1.3.121: the widgets' snapshot (JSON from src/lib/faro/widget.ts; "" = signed out). Kept app-private. */
        @JavascriptInterface fun setWidgetData(json: String) {
            if (!trusted) return
            runCatching { FaroWidgets.save(applicationContext, json) }
        }

        /** 1.3.121: the target of the last widget tap, once ("" when none). */
        @JavascriptInterface fun takeOpen(): String {
            if (!trusted) return ""
            val g = widgetGo ?: return ""
            widgetGo = null
            return g
        }

        @JavascriptInterface fun sharedClear() {
            if (!trusted) return
            synchronized(shared) { shared.forEach { it.file.delete() }; shared.clear() }
        }
    }

    private fun drop(id: String) {
        val s = saves.remove(id) ?: return
        runCatching { s.out.close() }; runCatching { contentResolver.delete(s.uri, null, null) }
    }

    private fun authReply(id: String, ok: Boolean) =
        dispatch("dispatchEvent(new CustomEvent('faronative-auth',{detail:{id:${JSONObject.quote(id)},ok:$ok}}))")

    /* ---------- back ---------- */

    private fun leaveOnSecondBack(msg: String) {
        val now = System.currentTimeMillis()
        if (now - lastBack < 2000) finish()
        else { lastBack = now; Toast.makeText(this, msg, Toast.LENGTH_SHORT).show() }
    }

    @Deprecated("Deprecated in Java")
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (!pageReady) { plainBack(); return }
        // Faro's own history decides (each open layer owns its entry); it calls atRoot() when nothing is left to close.
        web.evaluateJavascript("(function(){try{return window.FaroBack?window.FaroBack():'none'}catch(e){return 'none'}})()") { r ->
            if (r == null || r.contains("none")) plainBack()
        }
    }

    private fun plainBack() {
        if (web.canGoBack()) web.goBack() else leaveOnSecondBack("Pulsa atrás otra vez para salir")
    }

    /* ---------- updates of the app itself ---------- */

    /** If GitHub has a newer android-N release with Faro.apk, offer it (at most once a day per version) and install in place. */
    private fun checkUpdate() = Thread {
        try {
            val c = URL(REPO_RELEASES).openConnection() as HttpURLConnection
            c.setRequestProperty("Accept", "application/vnd.github+json"); c.connectTimeout = 8000; c.readTimeout = 8000
            val list = JSONArray(c.inputStream.bufferedReader().readText())
            var best = BuildConfig.VERSION_CODE
            var url: String? = null
            for (i in 0 until list.length()) {
                val r = list.getJSONObject(i)
                if (r.optBoolean("draft") || r.optBoolean("prerelease")) continue
                val n = r.getString("tag_name").takeIf { it.startsWith("android-") }?.substringAfter("android-")?.toIntOrNull() ?: continue
                if (n <= best) continue
                val assets = r.getJSONArray("assets")
                val apk = (0 until assets.length()).map { assets.getJSONObject(it) }.firstOrNull { it.getString("name") == "Faro.apk" } ?: continue
                best = n; url = apk.getString("browser_download_url")
            }
            val found = url ?: return@Thread
            val askedAt = prefs.getLong("asked-$best", 0L)
            if (System.currentTimeMillis() - askedAt < 86_400_000L) return@Thread
            runOnUiThread {
                prefs.edit().putLong("asked-$best", System.currentTimeMillis()).apply()
                AlertDialog.Builder(this).setTitle("Nueva versión de la app Faro")
                    .setMessage("Hay una versión nueva de la app. ¿Instalarla ahora? Tus datos y tu cuenta se quedan igual.")
                    .setPositiveButton("Instalar") { _, _ -> install(found) }.setNegativeButton("Más tarde", null).show()
            }
        } catch (_: Exception) {}
    }.start()

    private fun install(url: String) {
        Toast.makeText(this, "Descargando la actualización…", Toast.LENGTH_SHORT).show()
        Thread {
            try {
                val pi = packageManager.packageInstaller
                val id = pi.createSession(PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL))
                pi.openSession(id).use { s ->
                    val c = URL(url).openConnection() as HttpURLConnection; c.instanceFollowRedirects = true
                    c.inputStream.use { inp -> s.openWrite("faro.apk", 0, -1).use { out -> inp.copyTo(out); s.fsync(out) } }
                    val back = Intent(this, MainActivity::class.java).setAction("faro.INSTALL")
                    val pend = PendingIntent.getActivity(this, 1, back, PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                    s.commit(pend.intentSender)
                }
            } catch (e: Exception) { runOnUiThread { Toast.makeText(this, "No se pudo actualizar: ${e.message}", Toast.LENGTH_LONG).show() } }
        }.start()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action == "faro.INSTALL") {
            when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)) {
                PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                    @Suppress("DEPRECATION") val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                    if (confirm != null) startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                }
                PackageInstaller.STATUS_SUCCESS -> {}
                else -> Toast.makeText(this, "La actualización no se instaló: " + (intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: ""), Toast.LENGTH_LONG).show()
            }
            return
        }
        takeShare(intent)
        if (takeWidget(intent) && pageReady) dispatch("dispatchEvent(new Event('faronative-open'))")
    }

    /** A tap on a home-screen widget: remember where it goes until the page asks (after the lock, if any). */
    private fun takeWidget(i: Intent?): Boolean {
        if (i?.action != FaroWidgets.ACTION_OPEN) return false
        val go = i.getStringExtra(FaroWidgets.EXTRA_GO)?.takeIf { Regex("^[a-z-]{2,24}$").matches(it) } ?: return false
        widgetGo = go
        return true
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onSaveInstanceState(out: Bundle) { super.onSaveInstanceState(out); web.saveState(out) }

    override fun onDestroy() {
        for (id in saves.keys.toList()) drop(id)
        super.onDestroy()
    }
}
