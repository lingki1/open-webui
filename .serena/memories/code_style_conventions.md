# Open WebUI 代码风格和规范

## 前端代码规范

### TypeScript/JavaScript
- **类型定义**: 使用TypeScript严格类型检查
- **文件命名**: 
  - 组件文件: `PascalCase.svelte` (如 `ModelEditor.svelte`)
  - 工具函数: `camelCase.ts` (如 `chatModelLock.ts`)
  - 页面路由: `+page.svelte`, `+layout.svelte`
- **变量命名**: 
  - 变量和函数: `camelCase`
  - 常量: `UPPER_SNAKE_CASE` 
  - 类型接口: `PascalCase`

### Svelte组件规范
- **组件结构**:
  ```svelte
  <script lang="ts">
    // 导入
    // 类型定义
    // Props声明
    // 状态变量
    // 响应式语句
    // 函数定义
  </script>

  <!-- HTML模板 -->
  <div>...</div>

  <style>
    /* 样式 */
  </style>
  ```

- **Props定义**: 使用 `export let` 明确声明
- **事件处理**: 使用 `createEventDispatcher` 或 `on:` 指令
- **状态管理**: 通过 `$lib/stores` 集中管理全局状态

### CSS/TailwindCSS
- **样式优先级**: TailwindCSS > 组件样式 > 全局样式
- **响应式设计**: 移动优先原则
- **类名规范**: 
  - 布局: `flex`, `grid`, `w-full`, `h-full`
  - 间距: `p-*`, `m-*`, `gap-*`
  - 颜色: 使用预定义调色板
  - 深色模式: `dark:` 前缀

## 后端代码规范

### Python代码风格
- **格式化工具**: Black (行长度88字符)
- **代码检查**: Pylint + 类型提示
- **导入顺序**:
  1. 标准库
  2. 第三方库  
  3. 本地模块

### 文件和模块命名
- **文件名**: `snake_case.py`
- **类名**: `PascalCase`
- **函数名**: `snake_case`
- **常量**: `UPPER_SNAKE_CASE`

### FastAPI规范
- **路由定义**:
  ```python
  @router.get("/", response_model=list[ModelUserResponse])
  async def get_models(user=Depends(get_verified_user)):
      # 实现
  ```
- **依赖注入**: 使用 `Depends()` 进行认证和授权
- **响应模型**: 明确定义 Pydantic 模型
- **错误处理**: 使用 `HTTPException` 统一错误响应

### 数据模型规范
- **SQLAlchemy模型**:
  - 表名使用 `snake_case`
  - 字段名使用 `snake_case`
  - 关系定义清晰
- **Pydantic模型**:
  - 用于API输入输出验证
  - 配置 `ConfigDict` 进行自定义

## 项目结构规范

### 前端目录结构
```
src/
├── lib/
│   ├── apis/          # API调用封装
│   ├── components/    # 可复用组件
│   ├── stores/        # 状态管理
│   ├── utils/         # 工具函数
│   └── types/         # 类型定义
├── routes/            # 页面路由
└── static/            # 静态资源
```

### 后端目录结构
```
backend/
├── open_webui/
│   ├── models/        # 数据模型
│   ├── routers/       # API路由
│   ├── utils/         # 工具函数
│   └── config.py      # 配置文件
├── requirements.txt   # 依赖管理
└── migrations/        # 数据库迁移
```

## 开发最佳实践

### 组件开发
- **单一职责**: 每个组件专注一个功能
- **Props验证**: 使用TypeScript进行类型约束
- **事件传递**: 通过事件向上传递数据
- **状态管理**: 区分本地状态和全局状态

### API设计
- **RESTful原则**: 遵循REST API设计规范
- **版本控制**: URL中包含版本号 `/api/v1/`
- **错误处理**: 统一的错误响应格式
- **文档生成**: 自动生成Swagger文档

### 测试策略
- **单元测试**: 覆盖核心业务逻辑
- **集成测试**: 测试API端点和组件交互
- **E2E测试**: 使用Cypress测试完整用户流程

### 性能优化
- **代码分割**: 按需加载组件和页面
- **缓存策略**: 合理使用浏览器缓存
- **数据库优化**: 索引和查询优化
- **图片优化**: 压缩和WebP格式

### 国际化(i18n)
- **文案提取**: 使用 `$i18n.t()` 函数
- **键值命名**: 使用英文描述性键名
- **占位符**: 支持动态参数插值
- **多语言支持**: 完善的语言包管理