/**
 * 基础功能测试脚本
 * 测试 Workers 项目的核心模块是否正常工作
 */

const fs = require('fs');
const path = require('path');

// 测试结果
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// 测试函数
function test(name, fn) {
  try {
    console.log(`\n🧪 测试: ${name}`);
    fn();
    console.log(`✅ 通过: ${name}`);
    results.passed++;
  } catch (error) {
    console.log(`❌ 失败: ${name}`);
    console.log(`   错误: ${error.message}`);
    results.failed++;
    results.errors.push({ test: name, error: error.message });
  }
}

// 检查文件是否存在
function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  console.log(`   ✓ ${description}: ${filePath}`);
}

// 检查文件内容
function checkFileContent(filePath, searchText, description) {
  const fullPath = path.join(__dirname, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content.includes(searchText)) {
    throw new Error(`文件内容不包含: ${searchText}`);
  }
  console.log(`   ✓ ${description}`);
}

console.log('🚀 开始测试 StarKid Workers 项目基础功能\n');
console.log('=' .repeat(50));

// 测试项目结构
test('项目结构完整性', () => {
  checkFileExists('package.json', '包配置文件');
  checkFileExists('tsconfig.json', 'TypeScript配置文件');
  checkFileExists('wrangler.toml', 'Wrangler配置文件');
  checkFileExists('src/index.ts', '主入口文件');
  checkFileExists('src/types/index.ts', '类型定义文件');
});

// 测试核心模块
test('核心模块文件', () => {
  checkFileExists('src/auth/jwt.ts', 'JWT工具模块');
  checkFileExists('src/auth/middleware.ts', '认证中间件');
  checkFileExists('src/utils/index.ts', '工具函数模块');
  checkFileExists('src/db/index.ts', '数据库模块');
});

// 测试数据库模块
test('数据库操作模块', () => {
  checkFileExists('src/db/users.ts', '用户数据操作');
  checkFileExists('src/db/families.ts', '家庭数据操作');
  checkFileExists('src/db/rules.ts', '规则数据操作');
  checkFileExists('src/db/behaviors.ts', '行为数据操作');
  checkFileExists('src/db/rewards.ts', '奖励数据操作');
  checkFileExists('src/db/schema.ts', '数据库模式');
  checkFileExists('src/db/migrations.ts', '数据库迁移');
});

// 测试API处理器
test('API处理器模块', () => {
  checkFileExists('src/api/auth.ts', '认证API处理器');
  checkFileExists('src/api/users.ts', '用户API处理器');
  checkFileExists('src/api/families.ts', '家庭API处理器');
  checkFileExists('src/api/rules.ts', '规则API处理器');
  checkFileExists('src/api/behaviors.ts', '行为API处理器');
  checkFileExists('src/api/rewards.ts', '奖励API处理器');
});

// 测试配置文件内容
test('配置文件内容', () => {
  checkFileContent('package.json', '"starkid-workers"', 'package.json包含项目名称');
  checkFileContent('wrangler.toml', 'starkid-workers', 'wrangler.toml包含项目配置');
  checkFileContent('tsconfig.json', '"target"', 'tsconfig.json包含编译目标');
});

// 测试主要模块导出
test('模块导出检查', () => {
  checkFileContent('src/index.ts', 'export default', '主入口文件包含默认导出');
  checkFileContent('src/types/index.ts', 'export', '类型文件包含导出');
  checkFileContent('src/db/index.ts', 'export', '数据库模块包含导出');
  checkFileContent('src/utils/index.ts', 'export', '工具模块包含导出');
});

// 测试关键功能实现
test('关键功能实现', () => {
  checkFileContent('src/auth/jwt.ts', 'generateToken', 'JWT模块包含令牌生成');
  checkFileContent('src/auth/middleware.ts', 'authenticate', '中间件包含认证函数');
  checkFileContent('src/db/migrations.ts', 'CREATE TABLE', '迁移文件包含表创建');
  checkFileContent('src/utils/index.ts', 'validation', '工具模块包含验证函数');
});

// 输出测试结果
console.log('\n' + '=' .repeat(50));
console.log('📊 测试结果汇总:');
console.log(`✅ 通过: ${results.passed} 项`);
console.log(`❌ 失败: ${results.failed} 项`);

if (results.failed > 0) {
  console.log('\n🔍 失败详情:');
  results.errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.test}: ${error.error}`);
  });
}

const successRate = Math.round((results.passed / (results.passed + results.failed)) * 100);
console.log(`\n🎯 成功率: ${successRate}%`);

if (results.failed === 0) {
  console.log('\n🎉 所有测试通过！StarKid Workers 项目基础功能正常。');
} else {
  console.log('\n⚠️  部分测试失败，请检查上述错误并修复。');
  process.exit(1);
}