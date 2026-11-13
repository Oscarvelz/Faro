package com.oscarvelz.faro

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Outline
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.graphics.drawable.StateListDrawable
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal
import java.math.RoundingMode
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Apuntes rápidos del widget (línea de ventanas, 2026-11-12): los botones + / − del widget ya no
 * abren la app — levantan ESTA tarjeta, la tarjeta rápida del propio shell (como la pantalla de
 * opciones de los widgets, es una pantalla del shell, no la app: sin WebView, sin desbloqueo).
 * El usuario escribe el monto, guarda, y vuelve a su pantalla de inicio; el apunte queda en la
 * cola privada del shell y la página lo archiva en el libro la próxima vez que Faro está abierto
 * y desbloqueado (FaroNative.takeQuickEntries → lib/faro/quickadd.ts), por el camino normal.
 *
 * La tarjeta no muestra NADA del libro: solo el monto que el propio usuario está escribiendo.
 * La moneda es la de la foto del widget (la moneda de vista); el día, el día local del apunte.
 * El id del apunte será el id de su línea: recoger dos veces nunca duplica.
 */
object QuickAdd {
    private const val PREFS = "faro-quick"
    private const val KEY = "queue"
    const val EXTRA_SIGN = "sign"
    /** El mismo techo que impone lib/faro/quickadd.ts al archivar: $999,999,999.99. */
    const val MAX_MINOR = 99_999_999_999L

    fun enqueue(ctx: Context, entry: JSONObject) {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = runCatching { JSONArray(prefs.getString(KEY, "[]") ?: "[]") }.getOrDefault(JSONArray())
        arr.put(entry)
        prefs.edit().putString(KEY, arr.toString()).apply()
    }

    /** La última casa usada por signo («cat|sub»), para preseleccionarla la próxima vez. */
    fun lastHome(ctx: Context, sign: String): String =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("last_$sign", "") ?: ""

