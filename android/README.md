# Faro for Android

A thin WebView app around https://oscarvelz.github.io/Faro/ (package `com.oscarvelz.faro`, min Android 11).
Web releases arrive on their own (the page is loaded live; the service worker keeps it working offline).

- Bridge: `window.FaroNative` (see `src/spa/native.ts`, feature-detected; the browser/PWA never see it):
  Back (`FaroBack` → `atRoot`), bar colours, downloads into Downloads/Faro, BiometricPrompt for the fingerprint lock,
  pictures shared from other apps (scan preview), update offer from GitHub releases `android-N` (asset `Faro.apk`).
- Build: `.github/workflows/android.yml` on the `source` branch (only when `android/` changes). versionCode = run number.
- Signing: the key is private and never committed. With repo secrets `FARO_KS_B64` + `FARO_KS_PASS` CI signs and
  publishes; without them CI uploads `faro-unsigned-N` and the APK is signed privately (apksigner, alias `faro`) and
  attached to release `android-N` as `Faro.apk`. All updates must use the same key.
- Storage is separate from Chrome: sign in once (sync) or import a backup.
