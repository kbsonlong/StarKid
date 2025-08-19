-- 添加邀请功能相关表和字段

-- 更新现有表结构
-- 为children表添加child_invite_code字段
ALTER TABLE children ADD COLUMN child_invite_code VARCHAR(8) UNIQUE;

-- 为rules表添加created_by和requires_approval字段
ALTER TABLE rules ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE rules ADD COLUMN requires_approval BOOLEAN DEFAULT false;

-- 为behaviors表添加记录者和验证相关字段
ALTER TABLE behaviors ADD COLUMN recorded_by UUID REFERENCES users(id);
ALTER TABLE behaviors ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE behaviors ADD COLUMN verified_by UUID REFERENCES users(id);

-- 为rewards表添加审批相关字段
ALTER TABLE rewards ADD COLUMN approved_by UUID REFERENCES users(id);
ALTER TABLE rewards ADD COLUMN approval_note TEXT;
-- status字段和约束已存在，跳过修改

-- families表的description字段已存在，跳过添加

-- 创建家庭成员表
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'observer')),
    permissions TEXT[], -- 权限数组
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- 创建好友关系表
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES children(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id, friend_id)
);

-- 创建挑战表
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES children(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(20) CHECK (type IN ('habit', 'task', 'competition')),
    duration_days INTEGER DEFAULT 7,
    points_reward INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建挑战参与者表
CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'quit')),
    progress INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(challenge_id, child_id)
);

-- 创建聊天消息表
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES children(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES children(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'preset')),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建预设消息表
CREATE TABLE preset_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    emoji VARCHAR(10)
);

-- 创建索引
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_friendships_child_id ON friendships(child_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_challenges_creator_id ON challenges(creator_id);
CREATE INDEX idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_child_id ON challenge_participants(child_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- 设置RLS策略
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 基础权限设置
GRANT SELECT ON family_members TO anon;
GRANT ALL PRIVILEGES ON family_members TO authenticated;
GRANT SELECT ON friendships TO anon;
GRANT ALL PRIVILEGES ON friendships TO authenticated;
GRANT SELECT ON challenges TO anon;
GRANT ALL PRIVILEGES ON challenges TO authenticated;
GRANT SELECT ON challenge_participants TO anon;
GRANT ALL PRIVILEGES ON challenge_participants TO authenticated;
GRANT SELECT ON chat_messages TO anon;
GRANT ALL PRIVILEGES ON chat_messages TO authenticated;
GRANT SELECT ON preset_messages TO anon;
GRANT ALL PRIVILEGES ON preset_messages TO authenticated;

-- 创建RLS策略
-- 家庭成员表策略
CREATE POLICY "Users can view family members in their families" ON family_members
    FOR SELECT USING (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        ) OR user_id = auth.uid()
    );

CREATE POLICY "Users can insert family members in their families" ON family_members
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can update family members in their families" ON family_members
    FOR UPDATE USING (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

-- 好友关系表策略
CREATE POLICY "Users can view friendships of children in their families" ON friendships
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        ) OR friend_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert friendships for children in their families" ON friendships
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update friendships of children in their families" ON friendships
    FOR UPDATE USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

-- 挑战表策略
CREATE POLICY "Users can view challenges created by children in their families" ON challenges
    FOR SELECT USING (
        creator_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert challenges for children in their families" ON challenges
    FOR INSERT WITH CHECK (
        creator_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

-- 挑战参与者表策略
CREATE POLICY "Users can view challenge participants for children in their families" ON challenge_participants
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert challenge participants for children in their families" ON challenge_participants
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

-- 聊天消息表策略
CREATE POLICY "Users can view chat messages of children in their families" ON chat_messages
    FOR SELECT USING (
        sender_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        ) OR receiver_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert chat messages for children in their families" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM family_members WHERE user_id = auth.uid()
            )
        )
    );

-- 插入预设消息数据
INSERT INTO preset_messages (category, content, emoji) VALUES
('encouragement', '你真棒！', '👍'),
('encouragement', '加油！', '💪'),
('encouragement', '继续努力！', '🌟'),
('greeting', '你好！', '👋'),
('greeting', '早上好！', '🌅'),
('greeting', '晚安！', '🌙'),
('celebration', '恭喜你！', '🎉'),
('celebration', '太厉害了！', '🏆'),
('support', '我支持你！', '🤗'),
('support', '我们一起加油！', '👫');

-- 插入挑战模板数据
INSERT INTO challenges (creator_id, title, description, type, duration_days, points_reward) VALUES
(NULL, '早起挑战', '连续7天早上7点前起床', 'habit', 7, 50),
(NULL, '阅读马拉松', '每天阅读30分钟，坚持一周', 'habit', 7, 70),
(NULL, '家务小能手', '每天完成一项家务，持续一周', 'task', 7, 60),
(NULL, '运动达人', '每天运动30分钟，坚持一周', 'habit', 7, 80);