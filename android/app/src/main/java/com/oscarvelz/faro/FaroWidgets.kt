package com.oscarvelz.faro

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Calendar
import java.util.Locale

/**
 * Faro's home-screen widgets (1.3.121): "Faro · Mes" for the phone, "Faro · Panel" for the tablet and
 * "Faro · Vencimientos" (the dues on their own, phone-sized). Every widget can override whether it shows amounts:
 * the configure screen (WidgetConfigActivity) stores the choice in WidgetCfg and the renderers copy the snapshot
 * with the effective hide before drawing (see Snap.withHide).
 *
 * Data: the web app hands a privacy-safe snapshot to FaroNative.setWidgetData (src/lib/faro/widget.ts on `source`):
 * amounts are integer minor units already in the view currency; dates are ISO days. It is kept here in the app's own
 * private SharedPreferences ("faro-widget") and nothing else: the widgets never use the network or the account.
 * Until the first snapshot arrives they show "Abre Faro una vez".
 *
 * Drawing: plain RemoteViews (TextView, ImageView, ProgressBar with Faro's own drawables), so everything is crisp at any
 * size and follows the phone's day/night (values-night). Android 12+ gets several layouts mapped to sizes, so the launcher
 * swaps them as the widget is resized; Android 11 picks one from the reported size.
 *
 * Taps open MainActivity with action faro.WIDGET and the target ("desk", "pagos", "fixed", "add-out"…); the page takes it
 * with FaroNative.takeOpen() once it is open and unlocked (components/faro/widget-host.tsx).
 */
object FaroWidgets {
    private const val PREFS = "faro-widget"
    private const val KEY = "snap"
    const val ACTION_OPEN = "faro.WIDGET"
    const val EXTRA_GO = "go"
    const val ACTION_TICK = "com.oscarvelz.faro.WIDGET_TICK"

