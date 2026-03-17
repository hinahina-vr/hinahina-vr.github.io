package io.waddy.ookuhealthexporter

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import com.huawei.hmf.tasks.Task
import com.huawei.hms.hihealth.HuaweiHiHealth
import com.huawei.hms.hihealth.SettingController
import com.huawei.hms.hihealth.result.HealthKitAuthResult
import com.huawei.hms.support.hwid.HuaweiIdAuthManager
import com.huawei.hms.support.hwid.request.HuaweiIdAuthParams
import com.huawei.hms.support.hwid.request.HuaweiIdAuthParamsHelper
import com.huawei.hms.support.hwid.result.AuthHuaweiId
import com.huawei.hms.support.hwid.service.HuaweiIdAuthService
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
  private lateinit var authButton: Button
  private lateinit var exportTodayButton: Button
  private lateinit var exportDateButton: Button
  private lateinit var statusText: TextView

  private lateinit var exportManager: HealthExportManager
  private lateinit var statusStore: ExportStatusStore

  private var authService: HuaweiIdAuthService? = null
  private var settingController: SettingController? = null
  private var authHuaweiId: AuthHuaweiId? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    exportManager = HealthExportManager(applicationContext)
    statusStore = ExportStatusStore(applicationContext)

    authButton = findViewById(R.id.authButton)
    exportTodayButton = findViewById(R.id.exportTodayButton)
    exportDateButton = findViewById(R.id.exportDateButton)
    statusText = findViewById(R.id.statusText)

    authButton.setOnClickListener {
      startHuaweiIdSignIn()
    }
    exportTodayButton.setOnClickListener {
      launchExport(LocalDate.now(ZoneId.of("Asia/Tokyo")))
    }
    exportDateButton.setOnClickListener {
      showDatePicker()
    }

    updateStatus(statusStore.load())
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)

    when (requestCode) {
      REQUEST_SIGN_IN -> handleSignInResult(data)
      REQUEST_HEALTH_AUTH -> handleHealthAuthorizationResult(data)
    }
  }

  private fun startHuaweiIdSignIn() {
    updateStatus("Signing in with Huawei ID...")

    val authParams = HuaweiIdAuthParamsHelper(HuaweiIdAuthParams.DEFAULT_AUTH_REQUEST_PARAM)
      .setId()
      .setProfile()
      .createParams()

    authService = HuaweiIdAuthManager.getService(this, authParams)
    val signInIntent = authService?.getSignInIntent("ooku-health-exporter")
    if (signInIntent == null) {
      updateStatus("Huawei ID sign-in intent is unavailable.")
      return
    }
    startActivityForResult(signInIntent, REQUEST_SIGN_IN)
  }

  private fun handleSignInResult(data: Intent?) {
    val task: Task<AuthHuaweiId> = HuaweiIdAuthManager.parseAuthResultFromIntent(data)
    task.addOnSuccessListener { account ->
      authHuaweiId = account
      requestHealthAuthorization(account)
    }.addOnFailureListener { error ->
      updateStatus("Huawei ID sign-in failed: ${error.message}")
    }
  }

  private fun requestHealthAuthorization(account: AuthHuaweiId) {
    updateStatus("Requesting Health Kit permissions...")
    settingController = HuaweiHiHealth.getSettingController(this, account)
    val intent = settingController?.requestAuthorizationIntent(HEALTH_PERMISSION_SCOPES, false)
    if (intent == null) {
      updateStatus("Health Kit authorization intent is unavailable.")
      return
    }
    startActivityForResult(intent, REQUEST_HEALTH_AUTH)
  }

  private fun handleHealthAuthorizationResult(data: Intent?) {
    val result: HealthKitAuthResult? = settingController?.parseHealthKitAuthResultFromIntent(data)
    if (result?.isSuccess == true) {
      updateStatus("Health Kit authorization completed. Export buttons are ready.")
    } else {
      updateStatus("Health Kit authorization failed: ${result?.errorCode ?: "unknown"}")
    }
  }

  private fun launchExport(date: LocalDate) {
    updateStatus("Exporting $date ...")

    lifecycleScope.launch {
      val result = exportManager.exportDate(date)
      updateStatus(result.message)
    }
  }

  private fun showDatePicker() {
    val now = LocalDate.now(ZoneId.of("Asia/Tokyo"))
    DatePickerDialog(
      this,
      { _, year, month, dayOfMonth ->
        launchExport(LocalDate.of(year, month + 1, dayOfMonth))
      },
      now.year,
      now.monthValue - 1,
      now.dayOfMonth,
    ).show()
  }

  private fun updateStatus(message: String) {
    statusStore.save(message)
    statusText.text = message
  }

  companion object {
    private const val REQUEST_SIGN_IN = 1001
    private const val REQUEST_HEALTH_AUTH = 1002

    private val HEALTH_PERMISSION_SCOPES = arrayOf(
      "https://www.huawei.com/healthkit/step.read",
      "https://www.huawei.com/healthkit/activity.read",
      "https://www.huawei.com/healthkit/calories.read",
      "https://www.huawei.com/healthkit/distance.read",
      "https://www.huawei.com/healthkit/heartrate.read",
      "https://www.huawei.com/healthkit/hearthealth.read",
      "https://www.huawei.com/healthkit/oxygensaturation.read",
      "https://www.huawei.com/healthkit/sleep.read",
    )
  }
}
