/**
 * 行为记录相关的数据库操作函数
 */

import type { Behavior, CreateBehaviorRequest, UpdateBehaviorRequest } from '../types';
import { TABLES, BEHAVIOR_STATUS } from './schema';

/**
 * 根据 ID 获取行为记录
 * @param db D1 数据库实例
 * @param id 行为记录 ID
 * @returns 行为记录或 null
 */
export async function getBehaviorById(db: D1Database, id: string): Promise<Behavior | null> {
  try {
    const result = await db
      .prepare(`
        SELECT 
          b.*,
          r.title as rule_title,
          r.type as rule_type,
          u.name as child_name,
          creator.name as created_by_name,
          approver.name as approved_by_name
        FROM ${TABLES.BEHAVIORS} b
        LEFT JOIN ${TABLES.RULES} r ON b.rule_id = r.id
        LEFT JOIN ${TABLES.USERS} u ON b.child_id = u.id
        LEFT JOIN ${TABLES.USERS} creator ON b.created_by = creator.id
        LEFT JOIN ${TABLES.USERS} approver ON b.approved_by = approver.id
        WHERE b.id = ?
      `)
      .bind(id)
      .first<Behavior & {
        rule_title: string;
        rule_type: string;
        child_name: string;
        created_by_name: string;
        approved_by_name: string;
      }>();
    
    return result || null;
  } catch (error) {
    console.error('Error getting behavior by id:', error);
    throw new Error('Failed to get behavior');
  }
}

/**
 * 获取家庭的行为记录
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @param options 查询选项
 * @returns 行为记录列表
 */
