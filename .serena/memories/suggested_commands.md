# Open WebUI 开发常用命令

## PowerShell 环境命令

### 前端开发命令
```powershell
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 或指定端口
npm run dev:5050

# 构建生产版本
npm run build

# 监听构建
npm run build:watch

# 预览生产版本
npm run preview

# 代码检查和格式化
npm run lint
npm run lint:frontend
npm run lint:types
npm run lint:backend

# 格式化代码
npm run format
npm run format:backend

# 类型检查
npm run check
npm run check:watch

# 测试
npm run test:frontend
npm run cy:open

# 国际化
npm run i18n:parse

# PyOdide准备
npm run pyodide:fetch
```

### 后端开发命令
```powershell
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
.\venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn open_webui.main:app --reload --host 0.0.0.0 --port 8080

# 或使用开发脚本
.\dev.sh

# Windows启动脚本
.\start_windows.bat

# 数据库迁移
alembic upgrade head

# 代码格式化
black . --exclude ".venv/|/venv/"

# 代码检查
pylint open_webui/

# 测试
pytest
```

### Docker命令
```powershell
# 构建镜像
docker build -t open-webui .

# 运行容器
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui open-webui

# Docker Compose
docker-compose up -d
docker-compose down

# 查看日志
docker logs open-webui

# 进入容器
docker exec -it open-webui bash
```

### Git操作
```powershell
# 查看状态
git status

# 添加文件
git add .

# 提交更改
git commit -m "commit message"

# 推送更改
git push origin main

# 拉取更新
git pull origin main

# 查看分支
git branch

# 切换分支
git checkout branch-name

# 创建新分支
git checkout -b new-branch
```

### 项目管理命令
```powershell
# 查看项目大小
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum

# 清理node_modules
Remove-Item -Recurse -Force node_modules
npm install

# 清理Python缓存
Get-ChildItem -Recurse -Name "__pycache__" | Remove-Item -Recurse -Force

# 查看端口占用
netstat -ano | findstr :8080

# 杀死进程
taskkill /F /PID <PID>
```

### 调试命令
```powershell
# 查看日志文件
Get-Content -Tail 50 -Wait backend/logs/app.log

# 检查数据库
sqlite3 backend/webui.db ".tables"

# 查看环境变量
Get-ChildItem Env:

# 检查Python版本和包
python --version
pip list
```

### 性能分析
```powershell
# 分析bundle大小
npm run build
npx vite-bundle-analyzer dist

# 检查内存使用
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Format-Table ProcessName, CPU, WorkingSet

# 网络监控
netstat -an | findstr LISTEN
```