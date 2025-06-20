# Open WebUI Docker 使用教程

## 📋 目录
- [构建镜像 (Docker Build)](#构建镜像-docker-build)
- [运行容器 (Docker Run)](#运行容器-docker-run)
- [推送镜像 (Docker Push)](#推送镜像-docker-push)
- [拉取镜像 (Docker Pull)](#拉取镜像-docker-pull)
- [数据卷管理](#数据卷管理)
- [环境变量配置](#环境变量配置)
- [常见问题](#常见问题)

---

## 🔨 构建镜像 (Docker Build)

### 基础构建
```bash
# 基础构建（CPU版本）
docker build -t open-webui:latest .

# 构建时指定版本标签
docker build -t open-webui:v0.6.15 .
```

### 带构建参数的构建
```bash
# CUDA GPU支持版本
docker build \
  --build-arg USE_CUDA=true \
  --build-arg USE_CUDA_VER=cu128 \
  -t open-webui:cuda .

# Ollama集成版本
docker build \
  --build-arg USE_OLLAMA=true \
  -t open-webui:ollama .

# 自定义嵌入模型
docker build \
  --build-arg USE_EMBEDDING_MODEL=intfloat/multilingual-e5-large \
  -t open-webui:multilingual .

# 完整配置构建
docker build \
  --build-arg USE_CUDA=true \
  --build-arg USE_OLLAMA=true \
  --build-arg USE_CUDA_VER=cu128 \
  --build-arg USE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2 \
  --build-arg BUILD_HASH=v0.6.15 \
  -t open-webui:full .
```

### 构建参数说明
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `USE_CUDA` | `false` | 启用CUDA GPU支持 |
| `USE_OLLAMA` | `false` | 集成Ollama服务 |
| `USE_CUDA_VER` | `cu128` | CUDA版本 (cu117/cu121/cu128) |
| `USE_EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | 嵌入模型 |
| `USE_RERANKING_MODEL` | `""` | 重排序模型 |
| `BUILD_HASH` | `dev-build` | 构建版本标识 |

---

## 🚀 运行容器 (Docker Run)

### 基础运行
```bash
# 基础运行
docker run -d \
  --name open-webui \
  -p 3000:8080 \
  -v open-webui:/app/backend/data \
  --restart unless-stopped \
  open-webui:latest
```

### 完整配置运行
```bash
# 完整配置运行
docker run -d \
  --name open-webui \
  -p 3000:8080 \
  -v open-webui-data:/app/backend/data \
  -v open-webui-cache:/app/backend/data/cache \
  -e OPENAI_API_KEY=your_openai_api_key \
  -e WEBUI_SECRET_KEY=your_secret_key \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  --add-host=host.docker.internal:host-gateway \
  --restart unless-stopped \
  open-webui:latest
```

### GPU支持运行
```bash
# CUDA GPU支持
docker run -d \
  --name open-webui-gpu \
  --gpus all \
  -p 3000:8080 \
  -v open-webui-data:/app/backend/data \
  --restart unless-stopped \
  open-webui:cuda
```

### Ollama集成运行
```bash
# 内置Ollama版本
docker run -d \
  --name open-webui-ollama \
  -p 3000:8080 \
  -v ollama-data:/root/.ollama \
  -v open-webui-data:/app/backend/data \
  --restart unless-stopped \
  open-webui:ollama
```

---

## 📤 推送镜像 (Docker Push)

### 推送到Docker Hub
```bash
# 1. 登录Docker Hub
docker login

# 2. 给镜像打标签
docker tag open-webui:latest your-username/open-webui:latest
docker tag open-webui:latest your-username/open-webui:v0.6.15

# 3. 推送镜像
docker push your-username/open-webui:latest
docker push your-username/open-webui:v0.6.15
```

### 推送到其他仓库
```bash
# 推送到私有仓库
docker tag open-webui:latest registry.example.com/open-webui:latest
docker push registry.example.com/open-webui:latest

# 推送到GitHub Container Registry
docker tag open-webui:latest ghcr.io/your-username/open-webui:latest
docker push ghcr.io/your-username/open-webui:latest
```

---

## 📥 拉取镜像 (Docker Pull)

### 从Docker Hub拉取
```bash
# 拉取最新版本
docker pull ghcr.io/open-webui/open-webui:main

# 拉取指定版本
docker pull ghcr.io/open-webui/open-webui:v0.6.15

# 拉取CUDA版本
docker pull ghcr.io/open-webui/open-webui:cuda

# 拉取Ollama集成版本
docker pull ghcr.io/open-webui/open-webui:ollama
```

### 从其他仓库拉取
```bash
# 从私有仓库拉取
docker pull registry.example.com/open-webui:latest

# 从GitHub Container Registry拉取
docker pull ghcr.io/your-username/open-webui:latest
```

---

## 💾 数据卷管理

### 默认数据路径
```
/app/backend/data/          # 主数据目录
├── docs/                   # 文档存储
├── uploads/                # 上传文件
├── models/                 # 本地模型
├── cache/                  # 缓存目录
│   ├── whisper/           # Whisper模型缓存
│   ├── embedding/         # 嵌入模型缓存
│   └── tiktoken/          # Tiktoken缓存
└── vector_dbs/            # 向量数据库
```

### 推荐的卷挂载
```bash
# 基础挂载
-v open-webui-data:/app/backend/data

# 详细挂载（推荐生产环境）
-v open-webui-data:/app/backend/data \
-v open-webui-cache:/app/backend/data/cache \
-v open-webui-models:/app/backend/data/models \
-v open-webui-uploads:/app/backend/data/uploads

# 如果使用Ollama
-v ollama-data:/root/.ollama
```

### 数据备份
```bash
# 备份数据卷
docker run --rm \
  -v open-webui-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/open-webui-backup.tar.gz -C /data .

# 恢复数据卷
docker run --rm \
  -v open-webui-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/open-webui-backup.tar.gz -C /data
```

---

## ⚙️ 环境变量配置

### 基础配置
```bash
# API配置
-e OPENAI_API_KEY=sk-your-openai-key
-e OPENAI_API_BASE_URL=https://api.openai.com/v1

# Ollama配置
-e OLLAMA_BASE_URL=http://host.docker.internal:11434

# 安全配置
-e WEBUI_SECRET_KEY=your-secret-key-here

# 模型配置
-e WHISPER_MODEL=base
-e RAG_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### 完整环境变量示例
```bash
docker run -d \
  --name open-webui \
  -p 3000:8080 \
  -v open-webui-data:/app/backend/data \
  -e ENV=prod \
  -e PORT=8080 \
  -e OPENAI_API_KEY=your_openai_key \
  -e OPENAI_API_BASE_URL=https://api.openai.com/v1 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -e WEBUI_SECRET_KEY=your_secret_key \
  -e WHISPER_MODEL=base \
  -e RAG_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2 \
  -e SCARF_NO_ANALYTICS=true \
  -e DO_NOT_TRACK=true \
  -e ANONYMIZED_TELEMETRY=false \
  --restart unless-stopped \
  open-webui:latest
```

---

## 🔧 Docker Compose 示例

### 基础版本
```yaml
# docker-compose.yml
version: '3.8'

services:
  open-webui:
    build: .
    container_name: open-webui
    ports:
      - "3000:8080"
    volumes:
      - open-webui-data:/app/backend/data
    environment:
      - OPENAI_API_KEY=your_openai_api_key
      - WEBUI_SECRET_KEY=your_secret_key
    restart: unless-stopped

volumes:
  open-webui-data:
```

### 完整版本（包含Ollama）
```yaml
# docker-compose.full.yml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped

  open-webui:
    build:
      context: .
      args:
        USE_OLLAMA: "true"
        USE_CUDA: "true"
    container_name: open-webui
    ports:
      - "3000:8080"
    volumes:
      - open-webui-data:/app/backend/data
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEBUI_SECRET_KEY=your_secret_key
    depends_on:
      - ollama
    restart: unless-stopped

volumes:
  ollama-data:
  open-webui-data:
```

---

## 🛠️ 常用命令

### 容器管理
```bash
# 查看运行状态
docker ps
docker logs open-webui

# 进入容器
docker exec -it open-webui bash

# 停止和启动
docker stop open-webui
docker start open-webui
docker restart open-webui

# 删除容器
docker rm open-webui
```

### 镜像管理
```bash
# 查看镜像
docker images

# 删除镜像
docker rmi open-webui:latest

# 清理未使用的镜像
docker image prune
```

### 数据卷管理
```bash
# 查看数据卷
docker volume ls

# 查看数据卷详情
docker volume inspect open-webui-data

# 删除数据卷
docker volume rm open-webui-data
```

---

## ❗ 常见问题

### 1. 端口冲突
```bash
# 如果3000端口被占用，更改映射端口
docker run -p 8080:8080 open-webui:latest
```

### 2. GPU不可用
```bash
# 确保安装了nvidia-docker2
sudo apt install nvidia-docker2
sudo systemctl restart docker

# 测试GPU可用性
docker run --gpus all nvidia/cuda:11.0-base nvidia-smi
```

### 3. 数据持久化问题
```bash
# 确保使用了正确的数据卷挂载
-v open-webui-data:/app/backend/data
```

### 4. Ollama连接问题
```bash
# 使用host网络模式
docker run --network host open-webui:latest

# 或者正确配置host.docker.internal
--add-host=host.docker.internal:host-gateway
```

---

## 📝 使用步骤总结

1. **构建镜像**：`docker build -t open-webui:latest .`
2. **运行容器**：`docker run -d -p 3000:8080 -v open-webui-data:/app/backend/data open-webui:latest`
3. **访问应用**：打开浏览器访问 `http://localhost:3000`
4. **数据备份**：定期备份 `open-webui-data` 数据卷
5. **更新应用**：重新构建镜像并重新部署容器

---

> 💡 **提示**：生产环境建议使用 Docker Compose 进行部署管理，更加方便维护和扩展。 