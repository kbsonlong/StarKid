-- 更新社区功能表结构

-- 为challenges表添加缺失的列
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 先删除现有约束
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_type_check;

-- 更新现有数据的type字段值
UPDATE challenges SET type = 'individual' WHERE type IN ('habit', 'task');
UPDATE challenges SET type = 'group' WHERE type = 'competition';

-- 重新添加约束
ALTER TABLE challenges ADD CONSTRAINT challenges_type_check 
CHECK (type IN ('individual', 'group'));

-- 先删除现有约束
ALTER TABLE challenge_participants DROP CONSTRAINT IF EXISTS challenge_participants_status_check;

-- 更新现有数据的status字段值
UPDATE challenge_participants SET status = 'joined' WHERE status = 'active';
UPDATE challenge_participants SET status = 'failed' WHERE status = 'quit';

-- 重新添加约束
ALTER TABLE challenge_participants ADD CONSTRAINT challenge_participants_status_check 
CHECK (status IN ('joined', 'completed', 'failed'));

-- 为challenge_participants表添加缺失的列
ALTER TABLE challenge_participants 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 重命名challenge_participants表的joined_at列为created_at
ALTER TABLE challenge_participants 
RENAME COLUMN joined_at TO created_at;

-- 先删除friendships表的现有RLS策略
DROP POLICY IF EXISTS "Users can view friendships of children in their families" ON friendships;
DROP POLICY IF EXISTS "Users can insert friendships for children in their families" ON friendships;
DROP POLICY IF EXISTS "Users can update friendships of children in their families" ON friendships;

-- 更新friendships表结构
ALTER TABLE friendships 
DROP COLUMN IF EXISTS child_id CASCADE,
DROP COLUMN IF EXISTS friend_id CASCADE,
ADD COLUMN IF NOT EXISTS requester_id UUID,
ADD COLUMN IF NOT EXISTS addressee_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 添加外键约束
ALTER TABLE friendships 
ADD CONSTRAINT friendships_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES children(id) ON DELETE CASCADE,
ADD CONSTRAINT friendships_addressee_id_fkey 
FOREIGN KEY (addressee_id) REFERENCES children(id) ON DELETE CASCADE;

-- 先删除现有约束
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_status_check;

-- 更新现有数据的status字段值
UPDATE friendships SET status = 'accepted' WHERE status = 'approved';
UPDATE friendships SET status = 'declined' WHERE status = 'blocked';

-- 重新添加约束
ALTER TABLE friendships ADD CONSTRAINT friendships_status_check 
CHECK (status IN ('pending', 'accepted', 'declined'));

-- 添加唯一约束
ALTER TABLE friendships 
ADD CONSTRAINT friendships_unique_pair 
UNIQUE (requester_id, addressee_id);

-- 添加检查约束
ALTER TABLE friendships 
ADD CONSTRAINT friendships_no_self_friend 
CHECK (requester_id != addressee_id);

-- 更新chat_messages表结构
ALTER TABLE chat_messages 
RENAME COLUMN content TO message;

ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

ALTER TABLE chat_messages DROP COLUMN IF EXISTS is_approved;

-- 更新chat_messages表的message_type字段约束
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('text', 'preset', 'emoji'));

-- 添加检查约束
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_no_self_message 
CHECK (sender_id != receiver_id);

-- 更新preset_messages表结构
ALTER TABLE preset_messages 
RENAME COLUMN content TO message;

ALTER TABLE preset_messages 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) CHECK (category IN ('greeting', 'encouragement', 'celebration', 'question')) DEFAULT 'greeting',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 启用preset_messages表的RLS
ALTER TABLE preset_messages ENABLE ROW LEVEL SECURITY;

-- 创建supervision_logs表
CREATE TABLE IF NOT EXISTS supervision_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'chat', 'challenge', 'friendship'
  activity_id UUID, -- 对应活动的ID
  details JSONB,
  flagged BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_child ON challenge_participants(child_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_supervision_logs_child ON supervision_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_supervision_logs_flagged ON supervision_logs(flagged);

-- 删除现有的RLS策略
DROP POLICY IF EXISTS "Anyone can view active challenges" ON challenges;
DROP POLICY IF EXISTS "Authenticated users can create challenges" ON challenges;
DROP POLICY IF EXISTS "Challenge creators can update their challenges" ON challenges;

-- 重新创建挑战表RLS策略
CREATE POLICY "Anyone can view active challenges" ON challenges
  FOR SELECT USING (is_active = true AND (end_date IS NULL OR end_date > NOW()));

CREATE POLICY "Authenticated users can create challenges" ON challenges
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Challenge creators can update their challenges" ON challenges
  FOR UPDATE USING (created_by = auth.uid());

-- 挑战参与者表RLS策略
CREATE POLICY "Users can view participants of challenges they participate in" ON challenge_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE c.id = child_id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can add their children to challenges" ON challenge_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE c.id = child_id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can update their children's progress" ON challenge_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE c.id = child_id AND fm.user_id = auth.uid()
    )
  );

-- 好友关系表RLS策略
CREATE POLICY "Children can view their friendships" ON friendships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE (c.id = requester_id OR c.id = addressee_id) AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage their children's friendships" ON friendships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE (c.id = requester_id OR c.id = addressee_id) AND fm.user_id = auth.uid()
    )
  );

