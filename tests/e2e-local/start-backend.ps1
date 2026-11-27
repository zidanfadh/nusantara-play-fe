# Phase 29: starts the LOCAL backend for the local-login end-to-end run (tests/e2e-local/README.md).
# Everything on D:, the local Docker database and Mailpit only. Never point this at production.
#
#   powershell -ExecutionPolicy Bypass -File tests\e2e-local\start-backend.ps1 [-Port 3000] [-TokenTtlSeconds 20]
#
# Expects: npm run db:up and npm run db:setup done in nusantara-play-be, npm run build done there, and the
# dev-only JWT_* keys in nusantara-play-be\.env.local (npm run auth:generate-keys). The values below override
# .env.local for this process only (process env wins over the env files).
param(
  [int]$Port = 3000,
  [int]$FrontendPort = 3001,
  [int]$TokenTtlSeconds = 20,
  [string]$BackendDir = (Join-Path $PSScriptRoot '..\..\..\nusantara-play-be')
)
$ErrorActionPreference = 'Stop'
$BackendDir = (Resolve-Path $BackendDir).Path
# Upper-case drive letter (Phase 13 finding: a lower-case d:\ loads the entities twice).
if ($BackendDir -match '^[a-z]:') { $BackendDir = $BackendDir.Substring(0, 1).ToUpper() + $BackendDir.Substring(1) }

$env:TEMP = 'D:/dev-cache/tmp'; $env:TMP = 'D:/dev-cache/tmp'; $env:npm_config_cache = 'D:/dev-cache/npm'
$env:NODE_ENV = 'development'
$env:PORT = "$Port"
# Local database only (container nusantara-dev-db, Phase 05).
$env:DATABASE_URL = ''
$env:DATABASE_HOST = '127.0.0.1'; $env:DATABASE_PORT = '5432'; $env:DATABASE_USER = 'postgres'
$env:DATABASE_PASSWORD = 'localdev'; $env:DATABASE_NAME = 'nusantara_play_dev'; $env:DATABASE_SSL = 'false'
# The browser reaches the backend through the frontend's /backend-api rewrite, as in production.
$env:FRONTEND_URLS = "http://localhost:$FrontendPort"
$env:AUTH_COOKIE_PATH = '/backend-api/auth'
$env:AUTH_COOKIE_SECURE = 'false'
$env:APP_PUBLIC_URL = "http://localhost:$FrontendPort"
# Short access tokens, so the silent refresh is exercised (production default 900).
$env:ACCESS_TOKEN_TTL_SECONDS = "$TokenTtlSeconds"
# Mailpit (npm run db:up): every email lands at http://localhost:8025, nothing is delivered.
$env:SMTP_HOST = '127.0.0.1'; $env:SMTP_PORT = '1025'; $env:SMTP_SECURE = 'false'
$env:SMTP_USER = ''; $env:SMTP_PASS = ''; $env:SMTP_FROM = 'Nusantara Legacy (lokal) <no-reply@localhost.test>'
# No blockchain, no AWS.
$env:BLOCKCHAIN_RPC_URL = ''; $env:BLOCKCHAIN_PRIVATE_KEY = ''

Set-Location $BackendDir
if (-not (Test-Path 'dist\main.js')) { throw 'dist\main.js missing: run npm run build in nusantara-play-be first' }
node dist\main.js
