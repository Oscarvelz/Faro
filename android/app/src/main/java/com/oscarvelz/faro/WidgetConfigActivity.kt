package com.oscarvelz.faro

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView

/**
 * The widgets' options screen (android:configure on all three providers): one choice per widget instance — whether
 * THIS widget shows its amounts, following the app or always showing / always hiding them (stored by WidgetCfg).
 *
 * The configure contract: the result starts CANCELED, so backing out of a fresh placement removes the widget;
 * saving stores the choice, redraws that one widget and answers OK with its id. The wording follows the snapshot's
 * language, like the widgets themselves. UI is built in code: the shell's only screens are this and the WebView.
 */
class WidgetConfigActivity : Activity() {
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var en = false

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    override fun onCreate(saved: Bundle?) {
        super.onCreate(saved)
        setResult(RESULT_CANCELED)
        widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }
        en = FaroWidgets.load(this)?.en ?: false

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(24), dp(24), dp(24))
        }
        root.addView(TextView(this).apply {
            text = if (en) "Amounts on this widget" else "Importes en este widget"
            textSize = 20f
            setTextColor(Color.rgb(232, 236, 240))
        })
        root.addView(TextView(this).apply {
            text = if (en) "Faro can hide the amounts in the app. Choose what this widget does."
            else "Faro puede ocultar los importes en la app. Elige qué hace este widget."
            textSize = 14f
            setTextColor(Color.rgb(154, 163, 173))
            setPadding(0, dp(8), 0, 0)
        })
        val group = RadioGroup(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(16), 0, 0)
        }
        // Radio ids must be positive and stable: the mode (0..2) shifted by one.
        val labels = listOf(
            WidgetCfg.FOLLOW to (if (en) "Follow the app" else "Seguir la app"),
            WidgetCfg.SHOW to (if (en) "Always show" else "Mostrar siempre"),
            WidgetCfg.HIDE to (if (en) "Always hide" else "Ocultar siempre"),
        )
        for ((mode, label) in labels) {
            group.addView(RadioButton(this).apply {
                id = mode + 1
                text = label
                textSize = 16f
                setTextColor(Color.rgb(232, 236, 240))
                setPadding(0, dp(10), 0, dp(10))
            })
        }
        group.check(WidgetCfg.mode(this, widgetId) + 1)
        root.addView(group)
        val save = Button(this).apply {
            text = if (en) "Save" else "Guardar"
            setOnClickListener {
                val mode = group.checkedRadioButtonId - 1
                if (mode in WidgetCfg.FOLLOW..WidgetCfg.HIDE) WidgetCfg.setMode(this@WidgetConfigActivity, widgetId, mode)
                FaroWidgets.refreshOne(this@WidgetConfigActivity, widgetId)
                setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
                finish()
            }
        }
        root.addView(save, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.END
            topMargin = dp(24)
        })
        setContentView(root)
    }
}
