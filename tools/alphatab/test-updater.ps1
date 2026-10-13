# Isolated maintenance tests; no network or real vendor changes.
$ErrorActionPreference = 'Stop'
$toolRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$fixtureRoot = Join-Path $toolRoot ('.work\test-' + [Guid]::NewGuid().ToString('N'))
$fixtureRepo = Join-Path $fixtureRoot 'repo'
$fixtureTool = Join-Path $fixtureRepo 'tools\alphatab'
$fixtureVendor = Join-Path $fixtureRepo 'assets\vendor\alphatab'
$fixtureArchive = Join-Path $fixtureRoot 'package.tgz'
$testVersion = '1.8.4'
$testIntegrity = ''
$breakIntegrity = $false
$failInstallMove = $false
$files = @('alphaTab.js', 'alphaTab.core.mjs', 'alphaTab.worker.mjs', 'alphaTab.worklet.mjs',
    'font/Bravura.eot', 'font/Bravura.otf', 'font/Bravura.svg', 'font/Bravura.woff',
    'font/Bravura.woff2', 'soundfont/sonivox.sf2')

function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}
function Invoke-RestMethod {
    param($Uri, $TimeoutSec)
    return @{name = '@coderline/alphatab'; version = $testVersion; dist = @{
        tarball = 'https://registry.npmjs.org/test-package.tgz'
        integrity = if ($breakIntegrity) { 'sha512-AAAA' } else { $testIntegrity }
    }}
}
function Invoke-WebRequest {
    param([switch]$UseBasicParsing, $Uri, $OutFile, $TimeoutSec)
    Copy-Item -LiteralPath $fixtureArchive -Destination $OutFile
}
function Move-Item {
    param($LiteralPath, $Destination)
    if ($failInstallMove -and $LiteralPath -like '*package\dist' -and $Destination -eq $fixtureVendor) {
        throw 'Simulated install move failure'
    }
    Microsoft.PowerShell.Management\Move-Item -LiteralPath $LiteralPath -Destination $Destination
}
function Build-Package([switch]$MissingCore) {
    $packageRoot = Join-Path $fixtureRoot 'package'
    New-Item -ItemType Directory -Path (Join-Path $packageRoot 'dist') -Force | Out-Null
    @{name = '@coderline/alphatab'; version = $testVersion} | ConvertTo-Json | Set-Content (Join-Path $packageRoot 'package.json')
    foreach ($file in $files) {
        $path = Join-Path (Join-Path $packageRoot 'dist') $file
        New-Item -ItemType Directory -Path (Split-Path -Parent $path) -Force | Out-Null
        Set-Content -LiteralPath $path -Value "/*! alphaTab v$testVersion (test fixture) */"
    }
    if ($MissingCore) { Remove-Item -LiteralPath (Join-Path $packageRoot 'dist\alphaTab.core.mjs') }
    & tar.exe -czf $fixtureArchive -C $fixtureRoot package
    Assert ($LASTEXITCODE -eq 0) 'Failed to build fixture archive'
    $sha = [Security.Cryptography.SHA512]::Create()
    $stream = [IO.File]::OpenRead($fixtureArchive)
    try { $script:testIntegrity = 'sha512-' + [Convert]::ToBase64String($sha.ComputeHash($stream)) }
    finally { $stream.Dispose(); $sha.Dispose() }
}
try {
    New-Item -ItemType Directory -Path $fixtureTool, $fixtureVendor, (Join-Path $fixtureRepo 'js') -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $toolRoot 'update-alphatab.ps1') -Destination $fixtureTool
    Set-Content (Join-Path $fixtureRepo 'js\alphatab-host.js') '// fixture'
    Set-Content (Join-Path $fixtureVendor 'alphaTab.js') '/*! alphaTab v1.8.1 */'
    Set-Content (Join-Path $fixtureVendor 'old-marker.txt') 'previous bundle'
    $updater = Join-Path $fixtureTool 'update-alphatab.ps1'
    Build-Package
    & $updater -CheckOnly
    Assert ($LASTEXITCODE -eq 0) 'Check-only failed'
    Assert (Test-Path (Join-Path $fixtureVendor 'old-marker.txt')) 'Check-only touched vendor'
    Assert (-not (Test-Path (Join-Path $fixtureTool '.backups'))) 'Check-only created a backup'
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 0) 'Install failed'
    $manifest = Get-Content (Join-Path $fixtureVendor 'vendor-manifest.json') -Raw | ConvertFrom-Json
    Assert ($manifest.version -eq $testVersion -and @($manifest.files.PSObject.Properties).Count -eq 10) 'Incomplete manifest'
    $backups = @(Get-ChildItem (Join-Path $fixtureTool '.backups') -Directory)
    Assert ($backups.Count -eq 1 -and (Test-Path (Join-Path $backups[0].FullName 'old-marker.txt'))) 'Previous bundle was not preserved'
    $acceptedHash = (Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash
    $breakIntegrity = $true
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Bad integrity was accepted'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Integrity failure touched vendor'
    $breakIntegrity = $false
    Build-Package -MissingCore
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Missing core module was accepted'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Missing asset touched vendor'
    Build-Package
    $failInstallMove = $true
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Simulated failed installation reported success'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Failed move did not restore vendor'
    $failInstallMove = $false
    Write-Host 'PASS: check-only, complete install/backup, integrity failure, missing asset, and installation rollback.'
} finally {
    $resolved = [IO.Path]::GetFullPath($fixtureRoot)
    if (-not $resolved.StartsWith($toolRoot + '\.work\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid fixture cleanup path' }
    if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
