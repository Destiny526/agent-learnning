// ============================================================
// Gateway 调用工具
// 前端 API Routes 通过此工具调用后端 Gateway
// ============================================================

import { getAuthCookie } from './auth-utils';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';

interface GatewayRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  includeAuth?: boolean;
}

/**
 * 调用 Gateway API
 */
export async function callGateway<T = unknown>(
  options: GatewayRequestOptions
): Promise<{ status: number; data: T }> {
  const { method, path, body, params, includeAuth = true } = options;

  // 构建 URL
  let url = `${GATEWAY_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 添加认证 token
  if (includeAuth) {
    const token = await getAuthCookie();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 发送请求
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

/**
 * 转发请求到 Gateway（保持原始请求体）
 */
export async function forwardToGateway(
  request: Request,
  path: string,
  options?: { method?: string; params?: Record<string, string> }
): Promise<Response> {
  const method = options?.method || request.method;
  const token = await getAuthCookie();

  let url = `${GATEWAY_URL}${path}`;
  if (options?.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body = method !== 'GET' && method !== 'HEAD' ? await request.text() : undefined;

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
