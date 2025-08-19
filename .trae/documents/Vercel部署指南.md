# Vercel 部署指南

## 概述

本指南详细介绍如何在 Vercel 平台部署「小星星成长记」项目，并正确配置环境变量以确保应用安全运行。

## 前置条件

- GitHub 账户
- Vercel 账户
- Supabase 项目已创建并配置完成
- 本地项目已推送到 GitHub 仓库

## 部署步骤

### 1. 连接 GitHub 仓库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project" 按钮
3. 选择 "Import Git Repository"
4. 授权 Vercel 访问你的 GitHub 账户
5. 选择 `StarKid` 仓库
6. 点击 "Import" 按钮

### 2. 配置项目设置

在项目导入页面：

- **Project Name**: `star-kid` (或自定义名称)
- **Framework Preset**: Vite (自动检测)
- **Root Directory**: `./` (默认)
- **Build Command**: `npm run build` (自动检测)
- **Output Directory**: `dist` (自动检测)
- **Install Command**: `npm install` (自动检测)

### 3. 配置环境变量

在 "Environment Variables" 部分添加以下变量：

#### 必需的环境变量

| 变量名 | 值 | 说明 |
|--------|----|---------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase 公开密钥 |

#### 获取 Supabase 环境变量

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 "Settings" → "API"
4. 复制以下信息：
   - **URL**: 项目 URL
   - **anon public**: 公开密钥（用于前端）

#### 在 Vercel 中添加环境变量

1. 在项目配置页面找到 "Environment Variables" 部分
2. 点击 "Add" 按钮
3. 输入变量名和值
4. 选择环境：
   - **Production**: 生产环境
   - **Preview**: 预览环境
   - **Development**: 开发环境
5. 点击 "Add" 保存

### 4. 部署项目

1. 确认所有配置正确
2. 点击 "Deploy" 按钮
3. 等待部署完成（通常需要 1-3 分钟）

### 5. 验证部署

部署完成后：

1. 点击 "Visit" 按钮访问部署的应用
2. 测试用户注册/登录功能
3. 验证数据库连接是否正常
4. 检查所有功能模块是否工作正常

## 自动部署配置

### Git 集成

Vercel 会自动监听 GitHub 仓库的变化：

- **主分支推送**: 自动部署到生产环境
- **Pull Request**: 自动创建预览部署
- **其他分支**: 可配置自动部署到预览环境

### 部署钩子

可以配置部署钩子来触发自动部署：

1. 进入项目设置
2. 选择 "Git" 标签
3. 配置 "Deploy Hooks"
4. 设置触发条件和目标分支

## 域名配置

### 使用 Vercel 域名

默认情况下，Vercel 会提供一个免费域名：
- 格式：`https://your-project-name.vercel.app`
- 支持 HTTPS
- 全球 CDN 加速

### 自定义域名

1. 进入项目设置
2. 选择 "Domains" 标签
3. 点击 "Add" 按钮
4. 输入自定义域名
5. 按照提示配置 DNS 记录
6. 等待域名验证完成

## 性能优化

### 构建优化

在 `vercel.json` 中配置构建选项：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### 缓存策略

配置静态资源缓存：

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 监控和日志

### 部署日志

1. 进入项目仪表板
2. 选择 "Deployments" 标签
3. 点击具体部署查看详细日志
4. 检查构建和运行时错误

### 性能监控

1. 进入项目设置
2. 选择 "Analytics" 标签
3. 查看页面性能指标
4. 监控用户访问数据

### 错误追踪

可以集成第三方错误追踪服务：
- Sentry
- LogRocket
- Bugsnag

## 安全最佳实践

### 环境变量安全

1. **永远不要在代码中硬编码敏感信息**
2. **使用 `VITE_` 前缀暴露给前端的变量**
3. **定期轮换 API 密钥**
4. **使用最小权限原则**

### HTTPS 配置

- Vercel 自动提供 SSL 证书
- 强制 HTTPS 重定向
- 支持 HTTP/2 和 HTTP/3

### 内容安全策略 (CSP)

在 `vercel.json` 中配置 CSP：

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;"
        }
      ]
    }
  ]
}
```

## 故障排除

### 常见问题

#### 1. 构建失败

**问题**: 部署时构建失败

**解决方案**:
- 检查 `package.json` 中的依赖版本
- 确认构建命令正确
- 查看构建日志中的错误信息
- 本地测试 `npm run build` 命令

#### 2. 环境变量未生效

**问题**: 应用无法连接到 Supabase

**解决方案**:
- 确认环境变量名称正确（包含 `VITE_` 前缀）
- 检查变量值是否正确
- 重新部署项目使环境变量生效
- 在浏览器开发者工具中检查网络请求

#### 3. 路由问题

**问题**: 刷新页面出现 404 错误

**解决方案**:
在 `vercel.json` 中配置重写规则：

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### 4. 性能问题

**问题**: 页面加载缓慢

**解决方案**:
- 启用 Vercel Analytics
- 优化图片和静态资源
- 使用代码分割
- 配置适当的缓存策略

### 调试技巧

1. **使用 Vercel CLI 本地测试**:
   ```bash
   npm i -g vercel
   vercel dev
   ```

2. **查看实时日志**:
   ```bash
   vercel logs
   ```

3. **检查部署状态**:
   ```bash
   vercel ls
   ```

## 成本优化

### 免费额度

Vercel 免费计划包括：
- 100GB 带宽/月
- 100 次部署/天
- 无限静态网站
- 自定义域名

### 付费功能

- 团队协作
- 高级分析
- 密码保护
- 更多带宽和构建时间

## 总结

通过本指南，你应该能够：

1. ✅ 成功部署项目到 Vercel
2. ✅ 正确配置环境变量
3. ✅ 设置自动部署流程
4. ✅ 配置自定义域名
5. ✅ 实施安全最佳实践
6. ✅ 解决常见部署问题

如果遇到其他问题，请参考：
- [Vercel 官方文档](https://vercel.com/docs)
- [Supabase 部署指南](https://supabase.com/docs/guides/hosting/vercel)
- [项目 GitHub Issues](https://github.com/your-username/StarKid/issues)

---

**注意**: 请确保在部署前已完成本地开发和测试，并且所有敏感信息都已从代码仓库中移除。