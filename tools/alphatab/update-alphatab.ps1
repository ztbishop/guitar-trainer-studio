# Maintenance only: the browser app continues using bundled local assets.
[CmdletBinding()]
param(
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Windows PowerShell 5.1 otherwise may negotiate obsolete TLS defaults.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$toolRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$repoRoot = [IO.Path]::GetFullPath((Join-Path $toolRoot '..\..'))
$vendorRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'assets\vendor\alphatab'))
$stageRoot = Join-Path $toolRoot ('.work\' + [Guid]::NewGuid().ToString('N'))
$backupRoot = Join-Path $toolRoot ('.backups\' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N'))
$exitCode = 0
$requiredFiles = @(
    'alphaTab.js', 'alphaTab.core.mjs', 'alphaTab.worker.mjs', 'alphaTab.worklet.mjs',
    'font/Bravura.eot', 'font/Bravura.otf', 'font/Bravura.svg',
    'font/Bravura.woff', 'font/Bravura.woff2', 'soundfont/sonivox.sf2',
    'font/Bravura-OFL.txt', 'font/Bravura-OFL-FAQ.txt', 'font/Bravura-FONTLOG.txt',
    'soundfont/LICENSE', 'soundfont/README.md'
)
$packageNotices = @('LICENSE', 'LICENSE.header')

function Assert-ToolPath([string]$Path) {
    $resolved = [IO.Path]::GetFullPath($Path)
    if (-not $resolved.StartsWith($toolRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Maintenance path is outside tools/alphatab: $resolved"
    }
}

function Get-Download([string]$Url, [string]$Destination) {
    # Retry transient network failures without touching installed assets.
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Destination -TimeoutSec 180
            return
        } catch {
            if ($attempt -eq 3) { throw }
            Write-Host "Download failed; retrying ($attempt/3)..."
            Start-Sleep -Seconds 2
        }
    }
}

