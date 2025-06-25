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

## 📋 详细实施计划

### 步骤1: 创建角色状态管理器 [30分钟]

**目标**: 管理未锁定状态下的角色切换和开场白

#### 1.1 创建 RoleSessionManager
**文件**: `src/lib/utils/role-session.ts`

```typescript
import { get } from 'svelte/store';
import { models, chatId, chatModelLock } from '$lib/stores';
import { WorkspaceModelManager } from './models';
import { ChatModelLockManager } from './chat-model-lock';

interface RoleOpeningConfig {
  enabled: boolean;
  message: string;
  auto_send: boolean;
  delay_ms: number;
}

interface RoleSessionState {
  chatId: string;
  currentRoleId: string | null;
  isLocked: boolean;
  pendingOpeningMessages: Map<string, NodeJS.Timeout>;
  hasUserInteracted: boolean;
}

export class RoleSessionManager {
  private static sessions = new Map<string, RoleSessionState>();

  /**
   * 获取或创建会话状态
   */
  private static getOrCreateSession(chatId: string): RoleSessionState {
    if (!this.sessions.has(chatId)) {
      this.sessions.set(chatId, {
        chatId,
        currentRoleId: null,
        isLocked: false,
        pendingOpeningMessages: new Map(),
        hasUserInteracted: false
      });
    }
    return this.sessions.get(chatId)!;
  }

  /**
   * 获取角色开场白配置
   */
  static getRoleOpeningConfig(modelId: string): RoleOpeningConfig | null {
    const model = get(models).find(m => m.id === modelId);
    
    if (!model?.info?.meta?.role_opening?.enabled) {
      return null;
    }

    return {
      enabled: model.info.meta.role_opening.enabled,
      message: model.info.meta.role_opening.message || '',
      auto_send: model.info.meta.role_opening.auto_send ?? true,
      delay_ms: model.info.meta.role_opening.delay_ms ?? 1500
    };
  }

  /**
   * 检查会话是否已锁定
   */
  static isSessionLocked(chatId: string): boolean {
    const session = this.getOrCreateSession(chatId);
    return session.isLocked || ChatModelLockManager.isChatLocked(chatId);
  }

  /**
   * 检查用户是否已交互
   */
  static hasUserInteracted(chatId: string): boolean {
    const session = this.getOrCreateSession(chatId);
    return session.hasUserInteracted;
  }

  /**
   * 标记用户已交互并锁定到当前角色
   */
  static markUserInteraction(chatId: string): void {
    const session = this.getOrCreateSession(chatId);
    session.hasUserInteracted = true;

    // 如果当前有选择的角色，锁定到该角色
    if (session.currentRoleId && WorkspaceModelManager.isWorkspaceModel(session.currentRoleId)) {
      ChatModelLockManager.lockChatToWorkspaceModel(chatId, session.currentRoleId);
      session.isLocked = true;
      console.log(`用户交互后锁定会话 ${chatId} 到角色 ${session.currentRoleId}`);
    }
  }

  /**
   * 切换角色（未锁定状态下）
   */
  static async switchRole(
    chatId: string, 
    newRoleId: string,
    submitHandler: (content: string) => Promise<void>,
    clearMessagesHandler: () => Promise<void>
  ): Promise<void> {
    const session = this.getOrCreateSession(chatId);

    // 如果已锁定，不允许切换
    if (this.isSessionLocked(chatId)) {
      console.warn(`会话 ${chatId} 已锁定，无法切换角色`);
      return;
    }

    // 如果不是工作空间模型，直接返回
    if (!WorkspaceModelManager.isWorkspaceModel(newRoleId)) {
      session.currentRoleId = null;
      return;
    }

    // 取消之前角色的待发送开场白
    if (session.currentRoleId) {
      this.cancelRoleOpening(chatId, session.currentRoleId);
    }

    // 如果切换到不同角色，清空之前的消息
    if (session.currentRoleId && session.currentRoleId !== newRoleId) {
      console.log(`切换角色: ${session.currentRoleId} → ${newRoleId}，清空之前的开场白`);
      await clearMessagesHandler();
    }

    // 更新当前角色
    session.currentRoleId = newRoleId;

    // 触发新角色的开场白
    await this.triggerRoleOpening(chatId, newRoleId, submitHandler);
  }

  /**
   * 触发角色开场白
   */
  static async triggerRoleOpening(
    chatId: string,
    roleId: string,
    submitHandler: (content: string) => Promise<void>
  ): Promise<void> {
    const session = this.getOrCreateSession(chatId);
    const config = this.getRoleOpeningConfig(roleId);

    if (!config || !config.auto_send) {
      return;
    }

    console.log(`准备触发角色 ${roleId} 的开场白，延迟 ${config.delay_ms}ms`);

    // 设置延迟触发
    const timeoutId = setTimeout(async () => {
      try {
        // 再次检查是否已锁定或切换了角色
        if (session.isLocked || session.currentRoleId !== roleId) {
          return;
        }

        console.log(`触发角色开场白 [${roleId}]: "${config.message.substring(0, 50)}..."`);
        await submitHandler(config.message);
        
        session.pendingOpeningMessages.delete(roleId);
      } catch (error) {
        console.error(`角色开场白触发失败 [${roleId}]:`, error);
      }
    }, config.delay_ms);

    session.pendingOpeningMessages.set(roleId, timeoutId);
  }

  /**
   * 取消角色开场白
   */
  static cancelRoleOpening(chatId: string, roleId: string): void {
    const session = this.sessions.get(chatId);
    if (!session) return;

    const timeoutId = session.pendingOpeningMessages.get(roleId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      session.pendingOpeningMessages.delete(roleId);
      console.log(`取消角色 ${roleId} 的开场白`);
    }
  }

  /**
   * 清理会话状态
   */
  static cleanupSession(chatId: string): void {
    const session = this.sessions.get(chatId);
    if (!session) return;

    // 清除所有待触发的开场白
    session.pendingOpeningMessages.forEach((timeoutId, roleId) => {
      clearTimeout(timeoutId);
      console.log(`清理角色 ${roleId} 的待发送开场白`);
    });

    this.sessions.delete(chatId);
    console.log(`清理会话状态: ${chatId}`);
  }

  /**
   * 获取当前角色的开场白内容（用于预览）
   */
  static getCurrentRoleOpening(chatId: string): string | null {
    const session = this.sessions.get(chatId);
    if (!session?.currentRoleId) return null;

    const config = this.getRoleOpeningConfig(session.currentRoleId);
    return config?.message || null;
  }

  /**
   * 获取当前角色ID
   */
  static getCurrentRoleId(chatId: string): string | null {
    const session = this.sessions.get(chatId);
    return session?.currentRoleId || null;
  }

  /**
   * 重置会话（新对话时调用）
   */
  static resetSession(chatId: string): void {
    this.cleanupSession(chatId);
    // 重新创建空的会话状态
    this.getOrCreateSession(chatId);
  }
}
```

