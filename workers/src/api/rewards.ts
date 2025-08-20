import { RequestContext } from '../types'
import { createErrorResponse } from '../utils/response'

/**
 * 处理奖励相关路由
 */
export async function handleRewardRoutes(ctx: RequestContext): Promise<Response> {
  // TODO: 实现奖励相关的 API 端点
  return createErrorResponse('NOT_IMPLEMENTED', 'Reward routes not implemented yet', 501)
}