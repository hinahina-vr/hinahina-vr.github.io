param(
  [Parameter(Mandatory = $true)]
  [string[]]$Slugs,

  [string]$SourcePath = "",

  [string]$GeneratedImagesDir = "C:\Users\wdddi\.codex\generated_images\019da329-5f71-7732-abf6-0ee9baf75d2a",

  [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Slugs.Count -lt 1 -or $Slugs.Count -gt 4) {
  throw "Slugs must contain between 1 and 4 items."
}

Add-Type -AssemblyName System.Drawing

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $PSScriptRoot "..\assets\diary-covers"
}

if ([string]::IsNullOrWhiteSpace($SourcePath)) {
  $SourcePath = Get-ChildItem -LiteralPath $GeneratedImagesDir -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Source image not found: $SourcePath"
}

$bitmap = [System.Drawing.Bitmap]::FromFile($SourcePath)
try {
  $halfWidth = [int]($bitmap.Width / 2)
  $halfHeight = [int]($bitmap.Height / 2)
  $slots = @(
    @{ X = 0; Y = 0 },
    @{ X = $halfWidth; Y = 0 },
    @{ X = 0; Y = $halfHeight },
    @{ X = $halfWidth; Y = $halfHeight }
  )

  for ($i = 0; $i -lt $Slugs.Count; $i += 1) {
    $slot = $slots[$i]
    $cropRect = New-Object System.Drawing.Rectangle($slot.X, $slot.Y, $halfWidth, $halfHeight)
    $cropped = $bitmap.Clone($cropRect, $bitmap.PixelFormat)
    try {
      $target = New-Object System.Drawing.Bitmap(1536, 1024)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        try {
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.DrawImage($cropped, 0, 0, 1536, 1024)
        }
        finally {
          $graphics.Dispose()
        }

        $outPath = Join-Path $OutputDir ("{0}.png" -f $Slugs[$i])
        $target.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output $outPath
      }
      finally {
        $target.Dispose()
      }
    }
    finally {
      $cropped.Dispose()
    }
  }
}
finally {
  $bitmap.Dispose()
}
