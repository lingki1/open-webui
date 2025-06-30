# Open WebUI 聊天记录手动提取命令

## 🔍 查询特定聊天记录的多种方法

### 方法1: 使用自动化脚本（推荐）
```powershell
# 运行自动化提取脚本
.\get_chat_record.ps1 -ChatId "dd8c074e-32e2-439f-84bd-d4f17324f446" -ContainerName "open-webui"

# 如果容器名称不同，请指定正确的容器名
.\get_chat_record.ps1 -ChatId "dd8c074e-32e2-439f-84bd-d4f17324f446" -ContainerName "你的容器名"
```

### 方法2: 手动PowerShell命令

#### 步骤1: 检查容器状态
```powershell
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 如果容器未运行，启动它
docker start open-webui
```

#### 步骤2: 进入容器检查数据库
```powershell
# 进入容器
docker exec -it open-webui bash

# 在容器内执行以下命令：
ls -la /app/backend/data/
sqlite3 /app/backend/data/webui.db ".tables"
```

#### 步骤3: 查询聊天记录
```powershell
# 直接执行SQL查询（在PowerShell中）
docker exec open-webui sqlite3 /app/backend/data/webui.db "SELECT id, title, user_id FROM chat WHERE id = 'dd8c074e-32e2-439f-84bd-d4f17324f446';"

# 导出完整聊天内容
docker exec open-webui sqlite3 /app/backend/data/webui.db "SELECT chat FROM chat WHERE id = 'dd8c074e-32e2-439f-84bd-d4f17324f446';" > chat_export.json
```

### 方法3: 直接操作Docker卷

#### 步骤1: 查找数据卷
```powershell
# 查看所有数据卷
docker volume ls

# 查看容器的挂载信息
docker inspect open-webui | ConvertFrom-Json | Select-Object -ExpandProperty Mounts
```

#### 步骤2: 复制数据库文件到本地
```powershell
# 复制数据库文件到当前目录
docker cp open-webui:/app/backend/data/webui.db ./webui.db

# 使用本地SQLite工具查询
sqlite3 webui.db "SELECT * FROM chat WHERE id = 'dd8c074e-32e2-439f-84bd-d4f17324f446';"
```

### 方法4: 使用临时容器访问数据卷

```powershell
# 假设你的数据卷名为 open-webui-data
# 启动临时容器来访问数据卷
docker run --rm -it -v open-webui-data:/data alpine sh

# 在临时容器中：
apk add sqlite
sqlite3 /data/webui.db
```

## 📋 重要SQL查询语句

### 基本信息查询
```sql
-- 查看聊天基本信息
SELECT 
    id,
    user_id,
    title,
    datetime(created_at, 'unixepoch') as created_time,
    datetime(updated_at, 'unixepoch') as updated_time,
    archived,
    pinned
FROM chat 
WHERE id = 'dd8c074e-32e2-439f-84bd-d4f17324f446';
```

### 完整内容导出
```sql
-- 导出完整聊天内容（JSON格式）
SELECT json_extract(chat, '$') 
FROM chat 
WHERE id = 'dd8c074e-32e2-439f-84bd-d4f17324f446';
```

### 消息内容查询
```sql
-- 提取消息历史
SELECT 
    id,
    title,
    json_extract(chat, '$.history.messages') as messages,
    json_extract(chat, '$.history.currentId') as current_message_id
FROM chat 
WHERE id = 'dd8c074e-32e2-439f-84bd-d4f17324f446';
```

### 用户所有聊天查询
```sql
-- 查找该用户的所有聊天（如果需要确认用户ID）
SELECT id, title, datetime(created_at, 'unixepoch') as created_time
FROM chat 
WHERE user_id = (
    SELECT user_id FROM chat WHERE id = 'dd8c074e-32e2-439f-84bd-d4f17324f446'
)
ORDER BY created_at DESC;
```

## 🛠️ 故障排除

### 问题1: 容器未运行
```powershell
# 检查容器状态
docker ps -a | Select-String "open-webui"

# 启动容器
docker start open-webui

# 查看容器日志
docker logs open-webui
```

### 问题2: 数据库文件不存在
```powershell
# 检查数据目录
docker exec open-webui ls -la /app/backend/data/

# 检查环境变量
docker exec open-webui env | Select-String "DATABASE"
```

### 问题3: 权限问题
```powershell
# 以root用户进入容器
docker exec -it --user root open-webui bash

# 检查文件权限
ls -la /app/backend/data/webui.db
```

### 问题4: SQLite命令不可用
```powershell
# 安装SQLite（在容器内）
apt update && apt install -y sqlite3

# 或使用Docker镜像中已有的Python
docker exec open-webui python3 -c "
import sqlite3
conn = sqlite3.connect('/app/backend/data/webui.db')
cursor = conn.cursor()
cursor.execute('SELECT id, title FROM chat WHERE id = \"dd8c074e-32e2-439f-84bd-d4f17324f446\"')
print(cursor.fetchall())
conn.close()
"
```

## 📊 数据结构说明

### chat表结构
- `id`: 聊天唯一标识符（UUID）
- `user_id`: 用户ID  
- `title`: 聊天标题
- `chat`: 完整聊天内容（JSON格式）
  - `history.messages`: 消息字典，key为消息ID
  - `history.currentId`: 当前消息ID
  - `title`: 聊天标题
- `created_at`: 创建时间戳（Unix时间）
- `updated_at`: 更新时间戳（Unix时间）
- `share_id`: 分享ID（如果有）
- `archived`: 是否归档
- `pinned`: 是否置顶
- `meta`: 元数据（标签等）
- `folder_id`: 所属文件夹ID 