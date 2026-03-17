package io.waddy.ookuhealthexporter

data class HealthExportDocument(
  val version: Int = 1,
  val status: String,
  val date: String,
  val timezone: String,
  val source: String = "huawei-health-kit-android",
  val exportedAt: String,
  val origin: String,
  val device: HealthExportDevice,
  val summary: HealthExportSummary,
  val note: String? = null,
)

data class HealthExportDevice(
  val watchModel: String,
  val phonePlatform: String = "android",
)

data class HealthExportSummary(
  val sleep: SleepSummary = SleepSummary(),
  val activity: ActivitySummary = ActivitySummary(),
  val vitals: VitalsSummary = VitalsSummary(),
)

data class SleepSummary(
  val totalMinutes: Int? = null,
  val deepMinutes: Int? = null,
  val lightMinutes: Int? = null,
  val remMinutes: Int? = null,
  val awakeMinutes: Int? = null,
  val startAt: String? = null,
  val endAt: String? = null,
)

data class ActivitySummary(
  val steps: Int? = null,
  val distanceMeters: Double? = null,
  val activeCaloriesKcal: Double? = null,
  val exerciseMinutes: Int? = null,
)

data class VitalsSummary(
  val restingHeartRateBpm: Int? = null,
  val averageHeartRateBpm: Int? = null,
  val minSpO2Pct: Int? = null,
)

data class ExportResult(
  val status: String,
  val message: String,
  val devicePath: String?,
)
