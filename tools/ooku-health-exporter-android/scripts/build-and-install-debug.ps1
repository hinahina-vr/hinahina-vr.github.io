param(
  [string]$JavaHome = "C:\Program Files\ojdkbuild\java-17-openjdk-17.0.3.0.6-1",
  [string]$AdbPath = "adb",
  [string]$Serial = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localProperties = Join-Path $projectRoot "local.properties"
$agcConfig = Join-Path $projectRoot "app\agconnect-services.json"
$gradleWrapper = Join-Path $projectRoot "gradlew.bat"
$apkPath = Join-Path $projectRoot "app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $localProperties)) {
  throw "Missing local.properties: $localProperties"
}

if (-not (Test-Path $agcConfig)) {
  throw "Missing agconnect-services.json: $agcConfig"
}

$localContent = Get-Content $localProperties -Raw
if ($localContent -match "ooku\.health\.huaweiAppId\s*=\s*APP_ID") {
  throw "local.properties still contains placeholder APP_ID"
}

if (-not (Test-Path (Join-Path $JavaHome "bin\java.exe"))) {
  throw "JAVA_HOME is invalid: $JavaHome"
}

$env:JAVA_HOME = $JavaHome
$env:PATH = "$JavaHome\bin;$env:PATH"

$adbArgs = @()
if ($Serial) {
  $adbArgs += @("-s", $Serial)
}

& $AdbPath @adbArgs devices | Out-Host
& $gradleWrapper -p $projectRoot app:assembleDebug

if (-not (Test-Path $apkPath)) {
  throw "APK not found: $apkPath"
}

& $AdbPath @adbArgs install -r $apkPath
& $AdbPath @adbArgs shell am start -n "io.waddy.ookuhealthexporter/.MainActivity"

Write-Output "Installed and launched debug app: $apkPath"
