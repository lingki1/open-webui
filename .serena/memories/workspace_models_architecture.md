# 工作空间模型架构分析

## 后端数据模型

### Model 数据表结构 (backend/open_webui/models/models.py)
```python
class Model(Base):
    __tablename__ = "model"
    
    id = Column(Text, primary_key=True)              # 模型API ID
    user_id = Column(Text)                           # 创建用户ID
    base_model_id = Column(Text, nullable=True)      # 基础模型ID指针
    name = Column(Text)                              # 显示名称
    params = Column(JSONField)                       # 参数配置 (ModelParams)
    meta = Column(JSONField)                         # 元数据 (ModelMeta)
    access_control = Column(JSON, nullable=True)     # 访问控制
    is_active = Column(Boolean, default=True)        # 激活状态
    updated_at = Column(BigInteger)                  # 更新时间
    created_at = Column(BigInteger)                  # 创建时间
```

### ModelParams 配置结构
- `system`: 系统提示词
- `temperature`: 温度参数
- `top_p`: Top-p采样
- `top_k`: Top-k采样
- `stop`: 停止词列表
- 其他模型特定参数

### ModelMeta 元数据结构
- `profile_image_url`: 头像URL
- `description`: 模型描述
- `suggestion_prompts`: 建议提示词列表
- `tags`: 标签
- `capabilities`: 能力配置
- `knowledge`: 知识库关联
- `toolIds`: 工具ID列表
- `filterIds`: 过滤器ID列表
- `actionIds`: 动作ID列表
- `welcome_message`: 开场白配置

## 前端组件架构

### 主要页面和路由
- `/workspace/models/` - 模型列表页面
- `/workspace/models/create` - 创建模型页面
- `/workspace/models/edit` - 编辑模型页面

### 核心组件层次
```
Models.svelte (工作空间模型列表)
├── ModelMenu.svelte (操作菜单)
├── ModelDeleteConfirmDialog.svelte (删除确认)
└── ModelEditor.svelte (模型编辑器)
    ├── AccessControl.svelte (访问控制)
    ├── WelcomeMessageEditor.svelte (开场白编辑)
    ├── Knowledge.svelte (知识库选择)
    ├── ToolsSelector.svelte (工具选择)
    ├── FiltersSelector.svelte (过滤器选择)
    ├── ActionsSelector.svelte (动作选择)
    ├── Capabilities.svelte (能力配置)
    └── AdvancedParams.svelte (高级参数)
```

## API接口设计

### 后端路由 (backend/open_webui/routers/models.py)
- `GET /api/v1/models/` - 获取模型列表
- `GET /api/v1/models/base` - 获取基础模型列表
- `POST /api/v1/models/create` - 创建新模型
- `GET /api/v1/models/model?id=<id>` - 获取指定模型
- `POST /api/v1/models/model/toggle?id=<id>` - 切换模型状态
- `POST /api/v1/models/model/update?id=<id>` - 更新模型
- `DELETE /api/v1/models/model/delete?id=<id>` - 删除模型
- `DELETE /api/v1/models/delete/all` - 删除所有模型

### 前端API封装 (src/lib/apis/models/index.ts)
- `getModels()` - 获取工作空间模型列表
- `getBaseModels()` - 获取基础模型列表
- `createNewModel()` - 创建新模型
- `getModelById()` - 获取模型详情
- `updateModelById()` - 更新模型
- `toggleModelById()` - 切换激活状态
- `deleteModelById()` - 删除模型