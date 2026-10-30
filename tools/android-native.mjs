#!/usr/bin/env node
// Runs after `tauri android init` (imported by android-signing.mjs). Adds two small
// features to the generated Android project that the web page cannot do by itself:
//   - share a PDF file straight into WhatsApp (or any app)
//   - open Android's own print screen (Save as PDF / printers) with a PDF
// The page reaches them as window.EstockNative. If anything below does not match the
// generated project, the build carries on without them and the app falls back to
// the old behaviour (text message / RawBT).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './common.mjs';

const androidDir = join(ROOT, 'src-tauri', 'gen', 'android');
const main = join(androidDir, 'app', 'src', 'main');

function findFile(dir, name) {
  if (!existsSync(dir)) return null;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { const f = findFile(p, name); if (f) return f; }
    else if (e === name) return p;
  }
  return null;
}

try {
  const activity = findFile(join(main, 'java'), 'MainActivity.kt');
  const manifestPath = join(main, 'AndroidManifest.xml');
  if (!activity || !existsSync(manifestPath)) throw new Error('MainActivity.kt or AndroidManifest.xml not found');

  let src = readFileSync(activity, 'utf8');
  const pkg = /^\s*package\s+([\w.]+)/m.exec(src)?.[1];
  if (!pkg) throw new Error('package name not found in MainActivity.kt');

  // ---- file provider (the generated project normally already has one with this authority)
  let manifest = readFileSync(manifestPath, 'utf8');
  let authority = '${applicationId}.fileprovider';
  let kotlinAuthority = 'activity.packageName + ".fileprovider"';
  const xmlDir = join(main, 'res', 'xml');
  mkdirSync(xmlDir, { recursive: true });
  if (manifest.includes('androidx.core.content.FileProvider')) {
    const m = /android:authorities="([^"]+)"/.exec(manifest.slice(manifest.indexOf('androidx.core.content.FileProvider')));
    if (m && m[1] === authority) {
      const paths = join(xmlDir, 'file_paths.xml');
      if (existsSync(paths)) {
        let x = readFileSync(paths, 'utf8');
        if (!/<cache-path/.test(x)) { x = x.replace(/<\/paths>/, '    <cache-path name="estock_cache" path="." />\n</paths>'); writeFileSync(paths, x); }
      }
    } else { throw new Error('an unexpected FileProvider is already declared'); }
  } else {
    authority = '${applicationId}.estockshare';
    kotlinAuthority = 'activity.packageName + ".estockshare"';
    writeFileSync(join(xmlDir, 'estock_share_paths.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<paths>\n    <cache-path name="estock_cache" path="." />\n</paths>\n');
    manifest = manifest.replace('</application>', `    <provider android:name="androidx.core.content.FileProvider" android:authorities="${authority}" android:exported="false" android:grantUriPermissions="true">\n            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/estock_share_paths" />\n        </provider>\n    </application>`);
    writeFileSync(manifestPath, manifest);
  }

  // ---- the bridge
  writeFileSync(join(activity, '..', 'NativeBridge.kt'), `package ${pkg}

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import android.util.Base64
import android.webkit.JavascriptInterface
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

/** Exposed to the page as window.EstockNative. Every function returns "" on success or an error message. */
class NativeBridge(private val activity: Activity) {

    private fun writeTemp(b64: String, name: String): File {
        val dir = File(activity.cacheDir, "shared")
        dir.mkdirs()
        val now = System.currentTimeMillis()
        dir.listFiles()?.forEach { if (now - it.lastModified() > 86_400_000L) it.delete() }
        val file = File(dir, name.replace(Regex("[^A-Za-z0-9._-]"), "_"))
        file.writeBytes(Base64.decode(b64, Base64.DEFAULT))
        return file
    }

    @JavascriptInterface
    fun shareFile(b64: String, name: String, mime: String, packages: String, text: String, jid: String): String {
        return try {
            val file = writeTemp(b64, name)
            val uri = FileProvider.getUriForFile(activity, ${kotlinAuthority}, file)
            val send = Intent(Intent.ACTION_SEND)
            send.type = mime
            send.putExtra(Intent.EXTRA_STREAM, uri)
            if (text.isNotEmpty()) send.putExtra(Intent.EXTRA_TEXT, text)
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            for (p in packages.split(",")) {
                val pkgName = p.trim()
                if (pkgName.isEmpty()) continue
                try {
                    val direct = Intent(send)
                    direct.setPackage(pkgName)
                    if (jid.isNotEmpty()) direct.putExtra("jid", jid + "@s.whatsapp.net")
                    activity.startActivity(direct)
                    return ""
                } catch (e: ActivityNotFoundException) {
                    // that app is not installed, try the next one
                }
            }
            activity.startActivity(Intent.createChooser(send, "Share receipt"))
            ""
        } catch (e: Exception) {
            e.message ?: "Could not share the file"
        }
    }

    @JavascriptInterface
    fun printPdf(b64: String, name: String): String {
        return try {
            val bytes = Base64.decode(b64, Base64.DEFAULT)
            activity.runOnUiThread {
                val manager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
                manager.print(name, PdfAdapter(bytes, name), null)
            }
            ""
        } catch (e: Exception) {
            e.message ?: "Could not open printing"
        }
    }

    private class PdfAdapter(private val data: ByteArray, private val docName: String) : PrintDocumentAdapter() {
        override fun onLayout(oldAttributes: PrintAttributes?, newAttributes: PrintAttributes?, cancellationSignal: CancellationSignal?, callback: LayoutResultCallback?, extras: Bundle?) {
            if (cancellationSignal?.isCanceled == true) { callback?.onLayoutCancelled(); return }
            val info = PrintDocumentInfo.Builder(docName)
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                .build()
            callback?.onLayoutFinished(info, true)
        }

        override fun onWrite(pages: Array<out PageRange>?, destination: ParcelFileDescriptor?, cancellationSignal: CancellationSignal?, callback: WriteResultCallback?) {
            try {
                FileOutputStream(destination!!.fileDescriptor).use { it.write(data) }
                callback?.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
            } catch (e: Exception) {
                callback?.onWriteFailed(e.message)
            }
        }
    }
}
`);

  // ---- hook it into the web view as soon as it is created (before the page loads)
  if (!src.includes('EstockNative')) {
    const hook = `    override fun onWebViewCreate(webView: android.webkit.WebView) {
        super.onWebViewCreate(webView)
        webView.addJavascriptInterface(NativeBridge(this), "EstockNative")
    }
`;
    if (/class\s+MainActivity\s*:\s*TauriActivity\(\)\s*\{/.test(src)) src = src.replace(/(class\s+MainActivity\s*:\s*TauriActivity\(\)\s*\{\s*\n)/, `$1${hook}\n`);
    else if (/class\s+MainActivity\s*:\s*TauriActivity\(\)/.test(src)) src = src.replace(/class\s+MainActivity\s*:\s*TauriActivity\(\)/, `class MainActivity : TauriActivity() {\n${hook}}`);
    else throw new Error('class MainActivity declaration not recognised');
    writeFileSync(activity, src);
  }
  console.log('✔ Android: PDF share and print bridge added');
} catch (e) {
  console.warn(`⚠ Android PDF share/print bridge was not added (${e.message}). The app will use the plain WhatsApp message and RawBT instead.`);
}
