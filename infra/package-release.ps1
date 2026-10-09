param()
$ErrorActionPreference = 'Stop'
$releasePath = Join-Path (Split-Path $PSScriptRoot -Parent) 'release'
$version = (Get-Content (Join-Path $releasePath 'VERSION') -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'release/VERSION must be a semantic version such as 0.1.0.' }
$template = [IO.File]::ReadAllText((Join-Path $releasePath '.env.example'))
foreach ($field in @('OPENAI_API_KEY', 'POSTGRES_PASSWORD')) {
    if ($template -notmatch "(?m)^$field=\r?$" ) { throw "The public template must have an empty $field." }
}
if ($template -notmatch "(?m)^RULESHELF_VERSION=$([regex]::Escape($version))\r?$" ) { throw 'The template version must match release/VERSION.' }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archivePath = Join-Path $releasePath "ruleshelf-$version.zip"
$stream = [IO.File]::Open($archivePath, [IO.FileMode]::Create)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    # Explicit allowlist. Never package the user's real .env or any local data.
    foreach ($file in @('compose.yaml', 'compose.gpu.yaml', '.env.example', 'README.md', 'README.hu.md', 'VERSION')) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $releasePath $file), $file) | Out-Null
    }
    $entry = $archive.CreateEntry('.env')
    $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write($template) } finally { $writer.Dispose() }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}
$hash = (Get-FileHash $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$archivePath.sha256", "$hash  ruleshelf-$version.zip`n", [Text.UTF8Encoding]::new($false))
Write-Host "Package: $archivePath"
Write-Host "SHA256: $hash"