    fun rememberHome(ctx: Context, sign: String, home: QHome) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("last_$sign", "${home.c}|${home.s}").apply()
    }

    /** La cola entera como texto ("" si vacía); al entregarla queda vacía. */
    fun drain(ctx: Context): String {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY, "") ?: ""
        if (raw.isNotBlank()) prefs.edit().remove(KEY).apply()
        return raw
    }

    /** La cola como texto SIN vaciarla (entrega en dos fases, 1.3.234): la página primero
     *  mira, archiva en el libro y después confirma con ack los ids que archivó. */
    fun peek(ctx: Context): String =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "") ?: ""

    /** Quita de la cola SOLO los ids confirmados (un JSON array de ids); todo lo demás —
     *  incluido lo que la página no pudo archivar — se queda esperando. Nada se pierde. */
    fun ack(ctx: Context, idsJson: String) {
        val ids = runCatching {
            val a = JSONArray(idsJson)
            (0 until a.length()).mapNotNull { a.optString(it).takeIf { s -> s.isNotEmpty() } }.toSet()
        }.getOrDefault(emptySet())
        if (ids.isEmpty()) return
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
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

class QuickAddActivity : Activity() {
    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    // ——— 1.3.235 «El cristal»: el acabado de la tarjeta y de sus opciones. Solo pintura —
    // fondos, marcos y luz; ni un id, ni un listener, ni una medida de contenido cambia. ———

    private fun withAlpha(c: Int, a: Int): Int = Color.argb(a, Color.red(c), Color.green(c), Color.blue(c))

    /** El cuerpo de cristal de la tarjeta: degradado propio de arriba (luz) a abajo, marco de
     *  luz al 18 %, brillo diagonal que muere a mitad de camino y la caída de luz (claro arriba,
     *  asiento oscuro abajo). La tarjeta es opaca — el cristal aquí es luz, no transparencia. */
    private fun glassCardBg(): LayerDrawable {
        val r = dp(18).toFloat()
        val body = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(Color.rgb(36, 47, 59), Color.rgb(22, 30, 39), Color.rgb(13, 19, 25))).apply {
            cornerRadius = r; setStroke(dp(1), Color.argb(46, 255, 255, 255))
        }
        val brillo = GradientDrawable(GradientDrawable.Orientation.TL_BR,
            intArrayOf(Color.argb(20, 255, 255, 255), Color.TRANSPARENT, Color.TRANSPARENT)).apply { cornerRadius = r }
        val fall = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(Color.argb(48, 255, 255, 255), Color.TRANSPARENT, Color.argb(51, 0, 0, 0))).apply { cornerRadius = r }
        return LayerDrawable(arrayOf(body, brillo, fall))
    }

    /** La tarjeta dentro de un marco transparente con aire: su sombra real (elevación con el
     *  contorno redondeado declarado) necesita ese aire dentro de la ventana para dibujarse. */
    private fun wrapCard(card: View): FrameLayout {
        card.elevation = dp(18).toFloat()
        card.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View, outline: Outline) {
                outline.setRoundRect(0, 0, view.width, view.height, dp(18).toFloat())
            }
        }
        card.clipToOutline = true
        return FrameLayout(this).apply {
            setPadding(dp(20), dp(20), dp(20), dp(20))
            addView(card)
        }
    }

    /** Los botones de la tarjeta como fichas de cristal; Guardar lleva el color del signo. */
    private fun chipBg(fill: Int, stroke: Int): GradientDrawable = GradientDrawable().apply {
        setColor(fill); cornerRadius = dp(12).toFloat(); setStroke(dp(1), stroke)
    }

    /** El cristal de una opción de «¿Dónde va?», en el color c (el del signo; blanco para
     *  «Sin categoría»): en reposo, un susurro de c y su marco al 22 %; elegida, el marco casi
     *  entero, el lavado doblado y la banda de luz de c al borde de abajo — la gramática de
     *  selección de la casa, a escala de diálogo. */
    private fun rowBg(c: Int, checked: Boolean): LayerDrawable {
        val r = dp(12).toFloat()
        return if (!checked) {
            val under = GradientDrawable().apply { setColor(Color.argb(8, 255, 255, 255)); cornerRadius = r }
            val wash = GradientDrawable().apply {
                setColor(withAlpha(c, 15)); cornerRadius = r; setStroke(dp(1), withAlpha(c, 56))
            }
            LayerDrawable(arrayOf(under, wash))
        } else {
            val wash = GradientDrawable().apply {
                setColor(withAlpha(c, 38)); cornerRadius = r; setStroke(dp(1), withAlpha(c, 204))
            }
            val band = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.TRANSPARENT, Color.TRANSPARENT, withAlpha(c, 140))).apply { cornerRadius = r }
            LayerDrawable(arrayOf(wash, band))
        }
    }

    private fun rowSelector(c: Int): StateListDrawable = StateListDrawable().apply {
        addState(intArrayOf(android.R.attr.state_checked), rowBg(c, true))
        addState(intArrayOf(), rowBg(c, false))
    }

    private fun ringTint(c: Int): ColorStateList = ColorStateList(
        arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
        intArrayOf(c, Color.argb(92, 255, 255, 255)))

    override fun onCreate(saved: Bundle?) {
        super.onCreate(saved)
        val sign = intent.getStringExtra(QuickAdd.EXTRA_SIGN) ?: "out"
        val snap = FaroWidgets.load(this)
        val en = snap?.en ?: false
        val accent = if (sign == "in") Color.rgb(66, 190, 235) else Color.rgb(232, 138, 30)

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            minimumWidth = dp(288)
            setPadding(dp(22), dp(20), dp(22), dp(20))
            background = glassCardBg()
        }

        if (snap == null) {
            // Sin foto todavía no hay moneda de vista ni idioma fiables: el camino honesto es el de antes.
            card.addView(TextView(this).apply {
                text = "Abre Faro una vez para activar los apuntes rápidos."
                textSize = 16f
                setTextColor(Color.rgb(232, 236, 240))
            })
            card.addView(Button(this).apply {
                text = "Abrir Faro"
                background = chipBg(Color.argb(20, 255, 255, 255), Color.argb(46, 255, 255, 255))
                setTextColor(Color.rgb(232, 236, 240))
                setOnClickListener {
                    startActivity(Intent(this@QuickAddActivity, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    finish()
                }
            }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.END
                topMargin = dp(16)
            })
            setContentView(wrapCard(card))
            return
        }

        card.addView(TextView(this).apply {
            text = when {
                sign == "in" -> if (en) "+ New income" else "+ Anotar ingreso"
                else -> if (en) "− New expense" else "− Anotar gasto"
            }
            textSize = 20f
            setTextColor(accent)
        })

        val amount = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            hint = "0.00"
            textSize = 32f
            setTextColor(Color.rgb(232, 236, 240))
            setHintTextColor(Color.rgb(120, 131, 154))
            isSingleLine = true
            gravity = Gravity.END
        }
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(14), 0, 0)
        }
        row.addView(TextView(this).apply {
            text = if (snap.cur == "NIO") "C$" else "$"
            textSize = 24f
            setTextColor(Color.rgb(154, 163, 173))
            setPadding(0, 0, dp(10), 0)
        })
        row.addView(amount, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        card.addView(row)

        card.addView(TextView(this).apply {
            text = if (en) "Joins your book when you open Faro." else "Entra a tu libro al abrir Faro."
            textSize = 13f
            setTextColor(Color.rgb(154, 163, 173))
            setPadding(0, dp(10), 0, 0)
        })

        // Foto vieja: una foto escrita por una página anterior a los apuntes con casa no trae
        // las casas (Snap.stale) y la tarjeta no puede inventarlas — el apunte igual se guarda
        // (cae sin categoría), pero la tarjeta lo DICE. Desde 1.3.235 la página renueva la foto
        // en CADA primer plano del libro real, cambie algo o no, así que esta línea solo puede
        // quedar cuando el libro real no ha estado en primer plano ni una vez desde que existen
        // las casas (las sesiones de ejemplo no tocan la foto real, por la propia ley del modo
        // de ejemplo; al salir de él, el montaje renueva la foto al instante).
        if (snap.stale) {
            card.addView(TextView(this).apply {
                text = if (en) "Open Faro once to enable your categories." else "Abre Faro una vez para activar tus categorías."
                textSize = 13f
                setTextColor(Color.rgb(232, 184, 96))
                setPadding(0, dp(8), 0, 0)
            })
        }

        // La casa del apunte (2026-11-12): las que la foto trae para este signo — las que ya lo
        // reciben, en orden de uso. Sin casas (libro nuevo) la tarjeta queda como nació: el
        // apunte cae sin categoría. La última casa usada queda preseleccionada; si nunca se
        // eligió una, «Sin categoría» manda hasta que el usuario opte por una.
        val homes = if (sign == "in") snap.qhIn else snap.qhOut
        var group: RadioGroup? = null
        if (homes.isNotEmpty()) {
            card.addView(TextView(this).apply {
                text = if (en) "Where does it go?" else "¿Dónde va?"
                textSize = 14f
                setTextColor(Color.rgb(154, 163, 173))
                setPadding(0, dp(16), 0, dp(4))
            })
            val g = RadioGroup(this).apply { orientation = RadioGroup.VERTICAL }
            val last = QuickAdd.lastHome(this, sign)
            homes.forEachIndexed { i, h ->
                g.addView(RadioButton(this).apply {
                    id = 1000 + i
                    text = h.n
                    textSize = 16f
                    setTextColor(Color.rgb(232, 236, 240))
                    background = rowSelector(accent)
                    buttonTintList = ringTint(accent)
                    setPadding(dp(12), dp(9), dp(10), dp(9))
                }, RadioGroup.LayoutParams(
                    RadioGroup.LayoutParams.MATCH_PARENT, RadioGroup.LayoutParams.WRAP_CONTENT
                ).apply { if (i > 0) topMargin = dp(5) })
            }
            g.addView(RadioButton(this).apply {
                id = 1000 + homes.size
                text = if (en) "No category (quick note)" else "Sin categoría (apunte rápido)"
                textSize = 16f
                setTextColor(Color.rgb(154, 163, 173))
                background = rowSelector(Color.WHITE)
                buttonTintList = ringTint(Color.WHITE)
                setPadding(dp(12), dp(9), dp(10), dp(9))
            }, RadioGroup.LayoutParams(
                RadioGroup.LayoutParams.MATCH_PARENT, RadioGroup.LayoutParams.WRAP_CONTENT
            ).apply { if (homes.isNotEmpty()) topMargin = dp(5) })
            val lastIdx = homes.indexOfFirst { "${it.c}|${it.s}" == last }
            g.check(1000 + if (lastIdx >= 0) lastIdx else homes.size)
            group = g
            card.addView(ScrollView(this).apply { addView(g) },
                LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(176)))
        }

        val buttons = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
            setPadding(0, dp(18), 0, 0)
        }
        buttons.addView(Button(this).apply {
            text = if (en) "Cancel" else "Cancelar"
            background = chipBg(Color.argb(20, 255, 255, 255), Color.argb(46, 255, 255, 255))
            setTextColor(Color.rgb(232, 236, 240))
            setOnClickListener { finish() }
        })
        buttons.addView(Button(this).apply {
            text = if (en) "Save" else "Guardar"
            background = chipBg(withAlpha(accent, 51), withAlpha(accent, 153))
            setTextColor(Color.WHITE)
            setOnClickListener {
                val minor = parseMinor(amount.text.toString())
                if (minor == null) {
                    amount.error = if (en) "Enter an amount" else "Escribe un monto"
                    return@setOnClickListener
                }
                val chosenIdx = (group?.checkedRadioButtonId ?: -1) - 1000
                val home = if (chosenIdx in homes.indices) homes[chosenIdx] else null
                val entry = JSONObject()
                    .put("id", UUID.randomUUID().toString())
                    .put("sign", sign)
                    .put("minor", minor)
                    .put("cur", snap.cur)
                    .put("day", SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
                    .put("at", java.time.Instant.now().toString())
                    .put("cat", home?.c ?: "")
                    .put("sub", home?.s ?: "")
                QuickAdd.enqueue(this@QuickAddActivity, entry)
                if (home != null) QuickAdd.rememberHome(this@QuickAddActivity, sign, home)
                Toast.makeText(this@QuickAddActivity, if (en) "Noted ✓" else "Anotado ✓", Toast.LENGTH_SHORT).show()
                finish()
            }
        })
        card.addView(buttons)
        setContentView(wrapCard(card))
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE)
        amount.requestFocus()
    }

    /** "12.3" → 1230 centavos; null si no es un monto válido dentro del techo. */
    private fun parseMinor(text: String): Long? {
        val t = text.trim().replace(",", "")
        if (t.isEmpty()) return null
        return runCatching {
            val minor = BigDecimal(t).movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact()
            if (minor in 1..QuickAdd.MAX_MINOR) minor else null
        }.getOrNull()
    }
}
