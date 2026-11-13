package com.oscarvelz.faro

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.Drawable
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
 * La moneda abre en la de vista de la foto (o la última usada) y desde 1.3.241 el signo se
 * toca para alternarla entre las monedas del libro; el día, el día local del apunte.
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

    /** La última moneda usada por signo al alternar el signo de la tarjeta (1.3.241),
     *  para abrir la próxima vez en la misma moneda. */
    fun lastCur(ctx: Context, sign: String): String =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("lastcur_$sign", "") ?: ""

    fun rememberCur(ctx: Context, sign: String, cur: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("lastcur_$sign", cur).apply()
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

    // ——— 1.3.237 «Señal»: el acabado que Oscar eligió entre los tres candidatos del estudio
    // (faro-glass2-study). Placa cálida prensada: negro cálido PLANO, filete topo sólido,
    // una sola lengüeta del color de signo, el monto sentado en su placa hundida y Guardar
    // SÓLIDO en el color del signo. Nada de degradados multiparada, nada de alfa por debajo
    // del 15 % portando significado, nada de texto de botón de fábrica: todo sólido, para
    // que en el teléfono se vea exactamente como en la vista previa que Oscar aprobó.
    // Solo pintura — ni un id, ni un listener, ni una regla de función cambia. ———

    private val cBody = Color.rgb(0x16, 0x12, 0x0F)       // el cuerpo: negro cálido plano
    private val cKeyline = Color.rgb(0x3A, 0x33, 0x2B)    // el filete topo, siempre visible
    private val cPlate = Color.rgb(0x0D, 0x0A, 0x08)      // la placa hundida del monto
    private val cPlateLine = Color.rgb(0x33, 0x2C, 0x24)  // el trazo de la placa
    private val cRow = Color.rgb(0x1E, 0x19, 0x15)        // las filas del selector
    private val cRowLine = Color.rgb(0x2E, 0x28, 0x22)    // su trazo en reposo
    private val cRadioLine = Color.rgb(0x6B, 0x5F, 0x52)  // el cuadrado del radio en reposo
    private val cCancel = Color.rgb(0x24, 0x1E, 0x19)     // Cancelar: sólido cálido
    private val cCancelLine = Color.rgb(0x45, 0x3B, 0x31) // su trazo
    private val cCancelText = Color.rgb(0xED, 0xE4, 0xD3)
    private val cInk = Color.rgb(0xFF, 0xF8, 0xEC)        // la cifra
    private val cText = Color.rgb(0xF2, 0xEA, 0xD9)       // el texto de las filas
    private val cLabel = Color.rgb(0xCF, 0xC4, 0xB0)      // rótulos (Rajdhani, con tracking)
    private val cNote = Color.rgb(0xD8, 0xCE, 0xBE)       // la nota bajo el monto
    private val cHint = Color.rgb(0x7A, 0x6E, 0x5E)       // el «0.00» antes de escribir
    private val cOnSign = Color.rgb(0x11, 0x10, 0x0E)     // el texto sobre el color de signo
    private val cSignal = Color.rgb(0xFC, 0xEE, 0x0A)     // el amarillo señal, una sola vez

    /** Rajdhani viaja con el shell (assets/fonts, la misma fuente que la app web se sirve a
     *  sí misma): la voz de Faro también en la tarjeta — rótulos, título, cifra y botones. */
    private val rajdhani500: Typeface by lazy { Typeface.createFromAsset(assets, "fonts/rajdhani-500.ttf") }
    private val rajdhani600: Typeface by lazy { Typeface.createFromAsset(assets, "fonts/rajdhani-600.ttf") }
    private val rajdhani700: Typeface by lazy { Typeface.createFromAsset(assets, "fonts/rajdhani-700.ttf") }

    private fun darken(c: Int, f: Double): Int = Color.rgb(
        (Color.red(c) * f).toInt(), (Color.green(c) * f).toInt(), (Color.blue(c) * f).toInt())

    private fun solid(c: Int, rDp: Int, strokeDp: Int = 0, stroke: Int = 0): GradientDrawable =
        GradientDrawable().apply {
            setColor(c); cornerRadius = dp(rDp).toFloat()
            if (strokeDp > 0) setStroke(dp(strokeDp), stroke)
        }

    /** El cuerpo de la tarjeta: tres anillos sólidos concéntricos — negro fuera, filete topo,
     *  cuerpo cálido — cada uno con SU radio (el de fuera menos su anillo), para que ninguna
     *  esquina engorde. Sin degradado: sin bandas en OLED. */
    private fun senalCardBg(): LayerDrawable {
        val outer = solid(Color.BLACK, 12)
        val key = solid(cKeyline, 11)
        val body = solid(cBody, 10)
        return LayerDrawable(arrayOf(outer, key, body)).apply {
            paddingMode = LayerDrawable.PADDING_MODE_STACK
            setLayerInset(1, dp(1), dp(1), dp(1), dp(1))
            setLayerInset(2, dp(2), dp(2), dp(2), dp(2))
        }
    }

    /** La placa del monto: superficie hundida propia, radio 6 (la mitad del de la tarjeta —
     *  la regla de radios anidados), trazo cálido. La cifra vive DENTRO de algo. */
    private fun plateBg(): GradientDrawable = solid(cPlate, 6, 1, cPlateLine)

    /** Una fila del selector: en reposo, plana con su trazo; marcada, cambian TRES canales a
     *  la vez — trazo de 2dp del color de signo, barra izquierda de 4dp del mismo color
     *  (pegada al borde, altura entera, esquinas de la izquierda redondeadas como la fila) y
     *  el cuadrado del radio relleno (ver radioSquare). */
    private fun rowBg(c: Int, checked: Boolean): Drawable {
        if (!checked) return solid(cRow, 6, 1, cRowLine)
        val base = solid(cRow, 6, 2, c)
        val bar = GradientDrawable().apply {
            setColor(c)
            cornerRadii = floatArrayOf(
                dp(6).toFloat(), dp(6).toFloat(), 0f, 0f, 0f, 0f, dp(6).toFloat(), dp(6).toFloat())
        }
        return LayerDrawable(arrayOf(base, bar)).apply {
            paddingMode = LayerDrawable.PADDING_MODE_STACK
            setLayerGravity(1, Gravity.FILL_VERTICAL or Gravity.START)
            setLayerWidth(1, dp(4))
        }
    }

    private fun rowSelector(c: Int): StateListDrawable = StateListDrawable().apply {
        addState(intArrayOf(android.R.attr.state_checked), rowBg(c, true))
        addState(intArrayOf(), rowBg(c, false))
    }

    /** El radio CUADRADO de Señal (18dp, radio 2): en reposo solo su trazo topo; marcado, el
     *  cuadrado se llena del color de signo con su centro negro de 8dp — el tercer canal. */
    private fun radioSquare(c: Int): StateListDrawable {
        val off = GradientDrawable().apply {
            cornerRadius = dp(2).toFloat(); setStroke(dp(2), cRadioLine); setSize(dp(18), dp(18))
        }
        val fill = solid(c, 2).apply { setSize(dp(18), dp(18)) }
        val core = solid(cOnSign, 0).apply { setSize(dp(8), dp(8)) }
        val on = LayerDrawable(arrayOf(fill, core)).apply {
            paddingMode = LayerDrawable.PADDING_MODE_STACK
            setLayerInset(1, dp(5), dp(5), dp(5), dp(5))
        }
        return StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_checked), insetSquare(on))
            addState(intArrayOf(), insetSquare(off))
        }
    }

    /** El cuadrado dentro de su lienzo (1.3.243, defecto 5 del censo): el botón de un
     *  CompoundButton se pinta al ras del borde izquierdo de la vista — el padding de la
     *  fila no lo mueve — así que el cuadrado caía en 0dp y se tragaba la barra de 4dp.
     *  Ahora viaja dentro de una capa de 32dp de ancho, remetido 14dp desde la izquierda
     *  (la medida del espécimen): pinta en su sitio, la barra queda visible al borde, y
     *  como el texto se separa según el ancho intrínseco del dibujo, el texto cae en los
     *  44dp del espécimen (14 + 18 + los 12 de separación) sin tocar ningún layout. */
    private fun insetSquare(d: Drawable): Drawable = LayerDrawable(arrayOf(d)).apply {
        setLayerInset(0, dp(14), 0, 0, 0)
    }

    /** La ficha del signo de moneda (1.3.241): el signo es un blanco de toque — tocarlo
     *  alterna la moneda del apunte entre las que el libro conoce. Su acabado es el de la
     *  placa (superficie hundida, trazo cálido) con el tacto de las fichas: al pulsar, el
     *  relleno oscurece ~16 %. Ningún texto lo anuncia: el anuncio es el propio signo
     *  cambiando ante los ojos (C$ ⇄ $) — la superficie de anuncios de la tarjeta es el
     *  «¿Dónde va?» de la casa, no este signo. */
    private fun curChipBg(): StateListDrawable = StateListDrawable().apply {
        addState(intArrayOf(android.R.attr.state_pressed), solid(darken(cPlate, 0.84), 6, 1, cPlateLine))
        addState(intArrayOf(), solid(cPlate, 6, 1, cPlateLine))
    }

    /** Los botones: fichas SÓLIDAS de 50dp, radio 8. Pulsado = el relleno oscurece ~16 %,
     *  nada más (sin alfa: sobre el cuerpo cálido el alfa se haría barro). */
    private fun btnBg(fill: Int, stroke: Int = 0): StateListDrawable = StateListDrawable().apply {
        addState(intArrayOf(android.R.attr.state_pressed),
            if (stroke != 0) solid(darken(fill, 0.84), 8, 1, stroke) else solid(darken(fill, 0.84), 8))
        addState(intArrayOf(), if (stroke != 0) solid(fill, 8, 1, stroke) else solid(fill, 8))
    }

    /** La tarjeta dentro de un marco transparente con aire: su sombra real (elevación 24dp con
     *  el contorno redondeado declarado) necesita ese aire dentro de la ventana para dibujarse.
     *  La lengüeta del color de signo (28×3dp) se sienta sobre el borde superior de la tarjeta,
     *  a 20dp de su borde izquierdo: la única decoración, una sola vez. */
    private fun wrapCard(card: View, tick: Int?): FrameLayout {
        card.elevation = dp(24).toFloat()
        card.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View, outline: Outline) {
                outline.setRoundRect(0, 0, view.width, view.height, dp(12).toFloat())
            }
        }
        card.clipToOutline = true
        return FrameLayout(this).apply {
            setPadding(dp(20), dp(20), dp(20), dp(20))
            addView(card)
            if (tick != null) addView(View(this@QuickAddActivity).apply {
                setBackgroundColor(tick)
                // 1.3.243 (pasada fina, defecto 4 del censo): la lengüeta necesita 1dp MÁS
                // de elevación que la tarjeta — como hermana sin elevar en el mismo marco,
                // la tarjeta (24dp) la pintaba encima y nunca llegaba a la pantalla.
                elevation = dp(25).toFloat()
            }, FrameLayout.LayoutParams(dp(28), dp(3)).apply {
                gravity = Gravity.TOP or Gravity.START
                leftMargin = dp(20)
            })
        }
    }

    override fun onCreate(saved: Bundle?) {
        super.onCreate(saved)
        // La ventana respira sobre el lanzador atenuado al 72 %: la placa es opaca y pesada;
        // más atenuación la haría flotar sin suelo (la receta de Señal fija el techo en 0,72).
        window.attributes = window.attributes.apply { dimAmount = 0.72f }
        val sign = intent.getStringExtra(QuickAdd.EXTRA_SIGN) ?: "out"
        val snap = FaroWidgets.load(this)
        val en = snap?.en ?: false
        // El color del signo, SÓLIDO siempre (nunca lavado): cian de ingreso / naranja de gasto.
        val accent = if (sign == "in") Color.rgb(0x35, 0xE0, 0xFF) else Color.rgb(0xFF, 0x8B, 0x35)

        // La moneda del apunte (1.3.241, la orden de Oscar: «tocar el signo de dinero, poder
        // alternarlo»): la foto trae las monedas del libro (curs, con la de vista primero);
        // una foto vieja no las trae y se alterna entre las dos del sistema. La tarjeta abre
        // en la última moneda usada para este signo si sigue en la lista; si no, en la de
        // vista. El monto se escribe EN la moneda elegida: nada se convierte en la tarjeta —
        // la línea nace en esa moneda y los totales convierten, como con cualquier línea.
        val cursCycle: List<String> = run {
            val fromPhoto = snap?.curs?.filter { it == "NIO" || it == "USD" }?.distinct() ?: emptyList()
            val base = if (fromPhoto.isNotEmpty()) fromPhoto else listOf(snap?.cur ?: "USD")
            if (base.size >= 2) base else base + if (base[0] == "NIO") "USD" else "NIO"
        }
        var cur: String = QuickAdd.lastCur(this, sign).takeIf { it in cursCycle } ?: cursCycle.first()

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            minimumWidth = dp(288)
            setPadding(dp(20), dp(18), dp(20), dp(20))
            background = senalCardBg()
        }

        if (snap == null) {
            // Sin foto todavía no hay moneda de vista ni idioma fiables: el camino honesto es el de antes.
            card.addView(TextView(this).apply {
                text = "Abre Faro una vez para activar los apuntes rápidos."
                textSize = 16f
                setTextColor(cCancelText)
            })
            card.addView(Button(this).apply {
                text = "Abrir Faro"
                isAllCaps = false
                background = btnBg(cCancel, cCancelLine)
                setTextColor(cCancelText)
                setPadding(dp(18), 0, dp(18), 0)
                setOnClickListener {
                    startActivity(Intent(this@QuickAddActivity, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    finish()
                }
            }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(50)).apply {
                gravity = Gravity.END
                topMargin = dp(16)
            })
            setContentView(wrapCard(card, null))
            // 1.3.243 (defecto 1 del censo): la ventana a todo lo ancho — ver la nota en
            // el camino principal; esta tarjeta de reserva comparte el mismo marco.
            window.setLayout(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT)
            return
        }

        // El rótulo: cuadrado señal de 6dp + NOTA RÁPIDA en Rajdhani Medium con tracking.
        val eyebrow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        eyebrow.addView(View(this).apply { setBackgroundColor(cSignal) },
            LinearLayout.LayoutParams(dp(6), dp(6)))
        eyebrow.addView(TextView(this).apply {
            text = if (en) "QUICK NOTE" else "NOTA RÁPIDA"
            typeface = rajdhani500
            textSize = 11f
            letterSpacing = 0.18f
            setTextColor(cLabel)
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            leftMargin = dp(8)
        })
        card.addView(eyebrow)

        card.addView(TextView(this).apply {
            text = when {
                sign == "in" -> if (en) "+ New income" else "+ Anotar ingreso"
                else -> if (en) "− New expense" else "− Anotar gasto"
            }
            typeface = rajdhani600
            textSize = 20f
            letterSpacing = 0.02f
            setTextColor(accent)
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(6)
        })

        // El monto sobre su placa: símbolo y cifra en Rajdhani, y la regla sólida del color
        // de signo al pie interior de la placa — la cifra está sentada, no flotando.
        val plate = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = plateBg()
            setPadding(dp(16), dp(12), dp(16), dp(10))
        }
        val amount = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            hint = "0.00"
            typeface = rajdhani700
            textSize = 44f
            setTextColor(cInk)
            setHintTextColor(cHint)
            background = null
            // 1.3.243 (pasada fina, defectos 2, 3 y 6 del censo): el campo nacía con el
            // relleno de fábrica del tema (≈10dp de aire sobre y bajo la cifra, ≈6dp a la
            // derecha — la cifra flotaba y ni compartía borde con la regla) y su caja de
            // línea natural es 56dp cuando el espécimen fija 44 (line-height: 1); con las
            // dos cosas corregidas la placa mide los 78dp exactos aprobados. Y el cursor
            // deja de ser el turquesa Material de fábrica: pasa a ser el color de signo,
            // sólido, de 2dp — la única decoración que el cursor puede llevar en Señal.
            setPadding(0, 0, 0, 0)
            lineHeight = dp(44)
            textCursorDrawable = GradientDrawable().apply {
                setColor(accent); setSize(dp(2), dp(44))
            }
            isSingleLine = true
            gravity = Gravity.END
        }
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        // El signo es una ficha sobre la placa: tocarlo recorre las monedas del libro.
        val signView = TextView(this).apply {
            typeface = rajdhani600
            textSize = 24f
            setTextColor(accent)
            background = curChipBg()
            setPadding(dp(10), dp(2), dp(10), dp(2))
            isClickable = true
            setOnClickListener {
                cur = cursCycle[(cursCycle.indexOf(cur) + 1) % cursCycle.size]
                text = if (cur == "NIO") "C$" else "$"
            }
        }
        signView.text = if (cur == "NIO") "C$" else "$"
        row.addView(signView, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { rightMargin = dp(10) })
        row.addView(amount, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        plate.addView(row)
        plate.addView(View(this).apply { setBackgroundColor(accent) },
            LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(2)).apply { topMargin = dp(10) })
        card.addView(plate, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(14)
        })

        card.addView(TextView(this).apply {
            text = if (en) "Joins your book when you open Faro." else "Entra a tu libro al abrir Faro."
            textSize = 13f
            setTextColor(cNote)
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(12)
        })

        // La casa del apunte: la sección «¿Dónde va?» se compone SIEMPRE que hay foto
        // (1.3.241). Hasta 1.3.240 la lista solo se dibujaba si la foto traía casas — y
        // como las casas nacían solo de líneas con subcategoría, un libro cuyo hábito cae
        // sin categoría o a nivel de categoría devolvía la lista vacía y la tarjeta no
        // mostraba NI la pregunta (la cuarta prueba de Oscar: «No me aparece dónde va, no
        // puedo elegir ninguna carpeta»). Ahora la pregunta va impresa siempre, la casa
        // elegida se lee de un vistazo sin tocar nada (su principio del usuario frío: lo
        // que no se anuncia no existe) y «Sin categoría» es una fila más, explícita y
        // marcada cuando no hay hábito. Ningún texto pide abrir la app (la ley de Oscar,
        // 1.3.237): la foto se renueva del libro real en cada apertura.
        // Las casas son las que la foto trae para este signo — las que ya lo reciben, en
        // orden de uso, a nivel de subcategoría o de categoría (quickadd.ts). La última
        // casa usada queda preseleccionada; si nunca se eligió una, «Sin categoría» manda
        // hasta que el usuario opte por una.
        val homes = if (sign == "in") snap.qhIn else snap.qhOut
        card.addView(TextView(this).apply {
            text = if (en) "WHERE DOES IT GO?" else "¿DÓNDE VA?"
            typeface = rajdhani600
            textSize = 13f
            letterSpacing = 0.14f
            setTextColor(cLabel)
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(16); bottomMargin = dp(8)
        })
        val group = RadioGroup(this).apply { orientation = RadioGroup.VERTICAL }
        val last = QuickAdd.lastHome(this, sign)
        homes.forEachIndexed { i, h ->
            group.addView(RadioButton(this).apply {
                id = 1000 + i
                text = h.n
                textSize = 15f
                setTextColor(cText)
                background = rowSelector(accent)
                setButtonDrawable(radioSquare(accent))
                compoundDrawablePadding = dp(12)
                setPadding(dp(14), 0, dp(14), 0)
            }, RadioGroup.LayoutParams(
                RadioGroup.LayoutParams.MATCH_PARENT, dp(48)
            ).apply { if (i > 0) topMargin = dp(6) })
        }
        group.addView(RadioButton(this).apply {
            id = 1000 + homes.size
            text = if (en) "No category (quick note)" else "Sin categoría (apunte rápido)"
            textSize = 15f
            setTextColor(cText)
            background = rowSelector(accent)
            setButtonDrawable(radioSquare(accent))
            compoundDrawablePadding = dp(12)
            setPadding(dp(14), 0, dp(14), 0)
        }, RadioGroup.LayoutParams(
            RadioGroup.LayoutParams.MATCH_PARENT, dp(48)
        ).apply { if (homes.isNotEmpty()) topMargin = dp(6) })
        val lastIdx = homes.indexOfFirst { "${it.c}|${it.s}" == last }
        group.check(1000 + if (lastIdx >= 0) lastIdx else homes.size)
        // La zona de scroll (176dp) solo se reserva cuando las filas ya no caben a la
        // vista (4 o más, contando «Sin categoría»); con pocas casas la sección mide lo
        // que mide y la tarjeta no carga un hueco vacío.
        val rowsTotal = homes.size + 1
        card.addView(ScrollView(this).apply { addView(group) },
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                if (rowsTotal >= 4) dp(176) else LinearLayout.LayoutParams.WRAP_CONTENT
            ))

        val buttons = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(20), 0, 0)
        }
        // La fila de botones respira (1.3.237): antes las dos fichas se añadían sin ningún
        // margen declarado — el fondo de siempre del botón traía su propio aire transparente,
        // pero la ficha pinta hasta el borde de su vista, así que Cancelar y Guardar se
        // dibujaban PEGADAS (la tercera prueba de Oscar). Ahora la separación es una medida
        // de la fila, no un accidente del fondo: hueco constante de 10dp y aire propio dentro
        // de cada ficha para que la palabra nunca bese el marco. En Señal la fila entera es
        // de las fichas: Cancelar pesa 1, Guardar 1,25 (la receta que Oscar eligió).
        buttons.addView(Button(this).apply {
            text = if (en) "Cancel" else "Cancelar"
            isAllCaps = false
            typeface = rajdhani700
            textSize = 16f
            letterSpacing = 0.06f
            background = btnBg(cCancel, cCancelLine)
            setTextColor(cCancelText)
            setPadding(dp(18), 0, dp(18), 0)
            setOnClickListener { finish() }
        }, LinearLayout.LayoutParams(0, dp(50), 1f))
        buttons.addView(Button(this).apply {
            text = if (en) "Save" else "Guardar"
            isAllCaps = false
            typeface = rajdhani700
            textSize = 16f
            letterSpacing = 0.06f
            background = btnBg(accent)
            setTextColor(cOnSign)
            setPadding(dp(18), 0, dp(18), 0)
            setOnClickListener {
                val minor = parseMinor(amount.text.toString())
                if (minor == null) {
                    amount.error = if (en) "Enter an amount" else "Escribe un monto"
                    return@setOnClickListener
                }
                val chosenIdx = group.checkedRadioButtonId - 1000
                val home = if (chosenIdx in homes.indices) homes[chosenIdx] else null
                val entry = JSONObject()
                    .put("id", UUID.randomUUID().toString())
                    .put("sign", sign)
                    .put("minor", minor)
                    .put("cur", cur)
                    .put("day", SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
                    .put("at", java.time.Instant.now().toString())
                    .put("cat", home?.c ?: "")
                    .put("sub", home?.s ?: "")
                QuickAdd.enqueue(this@QuickAddActivity, entry)
                QuickAdd.rememberCur(this@QuickAddActivity, sign, cur)
                if (home != null) QuickAdd.rememberHome(this@QuickAddActivity, sign, home)
                Toast.makeText(this@QuickAddActivity, if (en) "Noted ✓" else "Anotado ✓", Toast.LENGTH_SHORT).show()
                finish()
            }
        }, LinearLayout.LayoutParams(
            0, dp(50), 1.25f
        ).apply { leftMargin = dp(10) })
        card.addView(buttons)
        setContentView(wrapCard(card, accent))
        // 1.3.243 (pasada fina, defecto 1 del censo): la ventana ya no envuelve al mínimo
        // de la tarjeta (288dp = el 75 % de la pantalla); va a todo lo ancho y es el aire
        // de 20dp del marco de wrapCard quien fija la tarjeta en pantalla − 40dp
        // (≈90 % — la proporción del espécimen en cualquier teléfono).
        window.setLayout(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT)
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
