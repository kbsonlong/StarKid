-- 创建用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'parent' CHECK (role IN ('parent', 'child')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建家庭表
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建儿童表
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    birth_date DATE,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建规则表
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('reward', 'punishment')),
    category VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    points INTEGER NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建行为记录表
CREATE TABLE behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
    points_change INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建奖励兑换表
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    points_cost INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_behaviors_child_id ON behaviors(child_id);
CREATE INDEX idx_behaviors_created_at ON behaviors(created_at DESC);
CREATE INDEX idx_rules_family_id ON rules(family_id);
CREATE INDEX idx_children_family_id ON children(family_id);

-- 设置RLS策略
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- 基础权限设置
GRANT SELECT ON families TO anon;
GRANT ALL PRIVILEGES ON families TO authenticated;
GRANT ALL PRIVILEGES ON children TO authenticated;
GRANT ALL PRIVILEGES ON rules TO authenticated;
GRANT ALL PRIVILEGES ON behaviors TO authenticated;
GRANT ALL PRIVILEGES ON rewards TO authenticated;

-- 创建RLS策略
-- 家庭表策略
CREATE POLICY "Users can view families they belong to" ON families
    FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "Users can insert their own families" ON families
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own families" ON families
    FOR UPDATE USING (creator_id = auth.uid());

-- 儿童表策略
CREATE POLICY "Users can view children in their families" ON children
    FOR SELECT USING (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert children in their families" ON children
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can update children in their families" ON children
    FOR UPDATE USING (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

-- 规则表策略
CREATE POLICY "Users can view rules in their families" ON rules
    FOR SELECT USING (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert rules in their families" ON rules
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can update rules in their families" ON rules
    FOR UPDATE USING (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete rules in their families" ON rules
    FOR DELETE USING (
        family_id IN (
            SELECT id FROM families WHERE creator_id = auth.uid()
        )
    );

-- 行为记录表策略
CREATE POLICY "Users can view behaviors of children in their families" ON behaviors
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT id FROM families WHERE creator_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert behaviors for children in their families" ON behaviors
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT id FROM families WHERE creator_id = auth.uid()
            )
        )
    );

-- 奖励兑换表策略
CREATE POLICY "Users can view rewards of children in their families" ON rewards
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT id FROM families WHERE creator_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert rewards for children in their families" ON rewards
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT id FROM families WHERE creator_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update rewards of children in their families" ON rewards
    FOR UPDATE USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT id FROM families WHERE creator_id = auth.uid()
            )
        )
    );