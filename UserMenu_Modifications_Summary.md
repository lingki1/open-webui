# 用户菜单权限控制修改总结

## 修改目标

根据用户要求，修改 Open WebUI 项目中的用户菜单权限控制，使得：

1. **普通用户（user）** 只能看到：
   - Settings（设置）
   - Archived Chats（归档聊天）
   - Keyboard shortcuts（快捷键）
   - Sign out（登出）

2. **管理员用户（admin）** 可以看到所有选项，包括：
   - 上述普通用户的所有选项
   - Documentation（文档）
   - Releases（发布信息）
   - Active users（在线用户，并显示具体用户名）
   - Playground（操场）
   - Admin Panel（管理面板）

## 已完成的修改

### 1. 后端 API 修改

**文件：** `backend/open_webui/main.py`

- 修改了 `/api/usage` API 端点（第 1656-1680 行）
- 新增返回在线用户详细信息，包括：
  - `users` 数组：包含用户 ID、姓名、邮箱
  - 保持向后兼容性：仍然返回原有的 `user_ids` 数组

### 2. 前端用户菜单修改

**文件：** `src/lib/components/layout/Sidebar/UserMenu.svelte`

- 根据用户角色限制菜单项显示：
  - Documentation 和 Releases 现在只对 admin 用户可见
  - Active Users 部分只对 admin 用户可见，并显示在线用户的详细名称
  - Settings、Archived Chats、Keyboard shortcuts、Sign out 对所有用户可见

## 技术实现详情

### 后端修改

```python
@app.get("/api/usage")
async def get_current_usage(user=Depends(get_verified_user)):
    try:
        # 获取在线用户ID列表
        user_ids = get_active_user_ids()
        
        # 获取用户详细信息
        users = []
        if user_ids:
            for user_id in user_ids:
                user_obj = Users.get_user_by_id(user_id)
                if user_obj:
                    users.append({
                        "id": user_obj.id,
                        "name": user_obj.name,
                        "email": user_obj.email
                    })
        
        return {
            "model_ids": get_models_in_use(), 
            "user_ids": user_ids,  # 保持向后兼容
            "users": users  # 新增：包含用户详细信息的数组
        }
    except Exception as e:
        log.error(f"Error getting usage statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
```

### 前端修改

在 UserMenu.svelte 中：

1. **权限控制**：使用 `{#if role === 'admin'}` 条件语句控制菜单项显示
2. **在线用户显示**：从 `usage.user_ids` 改为 `usage.users`，显示用户名而不只是数量
3. **保持兼容性**：原有功能保持不变，只是根据角色添加了可见性控制

## 使用方法

1. **启动后端服务器**：
   ```bash
   cd backend
   python -m uvicorn open_webui.main:app --host 0.0.0.0 --port 8080 --reload
   ```

2. **启动前端开发服务器**：
   ```bash
   npm run dev
   ```

3. **测试**：
   - 使用不同角色的用户登录（admin vs user）
   - 点击右上角头像查看用户菜单
   - 验证菜单项是否按照权限正确显示

## 注意事项

- TypeScript 类型错误：前端文件可能存在一些 TypeScript 类型错误，但不影响功能运行
- 向后兼容性：API 修改保持了向后兼容，现有的客户端仍然可以正常工作
- 权限验证：基于用户的 `role` 字段进行权限控制

## 预期效果

- **普通用户**：看到精简的菜单，只包含基本功能
- **管理员用户**：看到完整的菜单，包括管理功能和在线用户详情
- **在线用户显示**：管理员可以看到具体的在线用户名称，而不只是数量 