-- 社区功能相关表

-- 挑战表
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) CHECK (type IN ('individual', 'group')) DEFAULT 'individual',
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  points_reward INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 挑战参与者表
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('joined', 'completed', 'failed')) DEFAULT 'joined',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, child_id)
);

-- 好友关系表
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES children(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES children(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES children(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES children(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'preset', 'emoji')) DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (sender_id != receiver_id)
);

-- 预设消息模板表
CREATE TABLE IF NOT EXISTS preset_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('greeting', 'encouragement', 'celebration', 'question')) DEFAULT 'greeting',
  emoji VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 家长监督日志表
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

-- 插入示例挑战
INSERT INTO challenges (title, description, type, difficulty, points_reward, end_date) VALUES
('每日阅读挑战', '连续7天每天阅读30分钟', 'individual', 'easy', 50, NOW() + INTERVAL '30 days'),
('家务小帮手', '本周帮助家长完成5项家务', 'individual', 'medium', 80, NOW() + INTERVAL '7 days'),
('团队合作挑战', '与朋友一起完成拼图游戏', 'group', 'hard', 120, NOW() + INTERVAL '14 days'),
('运动达人', '每天运动30分钟，坚持一周', 'individual', 'medium', 70, NOW() + INTERVAL '7 days'),
('创意绘画', '创作一幅关于家庭的画作', 'individual', 'easy', 40, NOW() + INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- 启用RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_logs ENABLE ROW LEVEL SECURITY;

-- 挑战表RLS策略
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

-- 授予权限
GRANT ALL PRIVILEGES ON challenges TO authenticated;
GRANT ALL PRIVILEGES ON challenge_participants TO authenticated;
GRANT ALL PRIVILEGES ON friendships TO authenticated;
GRANT ALL PRIVILEGES ON chat_messages TO authenticated;
GRANT SELECT ON preset_messages TO authenticated;
GRANT ALL PRIVILEGES ON supervision_logs TO authenticated;

GRANT SELECT ON challenges TO anon;
GRANT SELECT ON preset_messages TO anon;

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
CREATE TRIGGER trigger_log_chat_supervision
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION log_supervision_activity();

CREATE TRIGGER trigger_log_challenge_supervision
  AFTER INSERT OR UPDATE ON challenge_participants
  FOR EACH ROW EXECUTE FUNCTION log_supervision_activity();

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

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();