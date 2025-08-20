import type { User, CreateUserRequest } from '../types';
import { hashPassword } from '../utils/crypto';

/**
 * 根据 ID 获取用户
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @returns 用户信息或 null
 */
export async function getUserById(db: D1Database, userId: string): Promise<User | null> {
  try {
    const result = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();
    
    return result || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw new Error('Failed to get user');
  }
}

/**
 * 根据邮箱获取用户
 * @param db D1 数据库实例
 * @param email 用户邮箱
 * @returns 用户信息或 null
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  try {
    const result = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<User>();
    
    return result || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw new Error('Failed to get user');
  }
}

/**
 * 创建新用户
 * @param db D1 数据库实例
 * @param userData 用户数据
 * @returns 创建的用户信息（不包含密码哈希）
 */
export async function createUser(
  db: D1Database,
  userData: CreateUserRequest
): Promise<Omit<User, 'password_hash'>> {
  try {
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(userData.password);
    const now = new Date().toISOString();

    await db
      .prepare(`
        INSERT INTO users (id, email, password_hash, name, role, family_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        userData.email,
        passwordHash,
        userData.name,
        userData.role,
        userData.family_id || null,
        now,
        now
      )
      .run();

    return {
      id: userId,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      family_id: userData.family_id,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

/**
 * 更新用户信息
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @param updates 更新数据
 * @returns 更新后的用户信息（不包含密码哈希）
 */
export async function updateUser(
  db: D1Database,
  userId: string,
  updates: Partial<Omit<User, 'id' | 'created_at' | 'password_hash'>>
): Promise<Omit<User, 'password_hash'> | null> {
  try {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    // 构建动态更新查询
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'password_hash') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = ?');
    values.push(now, userId);

    await db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // 返回更新后的用户信息
    const updatedUser = await getUserById(db, userId);
    if (!updatedUser) {
      return null;
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
}

/**
 * 更新用户密码
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @param newPassword 新密码
 * @returns 是否更新成功
 */
export async function updateUserPassword(
  db: D1Database,
  userId: string,
  newPassword: string
): Promise<boolean> {
  try {
    const passwordHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    const result = await db
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(passwordHash, now, userId)
      .run();

    return result.changes > 0;
  } catch (error) {
    console.error('Error updating user password:', error);
    throw new Error('Failed to update password');
  }
}

/**
 * 删除用户
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @returns 是否删除成功
 */
export async function deleteUser(db: D1Database, userId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run();

    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}

/**
 * 获取家庭成员列表
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @returns 家庭成员列表
 */
export async function getFamilyMembers(
  db: D1Database,
  familyId: string
): Promise<Omit<User, 'password_hash'>[]> {
  try {
    const result = await db
      .prepare('SELECT id, email, name, avatar_url, role, family_id, created_at, updated_at FROM users WHERE family_id = ?')
      .bind(familyId)
      .all<Omit<User, 'password_hash'>>();

    return result.results || [];
  } catch (error) {
    console.error('Error getting family members:', error);
    throw new Error('Failed to get family members');
  }
}

/**
 * 检查邮箱是否已存在
 * @param db D1 数据库实例
 * @param email 邮箱地址
 * @returns 是否存在
 */
export async function emailExists(db: D1Database, email: string): Promise<boolean> {
  try {
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM users WHERE email = ?')
      .bind(email)
      .first<{ count: number }>();

    return (result?.count || 0) > 0;
  } catch (error) {
    console.error('Error checking email existence:', error);
    throw new Error('Failed to check email');
  }
}