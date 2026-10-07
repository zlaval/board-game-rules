$ErrorActionPreference = 'Stop'
$envPath = Join-Path $PSScriptRoot '.env'
if (Test-Path -LiteralPath $envPath) {
    Write-Output 'infra/.env already exists; existing credentials were preserved.'
    exit 0
}
$adminSecret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24)).ToLowerInvariant()
$databaseSecret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24)).ToLowerInvariant()
$content = @"
APP_BIND_ADDRESS=127.0.0.1
APP_PORT=8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$adminSecret
POSTGRES_PASSWORD=$databaseSecret
COOKIE_SECURE=false
MAX_UPLOAD_MB=50
MAX_DOCUMENT_PAGES=100
PROCESSING_DEVICE=auto
OPENAI_API_KEY=
OPENAI_ANSWER_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIPTION_MODEL=gpt-transcribe
"@
[System.IO.File]::WriteAllText($envPath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Output 'Created infra/.env with generated credentials. Admin username: admin. Read ADMIN_PASSWORD locally from this file.'

