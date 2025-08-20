import { Env, RequestContext, Middleware } from './types'
import { corsMiddleware } from './utils/cors'
import { authMiddleware } from './auth/middleware'
import { handleAuthRoutes } from './auth/handlers'
import { handleApiRoutes } from './api'
import { createResponse } from './utils/response'

// 中间件链
const middlewares: Middleware[] = [
  corsMiddleware,
  // authMiddleware 将在需要认证的路由中单独应用
]

// 应用中间件
async function applyMiddlewares(
  ctx: RequestContext,
  middlewares: Middleware[],
  handler: () => Promise<Response>
): Promise<Response> {
  let index = 0

  async function next(): Promise<Response> {
    if (index >= middlewares.length) {
      return handler()
    }
    const middleware = middlewares[index++]
    return middleware(ctx, next)
  }

  return next()
}

// 路由处理
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  // 创建请求上下文
  const ctx: RequestContext = {
    request,
    env,
    params: {},
  }

  try {
    // 健康检查
    if (path === '/health') {
      return createResponse({ status: 'ok', timestamp: new Date().toISOString() })
    }

    // 认证路由 (不需要认证)
    if (path.startsWith('/api/auth')) {
      return applyMiddlewares(ctx, middlewares, () => handleAuthRoutes(ctx))
    }

    // API 路由 (需要认证)
    if (path.startsWith('/api/')) {
      const authMiddlewares = [...middlewares, authMiddleware]
      return applyMiddlewares(ctx, authMiddlewares, () => handleApiRoutes(ctx))
    }

    // 404 处理
    return createResponse(
      { error: { code: 'NOT_FOUND', message: 'Route not found' } },
      { status: 404 }
    )
  } catch (error) {
    console.error('Request handling error:', error)
    return createResponse(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    )
  }
}

// Worker 主入口
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env)
  },
}