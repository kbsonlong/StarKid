/**
 * 数据库迁移脚本
 * 用于创建和更新数据库表结构
 */

/**
 * 创建所有表的 SQL 脚本
 */
export const CREATE_TABLES_SQL = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  family_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 家庭表
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 规则表
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative')),
  points INTEGER NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 行为记录表
CREATE TABLE IF NOT EXISTS behaviors (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  points_change INTEGER NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 奖励表
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 兑换记录表
CREATE TABLE IF NOT EXISTS exchanges (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  points_used INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

/**
 * 创建索引的 SQL 脚本
 */
export const CREATE_INDEXES_SQL = `
-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 家庭表索引
CREATE INDEX IF NOT EXISTS idx_families_created_by ON families(created_by);

-- 规则表索引
CREATE INDEX IF NOT EXISTS idx_rules_family_id ON rules(family_id);
CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(type);
CREATE INDEX IF NOT EXISTS idx_rules_is_active ON rules(is_active);
CREATE INDEX IF NOT EXISTS idx_rules_category ON rules(category);

-- 行为记录表索引
CREATE INDEX IF NOT EXISTS idx_behaviors_family_id ON behaviors(family_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_child_id ON behaviors(child_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_rule_id ON behaviors(rule_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_status ON behaviors(status);
CREATE INDEX IF NOT EXISTS idx_behaviors_created_at ON behaviors(created_at);

-- 奖励表索引
CREATE INDEX IF NOT EXISTS idx_rewards_family_id ON rewards(family_id);
CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_rewards_points_required ON rewards(points_required);

-- 兑换记录表索引
CREATE INDEX IF NOT EXISTS idx_exchanges_family_id ON exchanges(family_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_child_id ON exchanges(child_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_reward_id ON exchanges(reward_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status);
CREATE INDEX IF NOT EXISTS idx_exchanges_created_at ON exchanges(created_at);
`;

/**
 * 初始化数据库
 * @param db D1 数据库实例
 */
export async function initializeDatabase(db: D1Database): Promise<void> {
  try {
    // 创建表
    await db.exec(CREATE_TABLES_SQL);
    
    // 创建索引
    await db.exec(CREATE_INDEXES_SQL);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw new Error('Failed to initialize database');
  }
}

/**
 * 检查数据库是否已初始化
 * @param db D1 数据库实例
 * @returns 是否已初始化
 */
export async function isDatabaseInitialized(db: D1Database): Promise<boolean> {
  try {
    const result = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .first();
    
    return !!result;
  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
}

/**
 * 获取数据库版本信息
 * @param db D1 数据库实例
 * @returns 版本信息
 */
export async function getDatabaseVersion(db: D1Database): Promise<string> {
  try {
    const result = await db
      .prepare('PRAGMA user_version')
      .first<{ user_version: number }>();
    
    return `v${result?.user_version || 0}`;
  } catch (error) {
    console.error('Error getting database version:', error);
    return 'unknown';
  }
}

/**
 * 设置数据库版本
 * @param db D1 数据库实例
 * @param version 版本号
 */
export async function setDatabaseVersion(db: D1Database, version: number): Promise<void> {
  try {
    await db.exec(`PRAGMA user_version = ${version}`);
  } catch (error) {
    console.error('Error setting database version:', error);
    throw new Error('Failed to set database version');
  }
}