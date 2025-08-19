-- 修复children表RLS策略，允许家庭成员查看儿童信息
-- 同时更新rules、behaviors、rewards表的相关策略

-- 删除现有的children表RLS策略
DROP POLICY IF EXISTS "Users can view children in their family" ON children;
DROP POLICY IF EXISTS "Users can insert children in their family" ON children;
DROP POLICY IF EXISTS "Users can update children in their family" ON children;
DROP POLICY IF EXISTS "Users can delete children in their family" ON children;

-- 创建新的children表RLS策略，允许家庭成员查看
CREATE POLICY "Family members can view children" ON children
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can insert children" ON children
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can update children" ON children
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can delete children" ON children
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- 更新rules表RLS策略
DROP POLICY IF EXISTS "Users can view rules for their family children" ON rules;
DROP POLICY IF EXISTS "Users can insert rules for their family children" ON rules;
DROP POLICY IF EXISTS "Users can update rules for their family children" ON rules;
DROP POLICY IF EXISTS "Users can delete rules for their family children" ON rules;

CREATE POLICY "Family members can view rules" ON rules
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can insert rules" ON rules
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can update rules" ON rules
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can delete rules" ON rules
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- 更新behaviors表RLS策略
DROP POLICY IF EXISTS "Users can view behaviors for their family children" ON behaviors;
DROP POLICY IF EXISTS "Users can insert behaviors for their family children" ON behaviors;
DROP POLICY IF EXISTS "Users can update behaviors for their family children" ON behaviors;
DROP POLICY IF EXISTS "Users can delete behaviors for their family children" ON behaviors;

CREATE POLICY "Family members can view behaviors" ON behaviors
  FOR SELECT
  USING (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can insert behaviors" ON behaviors
  FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can update behaviors" ON behaviors
  FOR UPDATE
  USING (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can delete behaviors" ON behaviors
  FOR DELETE
  USING (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- 更新rewards表RLS策略
DROP POLICY IF EXISTS "Users can view rewards for their family children" ON rewards;
DROP POLICY IF EXISTS "Users can insert rewards for their family children" ON rewards;
DROP POLICY IF EXISTS "Users can update rewards for their family children" ON rewards;
DROP POLICY IF EXISTS "Users can delete rewards for their family children" ON rewards;

CREATE POLICY "Family members can view rewards" ON rewards
  FOR SELECT
  USING (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can insert rewards" ON rewards
  FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can update rewards" ON rewards
  FOR UPDATE
  USING (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family members can delete rewards" ON rewards
  FOR DELETE
  USING (
    child_id IN (
      SELECT id 
      FROM children 
      WHERE family_id IN (
        SELECT family_id 
        FROM family_members 
        WHERE user_id = auth.uid()
      )
    )
  );