package io.waddy.ookuhealthexporter

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.google.gson.GsonBuilder
import com.huawei.hmf.tasks.Task
import com.huawei.hms.hihealth.DataController
import com.huawei.hms.hihealth.HuaweiHiHealth
import com.huawei.hms.hihealth.data.DataType
import com.huawei.hms.hihealth.data.Field
import com.huawei.hms.hihealth.data.HealthDataTypes
import com.huawei.hms.hihealth.data.HealthFields
import com.huawei.hms.hihealth.data.SamplePoint
import com.huawei.hms.hihealth.data.SampleSet
import com.huawei.hms.hihealth.data.Value
import com.huawei.hms.hihealth.options.ReadOptions
import com.huawei.hms.hihealth.result.ReadReply
import java.io.File
import java.io.FileOutputStream
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

private const val EXPORT_FOLDER = "OokuHealth"
private const val TIMEZONE = "Asia/Tokyo"
private const val ORIGIN_UI = "ui"
private const val ORIGIN_ADB = "adb"

class HealthExportManager(
  private val context: Context,
) {
  private val gson = GsonBuilder()
    .serializeNulls()
    .setPrettyPrinting()
    .create()
  private val statusStore = ExportStatusStore(context)
  private val zoneId = ZoneId.of(TIMEZONE)

  suspend fun exportToday(origin: String = ORIGIN_UI): ExportResult {
    return exportDate(LocalDate.now(zoneId), origin)
  }

  suspend fun exportDate(date: LocalDate, origin: String = ORIGIN_UI): ExportResult = withContext(Dispatchers.IO) {
    val controller = HuaweiHiHealth.getDataController(context)
      ?: return@withContext persistFailure(date, origin, "DataController is unavailable. Authorize Health Kit first.")

    try {
      val summary = HealthExportSummary(
        sleep = readSleepSummary(controller, date),
        activity = readActivitySummary(controller, date),
        vitals = readVitalsSummary(controller, date),
      )

      val document = HealthExportDocument(
        status = "ok",
        date = date.toString(),
        timezone = TIMEZONE,
        exportedAt = Instant.now().toString(),
        origin = origin,
        device = HealthExportDevice(watchModel = BuildConfig.WATCH_MODEL),
        summary = summary,
      )

      val devicePath = writeDocument(date, document)
      val message = "Exported ${date} to ${devicePath}"
      statusStore.save(message)
      ExportResult("ok", message, devicePath)
    } catch (error: Throwable) {
      persistFailure(date, origin, error.message ?: error.javaClass.simpleName)
    }
  }

  private suspend fun readSleepSummary(controller: DataController, date: LocalDate): SleepSummary {
    val reply = controller.read(
      ReadOptions.Builder()
        .read(DataType.DT_STATISTICS_SLEEP)
        .setTimeRange(startOfDayMillis(date), endOfDayMillis(date), TimeUnit.MILLISECONDS)
        .build(),
    ).await()

    val sample = latestPoint(reply.getSampleSet(DataType.DT_STATISTICS_SLEEP))
      ?: return SleepSummary()

    return SleepSummary(
      totalMinutes = durationToMinutes(sample.longValue(Field.ALL_SLEEP_TIME)),
      deepMinutes = durationToMinutes(sample.longValue(Field.DEEP_SLEEP_TIME)),
      lightMinutes = durationToMinutes(sample.longValue(Field.LIGHT_SLEEP_TIME)),
      remMinutes = durationToMinutes(sample.longValue(Field.DREAM_TIME)),
      awakeMinutes = durationToMinutes(sample.longValue(Field.AWAKE_TIME)),
      startAt = epochMillisToIso(sample.longValue(Field.FALL_ASLEEP_TIME)),
      endAt = epochMillisToIso(sample.longValue(Field.WAKE_UP_TIME)),
    )
  }

  private suspend fun readActivitySummary(controller: DataController, date: LocalDate): ActivitySummary {
    val reply = controller.read(
      ReadOptions.Builder()
        .polymerize(DataType.DT_CONTINUOUS_STEPS_DELTA, DataType.POLYMERIZE_STEP_COUNT_DELTA)
        .polymerize(DataType.DT_CONTINUOUS_DISTANCE_DELTA, DataType.POLYMERIZE_DISTANCE_DELTA)
        .polymerize(DataType.DT_CONTINUOUS_CALORIES_BURNT, DataType.POLYMERIZE_CALORIES_EXPENDED)
        .polymerize(DataType.DT_CONTINUOUS_WORKOUT_DURATION, DataType.POLYMERIZE_CONTINUOUS_WORKOUT_DURATION)
        .setTimeRange(startOfDayMillis(date), endOfDayMillis(date), TimeUnit.MILLISECONDS)
        .build(),
    ).await()

    val stepPoint = latestPoint(reply.getSampleSet(DataType.POLYMERIZE_STEP_COUNT_DELTA))
    val distancePoint = latestPoint(reply.getSampleSet(DataType.POLYMERIZE_DISTANCE_DELTA))
    val caloriesPoint = latestPoint(reply.getSampleSet(DataType.POLYMERIZE_CALORIES_EXPENDED))
    val workoutPoint = latestPoint(reply.getSampleSet(DataType.POLYMERIZE_CONTINUOUS_WORKOUT_DURATION))

    return ActivitySummary(
      steps = stepPoint?.intValue(Field.FIELD_STEPS),
      distanceMeters = distancePoint?.doubleValue(Field.FIELD_DISTANCE),
      activeCaloriesKcal = caloriesPoint?.doubleValue(Field.FIELD_CALORIES),
      exerciseMinutes = durationToMinutes(
        workoutPoint?.longValue(Field.FIELD_DURATION) ?: workoutPoint?.longValue(Field.FIELD_SPAN),
      ),
    )
  }

  private suspend fun readVitalsSummary(controller: DataController, date: LocalDate): VitalsSummary {
    val heartReply = controller.read(
      ReadOptions.Builder()
        .polymerize(DataType.DT_INSTANTANEOUS_HEART_RATE, DataType.POLYMERIZE_CONTINUOUS_HEART_RATE_STATISTICS)
        .read(DataType.DT_RESTING_HEART_RATE_STATISTICS)
        .setTimeRange(startOfDayMillis(date), endOfDayMillis(date), TimeUnit.MILLISECONDS)
        .build(),
    ).await()
    val spo2Reply = controller.read(
      ReadOptions.Builder()
        .polymerize(HealthDataTypes.DT_INSTANTANEOUS_SPO2, HealthDataTypes.POLYMERIZE_CONTINUOUS_SPO2_STATISTICS)
        .setTimeRange(startOfDayMillis(date), endOfDayMillis(date), TimeUnit.MILLISECONDS)
        .build(),
    ).await()

    val averageHeartPoint = latestPoint(heartReply.getSampleSet(DataType.POLYMERIZE_CONTINUOUS_HEART_RATE_STATISTICS))
    val restingHeartPoint = latestPoint(heartReply.getSampleSet(DataType.DT_RESTING_HEART_RATE_STATISTICS))
    val spo2Point = latestPoint(spo2Reply.getSampleSet(HealthDataTypes.POLYMERIZE_CONTINUOUS_SPO2_STATISTICS))

    return VitalsSummary(
      restingHeartRateBpm = restingHeartPoint?.intValue(Field.FIELD_LAST)
        ?: restingHeartPoint?.intValue(Field.FIELD_AVG)
        ?: restingHeartPoint?.intValue(Field.FIELD_BPM),
      averageHeartRateBpm = averageHeartPoint?.intValue(Field.FIELD_AVG)
        ?: averageHeartPoint?.intValue(HealthFields.FIELD_AVG_HEART_RATE),
      minSpO2Pct = spo2Point?.intValue(HealthFields.FIELD_SATURATION_MIN)
        ?: spo2Point?.intValue(Field.FIELD_MIN),
    )
  }

  private fun latestPoint(sampleSet: SampleSet?): SamplePoint? {
    return sampleSet?.samplePoints?.maxByOrNull { point ->
      point.getEndTime(TimeUnit.MILLISECONDS)
    }
  }

  private fun startOfDayMillis(date: LocalDate): Long {
    return date.atStartOfDay(zoneId).toInstant().toEpochMilli()
  }

  private fun endOfDayMillis(date: LocalDate): Long {
    return date.plusDays(1).atStartOfDay(zoneId).toInstant().toEpochMilli() - 1
  }

  private fun durationToMinutes(rawValue: Long?): Int? {
    rawValue ?: return null
    if (rawValue <= 0L) return null
    return when {
      rawValue > 86_400_000L -> TimeUnit.MILLISECONDS.toMinutes(rawValue).toInt()
      rawValue > 86_400L -> TimeUnit.MILLISECONDS.toMinutes(rawValue).toInt()
      rawValue > 1_440L -> TimeUnit.SECONDS.toMinutes(rawValue).toInt()
      else -> rawValue.toInt()
    }
  }

  private fun epochMillisToIso(rawValue: Long?): String? {
    rawValue ?: return null
    if (rawValue <= 0L) return null
    return Instant.ofEpochMilli(rawValue).toString()
  }

  private fun SamplePoint.intValue(field: Field): Int? {
    return getFieldValue(field)?.safeInt()
  }

  private fun SamplePoint.longValue(field: Field): Long? {
    return getFieldValue(field)?.safeLong()
  }

  private fun SamplePoint.doubleValue(field: Field): Double? {
    return getFieldValue(field)?.safeDouble()
  }

  private fun Value?.safeInt(): Int? = try {
    this?.asIntValue()
  } catch (_: Throwable) {
    null
  }

  private fun Value?.safeLong(): Long? = try {
    this?.asLongValue()
  } catch (_: Throwable) {
    null
  }

  private fun Value?.safeDouble(): Double? = try {
    when {
      this == null -> null
      else -> this.asDoubleValue()
    }
  } catch (_: Throwable) {
    try {
      this?.asFloatValue()?.toDouble()
    } catch (_: Throwable) {
      try {
        this?.asIntValue()?.toDouble()
      } catch (_: Throwable) {
        null
      }
    }
  }

  private fun writeDocument(date: LocalDate, document: HealthExportDocument): String {
    val fileName = "${date.format(DateTimeFormatter.ISO_DATE)}.json"
    val payload = gson.toJson(document)
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      writeToDownloadsViaMediaStore(fileName, payload)
    } else {
      writeToPublicDownloads(fileName, payload)
    }
  }

  private fun writeToDownloadsViaMediaStore(fileName: String, payload: String): String {
    val relativePath = "${Environment.DIRECTORY_DOWNLOADS}/$EXPORT_FOLDER"
    deleteExistingDownload(fileName, relativePath)

    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
      put(MediaStore.MediaColumns.MIME_TYPE, "application/json")
      put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
    }

    val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
    val uri = context.contentResolver.insert(collection, values)
      ?: throw IllegalStateException("Could not create download item")

    context.contentResolver.openOutputStream(uri)?.bufferedWriter(Charsets.UTF_8)?.use { writer ->
      writer.write(payload)
    } ?: throw IllegalStateException("Could not open download output stream")

    return "/sdcard/Download/$EXPORT_FOLDER/$fileName"
  }

  private fun deleteExistingDownload(fileName: String, relativePath: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return

    context.contentResolver.delete(
      MediaStore.Downloads.EXTERNAL_CONTENT_URI,
      "${MediaStore.MediaColumns.DISPLAY_NAME}=? AND ${MediaStore.MediaColumns.RELATIVE_PATH}=?",
      arrayOf(fileName, "$relativePath/"),
    )
  }

  private fun writeToPublicDownloads(fileName: String, payload: String): String {
    val baseDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    val exportDir = File(baseDir, EXPORT_FOLDER)
    if (!exportDir.exists()) {
      exportDir.mkdirs()
    }
    val outFile = File(exportDir, fileName)
    FileOutputStream(outFile).bufferedWriter(Charsets.UTF_8).use { writer ->
      writer.write(payload)
    }
    return outFile.absolutePath.replace("\\", "/")
  }

  private fun persistFailure(date: LocalDate, origin: String, reason: String): ExportResult {
    val message = "Export failed for $date: $reason"
    val document = HealthExportDocument(
      status = "error",
      date = date.toString(),
      timezone = TIMEZONE,
      exportedAt = Instant.now().toString(),
      origin = origin,
      device = HealthExportDevice(watchModel = BuildConfig.WATCH_MODEL),
      summary = HealthExportSummary(),
      note = reason,
    )
    val path = runCatching { writeDocument(date, document) }.getOrNull()
    statusStore.save(message)
    return ExportResult("error", message, path)
  }
}

class ExportStatusStore(
  context: Context,
) {
  private val preferences = context.getSharedPreferences("ooku-health-exporter", Context.MODE_PRIVATE)

  fun save(status: String) {
    preferences.edit().putString("last_status", status).apply()
  }

  fun load(): String {
    return preferences.getString("last_status", "No export yet.") ?: "No export yet."
  }
}

private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { continuation ->
  addOnSuccessListener { result ->
    continuation.resume(result)
  }
  addOnFailureListener { error ->
    continuation.resumeWithException(error)
  }
}

fun exportOriginFromIntent(intentValue: String?): String {
  return if (intentValue.isNullOrBlank()) ORIGIN_ADB else intentValue
}