export async function getBehaviorsByFamily(
  db: D1Database,
  familyId: string,
  options: {
    childId?: string;
    status?: 'pending' | 'approved' | 'rejected';
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{
  behaviors: (Behavior & {
    rule_title: string;
    rule_type: string;
    child_name: string;
    created_by_name: string;
    approved_by_name?: string;
  })[];
  total: number;
}> {
  try {
    const { childId, status, page = 1, limit = 20, startDate, endDate } = options;
    
    let whereClause = 'WHERE b.family_id = ?';
    const params: any[] = [familyId];
    
    if (childId) {
      whereClause += ' AND b.child_id = ?';
      params.push(childId);
    }
    
    if (status) {
      whereClause += ' AND b.status = ?';
      params.push(status);
    }
    
    if (startDate) {
      whereClause += ' AND b.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND b.created_at <= ?';
      params.push(endDate);
    }
    
    // 获取总数
    const countResult = await db
      .prepare(`
        SELECT COUNT(*) as total
        FROM ${TABLES.BEHAVIORS} b
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
          b.*,
          r.title as rule_title,
          r.type as rule_type,
          u.name as child_name,
          creator.name as created_by_name,
          approver.name as approved_by_name
        FROM ${TABLES.BEHAVIORS} b
        LEFT JOIN ${TABLES.RULES} r ON b.rule_id = r.id
        LEFT JOIN ${TABLES.USERS} u ON b.child_id = u.id
        LEFT JOIN ${TABLES.USERS} creator ON b.created_by = creator.id
        LEFT JOIN ${TABLES.USERS} approver ON b.approved_by = approver.id
        ${whereClause}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...params, limit, offset)
      .all<Behavior & {
        rule_title: string;
        rule_type: string;
        child_name: string;
        created_by_name: string;
        approved_by_name?: string;
      }>();
    
    return {
      behaviors: dataResult.results || [],
      total
    };
  } catch (error) {
    console.error('Error getting behaviors by family:', error);
    throw new Error('Failed to get family behaviors');
  }
}

/**
 * 创建行为记录
 * @param db D1 数据库实例
 * @param behaviorData 行为记录数据
 * @returns 创建的行为记录
 */
export async function createBehavior(
  db: D1Database,
  behaviorData: CreateBehaviorRequest & { id: string; created_by: string }
): Promise<Behavior> {
  try {
    const now = new Date().toISOString();
    
    const behavior: Behavior = {
      id: behaviorData.id,
      family_id: behaviorData.family_id,
      child_id: behaviorData.child_id,
      rule_id: behaviorData.rule_id,
      points_change: behaviorData.points_change,
      note: behaviorData.note || null,
      status: 'pending',
      created_by: behaviorData.created_by,
      approved_by: null,
      created_at: now,
      updated_at: now
    };
    
    await db
      .prepare(`
        INSERT INTO ${TABLES.BEHAVIORS} (
          id, family_id, child_id, rule_id, points_change, note,
          status, created_by, approved_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        behavior.id,
        behavior.family_id,
        behavior.child_id,
        behavior.rule_id,
        behavior.points_change,
        behavior.note,
        behavior.status,
        behavior.created_by,
        behavior.approved_by,
        behavior.created_at,
        behavior.updated_at
      )
      .run();
    
    return behavior;
  } catch (error) {
    console.error('Error creating behavior:', error);
    throw new Error('Failed to create behavior');
  }
}

/**
 * 更新行为记录状态
 * @param db D1 数据库实例
 * @param id 行为记录 ID
 * @param status 新状态
 * @param approvedBy 审批人 ID
 * @returns 更新后的行为记录或 null
 */
export async function updateBehaviorStatus(
  db: D1Database,
  id: string,
  status: 'approved' | 'rejected',
  approvedBy: string
): Promise<Behavior | null> {
  try {
    const existingBehavior = await getBehaviorById(db, id);
    if (!existingBehavior) {
      return null;
    }
    
    const now = new Date().toISOString();
    
    await db
      .prepare(`
        UPDATE ${TABLES.BEHAVIORS}
        SET status = ?, approved_by = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(status, approvedBy, now, id)
      .run();
    
    return await getBehaviorById(db, id);
  } catch (error) {
    console.error('Error updating behavior status:', error);
    throw new Error('Failed to update behavior status');
  }
}

/**
 * 删除行为记录
 * @param db D1 数据库实例
 * @param id 行为记录 ID
 * @returns 是否删除成功
 */
export async function deleteBehavior(db: D1Database, id: string): Promise<boolean> {
  try {
    const result = await db
      .prepare(`DELETE FROM ${TABLES.BEHAVIORS} WHERE id = ?`)
      .bind(id)
      .run();
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting behavior:', error);
    throw new Error('Failed to delete behavior');
  }
}

/**
 * 获取用户积分统计
 * @param db D1 数据库实例
 * @param userId 用户 ID
 * @param familyId 家庭 ID
 * @returns 积分统计
 */
export async function getUserPointsStats(
  db: D1Database,
  userId: string,
  familyId: string
): Promise<{
  totalPoints: number;
  pendingPoints: number;
  approvedPoints: number;
  rejectedPoints: number;
  thisMonthPoints: number;
}> {
  try {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const thisMonthStart = thisMonth.toISOString();
    
    const result = await db
      .prepare(`
        SELECT 
          SUM(CASE WHEN status = 'approved' THEN points_change ELSE 0 END) as approved_points,
          SUM(CASE WHEN status = 'pending' THEN points_change ELSE 0 END) as pending_points,
          SUM(CASE WHEN status = 'rejected' THEN points_change ELSE 0 END) as rejected_points,
          SUM(CASE WHEN status = 'approved' AND created_at >= ? THEN points_change ELSE 0 END) as this_month_points
        FROM ${TABLES.BEHAVIORS}
        WHERE child_id = ? AND family_id = ?
      `)
      .bind(thisMonthStart, userId, familyId)
      .first<{
        approved_points: number;
        pending_points: number;
        rejected_points: number;
        this_month_points: number;
      }>();
    
    const approvedPoints = result?.approved_points || 0;
    const pendingPoints = result?.pending_points || 0;
    const rejectedPoints = result?.rejected_points || 0;
    const thisMonthPoints = result?.this_month_points || 0;
    
    return {
      totalPoints: approvedPoints,
      pendingPoints,
      approvedPoints,
      rejectedPoints,
      thisMonthPoints
    };
  } catch (error) {
    console.error('Error getting user points stats:', error);
    throw new Error('Failed to get user points statistics');
  }
}

/**
 * 获取家庭行为统计
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @param days 统计天数
 * @returns 统计数据
 */
export async function getFamilyBehaviorStats(
  db: D1Database,
  familyId: string,
  days: number = 30
): Promise<{
  totalBehaviors: number;
  pendingBehaviors: number;
  approvedBehaviors: number;
  rejectedBehaviors: number;
  totalPointsAwarded: number;
  averagePointsPerDay: number;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();
    
    const result = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_behaviors,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_behaviors,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_behaviors,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_behaviors,
          SUM(CASE WHEN status = 'approved' THEN points_change ELSE 0 END) as total_points_awarded
        FROM ${TABLES.BEHAVIORS}
        WHERE family_id = ? AND created_at >= ?
      `)
      .bind(familyId, startDateStr)
      .first<{
        total_behaviors: number;
        pending_behaviors: number;
        approved_behaviors: number;
        rejected_behaviors: number;
        total_points_awarded: number;
      }>();
    
    const totalBehaviors = result?.total_behaviors || 0;
    const pendingBehaviors = result?.pending_behaviors || 0;
    const approvedBehaviors = result?.approved_behaviors || 0;
    const rejectedBehaviors = result?.rejected_behaviors || 0;
    const totalPointsAwarded = result?.total_points_awarded || 0;
    const averagePointsPerDay = days > 0 ? totalPointsAwarded / days : 0;
    
    return {
      totalBehaviors,
      pendingBehaviors,
      approvedBehaviors,
      rejectedBehaviors,
      totalPointsAwarded,
      averagePointsPerDay
    };
  } catch (error) {
    console.error('Error getting family behavior stats:', error);
    throw new Error('Failed to get family behavior statistics');
  }
}

/**
 * 检查用户是否可以管理行为记录
 * @param db D1 数据库实例
 * @param behaviorId 行为记录 ID
 * @param userId 用户 ID
 * @returns 是否可以管理
 */
export async function canUserManageBehavior(db: D1Database, behaviorId: string, userId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare(`
        SELECT b.id
        FROM ${TABLES.BEHAVIORS} b
        JOIN ${TABLES.USERS} u ON b.family_id = u.family_id
        WHERE b.id = ? AND u.id = ? AND u.role = 'parent'
      `)
      .bind(behaviorId, userId)
      .first();
    
    return !!result;
  } catch (error) {
    console.error('Error checking behavior management permission:', error);
    return false;
  }
}