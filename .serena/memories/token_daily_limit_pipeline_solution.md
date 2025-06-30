# Token Daily限制的Pipelines/Functions方案分析

## 🔍 **可行性分析结果：高度可行！**

使用Open WebUI的**Functions + Pipelines**架构实现token daily限制是**完全可行**的，而且是一个非常**优雅的解决方案**。

## 🏗️ **Pipelines架构优势**

### 1. 完美的拦截点
- **Inlet Filter**: 在请求发送给模型之前拦截，适合预先检查和限制
- **Outlet Filter**: 在收到模型响应后拦截，适合统计实际消耗的tokens
- **Pipeline优先级**: 支持多个filters的排序执行

### 2. 现有基础设施
```python
# 已有的pipeline处理流程
async def process_pipeline_inlet_filter(request, payload, user, models)
async def process_pipeline_outlet_filter(request, payload, user, models)
```

### 3. 多模型支持
- 支持所有模型提供商的统一处理
- 自动token格式转换（Ollama → OpenAI）
- 完善的错误处理机制

## 💡 **推荐实现方案**

### **方案A: Pipeline Filter (推荐)**

创建一个名为`token_limit_filter.py`的pipeline：

```python
from typing import List, Optional
import asyncio
import aiohttp
from pydantic import BaseModel
from datetime import datetime, date
import json

class Pipeline:
    class Valves(BaseModel):
        # 管理员可配置的参数
        DAILY_TOKEN_LIMITS: dict = {
            "user": 10000,      # 普通用户日限额
            "premium": 50000,   # 高级用户日限额
            "admin": -1         # 管理员无限制
        }
        RATE_LIMIT_WINDOW: int = 3600  # 速率限制窗口(秒)
        MAX_TOKENS_PER_HOUR: dict = {
            "user": 1000,
            "premium": 5000,
            "admin": -1
        }
        
    def __init__(self):
        self.name = "Token Daily Limit Filter"
        self.valves = self.Valves()
        self.type = "filter"
        self.priority = 1  # 高优先级，第一个执行
        
    async def inlet(self, body: dict, user: dict) -> dict:
        """请求前检查：验证用户token限额"""
        
        user_id = user["id"]
        user_role = user.get("role", "user")
        today = date.today().isoformat()
        
        # 1. 估算即将消耗的tokens
        estimated_tokens = await self.estimate_tokens(body)
        
        # 2. 检查日限额
        daily_usage = await self.get_daily_usage(user_id, today)
        daily_limit = self.valves.DAILY_TOKEN_LIMITS.get(user_role, 10000)
        
        if daily_limit > 0 and (daily_usage + estimated_tokens) > daily_limit:
            raise Exception(
                f"Daily token limit exceeded. Used: {daily_usage}, "
                f"Limit: {daily_limit}, Requested: {estimated_tokens}"
            )
        
        # 3. 检查小时速率限制
        await self.check_rate_limit(user_id, user_role, estimated_tokens)
        
        # 4. 记录请求开始
        await self.log_request_start(user_id, body, estimated_tokens)
        
        return body
        
    async def outlet(self, body: dict, user: dict) -> dict:
        """响应后统计：记录实际消耗的tokens"""
        
        user_id = user["id"]
        
        # 从响应中提取实际token使用量
        actual_usage = self.extract_token_usage(body)
        
        if actual_usage:
            await self.record_actual_usage(user_id, actual_usage)
            
        return body
        
    async def estimate_tokens(self, body: dict) -> int:
        """估算即将消耗的tokens"""
        # 使用tiktoken估算
        import tiktoken
        
        encoding = tiktoken.get_encoding("cl100k_base")
        total_tokens = 0
        
        messages = body.get("messages", [])
        for message in messages:
            content = message.get("content", "")
            if isinstance(content, str):
                total_tokens += len(encoding.encode(content))
                
        # 预估completion tokens (通常是prompt的30%-50%)
        estimated_completion = int(total_tokens * 0.4)
        
        return total_tokens + estimated_completion
        
    async def get_daily_usage(self, user_id: str, date: str) -> int:
        """获取用户今日token使用量"""
        # 这里可以连接数据库或外部存储
        # 示例使用内存存储
        return await self.query_usage_database(user_id, date)
        
    async def record_actual_usage(self, user_id: str, usage: dict):
        """记录实际token使用量"""
        await self.save_to_database(user_id, usage)
```

### **方案B: Function Tool (辅助方案)**

创建一个管理函数用于查询和管理用量：

```python
# token_management_function.py
from typing import Optional

async def get_user_token_usage(
    user_id: Optional[str] = None,
    date_range: Optional[str] = "today"
) -> str:
    """查询用户token使用情况"""
    
    if not user_id:
        return "需要提供用户ID"
        
    usage_data = await query_token_usage(user_id, date_range)
    
    return f"""
📊 Token使用情况报告
👤 用户: {user_id}
📅 时间: {date_range}
🔢 已使用: {usage_data['used_tokens']}
📊 限额: {usage_data['daily_limit']}
⏰ 剩余: {usage_data['remaining_tokens']}
📈 使用率: {usage_data['usage_percentage']}%
    """

async def set_user_token_limit(
    user_id: str,
    daily_limit: int,
    role: Optional[str] = None
) -> str:
    """设置用户token限额"""
    
    await update_user_limits(user_id, daily_limit, role)
    return f"✅ 已更新用户 {user_id} 的日限额为 {daily_limit} tokens"
```

## 🔄 **实现流程**

### 1. 开发阶段
```bash
# 1. 创建pipeline文件
touch pipelines/token_limit_filter.py

# 2. 测试pipeline
python -m pytest tests/test_token_limits.py

# 3. 上传到Open WebUI
curl -X POST http://localhost:8080/api/v1/pipelines/upload \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@token_limit_filter.py"
```

### 2. 配置阶段
```python
# 在管理界面配置Valves参数
valves_config = {
    "DAILY_TOKEN_LIMITS": {
        "user": 5000,
        "premium": 20000,
        "enterprise": 100000,
        "admin": -1
    },
    "ENABLE_RATE_LIMITING": True,
    "ALERT_THRESHOLD": 0.8  # 80%时发送警告
}
```

### 3. 监控阶段
- 实时dashboard显示token使用情况
- 自动告警机制
- 使用趋势分析

## 🎯 **核心优势**

1. **非侵入性**: 不需要修改Open WebUI核心代码
2. **高度可配置**: 通过Valves系统灵活配置
3. **实时生效**: 无需重启服务
4. **多模型兼容**: 支持所有模型提供商
5. **精确统计**: 基于实际响应统计token使用
6. **扩展性强**: 可轻松添加更多限制策略

## 📈 **扩展功能**

- **用户组限制**: 不同用户组不同限额
- **模型特定限制**: 不同模型不同计费
- **时间段限制**: 工作时间/非工作时间不同限额
- **积分制度**: token积分充值和消费
- **使用分析**: 详细的使用报告和趋势分析

这个方案充分利用了Open WebUI现有的架构优势，是实现token限制的最佳方式！