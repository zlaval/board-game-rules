$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    & "$PSScriptRoot/setup.ps1"
    $composeArgs = @('compose', '--env-file', 'infra/.env', '-f', 'infra/compose.yaml')
    & docker @composeArgs build
    if ($LASTEXITCODE -ne 0) { throw 'Docker build failed.' }

    # Probe the actual worker runtime, not just the host graphics card.
    $gpuAvailable = $false
    try {
        & docker run --rm --gpus all --entrypoint python board-game-rules-worker -m app.acceleration
        $gpuAvailable = $LASTEXITCODE -eq 0
    } catch {
        Write-Host 'Docker GPU probe failed; falling back to CPU.'
    }
    if ($gpuAvailable) {
        Write-Host 'CUDA available: enabling GPU worker with CPU fallback.'
        $composeArgs += @('-f', 'infra/compose.gpu.yaml')
    } else {
        Write-Host 'CUDA unavailable in Docker: using CPU worker.'
    }
    & docker @composeArgs up -d
    if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed.' }
} finally {
    Pop-Location
}
