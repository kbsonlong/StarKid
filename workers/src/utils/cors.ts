import { Middleware } from '../types'

/**
 * CORS 中间件
 */
export const corsMiddleware: Middleware = async (ctx, next) => {
  const { request, env } = ctx
  const origin = request.headers.get('Origin')
  const allowedOrigin = env.CORS_ORIGIN || 'http://localhost:5173'

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    })
  }

  // 继续处理请求
  const response = await next()

  // 添加 CORS 头到响应
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Credentials': 'true',
    },
  })

  return newResponse
}

/**
 * 检查请求来源是否被允许
 */
export function isOriginAllowed(origin: string | null, allowedOrigin: string): boolean {
  if (!origin) return false
  
  // 开发环境允许 localhost
  if (allowedOrigin.includes('localhost') && origin.includes('localhost')) {
    return true
  }
  
  return origin === allowedOrigin
}