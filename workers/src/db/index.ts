import { Env, QueryResult } from '../types'

/**
 * 数据库查询包装器
 */
export class Database {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  /**
   * 执行查询
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const result = await this.db.prepare(sql).bind(...params).all()
      return {
        success: true,
        results: result.results as T[],
        meta: result.meta,
      }
    } catch (error) {
      console.error('Database query error:', error)
      return {
        success: false,
      }
    }
  }

  /**
   * 执行单条查询
   */
  async queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const result = await this.db.prepare(sql).bind(...params).first()
      return result as T | null
    } catch (error) {
      console.error('Database queryFirst error:', error)
      return null
    }
  }

  /**
   * 执行插入/更新/删除操作
   */
  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    try {
      const result = await this.db.prepare(sql).bind(...params).run()
      return {
        success: true,
        meta: result.meta,
      }
    } catch (error) {
      console.error('Database execute error:', error)
      return {
        success: false,
      }
    }
  }

  /**
   * 执行批量操作
   */
  async batch(statements: { sql: string; params?: any[] }[]): Promise<QueryResult[]> {
    try {
      const prepared = statements.map(stmt => 
        this.db.prepare(stmt.sql).bind(...(stmt.params || []))
      )
      const results = await this.db.batch(prepared)
      
      return results.map(result => ({
        success: true,
        results: result.results,
        meta: result.meta,
      }))
    } catch (error) {
      console.error('Database batch error:', error)
      return [{ success: false }]
    }
  }

  /**
   * 开始事务
   */
  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    // D1 目前不支持显式事务，但批量操作是原子的
    // 这里提供一个接口，未来可以扩展
    return callback(this)
  }
}

/**
 * 创建数据库实例
 */
export function createDatabase(env: Env): Database {
  return new Database(env.DB)
}

/**
 * 生成 UUID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * 生成邀请码
 */
export function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 格式化日期为 ISO 字符串
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString()
}