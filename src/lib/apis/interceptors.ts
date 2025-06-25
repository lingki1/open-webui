import { WorkspaceModelManager } from '$lib/utils/models';
import { WorkspaceModelParams } from '$lib/utils/workspace-model-params';

/**
 * 工作空间模型API请求拦截器
 * 处理聊天API请求中的模型ID替换和参数继承
 * 
 * @param request 原始API请求对象
 * @returns 处理后的API请求对象
 */
export function workspaceModelRequestInterceptor(request: any) {
  // 如果请求中没有model字段，则不需要处理
  if (!request.body || !request.body.model) return request;

  const modelId = request.body.model;
  
  // 检查是否为工作空间模型
  if (!WorkspaceModelManager.isWorkspaceModel(modelId)) {
    return request; // 不是工作空间模型，直接返回原始请求
  }

  // 应用参数继承逻辑
  const updatedBody = WorkspaceModelParams.prepareChatRequest(request.body, modelId);
  
  // 返回更新后的请求
  return {
    ...request,
    body: updatedBody
  };
}

/**
 * 响应拦截器，将工作空间模型的信息添加回响应
 * 
 * @param response API响应对象
 * @param originalRequest 原始请求对象
 * @returns 处理后的响应对象
 */
export function workspaceModelResponseInterceptor(response: any, originalRequest: any) {
  // 如果原始请求中没有工作空间模型信息，则不需要处理
  if (!originalRequest.body?.metadata?.workspace_model_id) {
    return response;
  }
  
  // 从元数据中获取工作空间模型ID
  const workspaceModelId = originalRequest.body.metadata.workspace_model_id;
  
  // 在响应中添加工作空间模型信息
  // 这里主要是为了在UI中显示正确的模型名称
  if (response && !response.error) {
    if (response.model) {
      // 将model字段设置回工作空间模型ID
      response.model = workspaceModelId;
    }
    
    // 为流式响应处理添加metadata
    if (!response.metadata) {
      response.metadata = {};
    }
    
    // 在元数据中保存原始工作空间模型ID
    response.metadata.workspace_model_id = workspaceModelId;
  }
  
  return response;
}

/**
 * 应用所有API拦截器到请求对象
 * 
 * @param request 原始API请求对象
 * @returns 处理后的API请求对象
 */
export function applyRequestInterceptors(request: any) {
  // 应用工作空间模型拦截器
  request = workspaceModelRequestInterceptor(request);
  
  // 可以在这里添加更多拦截器
  
  return request;
}

/**
 * 应用所有API拦截器到响应对象
 * 
 * @param response API响应对象
 * @param originalRequest 原始请求对象
 * @returns 处理后的响应对象
 */
export function applyResponseInterceptors(response: any, originalRequest: any) {
  // 应用工作空间模型拦截器
  response = workspaceModelResponseInterceptor(response, originalRequest);
  
  // 可以在这里添加更多拦截器
  
  return response;
} 