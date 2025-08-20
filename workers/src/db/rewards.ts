/**
 * 奖励和兑换相关的数据库操作函数
 */

import type { Reward, Exchange, CreateRewardRequest, UpdateRewardRequest, CreateExchangeRequest } from '../types';
import { TABLES, EXCHANGE_STATUS } from './schema';

/**
 * 根据 ID 获取奖励
 * @param db D1 数据库实例
 * @param id 奖励 ID
 * @returns 奖励信息或 null
 */
export async function getRewardById(db: D1Database, id: string): Promise<Reward | null> {
  try {
    const result = await db
      .prepare(`SELECT * FROM ${TABLES.REWARDS} WHERE id = ?`)
      .bind(id)
      .first<Reward>();
    
    return result || null;
  } catch (error) {
    console.error('Error getting reward by id:', error);
    throw new Error('Failed to get reward');
  }
}

/**
 * 获取家庭的所有奖励
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @param isActive 是否激活（可选）
 * @returns 奖励列表
 */
export async function getRewardsByFamily(
  db: D1Database,
  familyId: string,
  isActive?: boolean
): Promise<Reward[]> {
  try {
    let query = `SELECT * FROM ${TABLES.REWARDS} WHERE family_id = ?`;
    const params: any[] = [familyId];
    
    if (isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(isActive ? 1 : 0);
    }
    
    query += ' ORDER BY points_required ASC, created_at DESC';
    
    const result = await db
      .prepare(query)
      .bind(...params)
      .all<Reward>();
    
    return result.results || [];
  } catch (error) {
    console.error('Error getting rewards by family:', error);
    throw new Error('Failed to get family rewards');
  }
}

/**
 * 创建新奖励
 * @param db D1 数据库实例
 * @param rewardData 奖励数据
 * @returns 创建的奖励
 */
export async function createReward(
  db: D1Database,
  rewardData: CreateRewardRequest & { id: string; created_by: string }
): Promise<Reward> {
  try {
    const now = new Date().toISOString();
    
    const reward: Reward = {
      id: rewardData.id,
      family_id: rewardData.family_id,
      title: rewardData.title,
      description: rewardData.description || null,
      points_required: rewardData.points_required,
      is_active: rewardData.is_active ?? true,
      created_by: rewardData.created_by,
      created_at: now,
      updated_at: now
    };
    
    await db
      .prepare(`
        INSERT INTO ${TABLES.REWARDS} (
          id, family_id, title, description, points_required,
          is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        reward.id,
        reward.family_id,
        reward.title,
        reward.description,
        reward.points_required,
        reward.is_active ? 1 : 0,
        reward.created_by,
        reward.created_at,
        reward.updated_at
      )
      .run();
    
    return reward;
  } catch (error) {
    console.error('Error creating reward:', error);
    throw new Error('Failed to create reward');
  }
}

/**
 * 更新奖励
 * @param db D1 数据库实例
 * @param id 奖励 ID
 * @param updateData 更新数据
 * @returns 更新后的奖励或 null
 */
export async function updateReward(
  db: D1Database,
  id: string,
  updateData: UpdateRewardRequest
): Promise<Reward | null> {
  try {
    const existingReward = await getRewardById(db, id);
    if (!existingReward) {
      return null;
    }
    
    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];
    
    if (updateData.title !== undefined) {
      updates.push('title = ?');
      params.push(updateData.title);
    }
    
    if (updateData.description !== undefined) {
      updates.push('description = ?');
      params.push(updateData.description);
    }
    
    if (updateData.points_required !== undefined) {
      updates.push('points_required = ?');
      params.push(updateData.points_required);
    }
    
    if (updateData.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(updateData.is_active ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return existingReward;
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);
    
    await db
      .prepare(`UPDATE ${TABLES.REWARDS} SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();
    
    return await getRewardById(db, id);
  } catch (error) {
    console.error('Error updating reward:', error);
    throw new Error('Failed to update reward');
  }
}

/**
 * 删除奖励
 * @param db D1 数据库实例
 * @param id 奖励 ID
 * @returns 是否删除成功
 */
export async function deleteReward(db: D1Database, id: string): Promise<boolean> {
  try {
    const result = await db
      .prepare(`DELETE FROM ${TABLES.REWARDS} WHERE id = ?`)
      .bind(id)
      .run();
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting reward:', error);
    throw new Error('Failed to delete reward');
  }
}

/**
 * 根据 ID 获取兑换记录
 * @param db D1 数据库实例
 * @param id 兑换记录 ID
 * @returns 兑换记录或 null
 */
export async function getExchangeById(db: D1Database, id: string): Promise<Exchange | null> {
  try {
    const result = await db
      .prepare(`
        SELECT 
          e.*,
          r.title as reward_title,
          r.description as reward_description,
          u.name as child_name
        FROM ${TABLES.EXCHANGES} e
        LEFT JOIN ${TABLES.REWARDS} r ON e.reward_id = r.id
        LEFT JOIN ${TABLES.USERS} u ON e.child_id = u.id
        WHERE e.id = ?
      `)
      .bind(id)
      .first<Exchange & {
        reward_title: string;
        reward_description: string;
        child_name: string;
      }>();
    
    return result || null;
  } catch (error) {
    console.error('Error getting exchange by id:', error);
    throw new Error('Failed to get exchange');
  }
}

/**
 * 获取家庭的兑换记录
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @param options 查询选项
 * @returns 兑换记录列表
 */
export async function getExchangesByFamily(
  db: D1Database,
  familyId: string,
  options: {
    childId?: string;
    status?: 'pending' | 'approved' | 'completed' | 'rejected';
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  exchanges: (Exchange & {
    reward_title: string;
    reward_description: string;
    child_name: string;
  })[];
  total: number;
}> {
  try {
    const { childId, status, page = 1, limit = 20 } = options;
    
    let whereClause = 'WHERE e.family_id = ?';
    const params: any[] = [familyId];
    
    if (childId) {
      whereClause += ' AND e.child_id = ?';
      params.push(childId);
    }
    
    if (status) {
      whereClause += ' AND e.status = ?';
      params.push(status);
    }
    
    // 获取总数
    const countResult = await db
      .prepare(`
        SELECT COUNT(*) as total
        FROM ${TABLES.EXCHANGES} e
        ${whereClause}
      `)
      .bind(...params)
      .first<{ total: number }>();
    
    const total = countResult?.total || 0;
    
    // 获取分页数据
    const offset = (page - 1) * limit;
    const dataResult = await db
      .prepare(`
        SELECT 
          e.*,
          r.title as reward_title,
          r.description as reward_description,
          u.name as child_name
        FROM ${TABLES.EXCHANGES} e
        LEFT JOIN ${TABLES.REWARDS} r ON e.reward_id = r.id
        LEFT JOIN ${TABLES.USERS} u ON e.child_id = u.id
        ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...params, limit, offset)
      .all<Exchange & {
        reward_title: string;
        reward_description: string;
        child_name: string;
      }>();
    
    return {
      exchanges: dataResult.results || [],
      total
    };
  } catch (error) {
    console.error('Error getting exchanges by family:', error);
    throw new Error('Failed to get family exchanges');
  }
}

/**
 * 创建兑换记录
 * @param db D1 数据库实例
 * @param exchangeData 兑换数据
 * @returns 创建的兑换记录
 */
export async function createExchange(
  db: D1Database,
  exchangeData: CreateExchangeRequest & { id: string }
): Promise<Exchange> {
  try {
    const now = new Date().toISOString();
    
    const exchange: Exchange = {
      id: exchangeData.id,
      family_id: exchangeData.family_id,
      child_id: exchangeData.child_id,
      reward_id: exchangeData.reward_id,
      points_used: exchangeData.points_used,
      status: 'pending',
      created_at: now,
      updated_at: now
    };
    
    await db
      .prepare(`
        INSERT INTO ${TABLES.EXCHANGES} (
          id, family_id, child_id, reward_id, points_used,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        exchange.id,
        exchange.family_id,
        exchange.child_id,
        exchange.reward_id,
        exchange.points_used,
        exchange.status,
        exchange.created_at,
        exchange.updated_at
      )
      .run();
    
    return exchange;
  } catch (error) {
    console.error('Error creating exchange:', error);
    throw new Error('Failed to create exchange');
  }
}

/**
 * 更新兑换记录状态
 * @param db D1 数据库实例
 * @param id 兑换记录 ID
 * @param status 新状态
 * @returns 更新后的兑换记录或 null
 */
export async function updateExchangeStatus(
  db: D1Database,
  id: string,
  status: 'approved' | 'completed' | 'rejected'
): Promise<Exchange | null> {
  try {
    const existingExchange = await getExchangeById(db, id);
    if (!existingExchange) {
      return null;
    }
    
    const now = new Date().toISOString();
    
    await db
      .prepare(`
        UPDATE ${TABLES.EXCHANGES}
        SET status = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(status, now, id)
      .run();
    
    return await getExchangeById(db, id);
  } catch (error) {
    console.error('Error updating exchange status:', error);
    throw new Error('Failed to update exchange status');
  }
}

/**
 * 检查用户是否有足够积分兑换奖励
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @param familyId 家庭 ID
 * @param pointsRequired 所需积分
 * @returns 是否有足够积分
 */
export async function hasEnoughPoints(
  db: D1Database,
  userId: string,
  familyId: string,
  pointsRequired: number
): Promise<{ hasEnough: boolean; currentPoints: number }> {
  try {
    // 获取用户当前积分（已批准的行为记录积分总和）
    const result = await db
      .prepare(`
        SELECT COALESCE(SUM(points_change), 0) as current_points
        FROM ${TABLES.BEHAVIORS}
        WHERE child_id = ? AND family_id = ? AND status = 'approved'
      `)
      .bind(userId, familyId)
      .first<{ current_points: number }>();
    
    const currentPoints = result?.current_points || 0;
    
    return {
      hasEnough: currentPoints >= pointsRequired,
      currentPoints
    };
  } catch (error) {
    console.error('Error checking user points:', error);
    throw new Error('Failed to check user points');
  }
}

/**
 * 获取奖励统计信息
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @returns 统计信息
 */
export async function getRewardStats(db: D1Database, familyId: string): Promise<{
  totalRewards: number;
  activeRewards: number;
  totalExchanges: number;
  pendingExchanges: number;
  completedExchanges: number;
}> {
  try {
    const rewardResult = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_rewards,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_rewards
        FROM ${TABLES.REWARDS}
        WHERE family_id = ?
      `)
      .bind(familyId)
      .first<{
        total_rewards: number;
        active_rewards: number;
      }>();
    
    const exchangeResult = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_exchanges,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_exchanges,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_exchanges
        FROM ${TABLES.EXCHANGES}
        WHERE family_id = ?
      `)
      .bind(familyId)
      .first<{
        total_exchanges: number;
        pending_exchanges: number;
        completed_exchanges: number;
      }>();
    
    return {
      totalRewards: rewardResult?.total_rewards || 0,
      activeRewards: rewardResult?.active_rewards || 0,
      totalExchanges: exchangeResult?.total_exchanges || 0,
      pendingExchanges: exchangeResult?.pending_exchanges || 0,
      completedExchanges: exchangeResult?.completed_exchanges || 0
    };
  } catch (error) {
    console.error('Error getting reward stats:', error);
    throw new Error('Failed to get reward statistics');
  }
}

/**
 * 检查用户是否可以管理奖励
 * @param db D1 数据库实例
 * @param rewardId 奖励 ID
 * @param userId 用户 ID
 * @returns 是否可以管理
 */
export async function canUserManageReward(db: D1Database, rewardId: string, userId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare(`
        SELECT r.id
        FROM ${TABLES.REWARDS} r
        JOIN ${TABLES.USERS} u ON r.family_id = u.family_id
        WHERE r.id = ? AND u.id = ? AND u.role = 'parent'
      `)
      .bind(rewardId, userId)
      .first();
    
    return !!result;
  } catch (error) {
    console.error('Error checking reward management permission:', error);
    return false;
  }
}