/**
 * 数据库模式定义
 * 包含表结构、约束和验证规则
 */

// 表名常量
export const TABLES = {
  USERS: 'users',
  FAMILIES: 'families',
  RULES: 'rules',
  BEHAVIORS: 'behaviors',
  REWARDS: 'rewards',
  EXCHANGES: 'exchanges'
} as const;

// 用户角色枚举
export const USER_ROLES = {
  PARENT: 'parent',
  CHILD: 'child'
} as const;

// 规则类型枚举
export const RULE_TYPES = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative'
} as const;

// 行为状态枚举
export const BEHAVIOR_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

// 兑换状态枚举
export const EXCHANGE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
} as const;

// 规则分类常量
export const RULE_CATEGORIES = {
  STUDY: '学习',
  HOUSEWORK: '家务',
  BEHAVIOR: '行为',
  HEALTH: '健康',
  SOCIAL: '社交',
  CREATIVITY: '创造力',
  OTHER: '其他'
} as const;

// 数据验证规则
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  TITLE_MIN_LENGTH: 2,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  NOTE_MAX_LENGTH: 200,
  POINTS_MIN: -1000,
  POINTS_MAX: 1000,
  POINTS_REQUIRED_MIN: 1,
  POINTS_REQUIRED_MAX: 10000
} as const;

// 分页默认值
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
} as const;

// 缓存键前缀
export const CACHE_KEYS = {
  USER: 'user:',
  FAMILY: 'family:',
  FAMILY_STATS: 'family_stats:',
  USER_STATS: 'user_stats:',
  BEHAVIORS: 'behaviors:',
  RULES: 'rules:',
  REWARDS: 'rewards:'
} as const;

// 缓存过期时间（秒）
export const CACHE_TTL = {
  SHORT: 300,    // 5 分钟
  MEDIUM: 1800,  // 30 分钟
  LONG: 3600,    // 1 小时
  VERY_LONG: 86400 // 24 小时
} as const;

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  return VALIDATION_RULES.EMAIL.test(email);
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 是否有效
 */
export function isValidPassword(password: string): boolean {
  return password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH;
}

/**
 * 验证用户名
 * @param name 用户名
 * @returns 是否有效
 */
export function isValidName(name: string): boolean {
  return name.length >= VALIDATION_RULES.NAME_MIN_LENGTH && 
         name.length <= VALIDATION_RULES.NAME_MAX_LENGTH;
}

/**
 * 验证标题
 * @param title 标题
 * @returns 是否有效
 */
export function isValidTitle(title: string): boolean {
  return title.length >= VALIDATION_RULES.TITLE_MIN_LENGTH && 
         title.length <= VALIDATION_RULES.TITLE_MAX_LENGTH;
}

/**
 * 验证描述
 * @param description 描述
 * @returns 是否有效
 */
export function isValidDescription(description: string): boolean {
  return description.length <= VALIDATION_RULES.DESCRIPTION_MAX_LENGTH;
}

/**
 * 验证积分值
 * @param points 积分
 * @returns 是否有效
 */
export function isValidPoints(points: number): boolean {
  return points >= VALIDATION_RULES.POINTS_MIN && 
         points <= VALIDATION_RULES.POINTS_MAX;
}

/**
 * 验证所需积分
 * @param pointsRequired 所需积分
 * @returns 是否有效
 */
export function isValidPointsRequired(pointsRequired: number): boolean {
  return pointsRequired >= VALIDATION_RULES.POINTS_REQUIRED_MIN && 
         pointsRequired <= VALIDATION_RULES.POINTS_REQUIRED_MAX;
}

/**
 * 验证用户角色
 * @param role 角色
 * @returns 是否有效
 */
export function isValidUserRole(role: string): role is 'parent' | 'child' {
  return Object.values(USER_ROLES).includes(role as any);
}

/**
 * 验证规则类型
 * @param type 规则类型
 * @returns 是否有效
 */
export function isValidRuleType(type: string): type is 'positive' | 'negative' {
  return Object.values(RULE_TYPES).includes(type as any);
}

/**
 * 验证行为状态
 * @param status 行为状态
 * @returns 是否有效
 */
export function isValidBehaviorStatus(status: string): status is 'pending' | 'approved' | 'rejected' {
  return Object.values(BEHAVIOR_STATUS).includes(status as any);
}

/**
 * 验证兑换状态
 * @param status 兑换状态
 * @returns 是否有效
 */
export function isValidExchangeStatus(status: string): status is 'pending' | 'approved' | 'completed' | 'rejected' {
  return Object.values(EXCHANGE_STATUS).includes(status as any);
}

/**
 * 验证分页参数
 * @param page 页码
 * @param limit 每页数量
 * @returns 验证结果
 */
export function validatePagination(page?: number, limit?: number): { page: number; limit: number } {
  const validPage = Math.max(1, page || PAGINATION_DEFAULTS.PAGE);
  const validLimit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, limit || PAGINATION_DEFAULTS.LIMIT)
  );
  
  return { page: validPage, limit: validLimit };
}

/**
 * 生成缓存键
 * @param prefix 前缀
 * @param id 标识符
 * @returns 缓存键
 */
export function generateCacheKey(prefix: string, id: string): string {
  return `${prefix}${id}`;
}