import { ApiResponse, ApiError } from '../types'

/**
 * 创建标准 API 响应
 */
export function createResponse<T = any>(
  data: T | { error: ApiError },
  options: {
    status?: number
    headers?: Record<string, string>
  } = {}
): Response {
  const { status = 200, headers = {} } = options

  const response: ApiResponse<T> = {
    success: !('error' in data),
    timestamp: new Date().toISOString(),
  }

  if ('error' in data) {
    response.error = data.error
  } else {
    response.data = data
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: defaultHeaders,
  })
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  headers?: Record<string, string>
): Response {
  return createResponse(data, { status, headers })
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: any
): Response {
  return createResponse(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  )
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  message: string,
  details?: any
): Response {
  return createErrorResponse('VALIDATION_ERROR', message, 400, details)
}

/**
 * 创建未授权响应
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized'
): Response {
  return createErrorResponse('UNAUTHORIZED', message, 401)
}

/**
 * 创建禁止访问响应
 */
export function createForbiddenResponse(
  message: string = 'Forbidden'
): Response {
  return createErrorResponse('FORBIDDEN', message, 403)
}

/**
 * 创建未找到响应
 */
export function createNotFoundResponse(
  message: string = 'Resource not found'
): Response {
  return createErrorResponse('NOT_FOUND', message, 404)
}

/**
 * 创建服务器错误响应
 */
export function createServerErrorResponse(
  message: string = 'Internal server error',
  details?: any
): Response {
  return createErrorResponse('INTERNAL_ERROR', message, 500, details)
}