### 步骤2: 修改模型选择器逻辑 [25分钟]

**目标**: 移除立即锁定，改为角色切换逻辑

#### 2.1 修改 ModelSelector.svelte
**文件**: `src/lib/components/chat/ModelSelector.svelte`

在现有 import 中添加：
```typescript
import { RoleSessionManager } from '$lib/utils/role-session';
```

**完全替换现有的 handleModelSelection 函数**：
```typescript
const handleModelSelection = async (modelId: string) => {
  // 🆕 新的角色切换逻辑，取代原来的立即锁定
  if (WorkspaceModelManager.isWorkspaceModel(modelId) && currentChatId && currentChatId !== 'new') {
    
    // 检查是否已锁定
    if (RoleSessionManager.isSessionLocked(currentChatId)) {
      console.log(`会话 ${currentChatId} 已锁定，无法切换角色`);
      return;
    }

    // 切换角色（包含清空之前消息和触发新开场白的逻辑）
    await RoleSessionManager.switchRole(
      currentChatId, 
      modelId, 
      submitHandler,
      clearRoleMessagesHandler
    );
  } else {
    // 选择普通模型时，重置当前角色
    if (currentChatId && currentChatId !== 'new') {
      const currentRoleId = RoleSessionManager.getCurrentRoleId(currentChatId);
      if (currentRoleId) {
        RoleSessionManager.cancelRoleOpening(currentChatId, currentRoleId);
        await clearRoleMessagesHandler();
      }
    }
  }
};
```

**添加新的 props**：
```typescript
// 提交处理器
export let submitHandler: (content: string) => Promise<void> = async () => {
  console.warn('submitHandler not provided to ModelSelector');
};

// 清空角色消息处理器
export let clearRoleMessagesHandler: () => Promise<void> = async () => {
  console.warn('clearRoleMessagesHandler not provided to ModelSelector');
};
```

