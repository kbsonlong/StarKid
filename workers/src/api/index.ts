import { RequestContext } from '../types'
import { createErrorResponse } from '../utils/response'
import { handleUserRoutes } from './users'
import { handleFamilyRoutes } from './families'
import { handleChildRoutes } from './children'
import { handleRuleRoutes } from './rules'
import { handleBehaviorRoutes } from './behaviors'
import { handleRewardRoutes } from './rewards'
import { handleUploadRoutes } from './upload'

/**
 * 处理 API 路由
 */
export async function handleApiRoutes(ctx: RequestContext): Promise<Response> {
  const url = new URL(ctx.request.url)
  const path = url.pathname

  // 用户相关路由
  if (path.startsWith('/api/users') || path.startsWith('/api/user')) {
    return handleUserRoutes(ctx)
  }

  // 家庭相关路由
  if (path.startsWith('/api/families') || path.startsWith('/api/family')) {
    return handleFamilyRoutes(ctx)
  }

  // 儿童相关路由
  if (path.startsWith('/api/children') || path.startsWith('/api/child')) {
    return handleChildRoutes(ctx)
  }

  // 规则相关路由
  if (path.startsWith('/api/rules') || path.startsWith('/api/rule')) {
    return handleRuleRoutes(ctx)
  }

  // 行为记录相关路由
  if (path.startsWith('/api/behaviors') || path.startsWith('/api/behavior')) {
    return handleBehaviorRoutes(ctx)
  }

  // 奖励相关路由
  if (path.startsWith('/api/rewards') || path.startsWith('/api/reward')) {
    return handleRewardRoutes(ctx)
  }

  // 文件上传路由
  if (path.startsWith('/api/upload')) {
    return handleUploadRoutes(ctx)
  }

  return createErrorResponse('NOT_FOUND', 'API route not found', 404)
}

/**
 * 解析路径参数
 */
export function parsePathParams(path: string, pattern: string): Record<string, string> {
  const pathParts = path.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)
  const params: Record<string, string> = {}

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]

    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1)
      params[paramName] = pathPart
    }
  }

  return params
}

/**
 * 检查路径是否匹配模式
 */
export function matchPath(path: string, pattern: string): boolean {
  const pathParts = path.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)

  if (pathParts.length !== patternParts.length) {
    return false
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]

    if (!patternPart.startsWith(':') && patternPart !== pathPart) {
      return false
    }
  }

  return true
}