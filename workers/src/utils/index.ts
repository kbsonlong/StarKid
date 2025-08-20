/**
 * 工具函数模块
 * 包含验证、格式化、分页等通用工具函数
 */

import type { PaginatedResponse, QueryParams } from '../types';
import { PAGINATION } from '../db/schema';

/**
 * 验证工具函数
 */
export const validation = {
  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   * @returns 是否有效
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 验证密码强度
   * @param password 密码
   * @returns 是否符合要求
   */
  isValidPassword(password: string): boolean {
    // 至少8位，包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  },

  /**
   * 验证用户名
   * @param username 用户名
   * @returns 是否有效
   */
  isValidUsername(username: string): boolean {
    // 2-20位，只能包含字母、数字、下划线
    const usernameRegex = /^[a-zA-Z0-9_]{2,20}$/;
    return usernameRegex.test(username);
  },

  /**
   * 验证手机号
   * @param phone 手机号
   * @returns 是否有效
   */
  isValidPhone(phone: string): boolean {
    // 中国大陆手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  /**
   * 验证积分值
   * @param points 积分
   * @returns 是否有效
   */
  isValidPoints(points: number): boolean {
    return Number.isInteger(points) && points >= 0 && points <= 10000;
  },

  /**
   * 验证 ID 格式
   * @param id ID 字符串
   * @returns 是否有效
   */
  isValidId(id: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 50;
  },
};

/**
 * 格式化工具函数
 */
export const format = {
  /**
   * 格式化日期为 ISO 字符串
   * @param date 日期对象或字符串
   * @returns ISO 格式字符串
   */
  toISOString(date: Date | string): string {
    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }
    return date.toISOString();
  },

  /**
   * 格式化用户显示名称
   * @param user 用户对象
   * @returns 显示名称
   */
  getUserDisplayName(user: { name?: string; email: string }): string {
    return user.name || user.email.split('@')[0];
  },

  /**
   * 格式化积分显示
   * @param points 积分数
   * @returns 格式化的积分字符串
   */
  formatPoints(points: number): string {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  },

  /**
   * 截断文本
   * @param text 原文本
   * @param maxLength 最大长度
   * @returns 截断后的文本
   */
  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  },

  /**
   * 清理和格式化文本输入
   * @param text 输入文本
   * @returns 清理后的文本
   */
  sanitizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  },
};

/**
 * 分页工具函数
 */
export const pagination = {
  /**
   * 解析分页参数
   * @param searchParams URL 搜索参数
   * @returns 分页参数
   */
  parseParams(searchParams: URLSearchParams): QueryParams {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || PAGINATION.DEFAULT_LIMIT.toString(), 10))
    );
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      offset,
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || undefined,
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
    };
  },

  /**
   * 创建分页响应
   * @param data 数据数组
   * @param total 总数
   * @param params 分页参数
   * @returns 分页响应
   */
  createResponse<T>(data: T[], total: number, params: QueryParams): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / params.limit);
    const hasNext = params.page < totalPages;
    const hasPrev = params.page > 1;

    return {
      success: true,
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  },
};

/**
 * 安全工具函数
 */
export const security = {
  /**
   * 生成随机字符串
   * @param length 长度
   * @returns 随机字符串
   */
  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * 生成邀请码
   * @returns 6位邀请码
   */
  generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * 清理 SQL 输入（基础防护）
   * @param input 输入字符串
   * @returns 清理后的字符串
   */
  sanitizeSqlInput(input: string): string {
    // 移除潜在的 SQL 注入字符
    return input.replace(/[';"\\]/g, '');
  },

  /**
   * 验证请求来源
   * @param request 请求对象
   * @param allowedOrigins 允许的来源列表
   * @returns 是否允许
   */
  isValidOrigin(request: Request, allowedOrigins: string[]): boolean {
    const origin = request.headers.get('Origin');
    if (!origin) return true; // 允许无 Origin 的请求（如 Postman）
    return allowedOrigins.includes(origin);
  },
};

/**
 * 时间工具函数
 */
export const time = {
  /**
   * 获取当前时间戳
   * @returns Unix 时间戳（秒）
   */
  now(): number {
    return Math.floor(Date.now() / 1000);
  },

  /**
   * 添加时间
   * @param date 基础日期
   * @param amount 数量
   * @param unit 单位
   * @returns 新日期
   */
  addTime(date: Date, amount: number, unit: 'minutes' | 'hours' | 'days'): Date {
    const newDate = new Date(date);
    switch (unit) {
      case 'minutes':
        newDate.setMinutes(newDate.getMinutes() + amount);
        break;
      case 'hours':
        newDate.setHours(newDate.getHours() + amount);
        break;
      case 'days':
        newDate.setDate(newDate.getDate() + amount);
        break;
    }
    return newDate;
  },

  /**
   * 检查是否为今天
   * @param date 日期
   * @returns 是否为今天
   */
  isToday(date: Date | string): boolean {
    const today = new Date();
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    
    return (
      today.getFullYear() === checkDate.getFullYear() &&
      today.getMonth() === checkDate.getMonth() &&
      today.getDate() === checkDate.getDate()
    );
  },

  /**
   * 获取日期范围
   * @param days 天数
   * @returns 开始和结束日期
   */
  getDateRange(days: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    return { start, end };
  },
};

/**
 * 数据处理工具函数
 */
export const data = {
  /**
   * 深度克隆对象
   * @param obj 对象
   * @returns 克隆的对象
   */
  deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * 移除对象中的空值
   * @param obj 对象
   * @returns 清理后的对象
   */
  removeEmpty<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        result[key as keyof T] = value;
      }
    });
    
    return result;
  },

  /**
   * 数组去重
   * @param array 数组
   * @param key 去重键（可选）
   * @returns 去重后的数组
   */
  unique<T>(array: T[], key?: keyof T): T[] {
    if (!key) {
      return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  },

  /**
   * 数组分组
   * @param array 数组
   * @param key 分组键
   * @returns 分组后的对象
   */
  groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },
};

/**
 * 错误处理工具函数
 */
export const error = {
  /**
   * 创建标准错误对象
   * @param message 错误消息
   * @param code 错误代码
   * @param details 错误详情
   * @returns 错误对象
   */
  create(message: string, code?: string, details?: any): Error & { code?: string; details?: any } {
    const err = new Error(message) as Error & { code?: string; details?: any };
    if (code) err.code = code;
    if (details) err.details = details;
    return err;
  },

  /**
   * 检查是否为已知错误类型
   * @param error 错误对象
   * @returns 是否为已知错误
   */
  isKnownError(error: any): boolean {
    return error instanceof Error && (
      error.message.includes('UNIQUE constraint failed') ||
      error.message.includes('NOT NULL constraint failed') ||
      error.message.includes('FOREIGN KEY constraint failed')
    );
  },

  /**
   * 格式化错误消息
   * @param error 错误对象
   * @returns 用户友好的错误消息
   */
  formatMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof Error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return '数据已存在，请检查输入';
      }
      if (error.message.includes('NOT NULL constraint failed')) {
        return '必填字段不能为空';
      }
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        return '关联数据不存在';
      }
      return error.message;
    }
    
    return '未知错误';
  },
};

// 导出所有工具函数
export default {
  validation,
  format,
  pagination,
  security,
  time,
  data,
  error,
};