**修改锁定状态检查**：
```typescript
// 修改现有的锁定状态变量
$: isCurrentChatLocked = currentChatId && RoleSessionManager.isSessionLocked(currentChatId);
```

### 步骤3: 修改 Chat.svelte 集成用户交互锁定 [30分钟]

**目标**: 在用户输入时锁定模型，并提供消息清理功能

#### 3.1 修改 Chat.svelte
**文件**: `src/lib/components/chat/Chat.svelte`

**添加导入**：
```typescript
import { RoleSessionManager } from '$lib/utils/role-session';
```

**为 ModelSelector 提供所需的处理器**：
```svelte
<ModelSelector 
  bind:selectedModels 
  submitHandler={submitPrompt}
  clearRoleMessagesHandler={clearRoleMessages}
  disabled={!loaded}
  showSetDefault={!shareUrl}
/>
```

**在 submitPrompt 函数开始处添加用户交互锁定逻辑**（约第1440行）：
```typescript
const submitPrompt = async (userPrompt, { _raw = false } = {}) => {
  // 🆕 用户开始输入内容，标记交互并锁定模型
  if ($chatId && !RoleSessionManager.hasUserInteracted($chatId)) {
    console.log('用户开始输入，锁定会话到当前角色');
    RoleSessionManager.markUserInteraction($chatId);
  }

  // 🆕 取消所有待发送的角色开场白
  if (selectedModels.length > 0 && $chatId) {
    selectedModels.forEach(modelId => {
      RoleSessionManager.cancelRoleOpening($chatId, modelId);
    });
  }

  // 现有的 submitPrompt 逻辑...
  console.log('submitPrompt:', { userPrompt: userPrompt?.substring(0, 100) + '...', chatId: $chatId });
  // ... 继续原有代码
};
```

**添加清空角色消息的函数**（在 submitPrompt 函数前添加）：
```typescript
/**
 * 清空当前会话中角色产生的消息
 */
const clearRoleMessages = async () => {
  if (!$chatId || !history) return;

  // 找到最后一条助手消息（角色开场白）
  const messages = Object.values(history.messages).sort((a, b) => 
    (a.timestamp || 0) - (b.timestamp || 0)
  );
  
  // 只清空最后一条助手消息（如果是角色开场白的话）
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && 
      lastMessage.role === 'assistant' && 
      lastMessage.parentId === null) { // 没有父消息的助手消息通常是开场白
    
    delete history.messages[lastMessage.id];
    
    // 如果这是当前消息，重置 currentId
    if (history.currentId === lastMessage.id) {
      // 找到上一条消息作为新的 currentId
      const remainingMessages = Object.values(history.messages).sort((a, b) => 
        (a.timestamp || 0) - (b.timestamp || 0)
      );
      history.currentId = remainingMessages.length > 0 ? 
        remainingMessages[remainingMessages.length - 1].id : 
        null;
    }
    
    console.log(`清空角色开场白消息: ${lastMessage.id}`);
    
    // 触发界面更新
    history = history;
    await tick();
  }
};
```

**在对话切换处理中添加会话重置**（找到现有的对话切换代码并修改）：
```typescript
const handleChatSwitch = (newChatId: string) => {
  // 现有的清理逻辑...
  
  // 🆕 清理角色会话状态
  if (currentChatId && currentChatId !== newChatId) {
    RoleSessionManager.cleanupSession(currentChatId);
  }
  
  // 🆕 为新对话初始化会话状态
  if (newChatId && newChatId !== 'new') {
    RoleSessionManager.resetSession(newChatId);
  }
};
```

### 步骤4: 扩展模型数据结构 [20分钟]

**目标**: 在工作空间模型中添加角色开场白配置（与之前方案相同）

#### 4.1 修改 ModelEditor.svelte
**文件**: `src/lib/components/workspace/Models/ModelEditor.svelte`

在系统提示符配置区域后（约第560行）添加：

