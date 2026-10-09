param(
    [string]$Namespace = 'zalerix',
    [ValidateSet('api', 'frontend', 'cpu', 'cuda')]
    [string[]]$Components = @('api', 'frontend', 'cpu', 'cuda'),
    [switch]$BuildOnly,
    [switch]$PushOnly
)
$ErrorActionPreference = 'Stop'
if ($BuildOnly -and $PushOnly) { throw 'Choose BuildOnly or PushOnly, not both.' }
if ($Namespace -notmatch '^[a-z0-9][a-z0-9_-]+$') { throw 'Invalid Docker Hub namespace.' }
$rootPath = Split-Path $PSScriptRoot -Parent
$version = (Get-Content (Join-Path $rootPath 'release/VERSION') -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release/VERSION.' }
$revision = (& git -C $rootPath rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot read the source revision.' }
$images = @(
    @{Component='api'; Name='ruleshelf-api'; Dockerfile='infra/Dockerfile.api'; Tag=$version},
    @{Component='frontend'; Name='ruleshelf-frontend'; Dockerfile='infra/Dockerfile.frontend'; Tag=$version},
    @{Component='cpu'; Name='ruleshelf-worker'; Dockerfile='infra/Dockerfile.worker'; Tag="$version-cpu"; TorchIndex='https://download.pytorch.org/whl/cpu'},
    @{Component='cuda'; Name='ruleshelf-worker'; Dockerfile='infra/Dockerfile.worker'; Tag="$version-cuda"; TorchIndex='https://download.pytorch.org/whl/cu130'}
)
$images = @($images | Where-Object { $_.Component -in $Components })
foreach ($image in $images) {
    $imageRef = "$Namespace/$($image.Name):$($image.Tag)"
    if (-not $PushOnly) {
        $buildArgs = @('build', '--platform', 'linux/amd64', '-f', (Join-Path $rootPath $image.Dockerfile), '-t', $imageRef,
            '--label', "org.opencontainers.image.version=$version",
            '--label', "org.opencontainers.image.revision=$revision",
            '--label', 'org.opencontainers.image.source=https://github.com/zlaval/board-game-rules')
        if ($image.TorchIndex) { $buildArgs += @('--build-arg', "TORCH_INDEX_URL=$($image.TorchIndex)") }
        & docker @buildArgs $rootPath
        if ($LASTEXITCODE -ne 0) { throw "Build failed: $imageRef" }
    }
}
if (-not $BuildOnly) {
    # Check every tag before pushing any image. Do not overwrite released tags.
    foreach ($image in $images) {
        $imageRef = "$Namespace/$($image.Name):$($image.Tag)"
        & docker image inspect $imageRef --format '{{.Id}}'
        if ($LASTEXITCODE -ne 0) { throw "Missing local image: $imageRef" }
        $remote = & docker buildx imagetools inspect $imageRef 2>&1
        if ($LASTEXITCODE -eq 0) { throw "Release tag already exists: $imageRef. Use a new version." }
        if (($remote -join "`n") -notmatch 'not found|manifest unknown') { throw "Cannot check remote tag ${imageRef}: $remote" }
    }
    foreach ($image in $images) {
        $imageRef = "$Namespace/$($image.Name):$($image.Tag)"
        & docker push $imageRef
        if ($LASTEXITCODE -ne 0) { throw "Push failed: $imageRef" }
    }
}
& (Join-Path $PSScriptRoot 'package-release.ps1')
