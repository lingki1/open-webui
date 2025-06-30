# 工作空间模型角色开场白功能优化实施方案

## 🎭 项目背景

工作空间模型被设计为**AI角色或剧本**。用户希望有更灵活的角色体验：
1. 首次选择角色时触发开场白，但不立即锁定
2. 可以在当前会话中自由切换角色，体验不同角色的开场白
3. 切换角色时清空上个角色的开场白，触发新角色的开场白
4. **只有当用户真正输入内容后，才锁定到当前选择的角色**

## 🎯 核心功能流程

```
用户选择角色A → 触发开场白A (未锁定)
↓
用户不满意，切换到角色B → 清空开场白A + 触发开场白B (未锁定)
↓  
用户满意角色B，开始输入内容 → 锁定到角色B + 正常对话
```

## 🔧 技术实施方案

### 📊 数据结构设计

**模型 meta 字段扩展**
- 在现有模型的 `meta` 对象中新增 `welcome_message` 字段
- 包含：启用状态、内容文本、图片URL、显示策略等属性
- 复用现有的模型数据结构，无需后端架构改动

### 🧩 新增组件架构

#### 1. 开场白弹框组件
**文件**：`src/lib/components/common/WelcomeMessageModal.svelte`
**技术要点**：
- 基于现有 `ConfirmDialog.svelte` 的设计模式
- 支持 Markdown 富文本渲染
- 支持图片显示
- 使用现有的过渡动画系统

#### 2. 开场白编辑器组件
**文件**：`src/lib/components/workspace/Models/WelcomeMessageEditor.svelte`
**技术要点**：
- 集成富文本编辑器 (复用现有 RichTextInput)
- 图片上传功能 (复用 ModelEditor 的图片处理逻辑)
- 开启/关闭切换开关
- 表单验证

### 🔄 核心逻辑修改

#### 1. 模型编辑器集成
**文件**：`src/lib/components/workspace/Models/ModelEditor.svelte`
**修改要点**：
- 在模型数据初始化时添加 welcome_message 默认值
- 在编辑界面中集成 WelcomeMessageEditor 组件
- 在提交逻辑中包含开场白数据的保存

#### 2. 聊天主逻辑
**文件**：`src/lib/components/chat/Chat.svelte`
**修改要点**：
- 添加开场白状态管理 (显示状态、当前内容、已显示记录)
- 监听模型选择变化，自动触发开场白检查
- 实现模型切换时的开场白清理逻辑
- 添加用户输入时的模型锁定机制
- 集成 WelcomeMessageModal 组件

#### 3. 模型切换优化
**文件**：`src/lib/components/chat/Chat.svelte` (现有函数扩展)
**修改要点**：
- 扩展 `onSelectedModelIdsChange` 函数
- 在 `resetInput` 中添加开场白清理
- 优化 `handleChatSwitchLock` 逻辑

### 📁 涉及文件清单

#### 新建文件
- `src/lib/components/common/WelcomeMessageModal.svelte` - 开场白弹框组件
- `src/lib/components/workspace/Models/WelcomeMessageEditor.svelte` - 开场白编辑器

#### 修改文件
- `src/lib/components/workspace/Models/ModelEditor.svelte` - 集成开场白编辑功能
- `src/lib/components/chat/Chat.svelte` - 核心聊天逻辑修改
- `src/lib/types/index.ts` - 类型定义扩展 (可选)

#### 可能涉及的文件
- `src/lib/components/chat/MessageInput.svelte` - 用户输入监听
- `src/lib/utils/models.ts` - 工作空间模型工具类
- `backend/open_webui/models/models.py` - 后端模型定义 (如需持久化)

### 🎨 UI/UX 设计原则

#### 弹框设计
- 复用项目现有的设计语言和样式系统
- 使用统一的颜色方案和字体
- 响应式设计，适配移动端

#### 编辑器设计
- 集成到现有的模型编辑界面中
- 保持与其他设置项的一致性
- 提供实时预览功能

#### 交互设计
- 平滑的过渡动画
- 直观的状态反馈
- 键盘快捷键支持

### 🔄 实施步骤

1. **阶段一：数据结构和编辑功能**
   - 扩展模型数据结构
   - 创建开场白编辑器组件
   - 集成到模型编辑界面

2. **阶段二：弹框展示功能**
   - 创建开场白弹框组件
   - 实现基础显示逻辑
   - 测试弹框交互

3. **阶段三：核心逻辑集成**
   - 修改聊天主逻辑
   - 实现模型切换触发
   - 添加状态管理

4. **阶段四：用户体验优化**
   - 完善动画效果
   - 优化性能
   - 测试边界情况

### 🧪 测试策略

#### 功能测试
- 开场白的创建、编辑、删除
- 模型切换时的开场白触发
- 用户输入后的模型锁定

#### 用户体验测试
- 弹框显示的时机和流畅度
- 多次切换模型的体验
- 移动端和桌面端的兼容性

#### 性能测试
- 大量模型时的切换性能
- 图片加载对性能的影响
- 内存使用情况

### 💡 技术亮点

- **最小化架构改动**：复用现有组件和设计模式
- **无后端依赖**：基于前端状态管理，可独立部署
- **高度可配置**：支持富文本、图片、显示策略等多种配置
- **用户体验优先**：平滑的交互和直观的界面设计

