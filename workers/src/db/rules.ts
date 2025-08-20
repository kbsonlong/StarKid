/**
 * 规则相关的数据库操作函数
 */

import type { Rule, CreateRuleRequest, UpdateRuleRequest } from '../types';
import { TABLES, RULE_TYPES } from './schema';

/**
 * 根据 ID 获取规则
 * @param db D1 数据库实例
 * @param id 规则 ID
 * @returns 规则信息或 null
 */
export async function getRuleById(db: D1Database, id: string): Promise<Rule | null> {
  try {
    const result = await db
      .prepare(`SELECT * FROM ${TABLES.RULES} WHERE id = ?`)
      .bind(id)
      .first<Rule>();
    
    return result || null;
  } catch (error) {
    console.error('Error getting rule by id:', error);
    throw new Error('Failed to get rule');
  }
}

/**
 * 获取家庭的所有规则
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @param type 规则类型（可选）
 * @param isActive 是否激活（可选）
 * @returns 规则列表
 */
export async function getRulesByFamily(
  db: D1Database,
  familyId: string,
  type?: 'positive' | 'negative',
  isActive?: boolean
): Promise<Rule[]> {
  try {
    let query = `SELECT * FROM ${TABLES.RULES} WHERE family_id = ?`;
    const params: any[] = [familyId];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(isActive ? 1 : 0);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db
      .prepare(query)
      .bind(...params)
      .all<Rule>();
    
    return result.results || [];
  } catch (error) {
    console.error('Error getting rules by family:', error);
    throw new Error('Failed to get family rules');
  }
}

/**
 * 创建新规则
 * @param db D1 数据库实例
 * @param ruleData 规则数据
 * @returns 创建的规则
 */
export async function createRule(
  db: D1Database,
  ruleData: CreateRuleRequest & { id: string; created_by: string }
): Promise<Rule> {
  try {
    const now = new Date().toISOString();
    
    const rule: Rule = {
      id: ruleData.id,
      family_id: ruleData.family_id,
      title: ruleData.title,
      description: ruleData.description || null,
      type: ruleData.type,
      points: ruleData.points,
      category: ruleData.category,
      is_active: ruleData.is_active ?? true,
      created_by: ruleData.created_by,
      created_at: now,
      updated_at: now
    };
    
    await db
      .prepare(`
        INSERT INTO ${TABLES.RULES} (
          id, family_id, title, description, type, points, category,
          is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        rule.id,
        rule.family_id,
        rule.title,
        rule.description,
        rule.type,
        rule.points,
        rule.category,
        rule.is_active ? 1 : 0,
        rule.created_by,
        rule.created_at,
        rule.updated_at
      )
      .run();
    
    return rule;
  } catch (error) {
    console.error('Error creating rule:', error);
    throw new Error('Failed to create rule');
  }
}

/**
 * 更新规则
 * @param db D1 数据库实例
 * @param id 规则 ID
 * @param updateData 更新数据
 * @returns 更新后的规则或 null
 */
export async function updateRule(
  db: D1Database,
  id: string,
  updateData: UpdateRuleRequest
): Promise<Rule | null> {
  try {
    const existingRule = await getRuleById(db, id);
    if (!existingRule) {
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
    
    if (updateData.type !== undefined) {
      updates.push('type = ?');
      params.push(updateData.type);
    }
    
    if (updateData.points !== undefined) {
      updates.push('points = ?');
      params.push(updateData.points);
    }
    
    if (updateData.category !== undefined) {
      updates.push('category = ?');
      params.push(updateData.category);
    }
    
    if (updateData.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(updateData.is_active ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return existingRule;
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);
    
    await db
      .prepare(`UPDATE ${TABLES.RULES} SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();
    
    return await getRuleById(db, id);
  } catch (error) {
    console.error('Error updating rule:', error);
    throw new Error('Failed to update rule');
  }
}

/**
 * 删除规则
 * @param db D1 数据库实例
 * @param id 规则 ID
 * @returns 是否删除成功
 */
export async function deleteRule(db: D1Database, id: string): Promise<boolean> {
  try {
    const result = await db
      .prepare(`DELETE FROM ${TABLES.RULES} WHERE id = ?`)
      .bind(id)
      .run();
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting rule:', error);
    throw new Error('Failed to delete rule');
  }
}

/**
 * 切换规则激活状态
 * @param db D1 数据库实例
 * @param id 规则 ID
 * @returns 更新后的规则或 null
 */
export async function toggleRuleStatus(db: D1Database, id: string): Promise<Rule | null> {
  try {
    const rule = await getRuleById(db, id);
    if (!rule) {
      return null;
    }
    
    const now = new Date().toISOString();
    const newStatus = !rule.is_active;
    
    await db
      .prepare(`UPDATE ${TABLES.RULES} SET is_active = ?, updated_at = ? WHERE id = ?`)
      .bind(newStatus ? 1 : 0, now, id)
      .run();
    
    return await getRuleById(db, id);
  } catch (error) {
    console.error('Error toggling rule status:', error);
    throw new Error('Failed to toggle rule status');
  }
}

/**
 * 获取规则统计信息
 * @param db D1 数据库实例
 * @param familyId 家庭 ID
 * @returns 统计信息
 */
export async function getRuleStats(db: D1Database, familyId: string): Promise<{
  total: number;
  positive: number;
  negative: number;
  active: number;
  inactive: number;
}> {
  try {
    const result = await db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN type = 'positive' THEN 1 ELSE 0 END) as positive,
          SUM(CASE WHEN type = 'negative' THEN 1 ELSE 0 END) as negative,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
        FROM ${TABLES.RULES}
        WHERE family_id = ?
      `)
      .bind(familyId)
      .first<{
        total: number;
        positive: number;
        negative: number;
        active: number;
        inactive: number;
      }>();
    
    return {
      total: result?.total || 0,
      positive: result?.positive || 0,
      negative: result?.negative || 0,
      active: result?.active || 0,
      inactive: result?.inactive || 0
    };
  } catch (error) {
    console.error('Error getting rule stats:', error);
    throw new Error('Failed to get rule statistics');
  }
}

/**
 * 检查用户是否可以管理规则
 * @param db D1 数据库实例
 * @param ruleId 规则 ID
 * @param userId 用户 ID
 * @returns 是否可以管理
 */
export async function canUserManageRule(db: D1Database, ruleId: string, userId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare(`
        SELECT r.id
        FROM ${TABLES.RULES} r
        JOIN ${TABLES.USERS} u ON r.family_id = u.family_id
        WHERE r.id = ? AND u.id = ? AND u.role = 'parent'
      `)
      .bind(ruleId, userId)
      .first();
    
    return !!result;
  } catch (error) {
    console.error('Error checking rule management permission:', error);
    return false;
  }
}