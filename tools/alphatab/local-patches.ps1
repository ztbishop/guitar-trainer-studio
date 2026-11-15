# Updater-only helpers. Patch the verified staging directory, never the live bundle.
function Get-LocalAlphaTabPlan([string]$ToolRoot, [string[]]$BundleNames) {
    $plan = Get-Content -LiteralPath (Join-Path $ToolRoot 'patches.json') -Raw | ConvertFrom-Json
    if ($plan.qualifiedVersion -notmatch '^\d+\.\d+\.\d+$' -or @($plan.patches).Count -eq 0) { throw 'Invalid alphaTab patch plan.' }
    $covered = @()
    $patchNames = @()
    foreach ($patch in $plan.patches) {
        if ($patch.file -notmatch '^alphaTab-[a-z0-9-]+\.patch$' -or $patchNames -contains $patch.file -or
                [string]::IsNullOrWhiteSpace($patch.description) -or @($patch.targets).Count -eq 0 -or
                @($patch.targets | Where-Object { $_ -cnotin $BundleNames }).Count -gt 0) { throw 'Invalid alphaTab patch entry.' }
        $covered += @($patch.targets)
        $patchNames += $patch.file
    }
    foreach ($reference in $plan.referencePatches) {
        if ($reference -notmatch '^alphaTab-[a-z0-9-]+\.patch$' -or $patchNames -contains $reference) { throw 'Invalid alphaTab source-reference entry.' }
        $patchNames += $reference
    }
    $licenseRoot = Join-Path $ToolRoot '..\..\docs\licenses'
    $onDisk = @(Get-ChildItem -LiteralPath $licenseRoot -File -Filter 'alphaTab-*.patch' | Select-Object -ExpandProperty Name)
    if (Compare-Object @($patchNames | Sort-Object) @($onDisk | Sort-Object) -CaseSensitive) {
        throw 'Patch inventory and docs/licenses disagree. Register every alphaTab patch before upgrading.'
    }
    $pinned = @($plan.bundles.PSObject.Properties.Name)
    if (Compare-Object @($covered | Sort-Object -Unique) @($pinned | Sort-Object)) { throw 'Patch plan and qualified bundle list disagree.' }
    foreach ($file in $pinned) {
        if ($plan.bundles.$file.upstream -notmatch '^[a-f0-9]{64}$' -or $plan.bundles.$file.patched -notmatch '^[a-f0-9]{64}$') { throw "Missing qualified hashes for $file." }
    }
    return $plan
}

function Get-AlphaTabHash([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Invoke-LocalAlphaTabPatches($Plan, [string]$Prepared, [string]$StageRoot, [string]$RepoRoot, [string]$Version) {
    $git = (Get-Command git -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $qualified = $Version -ceq $Plan.qualifiedVersion
    $upstream = [ordered]@{}
    $modifications = [ordered]@{}
    foreach ($file in $Plan.bundles.PSObject.Properties.Name) {
        $upstream[$file] = Get-AlphaTabHash (Join-Path $Prepared $file)
        if ($qualified -and $upstream[$file] -cne $Plan.bundles.$file.upstream) { throw "Unrecognized upstream bytes for qualified $file." }
    }
    # Do not discover the enclosing application repository or inherit its index.
    # Use upstream LF bytes even if the user's Git checkout converts text to CRLF.
    $priorCeiling = $env:GIT_CEILING_DIRECTORIES
    try {
        $env:GIT_CEILING_DIRECTORIES = Split-Path -Parent $Prepared
        foreach ($patch in $Plan.patches) {
            $source = Join-Path (Join-Path $RepoRoot 'docs\licenses') $patch.file
            $contents = [IO.File]::ReadAllText($source).Replace("`r`n", "`n")
            foreach ($marker in @('--- a', '+++ b')) {
                $found = @([regex]::Matches($contents, ('(?m)^' + [regex]::Escape($marker) + '/assets/vendor/alphatab/([^\r\n]+)$')) | ForEach-Object { $_.Groups[1].Value })
                $total = [regex]::Matches($contents, ('(?m)^' + [regex]::Escape($marker.Substring(0, 4)))).Count
                if ($total -ne $found.Count -or $found.Count -ne @($patch.targets).Count -or
                        (Compare-Object @($patch.targets | Sort-Object) @($found | Sort-Object) -CaseSensitive)) { throw "Unexpected paths in $($patch.file)." }
            }
            $local = Join-Path $StageRoot $patch.file
            [IO.File]::WriteAllText($local, $contents, (New-Object Text.UTF8Encoding($false)))
            & $git -C $Prepared -c core.autocrlf=false -c core.eol=lf apply --check -p4 -- $local
            if ($LASTEXITCODE -ne 0) { throw "Patch context changed: $($patch.file). See docs/ALPHATAB-UPGRADES.md for the search anchors and checks." }
            & $git -C $Prepared -c core.autocrlf=false -c core.eol=lf apply -p4 -- $local
            if ($LASTEXITCODE -ne 0) { throw "Could not apply $($patch.file) to the staged candidate." }
            foreach ($file in $patch.targets) {
                $note = "$($patch.description) (docs/licenses/$($patch.file))"
                $modifications[$file] = if ($modifications.Contains($file)) { $modifications[$file] + '; ' + $note } else { $note }
            }
            Write-Host "Applied $($patch.file) to staged files."
        }
    } finally {
        $env:GIT_CEILING_DIRECTORIES = $priorCeiling
    }
    foreach ($file in $Plan.bundles.PSObject.Properties.Name) {
        if ($qualified -and (Get-AlphaTabHash (Join-Path $Prepared $file)) -cne $Plan.bundles.$file.patched) { throw "Patched $file does not match its qualified hash." }
    }
    return @{upstream = $upstream; modifications = $modifications}
}
