-- 为新增表设置权限

-- 为 family_members 表设置权限
GRANT SELECT, INSERT, UPDATE, DELETE ON family_members TO authenticated;
GRANT SELECT ON family_members TO anon;

-- 为 friendships 表设置权限
GRANT SELECT, INSERT, UPDATE, DELETE ON friendships TO authenticated;
GRANT SELECT ON friendships TO anon;

-- 为 challenges 表设置权限
GRANT SELECT, INSERT, UPDATE, DELETE ON challenges TO authenticated;
GRANT SELECT ON challenges TO anon;

-- 为 challenge_participants 表设置权限
GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_participants TO authenticated;
GRANT SELECT ON challenge_participants TO anon;

-- 为 chat_messages 表设置权限
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
GRANT SELECT ON chat_messages TO anon;

-- 为 preset_messages 表设置权限（只读）
GRANT SELECT ON preset_messages TO authenticated;
GRANT SELECT ON preset_messages TO anon;

-- 为现有表添加缺失的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON children TO authenticated;
GRANT SELECT ON children TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON rules TO authenticated;
GRANT SELECT ON rules TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON behaviors TO authenticated;
GRANT SELECT ON behaviors TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON rewards TO authenticated;
GRANT SELECT ON rewards TO anon;