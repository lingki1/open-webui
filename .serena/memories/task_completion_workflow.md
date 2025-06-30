# 任务完成工作流程

## 开发任务完成后的检查清单

### 代码质量检查
```powershell
# 1. 前端代码检查
npm run lint
npm run check
npm run format

# 2. 后端代码检查  
cd backend
black . --exclude ".venv/|/venv/"
pylint open_webui/
```

### 测试验证
```powershell
# 1. 前端测试
npm run test:frontend

# 2. 后端测试
cd backend
pytest

# 3. E2E测试
npm run cy:open
```

### 构建验证
```powershell
# 1. 前端构建
npm run build

# 2. 检查构建产物
ls dist/

# 3. 预览生产版本
npm run preview
```

### 功能验证
1. **本地开发环境测试**
   - 启动前后端服务
   - 验证新功能正常工作
   - 检查现有功能无回归

2. **跨浏览器测试**
   - Chrome, Firefox, Safari
   - 移动端浏览器

3. **权限和安全测试**
   - 不同用户角色权限验证
   - 数据访问控制检查

### 文档更新
1. **代码注释**: 确保复杂逻辑有充分注释
2. **API文档**: 更新Swagger文档
3. **变更日志**: 记录重要变更
4. **用户文档**: 必要时更新使用说明

### 版本控制
```powershell
# 1. 提交前检查
git status
git diff

# 2. 分阶段提交
git add <specific-files>
git commit -m "feat: descriptive commit message"

# 3. 推送前拉取
git pull origin main
git push origin feature-branch
```

### 部署准备
1. **环境配置检查**
   - 环境变量设置
   - 数据库迁移脚本
   - 依赖版本兼容性

2. **Docker构建测试**
   ```powershell
   docker build -t open-webui-test .
   docker run -p 3000:8080 open-webui-test
   ```

3. **性能测试**
   - 内存使用监控
   - 响应时间测试
   - 并发负载测试

## 发布流程

### 1. 预发布检查
- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 文档更新完成
- [ ] 变更日志更新

### 2. 版本标记
```powershell
# 更新版本号
# package.json 和 pyproject.toml

# 创建版本标签
git tag -a v0.6.16 -m "Release v0.6.16"
git push origin v0.6.16
```

### 3. 部署验证
- [ ] 生产环境部署成功
- [ ] 核心功能验证
- [ ] 监控指标正常
- [ ] 用户反馈收集

### 4. 回滚准备
- [ ] 备份当前版本
- [ ] 回滚脚本准备
- [ ] 应急联系方式