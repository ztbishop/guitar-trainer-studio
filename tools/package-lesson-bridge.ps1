# Package only the optional Chrome extension, never lesson data or the trainer assets.
param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$extensionRoot = Join-Path $projectRoot 'extensions/lesson-bridge'
if (!$OutputDirectory) { $OutputDirectory = Join-Path $projectRoot 'dist/lesson-bridge' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$manifest = Get-Content -LiteralPath (Join-Path $extensionRoot 'manifest.json') -Raw | ConvertFrom-Json
$packagePath = Join-Path $OutputDirectory ("guitar-trainer-lesson-bridge-" + $manifest.version + '.zip')
$files = @('manifest.json','popup.html','popup.css','popup.js','scanner.js','discovery.js','transfer.js','send-job.js','send-worker.js','privacy.html','NOTICE.txt')
$files += @($manifest.icons.PSObject.Properties.Value | Sort-Object -Unique)
foreach ($file in $files) {
    if (!(Test-Path -LiteralPath (Join-Path $extensionRoot $file) -PathType Leaf)) { throw "Missing package file: $file" }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $packagePath) { Remove-Item -LiteralPath $packagePath }
$archive = [IO.Compression.ZipFile]::Open($packagePath,[IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $extensionRoot $file),$file,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $projectRoot 'LICENSE'),'LICENSE',[IO.Compression.CompressionLevel]::Optimal) | Out-Null
} finally { $archive.Dispose() }
$check = [IO.Compression.ZipFile]::OpenRead($packagePath)
try {
    if (!($check.Entries.FullName -contains 'manifest.json')) { throw 'The manifest must be at ZIP root.' }
    if ($check.Entries.Count -ne $files.Count + 1) { throw 'Unexpected package contents.' }
} finally { $check.Dispose() }
[pscustomobject]@{ Package=$packagePath; Version=$manifest.version; Files=$files.Count+1; SHA256=(Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash }
