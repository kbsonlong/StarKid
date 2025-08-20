import type { Family, CreateFamilyRequest, FamilyStats } from '../types';

/**
 * 根据 ID 获取家庭信息
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @returns 家庭信息或 null
 */
export async function getFamilyById(db: D1Database, familyId: string): Promise<Family | null> {
  try {
    const result = await db
      .prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>();
    
    return result || null;
  } catch (error) {
    console.error('Error getting family by ID:', error);
    throw new Error('Failed to get family');
  }
}

/**
 * 创建新家庭
 * @param db D1 数据库实例
 * @param familyData 家庭数据
 * @param createdBy 创建者 ID
 * @returns 创建的家庭信息
 */
export async function createFamily(
  db: D1Database,
  familyData: CreateFamilyRequest,
  createdBy: string
): Promise<Family> {
  try {
    const familyId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
      .prepare(`
        INSERT INTO families (id, name, description, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        familyId,
        familyData.name,
        familyData.description || null,
        createdBy,
        now,
        now
      )
      .run();

    return {
      id: familyId,
      name: familyData.name,
      description: familyData.description,
      created_by: createdBy,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('Error creating family:', error);
    throw new Error('Failed to create family');
  }
}

/**
 * 更新家庭信息
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @param updates 更新数据
 * @returns 更新后的家庭信息
 */
export async function updateFamily(
  db: D1Database,
  familyId: string,
  updates: Partial<Pick<Family, 'name' | 'description'>>
): Promise<Family | null> {
  try {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    // 构建动态更新查询
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'name' || key === 'description') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = ?');
    values.push(now, familyId);

    await db
      .prepare(`UPDATE families SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // 返回更新后的家庭信息
    return await getFamilyById(db, familyId);
  } catch (error) {
    console.error('Error updating family:', error);
    throw new Error('Failed to update family');
  }
}

/**
 * 删除家庭
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @returns 是否删除成功
 */
export async function deleteFamily(db: D1Database, familyId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare('DELETE FROM families WHERE id = ?')
      .bind(familyId)
      .run();

    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting family:', error);
    throw new Error('Failed to delete family');
  }
}

/**
 * 获取用户创建的家庭列表
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @returns 家庭列表
 */
export async function getFamiliesByUser(db: D1Database, userId: string): Promise<Family[]> {
  try {
    const result = await db
      .prepare('SELECT * FROM families WHERE created_by = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Family>();

    return result.results || [];
  } catch (error) {
    console.error('Error getting families by user:', error);
    throw new Error('Failed to get families');
  }
}

/**
 * 获取家庭统计信息
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @returns 家庭统计信息
 */
export async function getFamilyStats(db: D1Database, familyId: string): Promise<FamilyStats> {
  try {
    // 获取家庭成员数量
    const membersResult = await db
      .prepare('SELECT COUNT(*) as count FROM users WHERE family_id = ?')
      .bind(familyId)
      .first<{ count: number }>();

    // 获取行为记录数量
    const behaviorsResult = await db
      .prepare('SELECT COUNT(*) as count FROM behaviors WHERE family_id = ?')
      .bind(familyId)
      .first<{ count: number }>();

    // 获取总积分奖励
    const pointsResult = await db
      .prepare('SELECT COALESCE(SUM(points_change), 0) as total FROM behaviors WHERE family_id = ? AND status = "approved"')
      .bind(familyId)
      .first<{ total: number }>();

    // 获取活跃规则数量
    const rulesResult = await db
      .prepare('SELECT COUNT(*) as count FROM rules WHERE family_id = ? AND is_active = 1')
      .bind(familyId)
      .first<{ count: number }>();

    // 获取活跃奖励数量
    const rewardsResult = await db
      .prepare('SELECT COUNT(*) as count FROM rewards WHERE family_id = ? AND is_active = 1')
      .bind(familyId)
      .first<{ count: number }>();

    return {
      total_members: membersResult?.count || 0,
      total_behaviors: behaviorsResult?.count || 0,
      total_points_awarded: pointsResult?.total || 0,
      active_rules: rulesResult?.count || 0,
      active_rewards: rewardsResult?.count || 0
    };
  } catch (error) {
    console.error('Error getting family stats:', error);
    throw new Error('Failed to get family stats');
  }
}

/**
 * 检查用户是否属于指定家庭
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @param familyId 家庭 ID
 * @returns 是否属于该家庭
 */
export async function isUserInFamily(db: D1Database, userId: string, familyId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM users WHERE id = ? AND family_id = ?')
      .bind(userId, familyId)
      .first<{ count: number }>();

    return (result?.count || 0) > 0;
  } catch (error) {
    console.error('Error checking user family membership:', error);
    throw new Error('Failed to check family membership');
  }
}

/**
 * 检查用户是否是家庭创建者
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @param familyId 家庭 ID
 * @returns 是否是创建者
 */
export async function isUserFamilyCreator(db: D1Database, userId: string, familyId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM families WHERE id = ? AND created_by = ?')
      .bind(familyId, userId)
      .first<{ count: number }>();

    return (result?.count || 0) > 0;
  } catch (error) {
    console.error('Error checking family creator:', error);
    throw new Error('Failed to check family creator');
  }
}