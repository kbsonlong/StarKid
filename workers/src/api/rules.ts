import { RequestContext } from '../types'
import { createErrorResponse } from '../utils/response'

/**
 * 处理规则相关路由
 */
export async function handleRuleRoutes(ctx: RequestContext): Promise<Response> {
  // TODO: 实现规则相关的 API 端点
  return createErrorResponse('NOT_IMPLEMENTED', 'Rule routes not implemented yet', 501)
}