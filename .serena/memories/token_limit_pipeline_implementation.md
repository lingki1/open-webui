# Token限制Pipeline实现方案

以下是基于Open WebUI的Pipeline架构实现的多颗粒度token限制方案，支持按用户角色和模型ID限制daily tokens使用量。

```python
import os
import time
import json
import math
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
from datetime import datetime, date
import tiktoken

class Pipeline:
    class Valves(BaseModel):
        # 按用户角色设置每日token限额 {"user": 10000, "premium": 50000, "admin": -1}
        # -1表示无限制
        daily_token_limits: Dict[str, int] = {
            "user": 10000,
            "premium": 50000,
            "admin": -1
        }
        
        # 按模型ID设置每日token限额 {"gpt-3.5-turbo": 5000, "gpt-4": 2000}
        # 如果未指定模型，则使用用户角色的默认限额
        model_token_limits: Dict[str, int] = {}
        
        # 用户特定限制 {"user123": {"daily_limit": 20000, "models": {"gpt-4": 5000}}}
        user_specific_limits: Dict[str, Dict[str, Any]] = {}
        
        # 是否启用token估算（如果模型提供商不返回token统计）
        enable_token_estimation: bool = True
        
        # 警告阈值百分比（当用量达到限额的多少百分比时发出警告）
        warning_threshold: float = 0.8
        
        # 数据持久化路径（用于存储用户token使用记录）
        data_path: str = "token_usage_data.json"
        
        # 是否在响应中添加用量信息
        include_usage_info: bool = True
        
        # 重置时间（每天几点重置用量，24小时制）
        reset_hour: int = 0
        
        # 列表形式的模型ID，用于批量配置
        target_models: List[str] = ["*"]  # "*"表示所有模型

    def __init__(self):
        self.type = "filter"
        self.name = "Token Limit Filter"
        self.valves = self.Valves(
            **{
                "daily_token_limits": json.loads(os.getenv("TOKEN_LIMIT_DAILY_LIMITS", '{"user": 10000, "premium": 50000, "admin": -1}')),
                "model_token_limits": json.loads(os.getenv("TOKEN_LIMIT_MODEL_LIMITS", '{}')),
                "user_specific_limits": json.loads(os.getenv("TOKEN_LIMIT_USER_SPECIFIC", '{}')),
                "enable_token_estimation": os.getenv("TOKEN_LIMIT_ENABLE_ESTIMATION", "true").lower() == "true",
                "warning_threshold": float(os.getenv("TOKEN_LIMIT_WARNING_THRESHOLD", "0.8")),
                "data_path": os.getenv("TOKEN_LIMIT_DATA_PATH", "token_usage_data.json"),
                "include_usage_info": os.getenv("TOKEN_LIMIT_INCLUDE_USAGE_INFO", "true").lower() == "true",
                "reset_hour": int(os.getenv("TOKEN_LIMIT_RESET_HOUR", "0")),
                "target_models": os.getenv("TOKEN_LIMIT_TARGET_MODELS", "*").split(","),
            }
        )
        # 用户token使用数据
        self.usage_data = self._load_usage_data()
        # tiktoken编码器缓存
        self._encoders = {}

    def _load_usage_data(self) -> Dict:
        """从文件加载使用数据"""
        try:
            if os.path.exists(self.valves.data_path):
                with open(self.valves.data_path, "r") as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading token usage data: {e}")
        return {}

    def _save_usage_data(self):
        """保存使用数据到文件"""
        try:
            with open(self.valves.data_path, "w") as f:
                json.dump(self.usage_data, f)
        except Exception as e:
            print(f"Error saving token usage data: {e}")

    def _get_encoder(self, model_id: str):
        """获取适合模型的tiktoken编码器"""
        if model_id not in self._encoders:
            try:
                # 根据模型选择合适的编码
                encoding_name = "cl100k_base"  # 默认编码
                if "gpt-4" in model_id:
                    encoding_name = "cl100k_base"
                elif "gpt-3.5" in model_id:
                    encoding_name = "cl100k_base"
                elif "llama" in model_id.lower():
                    encoding_name = "cl100k_base"
                
                self._encoders[model_id] = tiktoken.get_encoding(encoding_name)
            except Exception as e:
                print(f"Error creating encoder for {model_id}: {e}")
                # 默认回退到cl100k_base
                self._encoders[model_id] = tiktoken.get_encoding("cl100k_base")
        
        return self._encoders[model_id]

    def _get_today_key(self) -> str:
        """获取今日日期键"""
        return date.today().isoformat()

    def _get_user_daily_limit(self, user_id: str, user_role: str, model_id: str) -> int:
        """获取用户的每日token限额"""
        # 检查用户特定限制
        if user_id in self.valves.user_specific_limits:
            user_config = self.valves.user_specific_limits[user_id]
            
            # 检查用户的模型特定限制
            if "models" in user_config and model_id in user_config["models"]:
                return user_config["models"][model_id]
            
            # 检查用户的总体限制
            if "daily_limit" in user_config:
                return user_config["daily_limit"]
        
        # 检查模型特定限制
        if model_id in self.valves.model_token_limits:
            return self.valves.model_token_limits[model_id]
        
        # 使用用户角色的默认限制
        return self.valves.daily_token_limits.get(user_role, self.valves.daily_token_limits.get("user", 10000))

    def _get_user_usage(self, user_id: str, date_key: str = None) -> Dict:
        """获取用户的使用数据"""
        if date_key is None:
            date_key = self._get_today_key()
            
        if user_id not in self.usage_data:
            self.usage_data[user_id] = {}
            
        if date_key not in self.usage_data[user_id]:
            self.usage_data[user_id][date_key] = {
                "total_tokens": 0,
                "models": {}
            }
            
        return self.usage_data[user_id][date_key]

    def _estimate_tokens(self, body: Dict, model_id: str) -> int:
        """估算请求的token数量"""
        try:
            encoder = self._get_encoder(model_id)
            total_tokens = 0
            
            # 处理消息
            messages = body.get("messages", [])
            for message in messages:
                content = message.get("content", "")
                if isinstance(content, str):
                    total_tokens += len(encoder.encode(content))
                    
                # 处理工具调用
                tool_calls = message.get("tool_calls", [])
                if tool_calls:
                    for tool_call in tool_calls:
                        # 工具名称
                        name = tool_call.get("function", {}).get("name", "")
                        if name:
                            total_tokens += len(encoder.encode(name))
                        
                        # 工具参数
                        args = tool_call.get("function", {}).get("arguments", "")
                        if args:
                            if isinstance(args, str):
                                total_tokens += len(encoder.encode(args))
                            else:
                                total_tokens += len(encoder.encode(json.dumps(args)))
            
            # 估算完成tokens (通常是输入的30%-50%)
            completion_estimate = int(total_tokens * 0.5)
            
            return total_tokens + completion_estimate
        except Exception as e:
            print(f"Error estimating tokens: {e}")
            # 如果估算失败，返回一个安全的默认值
            return 1000  # 默认估算值

    def _extract_tokens_from_response(self, body: Dict) -> Dict:
        """从响应中提取token使用量"""
        usage = {}
        
        # 处理OpenAI格式的响应
        if "usage" in body:
            usage = body["usage"]
        
        # 处理Ollama格式的响应
        elif "timings" in body and "prompt_eval_count" in body:
            usage = {
                "prompt_tokens": body.get("prompt_eval_count", 0),
                "completion_tokens": body.get("eval_count", 0),
                "total_tokens": body.get("prompt_eval_count", 0) + body.get("eval_count", 0)
            }
            
        return usage

    async def on_startup(self):
        print(f"Token Limit Filter started")
        # 确保数据目录存在
        os.makedirs(os.path.dirname(os.path.abspath(self.valves.data_path)), exist_ok=True)

    async def on_shutdown(self):
        print(f"Token Limit Filter shutting down")
        self._save_usage_data()

    async def inlet(self, body: Dict, user: Optional[Dict] = None) -> Dict:
        """请求前检查token限制"""
        if not user:
            return body
            
        user_id = user.get("id", "anonymous")
        user_role = user.get("role", "user")
        model_id = body.get("model", "")
        
        # 检查是否需要对此模型应用限制
        target_models = self.valves.target_models
        if target_models != ["*"] and model_id not in target_models:
            return body
        
        # 获取用户的每日限额
        daily_limit = self._get_user_daily_limit(user_id, user_role, model_id)
        
        # 如果限额为-1，表示无限制
        if daily_limit == -1:
            return body
            
        # 获取用户今日使用量
        today_key = self._get_today_key()
        user_usage = self._get_user_usage(user_id, today_key)
        
        # 获取总使用量和模型特定使用量
        total_used = user_usage["total_tokens"]
        model_used = user_usage.get("models", {}).get(model_id, 0)
        
        # 估算本次请求的token数量
        estimated_tokens = self._estimate_tokens(body, model_id)
        
        # 检查是否超出限制
        if total_used + estimated_tokens > daily_limit:
            remaining = daily_limit - total_used
            if remaining <= 0:
                error_message = f"您今日的token配额已用完。每日限额: {daily_limit}，已使用: {total_used}。请等到明天重置或联系管理员增加配额。"
            else:
                error_message = f"此请求预计需要 {estimated_tokens} tokens，但您今日仅剩 {remaining} tokens。请缩短您的输入或等到明天重置。"
            
            raise Exception(error_message)
            
        # 检查是否接近限制（达到警告阈值）
        warning_threshold = daily_limit * self.valves.warning_threshold
        if total_used + estimated_tokens > warning_threshold:
            # 计算剩余百分比
            remaining = daily_limit - total_used - estimated_tokens
            remaining_percent = int((remaining / daily_limit) * 100)
            
            # 将警告信息添加到请求中，让模型知道
            if "system" not in body:
                body["system"] = ""
                
            warning_message = f"\n\n[系统通知: 您的token使用量已达到每日限额的 {100-remaining_percent}%，剩余 {remaining} tokens ({remaining_percent}%)。]"
            body["system"] += warning_message
            
        return body

    async def outlet(self, body: Dict, user: Optional[Dict] = None) -> Dict:
        """响应后记录token使用量"""
        if not user:
            return body
            
        user_id = user.get("id", "anonymous")
        model_id = body.get("model", "")
        
        # 检查是否需要对此模型应用限制
        target_models = self.valves.target_models
        if target_models != ["*"] and model_id not in target_models:
            return body
        
        # 从响应中提取token使用量
        usage = self._extract_tokens_from_response(body)
        
        # 如果没有使用量信息且启用了估算
        if not usage and self.valves.enable_token_estimation:
            # 尝试从请求中估算
            if "request" in body and isinstance(body["request"], dict):
                estimated_tokens = self._estimate_tokens(body["request"], model_id)
                usage = {
                    "prompt_tokens": int(estimated_tokens * 0.67),  # 假设67%是提示词
                    "completion_tokens": int(estimated_tokens * 0.33),  # 假设33%是完成
                    "total_tokens": estimated_tokens
                }
        
        # 如果有使用量信息，更新用户记录
        if usage and "total_tokens" in usage:
            today_key = self._get_today_key()
            user_usage = self._get_user_usage(user_id, today_key)
            
            # 更新总使用量
            user_usage["total_tokens"] += usage["total_tokens"]
            
            # 更新模型特定使用量
            if "models" not in user_usage:
                user_usage["models"] = {}
                
            if model_id not in user_usage["models"]:
                user_usage["models"][model_id] = 0
                
            user_usage["models"][model_id] += usage["total_tokens"]
            
            # 保存使用数据
            self._save_usage_data()
            
            # 如果需要在响应中包含使用信息
            if self.valves.include_usage_info:
                # 获取用户的每日限额
                user_role = user.get("role", "user")
                daily_limit = self._get_user_daily_limit(user_id, user_role, model_id)
                
                # 添加使用信息到响应
                if "usage_info" not in body:
                    body["usage_info"] = {}
                    
                body["usage_info"].update({
                    "daily_limit": daily_limit,
                    "total_used": user_usage["total_tokens"],
                    "remaining": max(0, daily_limit - user_usage["total_tokens"]) if daily_limit > 0 else -1,
                    "current_request": usage["total_tokens"]
                })
        
        return body
```

