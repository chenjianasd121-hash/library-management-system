param([string]$RunId = ('run-' + (Get-Date -Format 'yyyyMMdd-HHmmss')))
$ErrorActionPreference = 'Stop'
if ($RunId -notmatch '^run-[0-9-]+$') { throw 'Invalid run identifier.' }
$workspace = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$run = Join-Path $workspace "output/flow-stress-qa/$RunId"
if (Test-Path -LiteralPath $run) { throw 'Run directory already exists; inspect its checkpoint before resuming.' }
& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker is unavailable; no QA files or secrets were created.' }
$existingContainers = @(docker ps -a --filter 'label=com.docker.compose.project=library-flow-qa' --format '{{.Names}}')
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing QA containers.' }
$existingVolumes = @(docker volume ls --filter 'label=com.docker.compose.project=library-flow-qa' --format '{{.Name}}')
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing QA volumes.' }
if ($existingContainers.Count -gt 0 -or $existingVolumes.Count -gt 0) {
  throw 'A QA project or retained data volume already exists. Resume its checkpoint instead of initializing another run.'
}
foreach ($port in 18081,13308,5273,5274,5275) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "QA port $port is already occupied." }
}
New-Item -ItemType Directory -Path (Join-Path $run 'covers') -Force | Out-Null
$secret = [guid]::NewGuid().ToString('N') + '!Qa9'
$credentials = @{ admin=$secret; librarian=$secret; reader=$secret }
$credentials | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $run 'credentials.private.json') -Encoding utf8
@(
  'DB_PASSWORD=' + [guid]::NewGuid().ToString('N')
  'MYSQL_ROOT_PASSWORD=' + [guid]::NewGuid().ToString('N')
  "DEMO_ADMIN_PASSWORD=$secret"
  "DEMO_LIBRARIAN_PASSWORD=$secret"
  "DEMO_READER_PASSWORD=$secret"
) | Set-Content -LiteralPath (Join-Path $run '.env') -Encoding utf8
$backend = (Join-Path $workspace 'backend').Replace('\','/')
$covers = (Join-Path $run 'covers').Replace('\','/')
@"
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: library_management
      MYSQL_USER: library_app
      MYSQL_PASSWORD: `${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: `${MYSQL_ROOT_PASSWORD}
      TZ: UTC
    ports: ['127.0.0.1:13308:3306']
    volumes: ['qa_mysql_data:/var/lib/mysql']
    command: ['--default-time-zone=+00:00','--character-set-server=utf8mb4','--collation-server=utf8mb4_0900_ai_ci']
    healthcheck:
      test: ['CMD-SHELL', 'mysqladmin ping -h localhost -u root -p`$`$MYSQL_ROOT_PASSWORD --silent']
      interval: 3s
      timeout: 3s
      retries: 40
  backend:
    image: library-flow-qa-backend:working
    build: {context: '$backend'}
    environment:
      DB_URL: 'jdbc:mysql://mysql:3306/library_management?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true'
      DB_USER: library_app
      DB_PASSWORD: `${DB_PASSWORD}
      SPRING_PROFILES_ACTIVE: local,demo
      DEMO_ADMIN_PASSWORD: `${DEMO_ADMIN_PASSWORD}
      DEMO_LIBRARIAN_PASSWORD: `${DEMO_LIBRARIAN_PASSWORD}
      DEMO_READER_PASSWORD: `${DEMO_READER_PASSWORD}
      COVERS_DIR: /app/data/covers
      SESSION_COOKIE_SECURE: 'false'
    ports: ['127.0.0.1:18081:8080']
    volumes: ['$covers`:/app/data/covers']
    depends_on:
      mysql: {condition: service_healthy}
    healthcheck:
      test: ['CMD-SHELL', 'wget -q -O /dev/null http://127.0.0.1:8080/api/v1/policy']
      interval: 3s
      timeout: 3s
      retries: 50
volumes:
  qa_mysql_data:
"@ | Set-Content -LiteralPath (Join-Path $run 'compose.yaml') -Encoding utf8
$sourceFiles = Get-ChildItem -LiteralPath (Join-Path $workspace 'backend/src'),(Join-Path $workspace 'frontend/src') -Recurse -File
$sourceHash = @($sourceFiles | Sort-Object FullName | ForEach-Object { @{path=$_.FullName.Substring($workspace.Length+1);sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash} })
$sourceHash | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $run 'source-before.json') -Encoding utf8
Set-Content -LiteralPath (Join-Path $workspace 'output/flow-stress-qa/current-run.txt') -Value $run -Encoding utf8
@{phase='environment-building';run=$run;startedAt=[DateTimeOffset]::Now.ToString('o');gitHead=(git -C $workspace rev-parse HEAD)} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $run 'checkpoint.json') -Encoding utf8
& docker compose --project-name library-flow-qa --env-file (Join-Path $run '.env') -f (Join-Path $run 'compose.yaml') up -d --build --wait --wait-timeout 180
if ($LASTEXITCODE -ne 0) { throw 'QA environment build/start failed.' }
$imageId = docker image inspect library-flow-qa-backend:working --format '{{.Id}}'
@{phase='environment-ready';run=$run;imageId=$imageId;readyAt=[DateTimeOffset]::Now.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $run 'checkpoint.json') -Encoding utf8
Write-Output "QA_RUN=$run"
