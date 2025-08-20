# 小星星成长记 - Cloudflare D1 迁移方案

## 1. 迁移概述

本文档详细描述了将小星星成长记项目从 Supabase 迁移到 Cloudflare D1 数据库，并使用 Cloudflare Workers 进行部署的完整方案。

### 1.1 迁移目标
- 将数据存储从 Supabase PostgreSQL 迁移到 Cloudflare D1 (SQLite)
- 使用 Cloudflare Workers 替代 Supabase 的后端服务
- 重新设计认证系统
- 实现文件存储解决方案
- 保持现有功能完整性

### 1.2 技术栈变更

| 组件 | 当前技术 | 目标技术 |
|------|----------|----------|
| 数据库 | Supabase PostgreSQL | Cloudflare D1 (SQLite) |
| 后端 | Supabase Edge Functions | Cloudflare Workers |
| 认证 | Supabase Auth | 自定义 JWT 认证 |
| 文件存储 | Supabase Storage | Cloudflare R2 |
| 前端 | React + Vite | React + Vite (保持不变) |

## 2. Cloudflare D1 数据库设计

### 2.1 数据库表结构

基于现有 Supabase 表结构，适配 SQLite 语法：

```sql
-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'parent' CHECK (role IN ('parent', 'child')),
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 家庭表
CREATE TABLE families (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 家庭成员表
CREATE TABLE family_members (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'parent' CHECK (role IN ('parent', 'guardian')),
    permissions TEXT, -- JSON 字符串
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(family_id, user_id)
);

-- 儿童表
CREATE TABLE children (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    name TEXT NOT NULL,
    birth_date DATE,
    avatar_url TEXT,
    total_points INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    child_invite_code TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 规则表
CREATE TABLE rules (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    type TEXT CHECK (type IN ('reward', 'punishment')),
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    created_by TEXT,
    requires_approval BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 行为记录表
CREATE TABLE behaviors (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    points_change INTEGER NOT NULL,
    notes TEXT,
    recorded_by TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_required BOOLEAN DEFAULT false,
    verified_by TEXT,
    verified_at DATETIME,
    has_image BOOLEAN DEFAULT false,
    family_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 奖励表
CREATE TABLE rewards (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    name TEXT NOT NULL,
    points_required INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 奖励兑换记录表
CREATE TABLE reward_redemptions (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
    approved_by TEXT,
    approved_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- 行为图片表
CREATE TABLE behavior_images (
    id TEXT PRIMARY KEY,
    behavior_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (behavior_id) REFERENCES behaviors(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 挑战表
CREATE TABLE challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('individual', 'group')) DEFAULT 'individual',
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
    points_reward INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 挑战参与者表
CREATE TABLE challenge_participants (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL,
    child_id TEXT NOT NULL,
    status TEXT DEFAULT 'joined' CHECK (status IN ('joined', 'completed', 'abandoned')),
    progress INTEGER DEFAULT 0,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    UNIQUE(challenge_id, child_id)
);

-- 好友关系表
CREATE TABLE friendships (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES children(id) ON DELETE CASCADE,
    UNIQUE(child_id, friend_id)
);

-- 监督日志表
CREATE TABLE supervision_logs (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- 'chat', 'challenge', 'friendship'
    activity_id TEXT, -- 对应活动的ID
    details TEXT, -- JSON 字符串
    flagged BOOLEAN DEFAULT false,
    reviewed_by TEXT,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);
```

### 2.2 索引创建

```sql
-- 性能优化索引
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_children_family_id ON children(family_id);
CREATE INDEX idx_rules_family_id ON rules(family_id);
CREATE INDEX idx_behaviors_child_id ON behaviors(child_id);
CREATE INDEX idx_behaviors_family_id ON behaviors(family_id);
CREATE INDEX idx_behaviors_created_at ON behaviors(created_at);
CREATE INDEX idx_rewards_family_id ON rewards(family_id);
CREATE INDEX idx_reward_redemptions_child_id ON reward_redemptions(child_id);
CREATE INDEX idx_behavior_images_behavior_id ON behavior_images(behavior_id);
CREATE INDEX idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_child_id ON challenge_participants(child_id);
CREATE INDEX idx_friendships_child_id ON friendships(child_id);
CREATE INDEX idx_supervision_logs_child_id ON supervision_logs(child_id);
```

## 3. Cloudflare Workers 架构设计

### 3.1 项目结构

