param(
  [string]$SdkRoot = "$env:LOCALAPPDATA\Android\Sdk",
  [string]$JavaHome = "C:\Program Files\ojdkbuild\java-17-openjdk-17.0.3.0.6-1",
  [string[]]$Packages = @(
    "platform-tools",
    "platforms;android-34",
    "build-tools;34.0.0"
  )
)

$ErrorActionPreference = "Stop"

$cmdlineRoot = Join-Path $SdkRoot "cmdline-tools"
$latestRoot = Join-Path $cmdlineRoot "latest"
$sdkManager = Join-Path $latestRoot "bin\sdkmanager.bat"
$zipPath = Join-Path $env:TEMP "commandlinetools-win-14742923_latest.zip"
$extractRoot = Join-Path $env:TEMP "android-cmdline-tools-extract"

New-Item -ItemType Directory -Force -Path $latestRoot | Out-Null

if (-not (Test-Path $sdkManager)) {
  Invoke-WebRequest -UseBasicParsing "https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip" -OutFile $zipPath
  Remove-Item $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
  Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force
  Copy-Item (Join-Path $extractRoot "cmdline-tools\*") $latestRoot -Recurse -Force
}

if (-not (Test-Path (Join-Path $JavaHome "bin\java.exe"))) {
  throw "JAVA_HOME is invalid: $JavaHome"
}

$env:JAVA_HOME = $JavaHome
$env:PATH = "$JavaHome\bin;$env:PATH"

$packageArgs = @("--sdk_root=$SdkRoot") + $Packages
$licenseAnswer = [string]::Join([Environment]::NewLine, @("y","y","y","y","y","y","y","y","y","y"))

$licenseAnswer | & $sdkManager --sdk_root=$SdkRoot --licenses | Out-Null
& $sdkManager @packageArgs

Write-Output "Installed Android SDK packages into $SdkRoot"
