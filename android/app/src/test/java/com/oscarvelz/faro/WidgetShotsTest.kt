package com.oscarvelz.faro

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.view.View
import android.widget.FrameLayout
import android.widget.RemoteViews
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * Renders the real RemoteViews layouts (the same ones the launcher inflates) to PNG with Robolectric's native graphics,
 * at the dp sizes of a Galaxy S24 Ultra 4×1 / 4×2 / 4×3 and a Galaxy Tab S10 Ultra 6×4, night and day.
 * Shots land in app/build/shots (uploaded by .github/workflows/widget-shots.yml). Also checks the formatting rules.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34])
class WidgetShotsTest {
    private fun snap(lang: String, hide: Boolean = false): Snap {
        val raw = javaClass.classLoader!!.getResource("widget-sample-$lang.json")!!.readText()
        val o = JSONObject(raw)
        o.put("hide", hide)
        return Snap.parse(o)
    }

    private fun shot(name: String, wDp: Int, hDp: Int, night: Boolean, density: String, build: (Context) -> RemoteViews) {
        RuntimeEnvironment.setQualifiers((if (night) "+night" else "+notnight") + "-$density")
        val ctx = ApplicationProvider.getApplicationContext<Context>()
        val d = ctx.resources.displayMetrics.density
        val w = Math.round(wDp * d)
        val h = Math.round(hDp * d)
        val host = FrameLayout(ctx)
        val v: View = build(ctx).apply(ctx, host)
        host.addView(v, FrameLayout.LayoutParams(w, h))
        host.measure(View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.EXACTLY))
        host.layout(0, 0, w, h)
        val pad = Math.round(16 * d)
        val bmp = Bitmap.createBitmap(w + 2 * pad, h + 2 * pad, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        // A plain wallpaper-like backdrop so the widget's own edge and corners show.
        c.drawColor(if (night) Color.rgb(38, 44, 52) else Color.rgb(196, 204, 212))
        c.translate(pad.toFloat(), pad.toFloat())
        host.draw(c)
        val out = File("build/shots/$name.png")
        out.parentFile!!.mkdirs()
        out.outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
        assertTrue(out.length() > 1000)
    }

    @Test fun phone() {
        for (night in listOf(true, false)) {
            val t = if (night) "night" else "day"
            shot("phone-4x1-$t", 360, 84, night, "xxhdpi") { Render.phoneS(it, snap("es")) }
            shot("phone-4x2-compact-$t", 360, 140, night, "xxhdpi") { Render.phoneM(it, snap("es"), R.layout.w_phone_m) }
            shot("phone-4x2-$t", 360, 190, night, "xxhdpi") { Render.phoneM(it, snap("es"), R.layout.w_phone_l) }
            shot("phone-4x3-$t", 360, 300, night, "xxhdpi") { Render.phoneM(it, snap("es"), R.layout.w_phone_xl) }
            shot("phone-4x2-hidden-$t", 360, 190, night, "xxhdpi") { Render.phoneM(it, snap("es", hide = true), R.layout.w_phone_l) }
            shot("phone-empty-$t", 360, 140, night, "xxhdpi") { Render.empty(it) }
        }
        shot("phone-4x2-en-night", 360, 190, true, "xxhdpi") { Render.phoneM(it, snap("en"), R.layout.w_phone_l) }
    }

    @Test fun tablet() {
        for (night in listOf(true, false)) {
            val t = if (night) "night" else "day"
            shot("tablet-6x4-$t", 1220, 760, night, "hdpi") { Render.panelV(it, snap("es"), R.layout.w_panel_xl) }
            shot("tablet-l-$t", 760, 440, night, "hdpi") { Render.panelV(it, snap("es"), R.layout.w_panel_l) }
            shot("tablet-m-$t", 500, 300, night, "hdpi") { Render.panelV(it, snap("es"), R.layout.w_panel_m) }
        }
        shot("tablet-6x4-hidden-night", 1220, 760, true, "hdpi") { Render.panelV(it, snap("es", hide = true), R.layout.w_panel_xl) }
        shot("tablet-6x4-en-day", 1220, 760, false, "hdpi") { Render.panelV(it, snap("en"), R.layout.w_panel_xl) }
    }

    @Test fun format() {
        assertEquals("$1,585.56", Fmt.money(158556, "USD"))
        assertEquals("C$12,480.50", Fmt.money(1248050, "NIO"))
        assertEquals("-$3.05", Fmt.money(-305, "USD"))
        assertEquals("C$36.6243", Fmt.rate(366243))
        assertEquals("en 3 d", Fmt.daysWord(3, false))
        assertEquals("hace 2 d", Fmt.daysWord(-2, false))
        assertEquals("tomorrow", Fmt.daysWord(1, true))
        assertEquals("9 nov", Fmt.shortDay("2026-11-09", false))
        val s = snap("es")
        assertEquals(347304L, s.have)
        assertEquals(s.have - s.spend, s.left)
        assertEquals(5, s.dues.size)
    }
}
