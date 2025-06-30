# Token-based Rate Limit Pipeline 实现

## 核心修改思路

将原有的请求次数限制改为token数量限制，使用tiktoken进行精确的token计算，并在inlet阶段预估token消耗，在outlet阶段记录实际使用量。

## 主要改进点

1. **引入tiktoken**: 用于精确计算token数量
2. **双阶段控制**: inlet预估检查 + outlet实际记录
3. **灵活配置**: 支持不同用户角色的token限额
4. **滑动窗口**: 基于token的时间窗口限制
5. **准确统计**: 区分prompt_tokens和completion_tokens

## 技术实现细节

- 使用`cl100k_base`编码进行token计算
- 支持多种消息格式的token统计
- 实现token预估算法（completion通常是prompt的30-50%）
- 提供详细的限额信息和重置时间