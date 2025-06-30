# Open WebUI 项目概述

## 项目目的
Open WebUI 是一个功能丰富、用户友好的自托管AI平台，设计为完全离线运行。它支持各种LLM运行器，如Ollama和兼容OpenAI的API，具有内置的RAG推理引擎，是一个强大的AI部署解决方案。

## 技术栈

### 前端技术栈
- **框架**: SvelteKit + Svelte 4
- **语言**: TypeScript + JavaScript
- **样式**: TailwindCSS 4.0
- **UI组件**: 
  - Bits UI (0.21.15)
  - Svelte Sonner (通知系统)
  - TipTap (富文本编辑器)
- **构建工具**: Vite 5.4.14
- **代码检查**: ESLint + Prettier
- **测试**: Vitest + Cypress

### 后端技术栈
- **框架**: FastAPI 0.115.7
- **服务器**: Uvicorn 0.34.2
- **语言**: Python 3.11-3.12
- **数据库**: 
  - SQLAlchemy 2.0.38 (ORM)
  - Peewee 3.18.1 (备用ORM)
  - 支持 PostgreSQL, MySQL, SQLite
- **认证**: 
  - Python-JOSE 3.4.0 (JWT)
  - Passlib (密码哈希)
  - LDAP3 (LDAP认证)
- **AI库**:
  - OpenAI, Anthropic, Google GenAI
  - LangChain 0.3.24
  - Transformers, Sentence-Transformers
  - 向量数据库: ChromaDB, Qdrant, Milvus

### 容器化和部署
- **容器**: Docker + Docker Compose
- **编排**: Kubernetes (支持Helm)
- **反向代理**: Apache (文档支持)

## 核心功能模块
1. **用户认证和权限管理** (RBAC)
2. **模型管理** (本地和远程模型)
3. **工作空间** (模型、工具、知识库、提示词)
4. **聊天系统** (多模型对话)
5. **RAG系统** (文档检索增强生成)
6. **管道插件系统** (Pipelines)
7. **文件管理和存储**
8. **音频处理** (TTS/STT)
9. **图像生成集成**