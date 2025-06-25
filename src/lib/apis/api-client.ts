import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';
import { applyRequestInterceptors, applyResponseInterceptors } from './interceptors';

/**
 * 执行API请求的通用函数
 * 支持请求和响应拦截器
 * 
 * @param url API端点URL
 * @param options 请求选项
 * @returns 响应对象
 */
export async function apiRequest(url: string, options: RequestInit & { body?: any }) {
  // 处理请求选项
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  // 如果有body对象，转换为JSON字符串
  if (options.body && typeof options.body === 'object') {
    // 创建一个请求对象供拦截器处理
    const request = {
      url,
      ...requestOptions,
      body: options.body // 原始对象，而不是字符串
    };
    
    // 应用请求拦截器
    const interceptedRequest = applyRequestInterceptors(request);
    
    // 更新URL和选项
    url = interceptedRequest.url;
    requestOptions.body = JSON.stringify(interceptedRequest.body);
  }

  // 执行请求
  const response = await fetch(url, requestOptions);
  
  // 创建响应对象
  let responseData;
  
  // 处理流式响应
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    return response; // 对于流式响应，直接返回响应对象
  }
  
  // 解析JSON响应
  try {
    responseData = await response.json();
  } catch (e) {
    responseData = null;
  }
  
  // 应用响应拦截器
  const originalRequest = options.body;
  return applyResponseInterceptors(responseData, { body: originalRequest });
}

/**
 * 聊天完成API函数，支持流式响应
 * 
 * @param token 认证令牌
 * @param body 请求体
 * @param url API基础URL
 * @returns 响应对象和控制器
 */
export async function chatCompletionWithInterceptors(
  token: string = '',
  body: any,
  url: string = `${WEBUI_BASE_URL}/api`
): Promise<[Response | null, AbortController]> {
  const controller = new AbortController();
  let error = null;
  
  // 应用请求拦截器
  const interceptedBody = applyRequestInterceptors({ body }).body;
  
  const res = await fetch(`${url}/chat/completions`, {
    signal: controller.signal,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(interceptedBody)
  }).catch((err) => {
    console.error(err);
    error = err;
    return null;
  });
  
  if (error) {
    throw error;
  }
  
  return [res, controller];
}

/**
 * 生成聊天完成API函数，不支持流式响应
 * 
 * @param token 认证令牌
 * @param body 请求体
 * @param url API基础URL
 * @returns 响应对象
 */
export async function generateChatCompletionWithInterceptors(
  token: string = '',
  body: any,
  url: string = `${WEBUI_BASE_URL}/api`
) {
  let error = null;
  
  // 应用请求拦截器
  const interceptedBody = applyRequestInterceptors({ body }).body;
  
  const res = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(interceptedBody)
  }).then(async (res) => {
    if (!res.ok) throw await res.json();
    return res.json();
  }).catch((err) => {
    error = `${err?.detail ?? err}`;
    return null;
  });
  
  if (error) {
    throw error;
  }
  
  // 应用响应拦截器
  return applyResponseInterceptors(res, { body });
} 