-- 聊天消息表RLS策略
CREATE POLICY "Children can view their chat messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE (c.id = sender_id OR c.id = receiver_id) AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can send messages for their children" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE c.id = sender_id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can update their children's messages" ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE (c.id = sender_id OR c.id = receiver_id) AND fm.user_id = auth.uid()
    )
  );

-- 预设消息表RLS策略
CREATE POLICY "Anyone can view active preset messages" ON preset_messages
  FOR SELECT USING (is_active = true);

-- 监督日志表RLS策略
CREATE POLICY "Family members can view supervision logs for their children" ON supervision_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE c.id = child_id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert supervision logs" ON supervision_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Family members can update supervision logs for their children" ON supervision_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM children c 
      JOIN family_members fm ON c.family_id = fm.family_id 
      WHERE c.id = child_id AND fm.user_id = auth.uid()
    )
  );

-- 启用supervision_logs表的RLS
ALTER TABLE supervision_logs ENABLE ROW LEVEL SECURITY;

-- 授予权限
GRANT ALL PRIVILEGES ON challenges TO authenticated;
GRANT ALL PRIVILEGES ON challenge_participants TO authenticated;
GRANT ALL PRIVILEGES ON friendships TO authenticated;
GRANT ALL PRIVILEGES ON chat_messages TO authenticated;
GRANT SELECT ON preset_messages TO authenticated;
GRANT ALL PRIVILEGES ON supervision_logs TO authenticated;

GRANT SELECT ON challenges TO anon;
GRANT SELECT ON preset_messages TO anon;

-- 插入预设消息模板
INSERT INTO preset_messages (message, category, emoji) VALUES
('你好！', 'greeting', '👋'),
('做得很棒！', 'encouragement', '👏'),
('恭喜你！', 'celebration', '🎉'),
('你今天学了什么？', 'question', '📚'),
('一起加油！', 'encouragement', '💪'),
('太厉害了！', 'celebration', '⭐'),
('你最喜欢什么？', 'question', '❤️'),
('晚安！', 'greeting', '🌙'),
('早上好！', 'greeting', '☀️'),
('继续努力！', 'encouragement', '🚀'),
('真棒！', 'celebration', '🏆'),
('你在做什么？', 'question', '🤔')
ON CONFLICT DO NOTHING;

-- 删除现有的示例挑战数据（如果存在）
DELETE FROM challenges WHERE title IN ('每日阅读挑战', '家务小帮手', '团队合作挑战', '运动达人', '创意绘画');

-- 插入示例挑战
INSERT INTO challenges (title, description, type, difficulty, points_reward, end_date, is_active) VALUES
('每日阅读挑战', '连续7天每天阅读30分钟', 'individual', 'easy', 50, NOW() + INTERVAL '30 days', true),
('家务小帮手', '本周帮助家长完成5项家务', 'individual', 'medium', 80, NOW() + INTERVAL '7 days', true),
('团队合作挑战', '与朋友一起完成拼图游戏', 'group', 'hard', 120, NOW() + INTERVAL '14 days', true),
('运动达人', '每天运动30分钟，坚持一周', 'individual', 'medium', 70, NOW() + INTERVAL '7 days', true),
('创意绘画', '创作一幅关于家庭的画作', 'individual', 'easy', 40, NOW() + INTERVAL '14 days', true);

-- 创建触发器函数来自动记录监督日志
CREATE OR REPLACE FUNCTION log_supervision_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- 记录聊天消息
  IF TG_TABLE_NAME = 'chat_messages' THEN
    INSERT INTO supervision_logs (child_id, activity_type, activity_id, details)
    VALUES (
      NEW.sender_id,
      'chat',
      NEW.id,
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'message_type', NEW.message_type,
        'message_length', length(NEW.message)
      )
    );
  END IF;
  
  -- 记录挑战参与
  IF TG_TABLE_NAME = 'challenge_participants' THEN
    INSERT INTO supervision_logs (child_id, activity_type, activity_id, details)
    VALUES (
      NEW.child_id,
      'challenge',
      NEW.challenge_id,
      jsonb_build_object(
        'status', NEW.status,
        'progress', NEW.progress
      )
    );
  END IF;
  
  -- 记录好友关系
  IF TG_TABLE_NAME = 'friendships' THEN
    INSERT INTO supervision_logs (child_id, activity_type, activity_id, details)
    VALUES (
      NEW.requester_id,
      'friendship',
      NEW.id,
      jsonb_build_object(
        'addressee_id', NEW.addressee_id,
        'status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_log_chat_supervision ON chat_messages;
CREATE TRIGGER trigger_log_chat_supervision
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION log_supervision_activity();

DROP TRIGGER IF EXISTS trigger_log_challenge_supervision ON challenge_participants;
CREATE TRIGGER trigger_log_challenge_supervision
  AFTER INSERT OR UPDATE ON challenge_participants
  FOR EACH ROW EXECUTE FUNCTION log_supervision_activity();

DROP TRIGGER IF EXISTS trigger_log_friendship_supervision ON friendships;
CREATE TRIGGER trigger_log_friendship_supervision
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION log_supervision_activity();

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_challenges_updated_at ON challenges;
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();