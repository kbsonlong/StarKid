-- 添加行为图片表
CREATE TABLE behavior_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    behavior_id UUID NOT NULL REFERENCES behaviors(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为behaviors表添加has_image字段
ALTER TABLE behaviors ADD COLUMN has_image BOOLEAN DEFAULT FALSE;

-- 添加家庭成员加入申请表
CREATE TABLE join_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    UNIQUE(family_id, user_id)
);

-- 创建索引
CREATE INDEX idx_behavior_images_behavior_id ON behavior_images(behavior_id);
CREATE INDEX idx_behavior_images_uploaded_by ON behavior_images(uploaded_by);
CREATE INDEX idx_join_requests_family_id ON join_requests(family_id);
CREATE INDEX idx_join_requests_user_id ON join_requests(user_id);
CREATE INDEX idx_join_requests_status ON join_requests(status);
CREATE INDEX idx_join_requests_invite_code ON join_requests(invite_code);

-- 创建触发器函数来自动更新behaviors表的has_image字段
CREATE OR REPLACE FUNCTION update_behavior_has_image()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE behaviors 
        SET has_image = TRUE, updated_at = NOW()
        WHERE id = NEW.behavior_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE behaviors 
        SET has_image = EXISTS(
            SELECT 1 FROM behavior_images 
            WHERE behavior_id = OLD.behavior_id
        ), updated_at = NOW()
        WHERE id = OLD.behavior_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_behavior_has_image
    AFTER INSERT OR DELETE ON behavior_images
    FOR EACH ROW
    EXECUTE FUNCTION update_behavior_has_image();

-- 启用行级安全策略
ALTER TABLE behavior_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- behavior_images表的RLS策略
CREATE POLICY "Users can view behavior images from their family" ON behavior_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM behaviors b
            JOIN children c ON b.child_id = c.id
            JOIN family_members fm ON c.family_id = fm.family_id
            WHERE b.id = behavior_images.behavior_id
            AND fm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert behavior images for their family children" ON behavior_images
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM behaviors b
            JOIN children c ON b.child_id = c.id
            JOIN family_members fm ON c.family_id = fm.family_id
            WHERE b.id = behavior_images.behavior_id
            AND fm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own behavior images" ON behavior_images
    FOR DELETE USING (uploaded_by = auth.uid());

-- join_requests表的RLS策略
CREATE POLICY "Users can view their own join requests" ON join_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Family admins can view join requests for their family" ON join_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM family_members fm
            WHERE fm.family_id = join_requests.family_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'admin'
        )
    );

CREATE POLICY "Users can insert their own join requests" ON join_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Family admins can update join requests for their family" ON join_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM family_members fm
            WHERE fm.family_id = join_requests.family_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'admin'
        )
    );

-- 授予权限
GRANT ALL PRIVILEGES ON behavior_images TO authenticated;
GRANT ALL PRIVILEGES ON join_requests TO authenticated;
GRANT SELECT ON behavior_images TO anon;
GRANT SELECT ON join_requests TO anon;