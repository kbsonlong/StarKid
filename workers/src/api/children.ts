import { RequestContext } from '../types'
import { createErrorResponse } from '../utils/response'

/**
 * 处理儿童相关路由
 */
export async function handleChildRoutes(ctx: RequestContext): Promise<Response> {
  // TODO: 实现儿童相关的 API 端点
  return createErrorResponse('NOT_IMPLEMENTED', 'Child routes not implemented yet', 501)
}