-- 为社区功能表授予权限

-- 授予anon角色基本读取权限
GRANT SELECT ON challenges TO anon;
GRANT SELECT ON challenge_participants TO anon;
GRANT SELECT ON friendships TO anon;
GRANT SELECT ON chat_messages TO anon;
GRANT SELECT ON preset_messages TO anon;
GRANT SELECT ON supervision_logs TO anon;

-- 授予authenticated角色完整权限
GRANT ALL PRIVILEGES ON challenges TO authenticated;
GRANT ALL PRIVILEGES ON challenge_participants TO authenticated;
GRANT ALL PRIVILEGES ON friendships TO authenticated;
GRANT ALL PRIVILEGES ON chat_messages TO authenticated;
GRANT ALL PRIVILEGES ON preset_messages TO authenticated;
GRANT ALL PRIVILEGES ON supervision_logs TO authenticated;

-- 检查权限授予情况
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('challenges', 'challenge_participants', 'friendships', 'chat_messages', 'preset_messages', 'supervision_logs')
ORDER BY table_name, grantee;