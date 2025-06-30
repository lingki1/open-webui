# Open WebUI 请求流程分析

## 聊天请求处理流程

### 1. 主要入口点
- **Ollama路由**: `/api/chat` → `backend/open_webui/routers/ollama.py`
- **OpenAI路由**: `/api/v1/chat/completions` → `backend/open_webui/routers/openai.py`
- **WebSocket**: 实时聊天通过socket.io

### 2. 关键处理节点

#### 用户认证层
```python
# 所有聊天接口都需要用户认证
user = Depends(get_verified_user)
```

#### 模型访问控制
```python
# backend/open_webui/routers/ollama.py
# 检查用户是否有权限访问特定模型
if not has_access(user.id, type="read", access_control=model_info.access_control):
    raise HTTPException(status_code=403)
```

#### 请求预处理
```python
# 处理系统提示词、模型参数等
payload = apply_model_system_prompt_to_body(payload, system_prompt, chat_id, user)
```

#### 响应后处理
```python
# 转换不同提供商的响应格式
response = convert_ollama_usage_to_openai(data)
```

### 3. Token计算时机

#### 请求时估算
- 在发送给模型提供商之前估算prompt tokens
- 使用tiktoken对输入内容进行token计算

#### 响应时统计
- 从模型提供商响应中提取usage信息
- 统一转换为OpenAI格式的usage统计

#### 存储时记录
- 聊天记录保存时可同时记录token使用量
- Chat表的JSONField中包含完整对话内容

## WebSocket实时聊天流程

### 1. 连接管理
```python
# backend/open_webui/socket/main.py
USAGE_POOL = {}  # 已有的使用量池，可扩展为token统计
```

### 2. 实时监控
- 已有的usage pool机制可扩展为token监控
- 支持实时更新用户token使用量
- 可实现实时的限制检查

## 中间件扩展点

### 1. 请求中间件
- 可在请求处理前检查token限制
- 支持早期拦截超限请求

### 2. 响应中间件
- 统计实际的token使用量
- 更新用户的daily usage计数

### 3. 审计中间件
- 项目已有audit logging机制
- 可记录详细的token使用审计日志