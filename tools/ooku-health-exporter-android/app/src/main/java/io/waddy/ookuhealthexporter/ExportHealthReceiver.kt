package io.waddy.ookuhealthexporter

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class ExportHealthReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_EXPORT_HEALTH) return

    val pendingResult = goAsync()
    val exportDate = parseDate(intent.getStringExtra(EXTRA_DATE))
    val origin = exportOriginFromIntent(intent.getStringExtra(EXTRA_ORIGIN))

    CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
      try {
        HealthExportManager(context.applicationContext).exportDate(exportDate, origin)
      } finally {
        pendingResult.finish()
      }
    }
  }

  private fun parseDate(rawDate: String?): LocalDate {
    return runCatching { LocalDate.parse(rawDate) }
      .getOrElse { LocalDate.now(ZoneId.of("Asia/Tokyo")) }
  }

  companion object {
    const val ACTION_EXPORT_HEALTH = "io.waddy.ookuhealthexporter.EXPORT_HEALTH"
    const val EXTRA_DATE = "date"
    const val EXTRA_ORIGIN = "origin"
  }
}
