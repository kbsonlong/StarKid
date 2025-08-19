-- 为families表设置RLS策略
DROP POLICY IF EXISTS "Users can view families they created or are members of" ON families;
CREATE POLICY "Users can view families they created or are members of" ON families
  FOR SELECT USING (
    auth.uid() = creator_id OR 
    auth.uid() IN (
      SELECT user_id FROM family_members WHERE family_id = families.id
    )
  );

DROP POLICY IF EXISTS "Users can insert their own families" ON families;
CREATE POLICY "Users can insert their own families" ON families
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Family creators can update their families" ON families;
CREATE POLICY "Family creators can update their families" ON families
  FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Family creators can delete their families" ON families;
CREATE POLICY "Family creators can delete their families" ON families
  FOR DELETE USING (auth.uid() = creator_id);

-- 为family_members表设置RLS策略
DROP POLICY IF EXISTS "Users can view family members of families they belong to" ON family_members;
CREATE POLICY "Users can view family members of families they belong to" ON family_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT creator_id FROM families WHERE id = family_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM family_members fm WHERE fm.family_id = family_members.family_id
    )
  );

DROP POLICY IF EXISTS "Family creators can insert members" ON family_members;
CREATE POLICY "Family creators can insert members" ON family_members
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT creator_id FROM families WHERE id = family_id
    )
  );

DROP POLICY IF EXISTS "Users can insert themselves as members" ON family_members;
CREATE POLICY "Users can insert themselves as members" ON family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Family creators and members can update member info" ON family_members;
CREATE POLICY "Family creators and members can update member info" ON family_members
  FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT creator_id FROM families WHERE id = family_id
    )
  );

DROP POLICY IF EXISTS "Family creators can delete members" ON family_members;
CREATE POLICY "Family creators can delete members" ON family_members
  FOR DELETE USING (
    auth.uid() IN (
      SELECT creator_id FROM families WHERE id = family_id
    )
  );

-- 为users表启用RLS并设置策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 授予anon和authenticated角色基本权限
GRANT SELECT, INSERT, UPDATE, DELETE ON families TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON family_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;

-- 为anon角色授予基本查询权限（用于邀请码查询）
GRANT SELECT ON families TO anon;
GRANT SELECT ON users TO anon;