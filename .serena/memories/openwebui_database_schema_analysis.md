# Open WebUI 数据库架构分析

## 现有数据表结构

### 核心用户表
```python
class User(Base):
    __tablename__ = "user"
    id = Column(String, primary_key=True)
    name = Column(String)
    email = Column(String)
    role = Column(String)  # admin, user, premium
    settings = Column(JSONField, nullable=True)  # 可扩展用户配置
    info = Column(JSONField, nullable=True)      # 可扩展用户信息
    created_at = Column(BigInteger)
    updated_at = Column(BigInteger)
```

### 聊天记录表
```python
class Chat(Base):
    __tablename__ = "chat"
    id = Column(Text, primary_key=True)
    user_id = Column(Text)
    title = Column(Text)
    chat = Column(JSONField)  # 包含所有消息内容
    created_at = Column(BigInteger)
    updated_at = Column(BigInteger)
```

### 模型配置表
```python
class Model(Base):
    __tablename__ = "model"
    id = Column(Text, primary_key=True)
    user_id = Column(Text)
    name = Column(Text)
    params = Column(JSONField)      # 模型参数配置
    meta = Column(JSONField)        # 元数据
    access_control = Column(JSON)   # 访问控制
    is_active = Column(Boolean)
    created_at = Column(BigInteger)
    updated_at = Column(BigInteger)
```

## 扩展潜力分析

### 1. JSONField的灵活性
- `User.settings`: 可存储用户级别的token限制配置
- `User.info`: 可存储使用量统计信息
- `Chat.chat`: 已包含完整对话内容，可用于token计算

### 2. 时间戳支持
- 所有表都有`created_at`和`updated_at`字段
- 支持BigInteger时间戳（纳秒精度）
- 便于实现daily限制逻辑

### 3. 用户角色系统
- 支持admin, user, premium等角色
- 可为不同角色设置不同的token限制
- 权限控制已经完善

## 建议的扩展表结构

### 用户Token使用量表
```sql
CREATE TABLE user_token_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    model_id VARCHAR NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    chat_id VARCHAR,
    date DATE NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE(user_id, model_id, date)
);
```

### Token限制配置表
```sql
CREATE TABLE user_token_limits (
    user_id VARCHAR PRIMARY KEY,
    daily_limit INTEGER DEFAULT 10000,
    role_override BOOLEAN DEFAULT FALSE,
    custom_limits JSON,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);
```