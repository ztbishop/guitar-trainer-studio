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
    'font/Bravura.woff2', 'soundfont/sonivox.sf2',
    'font/Bravura-OFL.txt', 'font/Bravura-OFL-FAQ.txt', 'font/Bravura-FONTLOG.txt',
    'soundfont/LICENSE', 'soundfont/README.md')

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
function Write-FixtureBundle([string]$Path, [string]$Version, [string]$Marker) {
    [IO.File]::WriteAllText($Path, "/*! alphaTab v$Version (test fixture) */`n// before`n$Marker`n// after`n")
}
function Build-Package([switch]$MissingCore, [switch]$MissingLicense, [switch]$Drift) {
    $packageRoot = Join-Path $fixtureRoot 'package'
    New-Item -ItemType Directory -Path (Join-Path $packageRoot 'dist') -Force | Out-Null
    @{name = '@coderline/alphatab'; version = $testVersion} | ConvertTo-Json | Set-Content (Join-Path $packageRoot 'package.json')
    foreach ($notice in @('LICENSE', 'LICENSE.header')) {
        Set-Content -LiteralPath (Join-Path $packageRoot $notice) -Value "Upstream $notice fixture"
    }
    foreach ($file in $files) {
        $path = Join-Path (Join-Path $packageRoot 'dist') $file
        New-Item -ItemType Directory -Path (Split-Path -Parent $path) -Force | Out-Null
        Set-Content -LiteralPath $path -Value "/*! alphaTab v$testVersion (test fixture) */"
    }
    Write-FixtureBundle (Join-Path $packageRoot 'dist\alphaTab.js') $testVersion $(if ($Drift) { '// upstream changed' } else { '// upstream' })
    if ($MissingCore) { Remove-Item -LiteralPath (Join-Path $packageRoot 'dist\alphaTab.core.mjs') }
    if ($MissingLicense) { Remove-Item -LiteralPath (Join-Path $packageRoot 'LICENSE') }
    & tar.exe -czf $fixtureArchive -C $fixtureRoot package
    Assert ($LASTEXITCODE -eq 0) 'Failed to build fixture archive'
    $sha = [Security.Cryptography.SHA512]::Create()
    $stream = [IO.File]::OpenRead($fixtureArchive)
    try { $script:testIntegrity = 'sha512-' + [Convert]::ToBase64String($sha.ComputeHash($stream)) }
    finally { $stream.Dispose(); $sha.Dispose() }
}
try {
    New-Item -ItemType Directory -Path $fixtureTool, $fixtureVendor, (Join-Path $fixtureRepo 'js') -Force | Out-Null
    foreach ($script in @('update-alphatab.ps1', 'local-patches.ps1')) {
        Copy-Item -LiteralPath (Join-Path $toolRoot $script) -Destination $fixtureTool
    }
    $licenseRoot = Join-Path $fixtureRepo 'docs\licenses'
    New-Item -ItemType Directory -Path $licenseRoot -Force | Out-Null
    @'
--- a/assets/vendor/alphatab/alphaTab.js
+++ b/assets/vendor/alphatab/alphaTab.js
@@ -2,3 +2,3 @@
 // before
-// upstream
+// local patch
 // after
'@ | Set-Content -LiteralPath (Join-Path $licenseRoot 'alphaTab-test.patch')
    $raw = Join-Path $fixtureRoot 'raw.js'
    $patched = Join-Path $fixtureRoot 'patched.js'
    Write-FixtureBundle $raw $testVersion '// upstream'
    Write-FixtureBundle $patched $testVersion '// local patch'
    $plan = @{
        qualifiedVersion = $testVersion
        referencePatches = @()
        patches = @(@{file = 'alphaTab-test.patch'; targets = @('alphaTab.js'); description = 'Synthetic local patch'})
        bundles = @{'alphaTab.js' = @{
            upstream = (Get-FileHash $raw).Hash.ToLowerInvariant()
            patched = (Get-FileHash $patched).Hash.ToLowerInvariant()
        }}
    }
    $planFile = Join-Path $fixtureTool 'patches.json'
    $plan | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $planFile
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
    Assert ($manifest.version -eq $testVersion -and @($manifest.files.PSObject.Properties).Count -eq 17) 'Incomplete manifest'
    Assert ($manifest.upstreamFiles.'alphaTab.js' -eq $plan.bundles.'alphaTab.js'.upstream) 'Upstream hash not recorded'
    Assert ($manifest.modifications.'alphaTab.js' -match 'alphaTab-test\.patch') 'Patch provenance not recorded'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'alphaTab.js')).Hash.ToLowerInvariant() -eq $plan.bundles.'alphaTab.js'.patched) 'Installed bundle is missing the patch'
    foreach ($notice in @('LICENSE', 'LICENSE.header', 'font/Bravura-OFL.txt', 'soundfont/LICENSE')) {
        Assert (Test-Path (Join-Path $fixtureVendor $notice)) "Missing installed notice: $notice"
        Assert ($manifest.files.$notice -eq (Get-FileHash (Join-Path $fixtureVendor $notice) -Algorithm SHA256).Hash.ToLowerInvariant()) "Notice hash mismatch: $notice"
    }
    $backups = @(Get-ChildItem (Join-Path $fixtureTool '.backups') -Directory)
    Assert ($backups.Count -eq 1 -and (Test-Path (Join-Path $backups[0].FullName 'old-marker.txt'))) 'Previous bundle was not preserved'
    $acceptedHash = (Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash
    $unregistered = Join-Path $licenseRoot 'alphaTab-unregistered.patch'
    Set-Content -LiteralPath $unregistered 'unregistered patch fixture'
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Unregistered patch was ignored'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Inventory guard touched vendor'
    Remove-Item -LiteralPath $unregistered
    $approved = $testVersion
    $testVersion = '1.8.5'
    Build-Package
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Unqualified version was installed'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Version guard touched vendor'
    & $updater -Version $testVersion -PrepareOnly
    Assert ($LASTEXITCODE -eq 0) 'Could not prepare an unqualified candidate'
    $candidates = @(Get-ChildItem (Join-Path $fixtureTool '.work') -Directory)
    Assert ($candidates.Count -eq 1 -and (Test-Path (Join-Path $candidates[0].FullName 'alphatab.tgz'))) 'Candidate archive was not retained'
    Assert ((Get-Content (Join-Path $candidates[0].FullName 'package\dist\alphaTab.js') -Raw).Contains('// local patch')) 'Candidate did not get the patch'
    Build-Package -Drift
    & $updater -Version $testVersion -PrepareOnly
    Assert ($LASTEXITCODE -eq 1) 'Changed patch context was accepted'
    Assert (@(Get-ChildItem (Join-Path $fixtureTool '.work') -Directory).Count -eq 2) 'Failed candidate was not retained for porting'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Candidate preparation touched vendor'
    $testVersion = $approved
    Build-Package -Drift
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Unexpected bytes for the qualified release were installed'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Upstream hash guard touched vendor'
    Build-Package
    $correct = $plan.bundles.'alphaTab.js'.patched
    $plan.bundles.'alphaTab.js'.patched = $plan.bundles.'alphaTab.js'.upstream
    $plan | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $planFile
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Unqualified patch output was installed'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Patched hash guard touched vendor'
    $plan.bundles.'alphaTab.js'.patched = $correct
    $plan | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $planFile
    $breakIntegrity = $true
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Bad integrity was accepted'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Integrity failure touched vendor'
    $breakIntegrity = $false
    Build-Package -MissingCore
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Missing core module was accepted'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Missing asset touched vendor'
    Build-Package -MissingLicense
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Missing license was accepted'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Missing license touched vendor'
    Build-Package
    $failInstallMove = $true
    & $updater -Version $testVersion
    Assert ($LASTEXITCODE -eq 1) 'Simulated failed installation reported success'
    Assert ((Get-FileHash (Join-Path $fixtureVendor 'vendor-manifest.json')).Hash -eq $acceptedHash) 'Failed move did not restore vendor'
    $failInstallMove = $false
    Write-Host 'PASS: staged patch replay, version and hash gates, context drift, check-only, complete install/backup, integrity failure, missing asset/license, and rollback.'
} finally {
    $resolved = [IO.Path]::GetFullPath($fixtureRoot)
    if (-not $resolved.StartsWith($toolRoot + '\.work\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid fixture cleanup path' }
    if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
