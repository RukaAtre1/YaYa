param(
  [Parameter(Mandatory = $true)]
  [string]$ExporterPath,

  [Parameter(Mandatory = $true)]
  [string]$Token,

  [Parameter(Mandatory = $true)]
  [string]$ChannelId,

  [string]$Format = "Json",

  [string]$OutputPath = ".\\exports\\discord-history.json"
)

$resolvedExporter = Resolve-Path $ExporterPath
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDir = Split-Path $resolvedOutput -Parent

if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

& $resolvedExporter "export" "-t" $Token "-c" $ChannelId "-f" $Format "-o" $resolvedOutput
Write-Output $resolvedOutput
