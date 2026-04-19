param(
  [Parameter(Mandatory = $true)]
  [string]$Slug,

  [string]$GeneratedImagesDir = "C:\Users\wdddi\.codex\generated_images\019da329-5f71-7732-abf6-0ee9baf75d2a",

  [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $PSScriptRoot "..\assets\diary-covers"
}

$latest = Get-ChildItem -LiteralPath $GeneratedImagesDir -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latest) {
  throw "No generated image found in $GeneratedImagesDir"
}

$destination = Join-Path $OutputDir ("{0}.png" -f $Slug)
Copy-Item -LiteralPath $latest.FullName -Destination $destination -Force
Write-Output $destination
