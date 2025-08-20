import { Database } from '../db'
import { User } from '../types'

/**
 * 根据 ID 获取用户
 */
export async function getUserById(db: Database, userId: string): Promise<User | null> {
  const sql = `
    SELECT id, email, name, role, avatar_url, created_at, updated_at
    FROM users 
    WHERE id = ?
  `
  return db.queryFirst<User>(sql, [userId])
}

/**
 * 根据邮箱获取用户
 */
export async function getUserByEmail(db: Database, email: string): Promise<User | null> {
  const sql = `
    SELECT id, email, name, role, avatar_url, created_at, updated_at
    FROM users 
    WHERE email = ?
  `
  return db.queryFirst<User>(sql, [email])
}

/**
 * 根据邮箱获取用户（包含密码）
 */
export async function getUserWithPasswordByEmail(
  db: Database, 
  email: string
): Promise<(User & { password_hash: string }) | null> {
  const sql = `
    SELECT id, email, name, role, avatar_url, password_hash, created_at, updated_at
    FROM users 
    WHERE email = ?
  `
  return db.queryFirst<User & { password_hash: string }>(sql, [email])
}

/**
 * 创建新用户
 */
export async function createUser(
  db: Database,
  userData: {
    id: string
    email: string
    name: string
    password_hash: string
    role: 'parent' | 'child'
    avatar_url?: string
  }
): Promise<boolean> {
  const sql = `
    INSERT INTO users (id, email, name, password_hash, role, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `
  
  const result = await db.execute(sql, [
    userData.id,
    userData.email,
    userData.name,
    userData.password_hash,
    userData.role,
    userData.avatar_url || null,
  ])
  
  return result.success
}

/**
 * 更新用户信息
 */
export async function updateUser(
  db: Database,
  userId: string,
  updates: Partial<Pick<User, 'name' | 'avatar_url'>>
): Promise<boolean> {
  const fields = []
  const values = []
  
  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  
  if (updates.avatar_url !== undefined) {
    fields.push('avatar_url = ?')
    values.push(updates.avatar_url)
  }
  
  if (fields.length === 0) {
    return true // 没有更新
  }
  
  fields.push('updated_at = datetime(\'now\')')
  values.push(userId)
  
  const sql = `
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE id = ?
  `
  
  const result = await db.execute(sql, values)
  return result.success
}

/**
 * 更新用户密码
 */
export async function updateUserPassword(
  db: Database,
  userId: string,
  passwordHash: string
): Promise<boolean> {
  const sql = `
    UPDATE users 
    SET password_hash = ?, updated_at = datetime('now')
    WHERE id = ?
  `
  
  const result = await db.execute(sql, [passwordHash, userId])
  return result.success
}

/**
 * 检查邮箱是否已存在
 */
export async function emailExists(db: Database, email: string): Promise<boolean> {
  const sql = `
    SELECT 1 FROM users WHERE email = ? LIMIT 1
  `
  const result = await db.queryFirst(sql, [email])
  return result !== null
}

/**
 * 删除用户
 */
export async function deleteUser(db: Database, userId: string): Promise<boolean> {
  const sql = `
    DELETE FROM users WHERE id = ?
  `
  const result = await db.execute(sql, [userId])
  return result.success
}