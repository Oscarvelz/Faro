package com.oscarvelz.faro

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File

/**
 * 1.3.408: la cámara del widget. El tercer botón de la cabecera («Fotografiar
 * un recibo») levanta esta actividad-isla, que no tiene interfaz propia: abre
 * la cámara del teléfono (ACTION_IMAGE_CAPTURE — sin permiso CAMERA, como
 * declara el manifiesto) con la foto destinada a la carpeta `camera/` de la
 * caché (la ruta que file_paths.xml ya expone por FileProvider).
 *
 * Al volver con foto, la entrega a MainActivity por la puerta de siempre —
 * ACTION_SEND con la imagen — marcada con la pista «receipt»: la bandeja la
 * recibe como cualquier foto compartida, pero la página la abre DIRECTA en
 * el escaneo de recibos (sin preguntar «¿qué es?»), porque este botón ya lo
 * dijo. Ahí la foto se procesa (OCR) y cae en la preview de revisión de
 * siempre: verificar, corregir, elegir categoría, poner la nota — y nada se
 * guarda hasta que él confirma, como en toda la Captura Inteligente.
 *
 * Sin foto (canceló, o el teléfono no tiene cámara): se cierra en silencio.
 * Vive en su propia tarea (taskAffinity=""), como la tarjeta rápida: nunca
 * arrastra la app entera detrás.
 */
class CapturePhotoActivity : Activity() {

    private var photoUri: Uri? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (savedInstanceState != null) {
            photoUri = savedInstanceState.getString(KEY_URI)?.let { Uri.parse(it) }
            return // el resultado llega a onActivityResult como siempre
        }
        val dir = File(cacheDir, "camera").apply { mkdirs() }
        val file = File(dir, "recibo-${System.currentTimeMillis()}.jpg")
        val uri = runCatching { FileProvider.getUriForFile(this, "com.oscarvelz.faro.files", file) }.getOrNull()
        if (uri == null) { finish(); return }
        photoUri = uri
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            .putExtra(MediaStore.EXTRA_OUTPUT, uri)
            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        if (intent.resolveActivity(packageManager) == null) { finish(); return }
        @Suppress("DEPRECATION") startActivityForResult(intent, REQ_CAMERA)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(KEY_URI, photoUri?.toString())
    }

    @Deprecated("La isla usa el resultado clásico: una sola petición, sin registro.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val uri = photoUri
        if (requestCode != REQ_CAMERA || resultCode != RESULT_OK || uri == null) { finish(); return }
        // La foto entra por la bandeja de compartir, con su pista: recibo.
        val send = Intent(this, MainActivity::class.java)
            .setAction(Intent.ACTION_SEND)
            .setType("image/jpeg")
            .putExtra(Intent.EXTRA_STREAM, uri)
            .putExtra(EXTRA_HINT, "receipt")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        runCatching { startActivity(send) }
        finish()
    }

    companion object {
        private const val REQ_CAMERA = 408
        private const val KEY_URI = "photoUri"
        const val EXTRA_HINT = "faro.hint"
    }
}
