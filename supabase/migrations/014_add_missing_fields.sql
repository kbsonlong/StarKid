-- 为rewards表添加缺失的is_active字段
ALTER TABLE rewards ADD COLUMN is_active BOOLEAN DEFAULT true;

-- 为现有记录设置默认值
UPDATE rewards SET is_active = true WHERE is_active IS NULL;

-- 添加索引以提高查询性能
CREATE INDEX idx_rewards_is_active ON rewards(is_active);

-- 更新RLS策略以包含is_active字段
DROP POLICY IF EXISTS "Users can view rewards for their family" ON rewards;
CREATE POLICY "Users can view rewards for their family" ON rewards
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage rewards for their family" ON rewards;
CREATE POLICY "Users can manage rewards for their family" ON rewards
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );