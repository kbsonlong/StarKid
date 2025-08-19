-- 修复family_members表role字段约束不匹配问题
-- 将role字段约束从('admin', 'member', 'observer')更新为('parent', 'guardian', 'member')

-- 首先删除现有的检查约束
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_role_check;

-- 添加新的检查约束，支持parent、guardian、member角色
ALTER TABLE family_members ADD CONSTRAINT family_members_role_check 
  CHECK (role IN ('parent', 'guardian', 'member'));

-- 更新现有数据：将admin角色改为parent，observer角色改为member
UPDATE family_members SET role = 'parent' WHERE role = 'admin';
UPDATE family_members SET role = 'member' WHERE role = 'observer';

-- 添加注释说明角色含义
COMMENT ON COLUMN family_members.role IS 'Family member role: parent (家长), guardian (监护人), member (普通成员)';