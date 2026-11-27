# Phase 29: builds (unless -SkipBuild) and starts a PRODUCTION build of the frontend with the self-hosted login
# (NEXT_PUBLIC_AUTH_MODE=local) against the LOCAL backend. See tests/e2e-local/README.md.
#
#   powershell -ExecutionPolicy Bypass -File tests\e2e-local\start-frontend.ps1 [-Port 3001] [-BackendPort 3000] [-SkipBuild]
param(
  [int]$Port = 3001,
  [int]$BackendPort = 3000,
  [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$FrontendDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$env:TEMP = 'D:/dev-cache/tmp'; $env:TMP = 'D:/dev-cache/tmp'; $env:npm_config_cache = 'D:/dev-cache/npm'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:NEXT_PUBLIC_AUTH_MODE = 'local'
# The /backend-api rewrite target (next.config.ts refuses local mode without it outside Vercel).
$env:BACKEND_ORIGIN = "http://localhost:$BackendPort"
# Server-side fetches (landing page) go straight to the local backend.
$env:NEXT_PUBLIC_BACKEND_API_URL = "http://localhost:$BackendPort/api"

Set-Location $FrontendDir
if (-not $SkipBuild) {
  npx next build
  if ($LASTEXITCODE -ne 0) { throw 'next build failed' }
}
npx next start -p $Port
