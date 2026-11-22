package com.oscarvelz.faro

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Ola 8 (1.3.388): la billetera por notificaciones — el oyente. La cáscara
 * escucha SOLO las apps que la página eligió (la elección vive en las
 * prefs "faro-listen", escrita por el puente listenApps) y SOLO cuando el
 * interruptor de la página está encendido. Cada aviso elegido entra en la
 * cola "faro-notices" tal cual (título + texto + hora); la página lo
 * recoge con la entrega en dos fases de la casa (peek/ack, como los
 * apuntes rápidos) y el intérprete de la página (lib/faro/notices.ts)
 * redacta el borrador — la cáscara jamás interpreta dinero.
 *
 * Los códigos, jamás: un aviso con palabra de código y su racimo de
 * dígitos se descarta AQUÍ, antes de la cola — no se guarda ni en
 * tránsito (el espejo grueso de la cerca fina de la página, que además
 * cede si el aviso trae forma de dinero: un código de autorización
 * dentro de una compra sigue siendo una compra, y eso lo juzga la
 * página, no esta criba).
 *
 * El permiso es del sistema (la pantalla de acceso a notificaciones);
 * la página lo lee con noticesState y lo pide con requestNotices.
 */
class FaroListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        runCatching {
            val n = sbn ?: return
            val ctx = applicationContext
            val prefs = ctx.getSharedPreferences(FaroNotices.PREFS_LISTEN, Context.MODE_PRIVATE)
            if (!prefs.getBoolean("on", false)) return
            val apps = runCatching {
                val a = JSONArray(prefs.getString("apps", "[]") ?: "[]")
                (0 until a.length()).mapNotNull { a.optString(it).takeIf { s -> s.isNotEmpty() } }.toSet()
            }.getOrDefault(emptySet())
            if (n.packageName !in apps) return
            val ex = n.notification.extras
            val title = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val big = ex.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
            val text = big.ifBlank { ex.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: "" }
            if (title.isBlank() && text.isBlank()) return
            if (FaroNotices.looksLikeCode("$title $text")) return
            val item = JSONObject()
                .put("id", "${n.packageName}-${n.postTime}-${n.id}")
                .put("pkg", n.packageName)
                .put("title", title)
                .put("text", text)
                .put("at", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date(n.postTime)))
            FaroNotices.enqueue(ctx, item)
        }
    }
}

object FaroNotices {
    const val PREFS_LISTEN = "faro-listen"
    private const val PREFS_QUEUE = "faro-notices"
    private const val KEY = "queue"
    private const val CAP = 50

    private val CODE_WORDS = listOf(
        "codigo", "verificacion", "verification", "otp", "one-time", "one time",
        "clave temporal", "security code", "passcode", "autenticacion", "authentication code", "2fa",
    )
    private val DIGITS = Regex("\\b\\d{4,8}\\b")
    private val MONEY = Regex("(us\\$|c\\$|\\$|\\busd\\b|\\bnio\\b|cordobas|dolares|dollars)")
    private val MOVE = listOf(
        "compra", "pago", "pagaste", "cargo", "aprobada", "aprobado", "purchase",
        "paid", "payment", "charged", "recibiste", "recibido", "deposito", "refund", "reembolso",
    )

    /** La criba de códigos, espejo de la cerca de la página: palabra de
     *  código + dígitos, y SIN forma de dinero — un código de
     *  autorización dentro de una compra no convierte la compra en
     *  código: ese aviso sí viaja y lo juzga el intérprete. */
    fun looksLikeCode(raw: String): Boolean {
        val t = raw.lowercase()
        if (!CODE_WORDS.any { t.contains(it) }) return false
        if (!DIGITS.containsMatchIn(t)) return false
        val hasMoney = MONEY.containsMatchIn(t) && MOVE.any { t.contains(it) }
        return !hasMoney
    }

    /** La elección de la página (interruptor + apps) manda en el oyente. */
    fun setChoice(ctx: Context, json: String) {
        runCatching {
            val o = JSONObject(json)
            val apps = o.optJSONArray("apps") ?: JSONArray()
            ctx.getSharedPreferences(PREFS_LISTEN, Context.MODE_PRIVATE).edit()
                .putBoolean("on", o.optBoolean("on", false))
                .putString("apps", apps.toString())
                .apply()
        }
    }

    /** ¿El sistema concedió el acceso a notificaciones a esta app? */
    fun granted(ctx: Context): Boolean =
        NotificationManagerCompat.getEnabledListenerPackages(ctx).contains(ctx.packageName)

    /** La puerta a la pantalla del sistema que concede el acceso. */
    fun openSettings(ctx: Context) {
        runCatching {
            ctx.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }

    fun enqueue(ctx: Context, item: JSONObject) {
        val prefs = ctx.getSharedPreferences(PREFS_QUEUE, Context.MODE_PRIVATE)
        val arr = runCatching { JSONArray(prefs.getString(KEY, "[]") ?: "[]") }.getOrDefault(JSONArray())
        arr.put(item)
        while (arr.length() > CAP) arr.remove(0)
        prefs.edit().putString(KEY, arr.toString()).apply()
    }

    /** La cola como texto SIN vaciarla (entrega en dos fases). */
    fun peek(ctx: Context): String =
        ctx.getSharedPreferences(PREFS_QUEUE, Context.MODE_PRIVATE).getString(KEY, "") ?: ""

    /** Quita de la cola SOLO los ids confirmados; lo demás espera. */
    fun ack(ctx: Context, idsJson: String) {
        val ids = runCatching {
            val a = JSONArray(idsJson)
            (0 until a.length()).mapNotNull { a.optString(it).takeIf { s -> s.isNotEmpty() } }.toSet()
        }.getOrDefault(emptySet())
        if (ids.isEmpty()) return
        val prefs = ctx.getSharedPreferences(PREFS_QUEUE, Context.MODE_PRIVATE)
        val arr = runCatching { JSONArray(prefs.getString(KEY, "[]") ?: "[]") }.getOrDefault(JSONArray())
        val kept = JSONArray()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i)
            if (o == null || o.optString("id") !in ids) kept.put(arr.opt(i))
        }
        if (kept.length() == 0) prefs.edit().remove(KEY).apply()
        else prefs.edit().putString(KEY, kept.toString()).apply()
    }
}