```
workers/
├── src/
│   ├── index.ts              # 主入口文件
│   ├── auth/
│   │   ├── jwt.ts            # JWT 工具函数
│   │   ├── middleware.ts     # 认证中间件
│   │   └── handlers.ts       # 认证相关处理器
│   ├── api/
│   │   ├── users.ts          # 用户相关 API
│   │   ├── families.ts       # 家庭相关 API
│   │   ├── children.ts       # 儿童相关 API
│   │   ├── rules.ts          # 规则相关 API
│   │   ├── behaviors.ts      # 行为记录相关 API
│   │   ├── rewards.ts        # 奖励相关 API
│   │   ├── challenges.ts     # 挑战相关 API
│   │   └── upload.ts         # 文件上传 API
│   ├── db/
│   │   ├── connection.ts     # D1 数据库连接
│   │   ├── queries.ts        # 数据库查询函数
│   │   └── migrations.ts     # 数据库迁移
│   ├── utils/
│   │   ├── response.ts       # 响应工具函数
│   │   ├── validation.ts     # 数据验证
│   │   └── helpers.ts        # 通用工具函数
│   └── types/
│       └── index.ts          # TypeScript 类型定义
├── wrangler.toml             # Cloudflare Workers 配置
├── package.json
└── tsconfig.json
```

### 3.2 主要 API 端点设计

```typescript
// 认证相关
POST /api/auth/register       # 用户注册
POST /api/auth/login          # 用户登录
POST /api/auth/refresh        # 刷新 token
POST /api/auth/logout         # 用户登出

// 用户相关
GET /api/users/profile        # 获取用户信息
PUT /api/users/profile        # 更新用户信息

// 家庭相关
GET /api/families             # 获取用户的家庭列表
POST /api/families            # 创建家庭
GET /api/families/:id         # 获取家庭详情
PUT /api/families/:id         # 更新家庭信息
DELETE /api/families/:id      # 删除家庭
POST /api/families/join       # 加入家庭
GET /api/families/:id/members # 获取家庭成员

// 儿童相关
GET /api/children             # 获取儿童列表
POST /api/children            # 添加儿童
GET /api/children/:id         # 获取儿童详情
PUT /api/children/:id         # 更新儿童信息
DELETE /api/children/:id      # 删除儿童

// 规则相关
GET /api/rules                # 获取规则列表
POST /api/rules               # 创建规则
GET /api/rules/:id            # 获取规则详情
PUT /api/rules/:id            # 更新规则
DELETE /api/rules/:id         # 删除规则

// 行为记录相关
GET /api/behaviors            # 获取行为记录列表
POST /api/behaviors           # 创建行为记录
GET /api/behaviors/:id        # 获取行为记录详情
PUT /api/behaviors/:id        # 更新行为记录
DELETE /api/behaviors/:id     # 删除行为记录
POST /api/behaviors/:id/verify # 验证行为记录

// 奖励相关
GET /api/rewards              # 获取奖励列表
POST /api/rewards             # 创建奖励
GET /api/rewards/:id          # 获取奖励详情
PUT /api/rewards/:id          # 更新奖励
DELETE /api/rewards/:id       # 删除奖励
POST /api/rewards/:id/redeem  # 兑换奖励

// 挑战相关
GET /api/challenges           # 获取挑战列表
POST /api/challenges          # 创建挑战
GET /api/challenges/:id       # 获取挑战详情
PUT /api/challenges/:id       # 更新挑战
DELETE /api/challenges/:id    # 删除挑战
POST /api/challenges/:id/join # 参加挑战

// 文件上传
POST /api/upload/image        # 上传图片
DELETE /api/upload/image/:id  # 删除图片
```

### 3.3 认证系统设计

使用 JWT (JSON Web Token) 替代 Supabase Auth：

```typescript
// JWT Payload 结构
interface JWTPayload {
  userId: string
  email: string
  role: 'parent' | 'child'
  familyId?: string
  iat: number
  exp: number
}

// 认证中间件
export async function authMiddleware(request: Request, env: Env): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET)
    return payload as JWTPayload
  } catch (error) {
    return null
  }
}
```

## 4. 前端代码调整方案

### 4.1 API 客户端重构

创建新的 API 客户端替代 Supabase 客户端：

```typescript
// src/lib/api.ts
class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // 认证相关
  async login(email: string, password: string) {
    return this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(email: string, password: string, name: string) {
    return this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  }

  // 其他 API 方法...
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_BASE_URL)
```

### 4.2 状态管理调整

更新 Zustand store 以使用新的 API 客户端：

```typescript
// src/store/index.ts
import { apiClient } from '../lib/api'

export const useAuthStore = create<AuthState>((set, get) => ({
  // ... 其他状态

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const { token, user } = await apiClient.login(email, password)
      apiClient.setToken(token)
      set({ user, isAuthenticated: true })
      
      // 加载用户的家庭信息
      await get().loadFamily()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true })
    try {
      const { token, user } = await apiClient.register(email, password, name)
      apiClient.setToken(token)
      set({ user, isAuthenticated: true })
    } catch (error) {
      console.error('Register error:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    apiClient.clearToken()
    set({
      user: null,
      family: null,
      children: [],
      isAuthenticated: false,
    })
  },

  // 其他方法需要相应调整...
}))
```

### 4.3 环境变量调整

```env
# .env
VITE_API_BASE_URL=https://your-worker.your-subdomain.workers.dev
```

## 5. 文件存储解决方案

