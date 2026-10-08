param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'
$taskBackend = Split-Path $PSScriptRoot -Parent
$taskEnvPath = Join-Path $taskBackend '.env'
$taskCompose = Join-Path $taskBackend 'compose.yaml'

function New-LocalSecret {
    $taskBytes = New-Object byte[] 24
    $taskGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $taskGenerator.GetBytes($taskBytes) } finally { $taskGenerator.Dispose() }
    return [Convert]::ToBase64String($taskBytes).Replace('+','a').Replace('/','b').TrimEnd('=')
}
function ConvertTo-EnvLiteral([string]$Value) {
    return "'" + $Value.Replace("'", "\'") + "'"
}

if (-not (Test-Path -LiteralPath $taskEnvPath)) {
    $taskPrevious = $null
    $taskInspection = docker inspect backend-mysql-1 2>$null
    if ($LASTEXITCODE -eq 0 -and $taskInspection) {
        $taskCandidate = @($taskInspection | ConvertFrom-Json)[0]
        $taskPreviousDirectory = $taskCandidate.Config.Labels.'com.docker.compose.project.working_dir'
        if ($taskPreviousDirectory -and ([System.IO.Path]::GetFullPath($taskPreviousDirectory).TrimEnd('\') -eq $taskBackend.TrimEnd('\'))) {
            $taskPrevious = @{}
            foreach ($taskEntry in $taskCandidate.Config.Env) {
                $taskPair = $taskEntry -split '=',2
                $taskPrevious[$taskPair[0]] = $taskPair[1]
            }
        }
    }
    $taskDbPassword = if ($taskPrevious -and $taskPrevious.MYSQL_PASSWORD) { $taskPrevious.MYSQL_PASSWORD } else { New-LocalSecret }
    $taskRootPassword = if ($taskPrevious -and $taskPrevious.MYSQL_ROOT_PASSWORD) { $taskPrevious.MYSQL_ROOT_PASSWORD } else { New-LocalSecret }
    $taskLines = @(
        'DB_PASSWORD=' + (ConvertTo-EnvLiteral $taskDbPassword)
        'MYSQL_ROOT_PASSWORD=' + (ConvertTo-EnvLiteral $taskRootPassword)
        'DEMO_ADMIN_PASSWORD=' + (ConvertTo-EnvLiteral (New-LocalSecret))
        'DEMO_LIBRARIAN_PASSWORD=' + (ConvertTo-EnvLiteral (New-LocalSecret))
        'DEMO_READER_PASSWORD=' + (ConvertTo-EnvLiteral (New-LocalSecret))
        'SPRING_PROFILES_ACTIVE=local,demo'
    )
    [System.IO.File]::WriteAllText($taskEnvPath, ($taskLines -join [Environment]::NewLine) + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    Write-Host '本机配置已保存至 backend/.env；已有 MySQL 凭据已复用。演示密码仅用于首次空库初始化，已有账号密码不会改变。'
}

$taskArgs = @('compose','--env-file',$taskEnvPath,'-f',$taskCompose,'up','-d','--wait','--wait-timeout','180')
if (-not $NoBuild) { $taskArgs += '--build' }
& docker @taskArgs
if ($LASTEXITCODE -ne 0) { throw 'Docker 启动未完成，请查看容器日志。' }
Write-Host '读者：http://127.0.0.1:5173/'
Write-Host '馆员：http://127.0.0.2:5174/'
Write-Host '管理员：http://127.0.0.3:5175/'