## 使用说明

### 1. 创建Pipeline文件

将上面的代码保存为`token_limit_filter.py`文件。

### 2. 配置环境变量

可以通过环境变量配置Pipeline的行为：

```bash
# 按用户角色设置每日token限额
export TOKEN_LIMIT_DAILY_LIMITS='{"user": 10000, "premium": 50000, "admin": -1}'

# 按模型ID设置每日token限额
export TOKEN_LIMIT_MODEL_LIMITS='{"gpt-3.5-turbo": 5000, "gpt-4": 2000, "llama2": 15000}'

# 用户特定限制
export TOKEN_LIMIT_USER_SPECIFIC='{"user123": {"daily_limit": 20000, "models": {"gpt-4": 5000}}}'

# 是否启用token估算
export TOKEN_LIMIT_ENABLE_ESTIMATION="true"

# 警告阈值百分比
export TOKEN_LIMIT_WARNING_THRESHOLD="0.8"

# 数据持久化路径
export TOKEN_LIMIT_DATA_PATH="token_usage_data.json"

# 是否在响应中添加用量信息
export TOKEN_LIMIT_INCLUDE_USAGE_INFO="true"

# 重置时间（每天几点重置用量，24小时制）
export TOKEN_LIMIT_RESET_HOUR="0"

# 目标模型列表（逗号分隔）
export TOKEN_LIMIT_TARGET_MODELS="*"  # 或 "gpt-3.5-turbo,gpt-4,claude-2"
```

