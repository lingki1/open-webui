import { get } from 'svelte/store';
import { models, dynamicBaseModels } from '$lib/stores';
import { WorkspaceModelManager } from './models';
import type { Model } from '$lib/stores';

/**
 * 工作空间模型参数继承处理类
 * 处理工作空间模型参数与动态基础模型的参数继承关系
 */
export class WorkspaceModelParams {
  /**
   * 从工作空间模型获取聊天API请求参数
   * 优先使用工作空间模型的参数，缺失的参数从基础模型继承
   * 
   * @param workspaceModelId 工作空间模型ID
   * @returns 完整的请求参数对象
   */
  static getChatParams(workspaceModelId: string): Record<string, any> {
    const workspaceModel = this.getWorkspaceModel(workspaceModelId);
    if (!workspaceModel) return {};
    
    // 获取当前使用的基础模型ID
    const baseModelId = WorkspaceModelManager.getCurrentBaseModelId(workspaceModelId);
    if (!baseModelId) return this.getModelParamsFromInfo(workspaceModel);
    
    // 获取基础模型
    const baseModel = this.getModelById(baseModelId);
    if (!baseModel) return this.getModelParamsFromInfo(workspaceModel);
    
    // 先获取工作空间模型的所有参数
    const workspaceParams = this.getModelParamsFromInfo(workspaceModel);
    
    // 获取基础模型的参数，作为备用
    const baseParams = this.getModelParamsFromInfo(baseModel);
    
    // 合并参数，工作空间模型参数优先级高于基础模型参数
    return this.mergeParams(workspaceParams, baseParams);
  }
  
  /**
   * 准备聊天API请求
   * 处理模型ID替换和参数继承逻辑
   * 
   * @param request 原始请求对象
   * @param workspaceModelId 工作空间模型ID
   * @returns 处理后的请求对象
   */
  static prepareChatRequest(request: Record<string, any>, workspaceModelId: string): Record<string, any> {
    // 检查是否为工作空间模型
    if (!WorkspaceModelManager.isWorkspaceModel(workspaceModelId)) {
      return request; // 如果不是工作空间模型，直接返回原始请求
    }
    
    // 获取当前基础模型ID
    const baseModelId = WorkspaceModelManager.getCurrentBaseModelId(workspaceModelId);
    if (!baseModelId) return request; // 没有有效的基础模型，返回原始请求
    
    // 复制请求对象，避免修改原始对象
    const updatedRequest = { ...request };
    
    // 替换model字段为实际使用的基础模型ID
    updatedRequest.model = baseModelId;
    
    // 添加原始工作空间模型信息到请求元数据
    if (!updatedRequest.metadata) {
      updatedRequest.metadata = {};
    }
    
    // 在元数据中保留工作空间模型信息
    updatedRequest.metadata.workspace_model_id = workspaceModelId;
    
    // 获取合并后的参数
    const mergedParams = this.getChatParams(workspaceModelId);
    
    // 确保系统提示词(system)的保留和优先级
    this.ensureSystemPrompt(updatedRequest, mergedParams);
    
    // 应用合并后的参数到请求中
    return { ...updatedRequest, ...mergedParams };
  }

  /**
   * 确保系统提示词被正确设置
   * 工作空间模型的系统提示词具有最高优先级
   */
  private static ensureSystemPrompt(request: Record<string, any>, params: Record<string, any>): void {
    // 如果工作空间模型有系统提示词，确保它被正确应用到请求消息中
    if (params.system) {
      // 检查消息数组是否存在
      if (!request.messages || !Array.isArray(request.messages)) {
        request.messages = [];
      }
      
      // 查找现有的系统消息
      const systemMessageIndex = request.messages.findIndex((msg: Record<string, any>) => msg.role === 'system');
      
      // 如果存在系统消息，则更新它
      if (systemMessageIndex >= 0) {
        request.messages[systemMessageIndex].content = params.system;
      } else {
        // 如果不存在，在消息数组开头添加系统消息
        request.messages.unshift({ role: 'system', content: params.system });
      }
      
      // 从params中删除system字段，因为它已经被应用到messages中了
      delete params.system;
    }
  }
  
  /**
   * 合并工作空间模型参数和基础模型参数
   * 工作空间模型参数优先级高于基础模型参数
   */
  private static mergeParams(workspaceParams: Record<string, any>, baseParams: Record<string, any>): Record<string, any> {
    // 创建一个新对象，避免修改原始对象
    const mergedParams: Record<string, any> = { ...baseParams };
    
    // 使用工作空间模型的参数覆盖基础模型参数
    for (const [key, value] of Object.entries(workspaceParams)) {
      // 只有当值不是undefined或null时才覆盖
      if (value !== undefined && value !== null) {
        mergedParams[key] = value;
      }
    }
    
    return mergedParams;
  }
  
  /**
   * 从模型中提取参数
   */
  private static getModelParamsFromInfo(model: Model): Record<string, any> {
    // 模型信息中可能包含params字段
    const info = model.info || {} as any;
    const params = (info.params || {}) as Record<string, any>;

    // 提取所有有效参数
    return {
      // 系统提示词(如果有)
      ...(params.system ? { system: params.system } : {}),
      
      // 温度设置
      ...(params.temperature ? { temperature: parseFloat(params.temperature) } : {}),
      
      // Top-p 采样
      ...(params.top_p ? { top_p: parseFloat(params.top_p) } : {}),
      
      // 频率惩罚
      ...(params.frequency_penalty ? { frequency_penalty: parseFloat(params.frequency_penalty) } : {}),
      
      // 存在惩罚
      ...(params.presence_penalty ? { presence_penalty: parseFloat(params.presence_penalty) } : {}),
      
      // Top-k 采样
      ...(params.top_k ? { top_k: parseInt(params.top_k) } : {}),
      
      // Max tokens
      ...(params.max_tokens ? { max_tokens: parseInt(params.max_tokens) } : {}),
      
      // 停止词
      ...(params.stop ? { stop: params.stop } : {}),
    };
  }

  /**
   * 获取指定ID的模型
   */
  private static getModelById(modelId: string): Model | undefined {
    const allModels = get(models);
    return allModels.find(model => model.id === modelId);
  }
  
  /**
   * 获取工作空间模型
   */
  private static getWorkspaceModel(modelId: string): Model | undefined {
    return this.getModelById(modelId);
  }

  /**
   * 获取当前正在使用的基础模型
   * 考虑动态基础模型设置
   */
  static getEffectiveBaseModel(workspaceModelId: string): Model | undefined {
    const baseModelId = WorkspaceModelManager.getCurrentBaseModelId(workspaceModelId);
    if (!baseModelId) return undefined;
    
    return this.getModelById(baseModelId);
  }

  /**
   * 获取模型能力标志位
   * 工作空间模型和基础模型的能力合并
   */
  static getModelCapabilities(workspaceModelId: string): Record<string, boolean> {
    const workspaceModel = this.getWorkspaceModel(workspaceModelId);
    if (!workspaceModel) return {} as Record<string, boolean>;
    
    // 获取工作空间模型的能力
    const workspaceCapabilities = (workspaceModel.info?.meta?.capabilities || {}) as Record<string, boolean>;
    
    // 获取基础模型
    const baseModel = this.getEffectiveBaseModel(workspaceModelId);
    if (!baseModel) return workspaceCapabilities;
    
    // 获取基础模型的能力
    const baseCapabilities = (baseModel.info?.meta?.capabilities || {}) as Record<string, boolean>;
    
    // 合并能力，工作空间模型的设置优先级高于基础模型
    return { ...baseCapabilities, ...workspaceCapabilities };
  }
} 