### 5.1 Cloudflare R2 配置

使用 Cloudflare R2 替代 Supabase Storage：

```typescript
// workers/src/api/upload.ts
export async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return new Response('No file provided', { status: 400 })
  }

  // 生成唯一文件名
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${file.name.split('.').pop()}`
  const key = `behavior-images/${fileName}`

  // 上传到 R2
  await env.R2_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  })

  // 返回公共 URL
  const imageUrl = `https://your-r2-domain.com/${key}`
  
  return Response.json({ imageUrl, key })
}
```

### 5.2 前端文件上传调整

```typescript
// src/components/ImageUpload.tsx
const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiClient.getToken()}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const { imageUrl } = await response.json()
  return imageUrl
}
```

## 6. 迁移步骤

### 6.1 准备阶段

1. **创建 Cloudflare 账户和配置**
   ```bash
   # 安装 Wrangler CLI
   npm install -g wrangler
   
   # 登录 Cloudflare
   wrangler login
   
   # 创建 D1 数据库
   wrangler d1 create starkid-db
   
   # 创建 R2 存储桶
   wrangler r2 bucket create starkid-images
   ```

2. **设置 Workers 项目**
   ```bash
   # 创建 Workers 项目
   mkdir starkid-workers
   cd starkid-workers
   npm init -y
   npm install @cloudflare/workers-types
   ```

3. **配置 wrangler.toml**
   ```toml
   name = "starkid-api"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"
   
   [[d1_databases]]
   binding = "DB"
   database_name = "starkid-db"
   database_id = "your-database-id"
   
   [[r2_buckets]]
   binding = "R2_BUCKET"
   bucket_name = "starkid-images"
   
   [vars]
   JWT_SECRET = "your-jwt-secret"
   ```

### 6.2 数据迁移

1. **导出 Supabase 数据**
   ```bash
   # 使用 pg_dump 导出数据
   pg_dump "postgresql://user:pass@host:port/db" --data-only --inserts > data.sql
   ```

2. **转换数据格式**
   - 将 PostgreSQL 的 UUID 转换为 SQLite 的 TEXT
   - 调整日期时间格式
   - 转换 JSONB 字段为 TEXT

3. **导入到 D1**
   ```bash
   # 执行数据库迁移
   wrangler d1 execute starkid-db --file=./schema.sql
   wrangler d1 execute starkid-db --file=./data.sql
   ```

### 6.3 部署阶段

1. **部署 Workers**
   ```bash
   # 部署到 Cloudflare Workers
   wrangler deploy
   ```

2. **更新前端配置**
   - 更新环境变量
   - 替换 API 客户端
   - 测试所有功能

3. **域名配置**
   - 配置自定义域名
   - 设置 SSL 证书
   - 更新 DNS 记录

### 6.4 测试验证

1. **功能测试**
   - 用户注册/登录
   - 家庭管理
   - 行为记录
   - 奖励系统
   - 文件上传

2. **性能测试**
   - API 响应时间
   - 数据库查询性能
   - 文件上传速度

3. **安全测试**
   - JWT 认证
   - 权限控制
   - 数据验证

## 7. 注意事项

### 7.1 SQLite 限制

- **外键约束**：SQLite 的外键支持需要显式启用
- **数据类型**：SQLite 的类型系统相对宽松
- **并发限制**：D1 有并发连接限制
- **查询复杂度**：避免过于复杂的 JOIN 查询

### 7.2 Workers 限制

- **执行时间**：单次请求最长 30 秒
- **内存限制**：128MB 内存限制
- **冷启动**：可能存在冷启动延迟
- **CPU 时间**：有 CPU 时间限制

### 7.3 成本考虑

- **D1 定价**：按读写操作计费
- **Workers 定价**：按请求数计费
- **R2 定价**：按存储和传输计费
- **带宽成本**：考虑 CDN 和传输成本

### 7.4 备份策略

- **定期备份**：设置自动备份计划
- **数据导出**：定期导出重要数据
- **版本控制**：保持数据库 schema 版本控制
- **灾难恢复**：制定灾难恢复计划

## 8. 后续优化

### 8.1 性能优化

- **缓存策略**：使用 Cloudflare Cache API
- **数据库优化**：优化查询和索引
- **CDN 配置**：优化静态资源分发
- **压缩优化**：启用 Gzip/Brotli 压缩

### 8.2 监控告警

- **性能监控**：监控 API 响应时间
- **错误追踪**：集成错误追踪服务
- **使用统计**：分析用户使用模式
- **成本监控**：监控服务使用成本

### 8.3 扩展功能

- **实时通信**：使用 WebSocket 或 Server-Sent Events
- **推送通知**：集成推送通知服务
- **数据分析**：添加用户行为分析
- **AI 功能**：集成 AI 服务提供智能建议

这个迁移方案提供了从 Supabase 到 Cloudflare 技术栈的完整迁移路径，确保功能完整性的同时，充分利用 Cloudflare 平台的优势。