    fun save(ctx: Context, json: String) {
        val clean = json.trim()
        val ok = clean.isEmpty() || runCatching { JSONObject(clean).optInt("v") == 1 }.getOrDefault(false)
        if (!ok) return
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, clean).apply()
        refreshAll(ctx)
        FaroNotify.onSnapshot(ctx)
    }

    fun load(ctx: Context): Snap? {
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "") ?: ""
        if (raw.isBlank()) return null
        return runCatching { Snap.parse(JSONObject(raw)) }.getOrNull()
    }

    fun refreshAll(ctx: Context) {
        val m = AppWidgetManager.getInstance(ctx)
        val phone = m.getAppWidgetIds(ComponentName(ctx, PhoneWidget::class.java))
        val panel = m.getAppWidgetIds(ComponentName(ctx, PanelWidget::class.java))
        val dues = m.getAppWidgetIds(ComponentName(ctx, DuesWidget::class.java))
        for (id in phone) m.updateAppWidget(id, Render.phone(ctx, m, id))
        for (id in panel) m.updateAppWidget(id, Render.panel(ctx, m, id))
        for (id in dues) m.updateAppWidget(id, Render.duesWidget(ctx, m, id))
        if (phone.isNotEmpty() || panel.isNotEmpty() || dues.isNotEmpty()) scheduleMidnight(ctx)
    }

    /** Redraws one widget instance (the configure screen saves and refreshes just that one). */
    fun refreshOne(ctx: Context, id: Int) {
        val m = AppWidgetManager.getInstance(ctx)
        val v = when (m.getAppWidgetInfo(id)?.provider?.className) {
            PhoneWidget::class.java.name -> Render.phone(ctx, m, id)
            PanelWidget::class.java.name -> Render.panel(ctx, m, id)
            DuesWidget::class.java.name -> Render.duesWidget(ctx, m, id)
            else -> return
        }
        m.updateAppWidget(id, v)
    }

    /** Days left change at midnight: one inexact alarm just after it (no exact-alarm permission needed). */
    fun scheduleMidnight(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        val c = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, 1); set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 1); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        val i = Intent(ctx, PhoneWidget::class.java).setAction(ACTION_TICK)
        val pi = PendingIntent.getBroadcast(ctx, 41, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        runCatching { am.set(AlarmManager.RTC, c.timeInMillis, pi) }
    }

    fun openIntent(ctx: Context, go: String): PendingIntent {
        val i = Intent(ctx, MainActivity::class.java).setAction(ACTION_OPEN).putExtra(EXTRA_GO, go)
            .setData(Uri.parse("faro-widget://open/$go"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(ctx, go.hashCode(), i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    /** Los + / − del widget (línea de ventanas, 2026-11-12): ya no abren la app — levantan la
     *  tarjeta rápida del shell (QuickAddActivity), donde el apunte se escribe sin abrir Faro. */
    fun quickIntent(ctx: Context, sign: String): PendingIntent {
        val i = Intent(ctx, QuickAddActivity::class.java).putExtra(QuickAdd.EXTRA_SIGN, sign)
            .setData(Uri.parse("faro-widget://quick/$sign"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return PendingIntent.getActivity(ctx, sign.hashCode(), i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
}

/**
 * 1.3.150: closes the reboot hole FaroNotify documents — Android wipes every alarm on reboot (and on an app
 * update), so the midnight tick that drives the dues/pace/month-close alerts died until the next snapshot.
 * On BOOT_COMPLETED / MY_PACKAGE_REPLACED: re-arm the midnight alarm and redraw the widgets from the last
 * snapshot. Registered in the manifest (exported: both are protected system broadcasts).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        FaroWidgets.scheduleMidnight(ctx)
        FaroWidgets.refreshAll(ctx)
    }
}

/* ---------- per-widget options ---------- */

/**
 * One option per widget instance, chosen on the configure screen (WidgetConfigActivity): whether THIS widget shows
 * amounts. FOLLOW (the default) defers to the snapshot's own hide; SHOW / HIDE win over it. Kept per appWidgetId in
 * its own prefs; the render entry points apply it by copying the snapshot with the effective hide (Snap.withHide).
 */
object WidgetCfg {
    private const val PREFS = "faro-widget-cfg"
    const val FOLLOW = 0
    const val SHOW = 1
    const val HIDE = 2

    fun mode(ctx: Context, id: Int): Int =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt("hide_$id", FOLLOW)

    fun setMode(ctx: Context, id: Int, mode: Int) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("hide_$id", mode).apply()
    }

    /** Widget ids get recycled by the launcher: a removed widget must not leave its choice behind for the next one. */
    fun forget(ctx: Context, ids: IntArray) {
        val e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        for (id in ids) e.remove("hide_$id")
        e.apply()
    }

    /** The snapshot as one widget instance should see it: the per-widget choice overrides its hide when set. */
    fun apply(ctx: Context, id: Int, s: Snap): Snap = when (mode(ctx, id)) {
        SHOW -> s.withHide(false)
        HIDE -> s.withHide(true)
        else -> s
    }
}

/* ---------- the snapshot ---------- */

class Due(val name: String, val kind: String, val on: String, val amt: Long?, val go: String)
class Cat(val name: String, val amt: Long, val prev: Long, val save: Boolean, val go: String)
/** Una casa para los apuntes rápidos (quickadd.ts quickHomes): ids de Estructura + nombre. */
class QHome(val c: String, val s: String, val n: String)
/** El juicio del patrón de ritmo (patron.ts paceReading, calculado por la página; 1.3.248):
 *  estado, veredicto ("" mientras aprende) y las cifras que la notificación nombra. */
class Pace(val status: String, val verdict: String, val spent: Long, val expected: Long, val projected: Long, val income: Long)
class Flow(val label: String, val inn: Long, val out: Long, val key: String = "")
class Pocket(val name: String, val amt: Long, val go: String)

class Snap(
    val at: String, val lang: String, val cur: String, val rateE4: Long, val rateSrc: String, val rateAsOf: String, val month: String, val monthLabel: String,
    val hide: Boolean, val have: Long, val spend: Long, val left: Long, val usedPct: Int?, val pay: Long, val tone: String,
    val saveMonth: Long, val saveGoal: Long, val saveTotal: Long, val pockets: List<Pocket>,
    val owed: Long, val owe: Long, val dues: List<Due>, val cats: List<Cat>, val flow: List<Flow>,
    /** 1.3.148: the user's Avisos switch (Ajustes); snapshots from older web builds don't carry it = on. */
    val notify: Boolean = true,
    /** Apuntes rápidos: las casas que la tarjeta ofrece por signo. Una foto escrita por una
     *  página anterior a las casas no las trae = ninguna; desde 1.3.237 la página renueva la
     *  foto del libro real en CADA apertura (también con el ejemplo en pantalla), así que el
     *  shell ya no distingue «foto vieja»: la tarjeta ofrece lo que la foto trae y ningún
     *  texto pide abrir la app. */
    val qhIn: List<QHome> = emptyList(),
    val qhOut: List<QHome> = emptyList(),
    /** 1.3.246: las FIJAS del widget (las categorías que él preestableció en Faro) por
     *  signo. La página ya las deduplicó contra las casas de hábito y rellenó los huecos;
     *  la tarjeta las pinta primero con su marca de pin. Una foto vieja no las trae = lista
     *  vacía, y la tarjeta muestra entonces su línea de anuncio. */
    val qpIn: List<QHome> = emptyList(),
    val qpOut: List<QHome> = emptyList(),
    /** 1.3.241: las monedas que el libro conoce, en el orden de la tarjeta (la foto las trae
     *  desde 1.3.241). Una foto vieja no las trae = lista vacía, y la tarjeta alterna entre
     *  las dos monedas del sistema por su cuenta. */
    val curs: List<String> = emptyList(),
    /** 1.3.248: el bloque del patrón de ritmo. Una foto de una página anterior no lo
     *  trae = null, y FaroNotify.checkPace conserva su recta como respaldo exacto. */
    val pace: Pace? = null,
) {
    val en get() = lang == "en"

    /** A copy with another amounts-hidden flag (the per-widget option; see WidgetCfg). All other fields as-is. */
    fun withHide(h: Boolean): Snap = Snap(
        at = at, lang = lang, cur = cur, rateE4 = rateE4, rateSrc = rateSrc, rateAsOf = rateAsOf, month = month, monthLabel = monthLabel,
        hide = h, have = have, spend = spend, left = left, usedPct = usedPct, pay = pay, tone = tone,
        saveMonth = saveMonth, saveGoal = saveGoal, saveTotal = saveTotal, pockets = pockets,
        owed = owed, owe = owe, dues = dues, cats = cats, flow = flow, notify = notify,
        qhIn = qhIn, qhOut = qhOut, qpIn = qpIn, qpOut = qpOut, curs = curs, pace = pace,
    )

    companion object {
        private fun arr(o: JSONObject, k: String): List<JSONObject> {
            val a: JSONArray = o.optJSONArray(k) ?: return emptyList()
            return (0 until a.length()).mapNotNull { a.optJSONObject(it) }
        }
        fun parse(o: JSONObject) = Snap(
            at = o.optString("at"), lang = o.optString("lang", "es"), cur = o.optString("cur", "USD"), rateE4 = o.optLong("rateE4"),
            rateSrc = o.optString("rateSrc"), rateAsOf = o.optString("rateAsOf"),
            month = o.optString("month"), monthLabel = o.optString("monthLabel"), hide = o.optBoolean("hide"),
            notify = o.optBoolean("notify", true),
            have = o.optLong("have"), spend = o.optLong("spend"), left = o.optLong("left"),
            usedPct = if (o.isNull("usedPct") || !o.has("usedPct")) null else o.optInt("usedPct"),
            pay = o.optLong("pay"), tone = o.optString("tone", "neutral"),
            saveMonth = o.optLong("saveMonth"), saveGoal = o.optLong("saveGoal"), saveTotal = o.optLong("saveTotal"),
            pockets = arr(o, "pockets").map { Pocket(it.optString("name"), it.optLong("amt"), it.optString("go", "vault-save")) },
            owed = o.optLong("owed"), owe = o.optLong("owe"),
            dues = arr(o, "dues").map { Due(it.optString("name"), it.optString("kind"), it.optString("on"), if (it.isNull("amt")) null else it.optLong("amt"), it.optString("go", "pagos")) },
            cats = arr(o, "cats").map { Cat(it.optString("name"), it.optLong("amt"), it.optLong("prev"), it.optBoolean("save"), it.optString("go", "desk")) },
            flow = arr(o, "flow").map { Flow(it.optString("label"), it.optLong("inn"), it.optLong("out"), it.optString("key")) },
            qhIn = arr(o, "qhIn").map { QHome(it.optString("c"), it.optString("s"), it.optString("n")) },
            qhOut = arr(o, "qhOut").map { QHome(it.optString("c"), it.optString("s"), it.optString("n")) },
            qpIn = arr(o, "qpIn").map { QHome(it.optString("c"), it.optString("s"), it.optString("n")) },
            qpOut = arr(o, "qpOut").map { QHome(it.optString("c"), it.optString("s"), it.optString("n")) },
            curs = (o.optJSONArray("curs")?.let { a -> (0 until a.length()).mapNotNull { a.optString(it).takeIf { s -> s.isNotEmpty() } } } ?: emptyList()),
            pace = o.optJSONObject("pace")?.let { Pace(it.optString("status"), it.optString("verdict"), it.optLong("spent"), it.optLong("expected"), it.optLong("projected"), it.optLong("income")) },
        )
    }
}

/* ---------- words and numbers ---------- */

object Fmt {
    private val two = DecimalFormat("#,##0.00", DecimalFormatSymbols(Locale.US))
    const val DOTS = "• • • •"

    /** Faro's own format: "$1,234.56" / "C$1,234.56", the sign before the symbol. */
    fun money(minor: Long, cur: String): String {
        val sign = if (minor < 0) "-" else ""
        val v = Math.abs(minor) / 100.0
        return sign + (if (cur == "NIO") "C$" else "$") + two.format(v)
    }

    fun rate(e4: Long): String = if (e4 <= 0) "—" else "C$" + DecimalFormat("0.0000", DecimalFormatSymbols(Locale.US)).format(e4 / 10000.0)

    fun dayIndex(iso: String): Long? {
        if (iso.length < 10) return null
        return runCatching {
            val c = Calendar.getInstance(); c.clear()
            c.set(iso.substring(0, 4).toInt(), iso.substring(5, 7).toInt() - 1, iso.substring(8, 10).toInt(), 12, 0)
            c.timeInMillis / 86_400_000L
        }.getOrNull()
    }

    fun today(): Long { val c = Calendar.getInstance(); c.set(Calendar.HOUR_OF_DAY, 12); c.set(Calendar.MINUTE, 0); return c.timeInMillis / 86_400_000L }

    fun daysLeft(iso: String): Int? = dayIndex(iso)?.let { (it - today()).toInt() }

    fun daysWord(d: Int, en: Boolean): String = when {
        d < 0 -> if (en) "${-d} d ago" else "hace ${-d} d"
        d == 0 -> if (en) "today" else "hoy"
        d == 1 -> if (en) "tomorrow" else "mañana"
        else -> if (en) "in $d d" else "en $d d"
    }

    fun shortDay(iso: String, en: Boolean): String {
        if (iso.length < 10) return ""
        val m = iso.substring(5, 7).toIntOrNull() ?: return ""
        val es = arrayOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
        val e = arrayOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
        val d = iso.substring(8, 10).toInt()
        return if (en) "${e[m - 1]} $d" else "$d ${es[m - 1]}"
    }

    fun clock(iso: String, en: Boolean): String {
        return runCatching {
            val t = java.time.OffsetDateTime.parse(iso).atZoneSameInstant(java.time.ZoneId.systemDefault())
            val today = java.time.LocalDate.now()
            val hm = String.format(Locale.US, "%02d:%02d", t.hour, t.minute)
            if (t.toLocalDate() == today) (if (en) "Updated $hm" else "Actualizado $hm")
            else (if (en) "Updated ${shortDay(t.toLocalDate().toString(), true)}, $hm" else "Actualizado ${shortDay(t.toLocalDate().toString(), false)}, $hm")
        }.getOrDefault("")
    }
}

/* ---------- drawing ---------- */

object Render {
    private val PHONE_S = SizeF(180f, 40f)
    private val PHONE_M = SizeF(250f, 140f)
    private val PHONE_L = SizeF(250f, 200f)
    private val PHONE_XL = SizeF(250f, 280f)
    private val PANEL_M = SizeF(440f, 260f)
    private val PANEL_L = SizeF(700f, 330f)
    private val PANEL_XL = SizeF(1000f, 520f)

    fun phone(ctx: Context, m: AppWidgetManager, id: Int): RemoteViews {
        val s = FaroWidgets.load(ctx)?.let { WidgetCfg.apply(ctx, id, it) } ?: return empty(ctx)
        if (Build.VERSION.SDK_INT >= 31) {
            return RemoteViews(mapOf(
                PHONE_S to phoneS(ctx, s), PHONE_M to phoneM(ctx, s, R.layout.w_phone_m),
                PHONE_L to phoneM(ctx, s, R.layout.w_phone_l), PHONE_XL to phoneM(ctx, s, R.layout.w_phone_xl),
            ))
        }
        val (_, h) = size(ctx, m.getAppWidgetOptions(id))
        return when {
            h < 100 -> phoneS(ctx, s)
            h < 170 -> phoneM(ctx, s, R.layout.w_phone_m)
            h < 255 -> phoneM(ctx, s, R.layout.w_phone_l)
            else -> phoneM(ctx, s, R.layout.w_phone_xl)
        }
    }

    fun panel(ctx: Context, m: AppWidgetManager, id: Int): RemoteViews {
        val s = FaroWidgets.load(ctx)?.let { WidgetCfg.apply(ctx, id, it) } ?: return empty(ctx)
        if (Build.VERSION.SDK_INT >= 31) {
            return RemoteViews(mapOf(
                PANEL_M to panelV(ctx, s, R.layout.w_panel_m), PANEL_L to panelV(ctx, s, R.layout.w_panel_l),
                PANEL_XL to panelV(ctx, s, R.layout.w_panel_xl),
            ))
        }
        val (w, h) = size(ctx, m.getAppWidgetOptions(id))
        return panelV(ctx, s, if (w >= 1000 && h >= 520) R.layout.w_panel_xl else if (w >= 700) R.layout.w_panel_l else R.layout.w_panel_m)
    }

    private val DUES_1 = SizeF(250f, 73f)
    private val DUES_2 = SizeF(250f, 99f)
    private val DUES_4 = SizeF(250f, 151f)

    /** "Faro · Vencimientos": the dues alone. One layout (w_dues); how many rows show follows the widget's height. */
    fun duesWidget(ctx: Context, m: AppWidgetManager, id: Int): RemoteViews {
        val s = FaroWidgets.load(ctx)?.let { WidgetCfg.apply(ctx, id, it) } ?: return empty(ctx)
        if (Build.VERSION.SDK_INT >= 31) {
            return RemoteViews(mapOf(
                DUES_1 to duesV(ctx, s, 1), DUES_2 to duesV(ctx, s, 2), DUES_4 to duesV(ctx, s, 4),
            ))
        }
        val (_, h) = size(ctx, m.getAppWidgetOptions(id))
        return duesV(ctx, s, if (h < 99) 1 else if (h < 151) 2 else 4)
    }

    internal fun duesV(ctx: Context, s: Snap, rows: Int): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.w_dues)
        val list = s.dues.mapNotNull { d -> Fmt.daysLeft(d.on)?.let { d to it } }.filter { it.second <= 31 }.sortedBy { it.second }
        v.setTextViewText(R.id.w_dues_title, L(s, "Vencimientos", "Due dates"))
        val first = list.firstOrNull()
        v.setTextViewText(R.id.w_dues_sum, first?.let { Fmt.daysWord(it.second, s.en) } ?: "")
        v.setTextColor(R.id.w_dues_sum, ctx.getColor(if (first == null) R.color.w_muted else if (first.second < 0) R.color.w_bad else if (first.second <= 3) R.color.w_amber else R.color.w_muted))
        v.setOnClickPendingIntent(R.id.w_dues_head, FaroWidgets.openIntent(ctx, "desk"))
        v.setOnClickPendingIntent(R.id.w_root, FaroWidgets.openIntent(ctx, "desk"))
        dues(ctx, v, s, rows, 31, long = true)
        // This widget's own empty line (dues() words it for a section of a bigger widget).
        if (list.isEmpty()) v.setTextViewText(R.id.w_dues_none, L(s, "Sin vencimientos próximos", "No upcoming dues"))
        return v
    }

    /** Width and height in dp for the current orientation (Android 11 path). */
    private fun size(ctx: Context, o: Bundle): Pair<Int, Int> {
        val land = ctx.resources.configuration.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE
        val w = o.getInt(if (land) AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH else AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val h = o.getInt(if (land) AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT else AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)
        return w to h
    }

    fun empty(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.w_empty)
        v.setOnClickPendingIntent(R.id.w_root, FaroWidgets.openIntent(ctx, "desk"))
        return v
    }

    private fun money(s: Snap, minor: Long) = if (s.hide) Fmt.DOTS else Fmt.money(minor, s.cur)
    private fun pct(n: Long, d: Long): Int = if (d <= 0) 0 else Math.max(0, Math.min(1000, Math.round(n * 1000.0 / d).toInt()))
    private fun L(s: Snap, es: String, en: String) = if (s.en) en else es

    /** The month: Queda, the bar, Tengo · Gastaré · Usado (+ Pagos on the panel). */
    private fun hero(ctx: Context, v: RemoteViews, s: Snap) {
        v.setTextViewText(R.id.w_month, s.monthLabel)
        v.setTextViewText(R.id.w_left, money(s, s.left))
        v.setTextColor(R.id.w_left, ctx.getColor(if (s.left < 0 && !s.hide) R.color.w_orange else R.color.w_ink))
        v.setTextViewText(R.id.w_left_lab, L(s, "queda", "left"))
        // Hidden amounts: the big number gives way to one quiet line (dots alone looked like a glitch).
        v.setViewVisibility(R.id.w_left, if (s.hide) View.GONE else View.VISIBLE)
        v.setViewVisibility(R.id.w_left_lab, if (s.hide) View.GONE else View.VISIBLE)
        v.setViewVisibility(R.id.w_left_hid, if (s.hide) View.VISIBLE else View.GONE)
        v.setTextViewText(R.id.w_left_hid, L(s, "Montos ocultos · toca para abrir", "Amounts hidden · tap to open"))
        v.setTextViewText(R.id.w_have_lab, L(s, "Tengo", "Have"))
        v.setTextViewText(R.id.w_spend_lab, L(s, "Gastaré", "Spending"))
        v.setTextViewText(R.id.w_have, money(s, s.have))
        v.setTextViewText(R.id.w_spend, if (s.hide) Fmt.DOTS else "−" + Fmt.money(s.spend, s.cur))
        v.setTextViewText(R.id.w_used, if (s.hide || s.usedPct == null) "" else "${s.usedPct}%")
        val used = if (s.have <= 0) (if (s.spend > 0) 1000 else 0) else pct(s.spend, s.have)
        v.setProgressBar(R.id.w_bar, 1000, used, false)
        v.setContentDescription(R.id.w_hero_box, L(s, "Queda ", "Left ") + money(s, s.left))
        v.setOnClickPendingIntent(R.id.w_hero_box, FaroWidgets.openIntent(ctx, "desk"))
        v.setOnClickPendingIntent(R.id.w_add_in, FaroWidgets.quickIntent(ctx, "in"))
        v.setOnClickPendingIntent(R.id.w_add_out, FaroWidgets.quickIntent(ctx, "out"))
        v.setOnClickPendingIntent(R.id.w_lamp, FaroWidgets.openIntent(ctx, "desk"))
    }

    /** First due from today on (the phone's "Próximo pago"). */
    private fun nextDue(s: Snap): Pair<Due, Int>? =
        s.dues.mapNotNull { d -> Fmt.daysLeft(d.on)?.let { d to it } }.filter { it.second >= 0 }.minByOrNull { it.second }

    private fun pay(ctx: Context, v: RemoteViews, s: Snap, withAmount: Boolean) {
        v.setTextViewText(R.id.w_pay_k, L(s, "Próximo pago", "Next payment"))
        val n = nextDue(s)
        if (n == null) {
            v.setTextViewText(R.id.w_pay_name, L(s, "Nada en 31 días", "Nothing in 31 days"))
            v.setTextViewText(R.id.w_pay_days, "")
            if (withAmount) v.setTextViewText(R.id.w_pay_amt, "")
        } else {
            val (d, days) = n
            v.setTextViewText(R.id.w_pay_name, d.name)
            v.setTextViewText(R.id.w_pay_days, Fmt.daysWord(days, s.en))
            v.setTextColor(R.id.w_pay_days, ctx.getColor(if (days <= 3) R.color.w_amber else R.color.w_muted))
            if (withAmount) v.setTextViewText(R.id.w_pay_amt, d.amt?.let { money(s, it) } ?: "")
        }
        v.setOnClickPendingIntent(R.id.w_c_pay, FaroWidgets.openIntent(ctx, n?.first?.go ?: "pagos"))
    }

    private fun scale(ctx: Context, v: RemoteViews, s: Snap) {
        v.setTextViewText(R.id.w_scale_k, L(s, "Me deben · Debo", "Owed to me · I owe"))
        val total = s.owed + s.owe
        v.setViewVisibility(R.id.w_scale, if (total > 0) View.VISIBLE else View.GONE)
        v.setViewVisibility(R.id.w_scale_zero, if (total > 0) View.GONE else View.VISIBLE)
        if (total > 0) v.setProgressBar(R.id.w_scale, 1000, pct(s.owed, total), false)
        v.setTextViewText(R.id.w_owed, money(s, s.owed))
        v.setTextViewText(R.id.w_owe, money(s, s.owe))
        v.setOnClickPendingIntent(R.id.w_c_debt, FaroWidgets.openIntent(ctx, if (s.owe >= s.owed) "vault-owe" else "vault-owed"))
    }

    private fun savings(ctx: Context, v: RemoteViews, s: Snap, panel: Boolean) {
        val p = pct(s.saveMonth, s.saveGoal)
        v.setProgressBar(R.id.w_ring, 1000, if (s.saveGoal > 0) p else 0, false)
        val shown = if (s.saveGoal > 0) Math.round(s.saveMonth * 100.0 / s.saveGoal).toInt() else null
        v.setTextViewText(R.id.w_save_pct, if (shown == null || s.hide) "" else "$shown%")
        if (panel) {
            v.setTextViewText(R.id.w_save_k, L(s, "Ahorros", "Savings"))
            v.setTextViewText(R.id.w_save_total, money(s, s.saveTotal))
            v.setTextViewText(R.id.w_save_amt, when {
                s.hide -> L(s, "Este mes ", "This month ") + Fmt.DOTS
                s.saveGoal > 0 -> L(s, "Este mes ${Fmt.money(s.saveMonth, s.cur)} de ${Fmt.money(s.saveGoal, s.cur)}", "This month ${Fmt.money(s.saveMonth, s.cur)} of ${Fmt.money(s.saveGoal, s.cur)}")
                else -> L(s, "Este mes ${Fmt.money(s.saveMonth, s.cur)}", "This month ${Fmt.money(s.saveMonth, s.cur)}")
            })
        } else {
            v.setTextViewText(R.id.w_save_k, L(s, "Ahorro", "Saved"))
            v.setTextViewText(R.id.w_save_amt, money(s, s.saveMonth))
        }
        v.setOnClickPendingIntent(R.id.w_c_save, FaroWidgets.openIntent(ctx, "vault-save"))
    }

    private val DUE_ROWS = intArrayOf(R.id.w_d0, R.id.w_d1, R.id.w_d2, R.id.w_d3, R.id.w_d4, R.id.w_d5)
    private val DUE_DOT = intArrayOf(R.id.w_d0_dot, R.id.w_d1_dot, R.id.w_d2_dot, R.id.w_d3_dot, R.id.w_d4_dot, R.id.w_d5_dot)
    private val DUE_NAME = intArrayOf(R.id.w_d0_name, R.id.w_d1_name, R.id.w_d2_name, R.id.w_d3_name, R.id.w_d4_name, R.id.w_d5_name)
    private val DUE_DAYS = intArrayOf(R.id.w_d0_days, R.id.w_d1_days, R.id.w_d2_days, R.id.w_d3_days, R.id.w_d4_days, R.id.w_d5_days)
    private val DUE_AMT = intArrayOf(R.id.w_d0_amt, R.id.w_d1_amt, R.id.w_d2_amt, R.id.w_d3_amt, R.id.w_d4_amt, R.id.w_d5_amt)
    private val POCKETS = arrayOf(intArrayOf(R.id.w_p0, R.id.w_p0_name, R.id.w_p0_amt), intArrayOf(R.id.w_p1, R.id.w_p1_name, R.id.w_p1_amt), intArrayOf(R.id.w_p2, R.id.w_p2_name, R.id.w_p2_amt))

    /** Overdue first (red dot), then by date: amber within 3 days, muted later. `horizon` in days. */
    private fun dues(ctx: Context, v: RemoteViews, s: Snap, rows: Int, horizon: Int, long: Boolean): Long {
        val list = s.dues.mapNotNull { d -> Fmt.daysLeft(d.on)?.let { d to it } }.filter { it.second <= horizon }.sortedBy { it.second }
        var total = 0L
        for (i in 0 until 6) {
            val row = list.getOrNull(i)
            if (i >= rows || row == null) { v.setViewVisibility(DUE_ROWS[i], View.GONE); continue }
            val (d, days) = row
            if (days >= 0) total += d.amt ?: 0
            v.setViewVisibility(DUE_ROWS[i], View.VISIBLE)
            v.setImageViewResource(DUE_DOT[i], if (days < 0) R.drawable.w_dot_bad else if (days <= 3) R.drawable.w_dot_amber else R.drawable.w_dot_muted)
            v.setTextViewText(DUE_NAME[i], d.name)
            v.setTextViewText(DUE_DAYS[i], if (long && days > 3) Fmt.shortDay(d.on, s.en) + " · " + Fmt.daysWord(days, s.en) else Fmt.daysWord(days, s.en))
            v.setTextColor(DUE_DAYS[i], ctx.getColor(if (days < 0) R.color.w_bad else if (days <= 3) R.color.w_amber else R.color.w_muted))
            v.setTextViewText(DUE_AMT[i], d.amt?.let { money(s, it) } ?: "")
            v.setOnClickPendingIntent(DUE_ROWS[i], FaroWidgets.openIntent(ctx, d.go))
        }
        for (d in list.drop(rows)) if (d.second >= 0) total += d.first.amt ?: 0
        val none = list.isEmpty()
        v.setViewVisibility(R.id.w_dues_none, if (none) View.VISIBLE else View.GONE)
        if (none) v.setTextViewText(R.id.w_dues_none, if (horizon <= 14) L(s, "Nada vence en 14 días.", "Nothing due in 14 days.") else L(s, "Nada vence pronto.", "Nothing due soon."))
        return total
    }

    internal fun phoneS(ctx: Context, s: Snap): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.w_phone_s)
        v.setTextViewText(R.id.w_month, L(s, "Queda · ", "Left · ") + s.monthLabel)
        v.setTextViewText(R.id.w_left, money(s, s.left))
        v.setTextColor(R.id.w_left, ctx.getColor(if (s.left < 0 && !s.hide) R.color.w_orange else R.color.w_ink))
        v.setOnClickPendingIntent(R.id.w_hero_box, FaroWidgets.openIntent(ctx, "desk"))
        v.setOnClickPendingIntent(R.id.w_add_out, FaroWidgets.quickIntent(ctx, "out"))
        pay(ctx, v, s, withAmount = false)
        return v
    }

    internal fun phoneM(ctx: Context, s: Snap, layout: Int): RemoteViews {
        val v = RemoteViews(ctx.packageName, layout)
        hero(ctx, v, s)
        // Every size from M up carries the cells row (next payment · the scale · savings): at Oscar's word
        // (2026-11-07) the medium widget showed only the hero and looked poor next to the tablet dashboard.
        // M is the compact take (cells under the hero), L spreads them with a flexible spacer, XL adds the dues.
        pay(ctx, v, s, withAmount = true)
        scale(ctx, v, s)
        savings(ctx, v, s, panel = false)
        if (layout == R.layout.w_phone_xl) dues(ctx, v, s, 3, 31, long = true)
        return v
    }

    private val FLOW = arrayOf(
        intArrayOf(R.id.w_f0, R.id.w_f0_in, R.id.w_f0_out, R.id.w_f0_lab), intArrayOf(R.id.w_f1, R.id.w_f1_in, R.id.w_f1_out, R.id.w_f1_lab),
        intArrayOf(R.id.w_f2, R.id.w_f2_in, R.id.w_f2_out, R.id.w_f2_lab), intArrayOf(R.id.w_f3, R.id.w_f3_in, R.id.w_f3_out, R.id.w_f3_lab),
        intArrayOf(R.id.w_f4, R.id.w_f4_in, R.id.w_f4_out, R.id.w_f4_lab), intArrayOf(R.id.w_f5, R.id.w_f5_in, R.id.w_f5_out, R.id.w_f5_lab),
    )
    private val CATS = arrayOf(
        intArrayOf(R.id.w_k0, R.id.w_k0_name, R.id.w_k0_amt, R.id.w_k0_bar, R.id.w_k0_sav), intArrayOf(R.id.w_k1, R.id.w_k1_name, R.id.w_k1_amt, R.id.w_k1_bar, R.id.w_k1_sav),
        intArrayOf(R.id.w_k2, R.id.w_k2_name, R.id.w_k2_amt, R.id.w_k2_bar, R.id.w_k2_sav), intArrayOf(R.id.w_k3, R.id.w_k3_name, R.id.w_k3_amt, R.id.w_k3_bar, R.id.w_k3_sav),
        intArrayOf(R.id.w_k4, R.id.w_k4_name, R.id.w_k4_amt, R.id.w_k4_bar, R.id.w_k4_sav),
    )

    private fun flowChart(ctx: Context, v: RemoteViews, s: Snap) {
        v.setTextViewText(R.id.w_six_k, L(s, "Seis meses", "Six months"))
        v.setTextViewText(R.id.w_leg_in, L(s, "Tengo", "Have"))
        v.setTextViewText(R.id.w_leg_out, L(s, "Gastaré", "Spending"))
        val peak = s.flow.maxOfOrNull { Math.max(it.inn, it.out) } ?: 0L
        for (i in 0 until 6) {
            val f = s.flow.getOrNull(i)
            val ids = FLOW[i]
            v.setProgressBar(ids[1], 1000, if (f == null) 0 else pct(f.inn, peak), false)
            v.setProgressBar(ids[2], 1000, if (f == null) 0 else pct(f.out, peak), false)
            v.setTextViewText(ids[3], f?.label ?: "")
            v.setTextColor(ids[3], ctx.getColor(if (i == 5) R.color.w_ink else R.color.w_muted))
            v.setOnClickPendingIntent(ids[0], FaroWidgets.openIntent(ctx, "stats"))
        }
    }

    internal fun panelV(ctx: Context, s: Snap, layout: Int): RemoteViews {
        val v = RemoteViews(ctx.packageName, layout)
        hero(ctx, v, s)
        v.setTextViewText(R.id.w_stamp, Fmt.clock(s.at, s.en))
        v.setTextViewText(R.id.w_rate_k, L(s, "Tasa", "Rate"))
        v.setTextViewText(R.id.w_rate, Fmt.rate(s.rateE4))
        v.setOnClickPendingIntent(R.id.w_rate_box, FaroWidgets.openIntent(ctx, "tools"))
        if (layout != R.layout.w_panel_m) {
            // US$100 in córdobas: 10 000 cents × rateE4 / 10 000 = rateE4 córdoba cents.
            v.setTextViewText(R.id.w_rate_ex, if (s.rateE4 > 0) "US$100 = " + Fmt.money(s.rateE4, "NIO") else "")
            val src = listOf(s.rateSrc.trim(), if (s.rateAsOf.length >= 10) Fmt.shortDay(s.rateAsOf, s.en) else "").filter { it.isNotEmpty() }.joinToString(" · ")
            v.setTextViewText(R.id.w_rate_sub, src)
        }
        v.setTextViewText(R.id.w_pay_lab, L(s, "Pagos", "Payments"))
        v.setTextViewText(R.id.w_pay, money(s, s.pay))
        // Faro's debt signal: the month's credit payments as a share of income (green / yellow / red by its own caps).
        val share = if (s.have > 0) Math.round(s.pay * 100.0 / s.have).toInt() else null
        v.setTextViewText(R.id.w_pay_pct, if (share == null || s.hide) "" else L(s, "$share% del ingreso", "$share% of income"))
        v.setTextColor(R.id.w_pay_pct, ctx.getColor(when (s.tone) { "warn" -> R.color.w_amber; "bad" -> R.color.w_bad; else -> R.color.w_muted }))
        v.setOnClickPendingIntent(R.id.w_pay_box, FaroWidgets.openIntent(ctx, "pagos"))
        // Six months: both bars share one scale (the biggest month), so heights compare across months.
        if (layout != R.layout.w_panel_m) flowChart(ctx, v, s)
        if (layout != R.layout.w_panel_m) {
            val xl = layout == R.layout.w_panel_xl
            v.setTextViewText(R.id.w_cats_k, if (xl) L(s, "Gastos por categoría", "Spending by category") else L(s, "Categorías", "Categories"))
            v.setTextViewText(R.id.w_cats_vs, L(s, "gris: mes pasado", "grey: last month"))
            for (i in 0 until 3) {
                val p = if (i < (if (xl) 3 else 2)) s.pockets.getOrNull(i) else null
                val ids = POCKETS[i]
                if (p == null) { v.setViewVisibility(ids[0], View.GONE); continue }
                v.setViewVisibility(ids[0], View.VISIBLE)
                v.setTextViewText(ids[1], p.name)
                v.setTextViewText(ids[2], money(s, p.amt))
                v.setOnClickPendingIntent(ids[0], FaroWidgets.openIntent(ctx, p.go))
            }
            val top = s.cats.maxOfOrNull { Math.max(it.amt, it.prev) } ?: 0L
            for (i in 0 until 5) {
                val c = if (i < (if (xl) 5 else 4)) s.cats.getOrNull(i) else null
                val ids = CATS[i]
                if (c == null) { v.setViewVisibility(ids[0], View.GONE); continue }
                v.setViewVisibility(ids[0], View.VISIBLE)
                v.setTextViewText(ids[1], c.name)
                v.setTextViewText(ids[2], money(s, c.amt))
                v.setViewVisibility(ids[3], if (c.save) View.GONE else View.VISIBLE)
                v.setViewVisibility(ids[4], if (c.save) View.VISIBLE else View.GONE)
                val bar = if (c.save) ids[4] else ids[3]
                v.setProgressBar(bar, 1000, pct(c.amt, top), false)
                v.setInt(bar, "setSecondaryProgress", pct(c.prev, top))
                v.setOnClickPendingIntent(ids[0], FaroWidgets.openIntent(ctx, c.go))
            }
            v.setViewVisibility(R.id.w_cats_none, if (s.cats.isEmpty()) View.VISIBLE else View.GONE)
            if (s.cats.isEmpty()) v.setTextViewText(R.id.w_cats_none, L(s, "Sin gastos este mes.", "No spending this month."))
        }
        v.setTextViewText(R.id.w_due_k, L(s, "Vence en 14 días", "Due in 14 days"))
        val total = dues(ctx, v, s, when (layout) { R.layout.w_panel_m -> 3; R.layout.w_panel_l -> 4; else -> 6 }, 14, long = layout == R.layout.w_panel_xl)
        v.setTextViewText(R.id.w_due_total, if (total > 0) money(s, total) else "")
        scale(ctx, v, s)
        v.setTextViewText(R.id.w_net, if (s.hide) "" else L(s, "Neto ", "Net ") + Fmt.money(s.owed - s.owe, s.cur))
        v.setViewVisibility(R.id.w_net, if (layout == R.layout.w_panel_m) View.GONE else View.VISIBLE)
        // The smallest panel keeps month, six months, dues and the scale; savings start at the larger sizes.
        if (layout != R.layout.w_panel_m) savings(ctx, v, s, panel = true)
        return v
    }
}

/* ---------- the three providers ---------- */

open class FaroWidgetBase : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, m: AppWidgetManager, ids: IntArray) {
        FaroWidgets.refreshAll(ctx)
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        WidgetCfg.forget(ctx, ids)
    }

    override fun onAppWidgetOptionsChanged(ctx: Context, m: AppWidgetManager, id: Int, options: Bundle) {
        FaroWidgets.refreshAll(ctx)
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        when (intent.action) {
            FaroWidgets.ACTION_TICK -> { FaroWidgets.refreshAll(ctx); FaroNotify.onTick(ctx) }
            Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_LOCALE_CHANGED -> FaroWidgets.refreshAll(ctx)
            else -> super.onReceive(ctx, intent)
        }
    }
}

/** "Faro · Mes": the phone widget (4×1 to 4×4). */
class PhoneWidget : FaroWidgetBase()

/** "Faro · Panel": the tablet dashboard (6×4 and up). */
class PanelWidget : FaroWidgetBase()

/** "Faro · Vencimientos": the dues on their own (4×2 by default, resizable). */
class DuesWidget : FaroWidgetBase()