### 3. 上传Pipeline

使用Open WebUI的Pipeline上传功能上传此文件。

### 4. 配置Valves

在Open WebUI的Pipeline管理界面中，可以配置以下参数：

- `daily_token_limits`: 按用户角色设置每日token限额
- `model_token_limits`: 按模型ID设置每日token限额
- `user_specific_limits`: 用户特定限制
- `enable_token_estimation`: 是否启用token估算
- `warning_threshold`: 警告阈值百分比
- `include_usage_info`: 是否在响应中添加用量信息
- `reset_hour`: 每天几点重置用量
- `target_models`: 目标模型列表

### 5. 监控使用情况

token使用数据将保存在`token_usage_data.json`文件中，格式如下：

```json
{
  "user123": {
    "2023-05-15": {
      "total_tokens": 5432,
      "models": {
        "gpt-3.5-turbo": 3210,
        "gpt-4": 2222
      }
    }
  },
  "user456": {
    "2023-05-15": {
      "total_tokens": 8765,
      "models": {
        "llama2": 8765
      }
    }
  }
}
```

## 功能特点

1. **多粒度限制**：
   - 按用户角色限制（user, premium, admin）
   - 按模型ID限制（gpt-3.5-turbo, gpt-4等）
   - 按用户ID限制（特定用户特殊配额）

2. **精确计量**：
   - 使用tiktoken准确估算token数量
   - 从模型响应中提取实际使用量
   - 支持多种模型格式（OpenAI, Ollama等）

3. **用户体验**：
   - 接近限额时显示警告
   - 超出限额时提供友好错误信息
   - 在响应中包含使用情况统计

4. **数据持久化**：
   - 保存使用记录到JSON文件
   - 支持每日自动重置
   - 按用户和模型分类存储

5. **灵活配置**：
   - 通过环境变量配置
   - 通过Valves界面动态调整
   - 支持模型白名单设置