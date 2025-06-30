# Open WebUI 聊天记录提取脚本
# 获取聊天记录 ID: dd8c074e-32e2-439f-84bd-d4f17324f446

param(
    [string]$ChatId = "dd8c074e-32e2-439f-84bd-d4f17324f446",
    [string]$ContainerName = "open-webui",
    [string]$OutputPath = ".\chat_export"
)

Write-Host "=== Open WebUI 聊天记录提取工具 ===" -ForegroundColor Green
Write-Host "聊天ID: $ChatId" -ForegroundColor Yellow
Write-Host "容器名称: $ContainerName" -ForegroundColor Yellow

# 创建输出目录
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    Write-Host "创建输出目录: $OutputPath" -ForegroundColor Blue
}

# 检查容器是否运行
Write-Host "`n1. 检查容器状态..." -ForegroundColor Cyan
$containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}"
if ([string]::IsNullOrEmpty($containerStatus)) {
    Write-Host "错误: 容器 '$ContainerName' 未运行" -ForegroundColor Red
    exit 1
}
Write-Host "容器状态: $containerStatus" -ForegroundColor Green

# 检查数据库文件是否存在
Write-Host "`n2. 检查数据库文件..." -ForegroundColor Cyan
$dbCheck = docker exec $ContainerName test -f /app/backend/data/webui.db
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 数据库文件不存在或无法访问" -ForegroundColor Red
    exit 1
}
Write-Host "数据库文件存在" -ForegroundColor Green

# 查询聊天记录基本信息
Write-Host "`n3. 查询聊天记录基本信息..." -ForegroundColor Cyan
$sqlQuery = @"
SELECT 
    id,
    user_id,
    title,
    created_at,
    updated_at,
    archived,
    pinned
FROM chat 
WHERE id = '$ChatId';
"@

$chatInfo = docker exec $ContainerName sqlite3 /app/backend/data/webui.db "$sqlQuery"
if ([string]::IsNullOrEmpty($chatInfo)) {
    Write-Host "错误: 未找到聊天记录 ID: $ChatId" -ForegroundColor Red
    exit 1
}

Write-Host "找到聊天记录:" -ForegroundColor Green
Write-Host $chatInfo -ForegroundColor White

# 导出完整聊天内容（JSON格式）
Write-Host "`n4. 导出完整聊天内容..." -ForegroundColor Cyan
$exportQuery = @"
SELECT json_extract(chat, '$') as chat_data
FROM chat 
WHERE id = '$ChatId';
"@

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = "$OutputPath\chat_${ChatId}_${timestamp}.json"

# 执行导出
docker exec $ContainerName sqlite3 /app/backend/data/webui.db "$exportQuery" > $outputFile

if (Test-Path $outputFile) {
    $fileSize = (Get-Item $outputFile).Length
    Write-Host "导出成功!" -ForegroundColor Green
    Write-Host "文件位置: $outputFile" -ForegroundColor Yellow
    Write-Host "文件大小: $($fileSize) 字节" -ForegroundColor Yellow
} else {
    Write-Host "导出失败!" -ForegroundColor Red
}

# 导出可读格式（格式化后的JSON）
Write-Host "`n5. 导出格式化内容..." -ForegroundColor Cyan
$readableFile = "$OutputPath\chat_${ChatId}_${timestamp}_readable.json"

try {
    $jsonContent = Get-Content $outputFile -Raw
    if (![string]::IsNullOrEmpty($jsonContent) -and $jsonContent -ne "null") {
        $formattedJson = $jsonContent | ConvertFrom-Json | ConvertTo-Json -Depth 100
        $formattedJson | Out-File -FilePath $readableFile -Encoding UTF8
        Write-Host "格式化文件: $readableFile" -ForegroundColor Yellow
    }
} catch {
    Write-Host "警告: 无法格式化JSON内容" -ForegroundColor Yellow
}

# 导出聊天历史摘要
Write-Host "`n6. 生成聊天摘要..." -ForegroundColor Cyan
$summaryQuery = @"
SELECT 
    'Chat ID: ' || id ||
    '\nUser ID: ' || user_id ||
    '\nTitle: ' || title ||
    '\nCreated: ' || datetime(created_at, 'unixepoch') ||
    '\nUpdated: ' || datetime(updated_at, 'unixepoch') ||
    '\nArchived: ' || archived ||
    '\nPinned: ' || pinned ||
    '\n\nMessage Count: ' || json_extract(chat, '$.history.messages') ||
    '\nCurrent ID: ' || json_extract(chat, '$.history.currentId')
FROM chat 
WHERE id = '$ChatId';
"@

$summaryFile = "$OutputPath\chat_${ChatId}_${timestamp}_summary.txt"
docker exec $ContainerName sqlite3 /app/backend/data/webui.db "$summaryQuery" > $summaryFile

Write-Host "摘要文件: $summaryFile" -ForegroundColor Yellow

Write-Host "`n=== 导出完成 ===" -ForegroundColor Green
Write-Host "输出目录: $OutputPath" -ForegroundColor Cyan 