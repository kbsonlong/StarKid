-- 修复RLS策略中的无限递归错误
-- 删除现有的有问题的策略并重新创建

-- 删除families表的现有策略
DROP POLICY IF EXISTS "Users can view families they created or are members of" ON families;
DROP POLICY IF EXISTS "Users can insert their own families" ON families;
DROP POLICY IF EXISTS "Family creators can update their families" ON families;
DROP POLICY IF EXISTS "Family creators can delete their families" ON families;

-- 删除family_members表的现有策略
DROP POLICY IF EXISTS "Users can view family members of families they belong to" ON family_members;
DROP POLICY IF EXISTS "Family creators can insert members" ON family_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON family_members;
DROP POLICY IF EXISTS "Family creators and members can update member info" ON family_members;
DROP POLICY IF EXISTS "Family creators can delete members" ON family_members;

-- 为families表创建新的RLS策略（避免循环引用）
-- 策略1：用户可以查看自己创建的家庭
CREATE POLICY "Users can view families they created" ON families
  FOR SELECT USING (auth.uid() = creator_id);

-- 策略2：用户可以通过邀请码查看家庭（用于加入家庭功能）
CREATE POLICY "Users can view families by invite code" ON families
  FOR SELECT USING (true); -- 允许所有认证用户查看，但在应用层控制

-- 策略3：用户可以插入自己创建的家庭
CREATE POLICY "Users can insert their own families" ON families
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 策略4：家庭创建者可以更新家庭信息
CREATE POLICY "Family creators can update their families" ON families
  FOR UPDATE USING (auth.uid() = creator_id);

-- 策略5：家庭创建者可以删除家庭
CREATE POLICY "Family creators can delete their families" ON families
  FOR DELETE USING (auth.uid() = creator_id);

-- 为family_members表创建新的RLS策略（避免循环引用）
-- 策略1：用户可以查看自己的成员记录
CREATE POLICY "Users can view their own membership" ON family_members
  FOR SELECT USING (auth.uid() = user_id);

-- 策略2：家庭创建者可以查看所有成员（通过直接检查families表）
CREATE POLICY "Family creators can view all members" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = family_members.family_id 
      AND families.creator_id = auth.uid()
    )
  );

-- 策略3：用户可以插入自己为成员
CREATE POLICY "Users can insert themselves as members" ON family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 策略4：家庭创建者可以插入成员
CREATE POLICY "Family creators can insert members" ON family_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = family_id 
      AND families.creator_id = auth.uid()
    )
  );

-- 策略5：用户可以更新自己的成员信息
CREATE POLICY "Users can update their own membership" ON family_members
  FOR UPDATE USING (auth.uid() = user_id);

-- 策略6：家庭创建者可以更新成员信息
CREATE POLICY "Family creators can update member info" ON family_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = family_id 
      AND families.creator_id = auth.uid()
    )
  );

-- 策略7：家庭创建者可以删除成员
CREATE POLICY "Family creators can delete members" ON family_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = family_id 
      AND families.creator_id = auth.uid()
    )
  );

-- 确保权限正确设置
GRANT SELECT, INSERT, UPDATE, DELETE ON families TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON family_members TO authenticated;

-- 为anon角色授予基本查询权限（用于邀请码查询）
GRANT SELECT ON families TO anon;
GRANT SELECT ON family_members TO anon;