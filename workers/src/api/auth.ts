/**
 * 认证 API 处理器
 * 处理用户登录、注册、令牌刷新等认证相关操作
 */

import type { RequestContext, LoginRequest, RegisterRequest, User } from '../types';
import { createErrorResponse, createSuccessResponse } from '../index';
import { generateToken, verifyToken, refreshToken } from '../auth/jwt';
import { getUserByEmail, createUser, emailExists } from '../db/users';
import { validation, security, error } from '../utils';
import bcrypt from 'bcryptjs';

/**
 * 处理用户注册
 * @param context 请求上下文
 * @returns 注册响应
 */
async function handleRegister(context: RequestContext): Promise<Response> {
  try {
    const body = await context.request.json() as RegisterRequest;
    
    // 验证必填字段
    if (!body.email || !body.password) {
      return createErrorResponse('邮箱和密码不能为空', 400);
    }
    
    // 验证邮箱格式
    if (!validation.isValidEmail(body.email)) {
      return createErrorResponse('邮箱格式不正确', 400);
    }
    
    // 验证密码强度
    if (!validation.isValidPassword(body.password)) {
      return createErrorResponse('密码至少8位，需包含字母和数字', 400);
    }
    
    // 验证用户名（如果提供）
    if (body.name && body.name.trim().length < 2) {
      return createErrorResponse('用户名至少2个字符', 400);
    }
    
    // 检查邮箱是否已存在
    const exists = await emailExists(context.env.DB, body.email);
    if (exists) {
      return createErrorResponse('邮箱已被注册', 409);
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(body.password, 10);
    
    // 创建用户
    const userId = security.generateRandomString(16);
    const user = await createUser(context.env.DB, {
      id: userId,
      email: body.email.toLowerCase().trim(),
      password: hashedPassword,
      name: body.name?.trim() || null,
      role: 'parent', // 默认为家长角色
      avatar: null,
      phone: body.phone || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // 生成访问令牌
    const accessToken = await generateToken(
      { userId: user.id, email: user.email, role: user.role },
      context.env.JWT_SECRET,
      '24h'
    );
    
    // 生成刷新令牌
    const refreshTokenValue = await generateToken(
      { userId: user.id, type: 'refresh' },
      context.env.JWT_SECRET,
      '7d'
    );
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    
    return createSuccessResponse({
      user: userWithoutPassword,
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 24 * 60 * 60, // 24小时（秒）
    }, '注册成功');
    
  } catch (err) {
    console.error('Register error:', err);
    return createErrorResponse(error.formatMessage(err), 500);
  }
}

/**
 * 处理用户登录
 * @param context 请求上下文
 * @returns 登录响应
 */
async function handleLogin(context: RequestContext): Promise<Response> {
  try {
    const body = await context.request.json() as LoginRequest;
    
    // 验证必填字段
    if (!body.email || !body.password) {
      return createErrorResponse('邮箱和密码不能为空', 400);
    }
    
    // 验证邮箱格式
    if (!validation.isValidEmail(body.email)) {
      return createErrorResponse('邮箱格式不正确', 400);
    }
    
    // 查找用户
    const user = await getUserByEmail(context.env.DB, body.email.toLowerCase().trim());
    if (!user) {
      return createErrorResponse('邮箱或密码错误', 401);
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(body.password, user.password);
    if (!isValidPassword) {
      return createErrorResponse('邮箱或密码错误', 401);
    }
    
    // 生成访问令牌
    const accessToken = await generateToken(
      { userId: user.id, email: user.email, role: user.role },
      context.env.JWT_SECRET,
      '24h'
    );
    
    // 生成刷新令牌
    const refreshTokenValue = await generateToken(
      { userId: user.id, type: 'refresh' },
      context.env.JWT_SECRET,
      '7d'
    );
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    
    return createSuccessResponse({
      user: userWithoutPassword,
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 24 * 60 * 60, // 24小时（秒）
    }, '登录成功');
    
  } catch (err) {
    console.error('Login error:', err);
    return createErrorResponse(error.formatMessage(err), 500);
  }
}

/**
 * 处理令牌刷新
 * @param context 请求上下文
 * @returns 刷新响应
 */
async function handleRefreshToken(context: RequestContext): Promise<Response> {
  try {
    const body = await context.request.json() as { refreshToken: string };
    
    if (!body.refreshToken) {
      return createErrorResponse('刷新令牌不能为空', 400);
    }
    
    // 验证刷新令牌
    const payload = await verifyToken(body.refreshToken, context.env.JWT_SECRET);
    if (!payload || payload.type !== 'refresh') {
      return createErrorResponse('无效的刷新令牌', 401);
    }
    
    // 获取用户信息
    const user = await getUserByEmail(context.env.DB, payload.email || '');
    if (!user || user.id !== payload.userId) {
      return createErrorResponse('用户不存在', 401);
    }
    
    // 生成新的访问令牌
    const newAccessToken = await generateToken(
      { userId: user.id, email: user.email, role: user.role },
      context.env.JWT_SECRET,
      '24h'
    );
    
    // 生成新的刷新令牌
    const newRefreshToken = await generateToken(
      { userId: user.id, type: 'refresh' },
      context.env.JWT_SECRET,
      '7d'
    );
    
    return createSuccessResponse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 24 * 60 * 60, // 24小时（秒）
    }, '令牌刷新成功');
    
  } catch (err) {
    console.error('Refresh token error:', err);
    return createErrorResponse('令牌刷新失败', 401);
  }
}

/**
 * 处理用户登出
 * @param context 请求上下文
 * @returns 登出响应
 */
async function handleLogout(context: RequestContext): Promise<Response> {
  // 在无状态的 JWT 系统中，登出主要是客户端删除令牌
  // 这里可以添加令牌黑名单逻辑（如果需要）
  return createSuccessResponse(null, '登出成功');
}

/**
 * 获取当前用户信息
 * @param context 请求上下文
 * @returns 用户信息响应
 */
async function handleGetProfile(context: RequestContext): Promise<Response> {
  try {
    // 从请求头获取令牌
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('未提供访问令牌', 401);
    }
    
    const token = authHeader.substring(7);
    
    // 验证令牌
    const payload = await verifyToken(token, context.env.JWT_SECRET);
    if (!payload || !payload.userId) {
      return createErrorResponse('无效的访问令牌', 401);
    }
    
    // 获取用户信息
    const user = await getUserByEmail(context.env.DB, payload.email || '');
    if (!user || user.id !== payload.userId) {
      return createErrorResponse('用户不存在', 401);
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    
    return createSuccessResponse(userWithoutPassword);
    
  } catch (err) {
    console.error('Get profile error:', err);
    return createErrorResponse('获取用户信息失败', 500);
  }
}

/**
 * 验证邮箱是否可用
 * @param context 请求上下文
 * @returns 验证响应
 */
async function handleCheckEmail(context: RequestContext): Promise<Response> {
  try {
    const email = context.url.searchParams.get('email');
    
    if (!email) {
      return createErrorResponse('邮箱参数不能为空', 400);
    }
    
    if (!validation.isValidEmail(email)) {
      return createErrorResponse('邮箱格式不正确', 400);
    }
    
    const exists = await emailExists(context.env.DB, email.toLowerCase().trim());
    
    return createSuccessResponse({
      email,
      available: !exists,
    });
    
  } catch (err) {
    console.error('Check email error:', err);
    return createErrorResponse('检查邮箱失败', 500);
  }
}

/**
 * 认证路由处理器
 * @param context 请求上下文
 * @returns 响应
 */
export async function handleAuthRoutes(context: RequestContext): Promise<Response> {
  const { segments, method } = context;
  
  // 移除 'auth' 前缀
  const [action, ...rest] = segments.slice(1);
  
  switch (action) {
    case 'register':
      if (method === 'POST') {
        return handleRegister(context);
      }
      break;
      
    case 'login':
      if (method === 'POST') {
        return handleLogin(context);
      }
      break;
      
    case 'refresh':
      if (method === 'POST') {
        return handleRefreshToken(context);
      }
      break;
      
    case 'logout':
      if (method === 'POST') {
        return handleLogout(context);
      }
      break;
      
    case 'profile':
      if (method === 'GET') {
        return handleGetProfile(context);
      }
      break;
      
    case 'check-email':
      if (method === 'GET') {
        return handleCheckEmail(context);
      }
      break;
      
    default:
      return createErrorResponse('认证接口不存在', 404);
  }
  
  return createErrorResponse('不支持的请求方法', 405);
}