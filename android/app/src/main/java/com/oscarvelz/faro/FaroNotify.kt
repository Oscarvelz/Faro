package com.oscarvelz.faro

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Faro's phone notifications (2026-11-07, Muse): the important reports Oscar asked for, posted by the shell itself.
 *
 * Everything is computed from the same privacy-safe snapshot the widgets use (FaroWidgets "faro-widget" prefs, built by
 * src/lib/faro/widget.ts): no network, no account, no people's names, no notes — and when the snapshot hides amounts
 * (widget privacy), the notifications hide them too. Three kinds:
 *
 * - Due payments: a cuota or card whose date is overdue or at most 2 days away. Posted once per due (dedupe key
 *   "due|<name>|<on>"); re-checked when a new snapshot arrives and at the widgets' midnight tick, so "due today"
 *   lands even if Faro is not opened that day (as fresh as the last snapshot, exactly like the widgets).
 * - Spending pace: once a week at most, from day 5 on. Since 1.3.248 the snapshot carries the learned pattern's
 *   judgement (the `pace` block, computed by the page with patron.ts — the web computes, the shell renders): with
 *   the pattern ready it posts only when the verdict is "over" against his own pattern (a body that names the
 *   pattern and its figures), or when spending has already passed the income — a fact, never a projection, in
 *   the plain body; while the pattern is learning there is no pace post at all, except that same fact. A snapshot
 *   without the block (a page from before 1.3.248) keeps the original straight-line judgement, verbatim.
 *   Evaluated only on a fresh snapshot, never at the tick (stale data, no nagging).
 * - Month close: the day the calendar turns, the finished month's report (in · out · left) from the snapshot's
 *   six-month flow. Posted once per month ("close|<yyyy-MM>"); a snapshot too old to contain that month stays silent.
 *
 * Taps reuse the widgets' route (action faro.WIDGET + "go", taken by the page with FaroNative.takeOpen()).
 * Android 13+ needs POST_NOTIFICATIONS: MainActivity asks once; areNotificationsEnabled() gates every post anyway.
 * Reboot drops the midnight alarm until the next snapshot or widget update re-arms it (the widgets' own limit too).
 */
object FaroNotify {
    private const val PREFS = "faro-notify"
    private const val CHANNEL = "faro-avisos"
    private const val ID_PACE = 9001
    private const val WEEK_MS = 7L * 86_400_000L

    /** A fresh snapshot arrived (FaroWidgets.save): re-check all three kinds and (re)arm the daily tick. */
    fun onSnapshot(ctx: Context) {
        runCatching {
            FaroWidgets.scheduleMidnight(ctx)
            val s = FaroWidgets.load(ctx) ?: return
            checkDues(ctx, s)
            checkClose(ctx, s)
            checkPace(ctx, s)
        }
    }

    /** The widgets' midnight tick: dates moved, so dues and the month close are re-checked (pace is not). */
    fun onTick(ctx: Context) {
        runCatching {
            val s = FaroWidgets.load(ctx) ?: return
            checkDues(ctx, s)
            checkClose(ctx, s)
        }
    }

    /* ---------- the three kinds ---------- */

    private fun checkDues(ctx: Context, s: Snap) {
        if (!enabled(ctx) || !s.notify || !s.notifyDues) return
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        for (d in s.dues) {
            val days = Fmt.daysLeft(d.on) ?: continue
            if (days > 2) continue
            // 1.3.408: la llave lleva la ETAPA — antes «due|nombre|fecha» era un
            // booleano para siempre: un pago avisado como «Vence pronto» jamás
            // volvía a avisar al caer en vencido, que es cuando más importa.
            // Cada etapa (pronto · hoy · vencido) avisa una vez, la suya.
            val stage = when { days < 0 -> "over"; days == 0 -> "today"; else -> "soon" }
            val key = "due|${d.name}|${d.on}|$stage"
            if (prefs.contains(key)) continue
            val amt = if (s.hide) null else d.amt
            val body = listOf(d.name, Fmt.daysWord(days, s.en), amt?.let { Fmt.money(it, s.cur) } ?: "")
                .filter { it.isNotEmpty() }.joinToString(" · ")
            val title = when {
                days < 0 -> L(s, "Faro · Pago vencido", "Faro · Payment overdue")
                days == 0 -> L(s, "Faro · Vence hoy", "Faro · Due today")
                days == 1 -> L(s, "Faro · Vence mañana", "Faro · Due tomorrow")
                else -> L(s, "Faro · Vence pronto", "Faro · Due soon")
            }
            post(ctx, key.hashCode(), title, body, d.go)
            prefs.edit().putBoolean(key, true).apply()
        }
    }

    private fun checkPace(ctx: Context, s: Snap) {
        if (!enabled(ctx) || !s.notify || !s.notifyPace) return
        if (s.have <= 0 || s.month != monthKey(0)) return
        val now = Calendar.getInstance()
        val elapsed = now.get(Calendar.DAY_OF_MONTH)
        if (elapsed < 5) return
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        // Ola 14 (Asesor A3): el hecho «ya gastaste» se juzga con el GASTO
        // verdadero (spent = Σ isSpendLine de la página), no con la suma
        // ancha: apartar mucho cruzaba el ingreso en la foto y el aviso
        // afirmaba «Ya gastaste C$30,300» con el gasto real en 41%. Cuando
        // lo que cruza es el apartado (la ancha pasa, el gasto no), el aviso
        // sigue sonando — como hoy — pero nombra el apartado como lo que
        // es: guardar, no gastar (espejo de la cura de BR12-3 en la app).
        val bad = s.spent >= s.have
        val wideCross = s.spend >= s.have
        val pace = s.pace
        if (pace == null) {
            // Respaldo exacto (degradación): una foto sin el bloque del patrón — una
            // página anterior a 1.3.248 — se juzga con la recta de siempre, palabra
            // por palabra, con su misma cadencia semanal y su mismo día de arranque.
            // Ola 14: la recta también proyecta desde el gasto verdadero.
            val dim = now.getActualMaximum(Calendar.DAY_OF_MONTH)
            val projected = s.spent * dim / elapsed
            if (!bad && !wideCross && projected <= s.have) return
            if (System.currentTimeMillis() - prefs.getLong("paceAt", 0L) < WEEK_MS) return
            val body = when {
                bad && !s.hide -> L(s, "Ya gastaste ${Fmt.money(s.spent, s.cur)} de tu ingreso de ${Fmt.money(s.have, s.cur)} este mes.",
                                       "You have already spent ${Fmt.money(s.spent, s.cur)} of this month's income of ${Fmt.money(s.have, s.cur)}.")
                bad -> L(s, "Ya pasaste tu ingreso de este mes.", "You have already passed this month's income.")
                wideCross && !s.hide -> L(s, "Este mes apartaste ${Fmt.money(s.savedOut, s.cur)}: con eso, lo que salió (${Fmt.money(s.spend, s.cur)}) pasa tu ingreso de ${Fmt.money(s.have, s.cur)}, pero tu gasto va en ${Fmt.money(s.spent, s.cur)}. Eso es guardar, no gastar.",
                                       "This month you set aside ${Fmt.money(s.savedOut, s.cur)}: with it, what went out (${Fmt.money(s.spend, s.cur)}) passes your income of ${Fmt.money(s.have, s.cur)}, but your spending stands at ${Fmt.money(s.spent, s.cur)}. That is saving, not spending.")
                wideCross -> L(s, "Lo que salió este mes pasa tu ingreso, pero lo que cruza es apartado, no gasto.", "What went out this month passes your income, but what crosses is set aside, not spent.")
                !s.hide -> L(s, "Vas en ${Fmt.money(s.spent, s.cur)} (${s.usedPct ?: 0}%) y el mes va en ${elapsed * 100 / dim}%. A este ritmo cerrarías en ${Fmt.money(projected, s.cur)}, sobre tu ingreso de ${Fmt.money(s.have, s.cur)}.",
                             "You are at ${Fmt.money(s.spent, s.cur)} (${s.usedPct ?: 0}%) with the month ${elapsed * 100 / dim}% through. At this pace you would close at ${Fmt.money(projected, s.cur)}, over your income of ${Fmt.money(s.have, s.cur)}.")
                else -> L(s, "Tu ritmo de gasto proyecta pasar tu ingreso este mes.", "Your spending pace is on track to pass this month's income.")
            }
            post(ctx, ID_PACE, L(s, "Faro · Ritmo de gasto", "Faro · Spending pace"), body, "desk")
            prefs.edit().putLong("paceAt", System.currentTimeMillis()).apply()
            return
        }
        // Con el bloque (1.3.248) manda el patrón, nunca la recta. Listo: solo suena
        // si el veredicto es «over» contra su propio patrón, o si el gasto ya pasó el
        // ingreso (un hecho, con su cuerpo llano y sin cifra proyectada). Aprendiendo:
        // silencio de ritmo — solo ese mismo hecho puede hablar. Ola 14: el hecho es
        // el gasto verdadero; el cruce de la suma ancha habla nombrando el apartado.
        if (pace.status == "ready") {
            if (!bad && !wideCross && pace.verdict != "over") return
        } else {
            if (!bad && !wideCross) return
        }
        if (System.currentTimeMillis() - prefs.getLong("paceAt", 0L) < WEEK_MS) return
        val body = when {
            bad && !s.hide -> L(s, "Ya gastaste ${Fmt.money(s.spent, s.cur)} de tu ingreso de ${Fmt.money(s.have, s.cur)} este mes.",
                                   "You have already spent ${Fmt.money(s.spent, s.cur)} of this month's income of ${Fmt.money(s.have, s.cur)}.")
            bad -> L(s, "Ya pasaste tu ingreso de este mes.", "You have already passed this month's income.")
            wideCross && !s.hide -> L(s, "Este mes apartaste ${Fmt.money(s.savedOut, s.cur)}: con eso, lo que salió (${Fmt.money(s.spend, s.cur)}) pasa tu ingreso de ${Fmt.money(s.have, s.cur)}, pero tu gasto va en ${Fmt.money(s.spent, s.cur)}. Eso es guardar, no gastar.",
                                       "This month you set aside ${Fmt.money(s.savedOut, s.cur)}: with it, what went out (${Fmt.money(s.spend, s.cur)}) passes your income of ${Fmt.money(s.have, s.cur)}, but your spending stands at ${Fmt.money(s.spent, s.cur)}. That is saving, not spending.")
            wideCross -> L(s, "Lo que salió este mes pasa tu ingreso, pero lo que cruza es apartado, no gasto.", "What went out this month passes your income, but what crosses is set aside, not spent.")
            !s.hide -> {
                val close = if (pace.projected > pace.income)
                    L(s, " A este ritmo cerrarías en ${Fmt.money(pace.projected, s.cur)}, sobre tu ingreso de ${Fmt.money(pace.income, s.cur)}.",
                         " At this pace you would close at ${Fmt.money(pace.projected, s.cur)}, over your income of ${Fmt.money(pace.income, s.cur)}.")
                else
                    L(s, " Aun así cerrarías en ${Fmt.money(pace.projected, s.cur)}, dentro de tu ingreso de ${Fmt.money(pace.income, s.cur)}.",
                         " You would still close at ${Fmt.money(pace.projected, s.cur)}, within your income of ${Fmt.money(pace.income, s.cur)}.")
                L(s, "Vas en ${Fmt.money(pace.spent, s.cur)} y para esta fecha tu patrón suele llevar unos ${Fmt.money(pace.expected, s.cur)}: vas sobre tu ritmo normal.$close",
                     "You are at ${Fmt.money(pace.spent, s.cur)} and by this date your pattern usually has about ${Fmt.money(pace.expected, s.cur)} out: you are running above your normal pace.$close")
            }
            else -> L(s, "Tu ritmo va por encima de tu patrón este mes.", "Your pace is running above your pattern this month.")
        }
        post(ctx, ID_PACE, L(s, "Faro · Ritmo de gasto", "Faro · Spending pace"), body, "desk")
        prefs.edit().putLong("paceAt", System.currentTimeMillis()).apply()
    }

    private fun checkClose(ctx: Context, s: Snap) {
        if (!enabled(ctx) || !s.notify || !s.notifyClose) return
        // 1.3.408: se juzga TODO mes cerrado que la foto traiga y aún no se
        // haya reportado, del más viejo al más nuevo — antes solo se miraba
        // el mes anterior contra la foto de hoy: saltarse un cambio de mes
        // sin abrir Faro perdía ese cierre para siempre.
        val now = monthKey(0)
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        for (f in s.flow.filter { it.key < now }.sortedBy { it.key }) {
            val key = "close|${f.key}"
            if (prefs.contains(key)) continue
            val name = monthName(f.key, s.en)
            val left = f.inn - f.out
            val body = if (s.hide) L(s, "Tu reporte de $name está listo en Estudio.", "Your $name report is ready in Stats.")
            else L(s, "Entró ${Fmt.money(f.inn, s.cur)} · salió ${Fmt.money(f.out, s.cur)} · quedó ${Fmt.money(left, s.cur)}",
                      "In ${Fmt.money(f.inn, s.cur)} · out ${Fmt.money(f.out, s.cur)} · left ${Fmt.money(left, s.cur)}")
            post(ctx, key.hashCode(), L(s, "Faro · Cierre de $name", "Faro · $name close"), body, "stats")
            prefs.edit().putBoolean(key, true).apply()
        }
    }

    /* ---------- plumbing ---------- */

    private fun enabled(ctx: Context): Boolean =
        runCatching { NotificationManagerCompat.from(ctx).areNotificationsEnabled() }.getOrDefault(false)

    private fun post(ctx: Context, id: Int, title: String, body: String, go: String) {
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Faro · Avisos", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Vencimientos, ritmo de gasto y cierre de mes / Due payments, spending pace and month close"
            })
        }
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(FaroWidgets.openIntent(ctx, go))
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(ctx).notify(id, n) }
    }

    private fun L(s: Snap, es: String, en: String) = if (s.en) en else es

    /** "yyyy-MM" of the current month shifted by `d` months. */
    private fun monthKey(d: Int): String {
        val c = Calendar.getInstance()
        c.add(Calendar.MONTH, d)
        return String.format(Locale.US, "%04d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1)
    }

    private fun monthName(key: String, en: Boolean): String {
        val c = Calendar.getInstance()
        c.clear()
        c.set(key.substring(0, 4).toInt(), key.substring(5, 7).toInt() - 1, 15)
        val name = SimpleDateFormat("MMMM", if (en) Locale.US else Locale("es")).format(c.time)
        return name.replaceFirstChar { it.uppercase() }
    }
}
