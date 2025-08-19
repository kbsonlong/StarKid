-- 修复数据库结构问题
-- 1. 将behaviors表的note列重命名为notes
-- 2. 为rewards表添加family_id列
-- 3. 更新相关的RLS策略

-- 重命名behaviors表的note列为notes
ALTER TABLE behaviors RENAME COLUMN note TO notes;

-- 为rewards表添加family_id列
ALTER TABLE rewards ADD COLUMN family_id UUID;

-- 添加外键约束
ALTER TABLE rewards ADD CONSTRAINT fk_rewards_family_id 
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

-- 创建索引以提高查询性能
CREATE INDEX idx_rewards_family_id ON rewards(family_id);

-- 更新rewards表的RLS策略以支持family_id字段
-- 删除现有策略
DROP POLICY IF EXISTS "Family members can view rewards" ON rewards;
DROP POLICY IF EXISTS "Family members can insert rewards" ON rewards;
DROP POLICY IF EXISTS "Family members can update rewards" ON rewards;
DROP POLICY IF EXISTS "Family members can delete rewards" ON rewards;

-- 创建新的RLS策略
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
    OR family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
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
    AND family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
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
    OR family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
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
    OR family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- 为现有的rewards记录填充family_id
-- 通过child_id关联到children表获取family_id
UPDATE rewards 
SET family_id = (
  SELECT family_id 
  FROM children 
  WHERE children.id = rewards.child_id
)
WHERE family_id IS NULL;

-- 设置family_id为NOT NULL（在填充数据后）
ALTER TABLE rewards ALTER COLUMN family_id SET NOT NULL;