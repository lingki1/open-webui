# Roadmap

- [ ] **1. 增加 role: premium**

  **目标**：在 user 和 admin 之间增加 premium 角色，默认权限与 user 一致。

  **后端：**
  - [x] 修改 `backend/open_webui/models/users.py`，允许 role 字段为 "premium"。
  - [x] 修改 `backend/open_webui/utils/auth.py`，`get_verified_user` 支持 premium。
  - [x] 修改 `backend/open_webui/utils/oauth.py`，角色分配支持 premium。
  - [x] 权限校验、模型访问、聊天等所有涉及 user 的地方均已支持 premium（如 `chat.py`、`embeddings.py`、`openai.py`、`ollama.py`、`main.py`、`chats.py` 等）。
  - [x] 默认角色配置（如 `config.py`）已支持 premium。
  - [x] 检查数据库迁移脚本，premium 角色兼容（无需结构变更，兼容字符串类型）。

  **前端：**
  - [x] 用户管理相关下拉框（`AddUserModal.svelte`、`EditUserModal.svelte`）已增加 premium 选项。
  - [x] 用户列表、Badge、展示等处已支持 premium，Badge 为橙色（warning）。
  - [x] API 调用（如 `updateUserRole`）已支持 premium。
  - [x] 检查所有涉及用户角色显示的地方，premium 均能正确显示。

  **结果：**
  - premium 角色已成功添加，默认权限与 user 一致，所有相关后端权限检查和前端界面均已支持。
  - 可通过管理界面创建/编辑 premium 用户，premium 用户可正常登录和使用系统。
  - 支持将 premium 设置为默认用户角色。
  - 用户列表等界面 premium 角色显示正常。

  **状态：已完成 ✅**

- [ ] **2. usermanu 菜单权限调整**

  **目标**：除 admin 外，其他用户（包括 user、premium）只能看到 settings, archived chats, keyboard shortcuts, sign out。

  **前端：**
  - [x] 修改 `src/lib/components/layout/Sidebar/UserMenu.svelte`，根据 role 判断，仅 admin 显示 playground、admin panel、documentation、releases 等，其他角色只显示指定菜单项。
  - [x] 确保 premium 也按 user 权限处理，非 admin 用户只能看到4个基础菜单项。
  - [x] 检查所有调用 UserMenu 的页面，确保菜单项一致（Chat Navbar、Layout Navbar、Sidebar、Channel Navbar、Notes Layout）。

  **详细实现：**
  - 所有用户（user、premium、admin）可见：Settings、Archived Chats、Keyboard shortcuts、Sign Out
  - 仅 admin 用户可见：Playground、Admin Panel、Documentation、Releases
  - 新增权限控制：Documentation 和 Releases 现在只有 admin 可以访问
  - 保留原有权限控制：Playground 和 Admin Panel 仍然只有 admin 可见

  **结果：**
  - 非 admin 用户（user、premium）的菜单已精简为4个核心功能项
  - premium 用户享受与 user 用户相同的菜单权限
  - admin 用户保留所有菜单项的访问权限
  - 所有使用 UserMenu 组件的页面自动应用统一的权限控制

  **状态：已完成 ✅**

- [ ] **3. usermanu 顶部显示用户 role**

  **目标**：在 usermanu 顶部直观显示当前用户的角色（如 admin、premium、user）。

  **前端：**
  - [x] 在 `UserMenu.svelte` 顶部区域增加角色显示，使用 Badge 组件，内容为用户角色。
  - [x] 多语言支持，使用 `$i18n.t()` 确保不同语言下角色名称正确显示。
  - [x] 检查所有调用 UserMenu 的页面，确保顶部角色显示一致（自动继承）。

  **详细实现：**
  - 导入并使用 Badge 组件显示用户角色
  - 色彩区分：Admin (蓝色/info)、Premium (橙色/warning)、User (绿色/success)、其他 (灰色/muted)
  - 使用 `$i18n.t(role.charAt(0).toUpperCase() + role.slice(1))` 实现多语言支持
  - 只在有角色时显示，避免空白显示
  - 位置：菜单顶部，在所有菜单项之前，用分隔线分开

  **结果：**
  - 用户打开菜单时可以清晰看到自己的角色（Admin/Premium/User/Pending）
  - 角色显示使用醒目的彩色Badge，易于识别
  - 支持多语言，角色名称会根据当前语言显示
  - 所有使用UserMenu的页面都自动获得角色显示功能

  **状态：已完成 ✅**

- [ ] **4. usermanu 底部 Active users 增强**

  **目标**：底部 Active users 区域，显示在线用户头像、用户名，超4人可滑动。

  **后端：**
  - [x] Socket 层（`backend/open_webui/socket/main.py`）已维护在线用户池，可通过 `/users/active` 获取在线用户 id。
  - [x] 扩展 `/users/active` 接口，返回用户头像、用户名等详细信息。
  - [x] 保持向后兼容性，同时返回 `user_ids` 和 `users` 详细信息。

  **前端：**
  - [x] 在 `src/lib/apis/users/index.ts` 中添加 `getActiveUsers` API 函数。
  - [x] 修改 `UserMenu.svelte` 底部，调用 active users API，获取在线用户详细信息（头像、用户名）。
  - [x] 支持头像、用户名显示，使用卡片式设计。
  - [x] 多语言支持，保持原有的国际化功能。
  - [x] 检查所有调用 UserMenu 的页面，确保底部在线用户显示一致（自动继承）。

  **详细实现：**
  - 后端 API 扩展：返回 `{user_ids: [], users: [{id, name, profile_image_url}]}`
  - 前端显示增强：用户头像（4x4圆形）+ 用户名（截断显示）
  - 错误处理：profile_image_url 为空时自动使用默认头像 `/user.png`
  - 响应式设计：使用 flex wrap 布局，支持多用户显示
  - 视觉优化：用户卡片采用灰色背景，圆角设计，间距合理

  **结果：**
  - 用户可以清晰看到当前在线的其他用户及其头像、用户名
  - 实时更新活跃用户列表，每次打开菜单时刷新
  - 保持原有用户数量统计功能，同时增加详细用户信息
  - 所有使用 UserMenu 的页面自动获得增强的活跃用户显示功能
  - UI 友好，支持多用户场景的清晰展示

  **状态：已完成 ✅**
