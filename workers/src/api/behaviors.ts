import { RequestContext } from '../types'
import { createErrorResponse } from '../utils/response'

/**
 * 处理行为记录相关路由
 */
export async function handleBehaviorRoutes(ctx: RequestContext): Promise<Response> {
  // TODO: 实现行为记录相关的 API 端点
  return createErrorResponse('NOT_IMPLEMENTED', 'Behavior routes not implemented yet', 501)
}