try {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'js\alphatab-host.js') -PathType Leaf)) {
        throw 'Run this tool from its tools/alphatab folder inside GuitarTrainerStudio.'
    }
    $tarCommand = Get-Command tar.exe -ErrorAction Stop
    $installed = 'unknown'
    $installedScript = Join-Path $vendorRoot 'alphaTab.js'
    if (Test-Path -LiteralPath $installedScript) {
        $header = Get-Content -LiteralPath $installedScript -TotalCount 5
        if (($header -join "`n") -match 'alphaTab v(\d+\.\d+\.\d+)') { $installed = $Matches[1] }
    }
    Write-Host "Installed alphaTab: $installed"
    if (-not $Version) {
        $latest = Invoke-RestMethod -Uri 'https://registry.npmjs.org/@coderline/alphatab/latest' -TimeoutSec 60
        $suggested = [string]$latest.version
        if ($suggested -notmatch '^\d+\.\d+\.\d+$') { throw 'The registry latest tag is not a stable version. Specify -Version explicitly.' }
        if ($CheckOnly) { $Version = $suggested }
        else {
            $choice = Read-Host "Version to install [$suggested] (Enter selects latest stable; Ctrl+C cancels)"
            $Version = if ([string]::IsNullOrWhiteSpace($choice)) { $suggested } else { $choice.Trim() }
        }
    }
    if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Use a stable version such as 1.8.4.' }
    Write-Host "Preparing alphaTab $Version from the official npm package..."
    $metadata = Invoke-RestMethod -Uri "https://registry.npmjs.org/@coderline/alphatab/$Version" -TimeoutSec 60
    if ($metadata.name -ne '@coderline/alphatab' -or $metadata.version -ne $Version) { throw 'Unexpected package metadata.' }
    $packageUrl = [Uri]$metadata.dist.tarball
    if ($packageUrl.Scheme -ne 'https' -or $packageUrl.Host -ne 'registry.npmjs.org') { throw 'Unexpected package download host.' }
    $integrity = [string]$metadata.dist.integrity
    if ($integrity -notmatch '^sha512-([A-Za-z0-9+/]+={0,2})$') { throw 'Package metadata has no supported SHA-512 integrity value.' }
    $expectedDigest = $Matches[1]
    Assert-ToolPath $stageRoot
    New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
    $archive = Join-Path $stageRoot 'alphatab.tgz'
    Get-Download $packageUrl.AbsoluteUri $archive
    $sha = [Security.Cryptography.SHA512]::Create()
    $stream = [IO.File]::OpenRead($archive)
    try { $actualDigest = [Convert]::ToBase64String($sha.ComputeHash($stream)) }
    finally { $stream.Dispose(); $sha.Dispose() }
    if ($actualDigest -cne $expectedDigest) { throw 'Package integrity verification failed; installed files were not touched.' }

    # Keep original notices alongside runtime files; fail closed if any are missing.
    $extractEntries = @('package/package.json') + @($packageNotices | ForEach-Object { 'package/' + $_ }) + @($requiredFiles | ForEach-Object { 'package/dist/' + $_ })
    & $tarCommand.Source -xzf $archive -C $stageRoot -- @extractEntries
    if ($LASTEXITCODE -ne 0) { throw 'Package extraction failed or required assets are missing.' }
    $package = Get-Content -LiteralPath (Join-Path $stageRoot 'package\package.json') -Raw | ConvertFrom-Json
    if ($package.name -ne '@coderline/alphatab' -or $package.version -ne $Version) { throw 'Extracted package version does not match.' }
    $prepared = Join-Path $stageRoot 'package\dist'
    foreach ($notice in $packageNotices) {
        Copy-Item -LiteralPath (Join-Path (Join-Path $stageRoot 'package') $notice) -Destination (Join-Path $prepared $notice)
    }
    $fileHashes = [ordered]@{}
    foreach ($file in ($requiredFiles + $packageNotices)) {
        $path = Join-Path $prepared $file
        if (-not (Test-Path -LiteralPath $path -PathType Leaf) -or (Get-Item -LiteralPath $path).Length -eq 0) { throw "Missing or empty asset: $file" }
        $fileHashes[$file] = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    foreach ($file in @('alphaTab.js', 'alphaTab.core.mjs', 'alphaTab.worker.mjs', 'alphaTab.worklet.mjs')) {
        $header = (Get-Content -LiteralPath (Join-Path $prepared $file) -TotalCount 5) -join "`n"
        if ($header -notmatch ('alphaTab v' + [regex]::Escape($Version) + '(?:\s|\()')) { throw "Wrong version header in $file" }
    }
    $record = [ordered]@{
        package = '@coderline/alphatab'; version = $Version
        source = $packageUrl.AbsoluteUri; integrity = $integrity; files = $fileHashes
    }
    $record | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $prepared 'vendor-manifest.json') -Encoding UTF8
    Write-Host 'Package integrity, version, runtime assets and required license notices verified.'
    if ($CheckOnly) {
        Write-Host 'Check only: installed assets have not changed.'
    } else {
        # These absolute paths are fixed within this checkout before any directory move.
        $expectedVendor = [IO.Path]::GetFullPath((Join-Path $repoRoot 'assets\vendor\alphatab'))
        if ($vendorRoot -ne $expectedVendor -or -not $vendorRoot.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid vendor destination.' }
        Assert-ToolPath $prepared
        Assert-ToolPath $backupRoot
        New-Item -ItemType Directory -Path (Split-Path -Parent $backupRoot) -Force | Out-Null
        New-Item -ItemType Directory -Path (Split-Path -Parent $vendorRoot) -Force | Out-Null
        $hadPrevious = Test-Path -LiteralPath $vendorRoot -PathType Container
        if ($hadPrevious) { Move-Item -LiteralPath $vendorRoot -Destination $backupRoot }
        try { Move-Item -LiteralPath $prepared -Destination $vendorRoot }
        catch {
            if ($hadPrevious -and -not (Test-Path -LiteralPath $vendorRoot)) {
                Move-Item -LiteralPath $backupRoot -Destination $vendorRoot
            }
            throw
        }
        Write-Host "Installed alphaTab $Version."
        if ($hadPrevious) { Write-Host "Previous assets retained at: $backupRoot" }
        Write-Host 'Hard-refresh Live Server, run the regression suite, and check playback/feedback with Fishman.'
        Write-Host 'Review git diff, then commit and push when satisfied. This tool performs no Git publishing.'
    }
} catch {
    Write-Host "Update failed: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
} finally {
    if (Test-Path -LiteralPath $stageRoot) {
        Assert-ToolPath $stageRoot
        try { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
        catch { Write-Warning "Temporary files could not be removed: $stageRoot" }
    }
}
exit $exitCode