```svelte
<!-- 角色开场白配置 -->
<div class="my-2">
  <div class="mb-1 flex w-full justify-between items-center">
    <div class="self-center text-sm font-semibold">{$i18n.t('Role Opening Message')}</div>
    <button
      class="p-1 text-xs flex rounded-sm transition"
      type="button"
      on:click={() => {
        if (!info.meta.role_opening) {
          info.meta.role_opening = {
            enabled: false,
            message: '',
            auto_send: true,
            delay_ms: 1500
          };
        } else {
          info.meta.role_opening.enabled = !info.meta.role_opening.enabled;
        }
      }}
    >
      {#if !info.meta.role_opening?.enabled}
        <span class="ml-2 self-center">{$i18n.t('Disabled')}</span>
      {:else}
        <span class="ml-2 self-center">{$i18n.t('Enabled')}</span>
      {/if}
    </button>
  </div>

  {#if info.meta.role_opening?.enabled}
    <div class="space-y-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <div class="flex items-center gap-2 mb-2">
        <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="text-sm font-medium text-green-800 dark:text-green-300">
          {$i18n.t('Role Opening Scene - Flexible Switching')}
        </span>
      </div>
      
      <Textarea
        className="text-sm w-full bg-white/70 dark:bg-gray-800/70 border border-green-200 dark:border-green-700 rounded-md outline-hidden resize-none overflow-y-hidden"
        placeholder={$i18n.t('Enter the opening message for this character...\n\nUsers can freely switch between characters before typing their first message.\n\nExample:\n"Hello! I\'m your creative writing assistant. I can help you with storytelling, character development, and plot creation. What would you like to work on today?"')}
        rows={5}
        bind:value={info.meta.role_opening.message}
      />
      
      <div class="flex items-center justify-between">
        <label class="flex items-center space-x-2">
          <input 
            type="checkbox" 
            bind:checked={info.meta.role_opening.auto_send}
            class="rounded border-green-300 text-green-600 focus:ring-green-500"
          />
          <span class="text-xs text-green-700 dark:text-green-300">{$i18n.t('Auto-send when role is selected')}</span>
        </label>
        
        <div class="flex items-center space-x-2">
          <span class="text-xs text-green-600 dark:text-green-400">{$i18n.t('Delay')}:</span>
          <input 
            type="number" 
            bind:value={info.meta.role_opening.delay_ms}
            min="500"
            max="5000"
            step="100"
            class="w-20 text-xs px-2 py-1 rounded border border-green-300 dark:border-green-700 bg-white/70 dark:bg-gray-800/70"
          />
          <span class="text-xs text-green-600 dark:text-green-400">ms</span>
        </div>
      </div>
      
      <div class="mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-800 dark:text-green-300">
        <strong>{$i18n.t('How it works')}:</strong><br/>
        • {$i18n.t('Users can switch between roles freely before typing')}<br/>
        • {$i18n.t('Each role switch clears previous opening and shows new one')}<br/>
        • {$i18n.t('Model locks only when user starts typing their message')}
      </div>
    </div>
  {/if}
</div>

<hr class="border-gray-100 dark:border-gray-850 my-1.5" />
```

#### 4.2 添加国际化文本
**文件**: `src/lib/i18n/locales/zh-CN/translation.json`

```json
{
  "Role Opening Message": "角色开场白",
  "Role Opening Scene - Flexible Switching": "角色开场 - 灵活切换",
  "Auto-send when role is selected": "选择角色时自动发送",
  "Delay": "延迟",
  "Enter the opening message for this character...": "输入此角色的开场白...",
  "How it works": "工作原理",
  "Users can switch between roles freely before typing": "用户可在输入前自由切换角色",
  "Each role switch clears previous opening and shows new one": "每次切换角色会清空之前的开场白并显示新的",
  "Model locks only when user starts typing their message": "只有用户开始输入时才锁定模型",
  "Disabled": "已禁用",
  "Enabled": "已启用"
}
```

### 步骤5: 优化 ChatPlaceholder 显示 [15分钟]

**目标**: 显示当前角色状态和切换提示

#### 5.1 修改 ChatPlaceholder.svelte
**文件**: `src/lib/components/chat/ChatPlaceholder.svelte`

**添加导入**：
```typescript
import { RoleSessionManager } from '$lib/utils/role-session';
```

**添加响应式变量**：
```typescript
// 获取当前角色会话状态
$: selectedModel = models[selectedModelIdx];
$: currentRoleOpening = $chatId ? RoleSessionManager.getCurrentRoleOpening($chatId) : null;
$: isSessionLocked = $chatId ? RoleSessionManager.isSessionLocked($chatId) : false;
$: hasUserInteracted = $chatId ? RoleSessionManager.hasUserInteracted($chatId) : false;
$: isWorkspaceModel = selectedModel ? WorkspaceModelManager.isWorkspaceModel(selectedModel.id) : false;
```

**在模型名称显示后添加角色状态显示**（约第87行）：
```svelte
<!-- 角色切换状态显示 -->
{#if isWorkspaceModel && currentRoleOpening}
  <div class="mt-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 shadow-sm" 
       in:fade={{ duration: 300, delay: 400 }}>
    <div class="flex items-center gap-2 mb-2">
      <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span class="text-sm font-medium text-green-800 dark:text-green-300">
        {isSessionLocked ? $i18n.t('Locked Role Says') : $i18n.t('Current Role Will Say')}:
      </span>
      {#if !isSessionLocked}
        <div class="ml-auto flex items-center gap-1">
          <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span class="text-xs text-amber-700 dark:text-amber-300">{$i18n.t('Unlocked')}</span>
        </div>
      {/if}
    </div>
    
    <div class="text-sm text-green-700 dark:text-green-300 italic leading-relaxed mb-3">
      "{currentRoleOpening}"
    </div>
    
    {#if !isSessionLocked && !hasUserInteracted}
      <div class="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 p-2 rounded">
        <div class="flex items-start gap-2">
          <svg class="w-3 h-3 mt-0.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5v3a.75.75 0 001.5 0v-3A.75.75 0 009 9z" clip-rule="evenodd"/>
          </svg>
          <div>
            <div class="font-medium">{$i18n.t('You can still switch roles!')}</div>
            <div class="mt-1 opacity-80">
              {$i18n.t('Try different characters from the model selector above. The conversation will lock to your chosen role once you start typing.')}
            </div>
          </div>
        </div>
      </div>
    {:else if isSessionLocked}
      <div class="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
        🔒 {$i18n.t('This conversation is now locked to this character')}
      </div>
    {/if}
  </div>
{/if}
```

**在国际化文件中添加**：
```json
{
  "Locked Role Says": "锁定角色说",
  "Current Role Will Say": "当前角色将会说",
  "Unlocked": "未锁定",
  "You can still switch roles!": "您仍可以切换角色！",
  "Try different characters from the model selector above. The conversation will lock to your chosen role once you start typing.": "尝试从上方的模型选择器中选择不同的角色。一旦您开始输入，对话将锁定到您选择的角色。",
  "This conversation is now locked to this character": "此对话现已锁定到此角色"
}
```

### 步骤6: 测试和验证 [20分钟]

**目标**: 验证完整的角色切换流程

#### 6.1 测试场景

1. **创建测试角色**:
   - 角色A: 创意写作助手，开场白："你好！我是你的创意写作助手..."
   - 角色B: 技术顾问，开场白："嗨！我是技术顾问..."

2. **测试角色切换流程**:
   ```
   选择角色A → 等待开场白A出现 → 
   切换到角色B → 开场白A消失，开场白B出现 → 
   切换回角色A → 开场白B消失，开场白A重新出现 →
   开始输入内容 → 锁定到角色A，显示锁定状态
   ```

3. **验证锁定后行为**:
   - 锁定后无法再切换工作空间模型
   - 可以切换基础LLM模型
   - 占位符显示锁定状态

#### 6.2 调试要点
- 检查控制台日志确认角色切换流程
- 验证消息清理功能正常工作
- 确认延迟设置生效
- 测试用户交互锁定时机

## 🎯 验收标准

✅ **角色切换体验**
- [ ] 选择工作空间模型时不立即锁定
- [ ] 角色开场白正常触发和显示
- [ ] 切换角色时清空之前的开场白
- [ ] 新角色的开场白正常显示

✅ **用户交互锁定**
- [ ] 用户输入内容时自动锁定到当前角色
- [ ] 锁定后显示正确的状态指示
- [ ] 锁定后无法切换工作空间模型

✅ **界面体验**
- [ ] 占位符正确显示角色状态
- [ ] 未锁定时显示切换提示
- [ ] 锁定时显示锁定状态
- [ ] 角色配置界面工作正常

## 🔧 核心技术改进

1. **分离选择和锁定**: 选择模型≠锁定模型，提供更好的用户体验
2. **智能消息管理**: 自动清理角色切换产生的冗余消息
3. **会话状态跟踪**: 精确管理每个会话的角色状态和锁定时机
4. **用户交互检测**: 准确判断用户真正开始使用的时机

## 🚀 用户体验亮点

1. **自由试用**: 用户可以"试听"不同角色的开场白
2. **无压力选择**: 不必担心误选导致锁定
3. **清晰反馈**: 界面清楚显示当前状态和下一步操作
4. **渐进锁定**: 只有真正开始对话时才锁定，符合自然使用习惯

---

此优化方案实现了真正灵活的角色切换体验，让用户可以在做出最终选择前充分体验不同角色，同时保持了必要的锁定机制来维护对话一致性。 