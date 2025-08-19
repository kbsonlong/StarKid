-- 创建behavior-images存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('behavior-images', 'behavior-images', true)
ON CONFLICT (id) DO NOTHING;

-- 创建存储策略：允许用户上传图片
CREATE POLICY "Users can upload behavior images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'behavior-images'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 创建存储策略：允许用户查看自己家庭的图片
CREATE POLICY "Users can view behavior images from their family" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'behavior-images'
        AND (
            -- 用户可以查看自己上传的图片
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- 或者查看同一家庭成员上传的图片
            EXISTS (
                SELECT 1 FROM family_members fm1
                JOIN family_members fm2 ON fm1.family_id = fm2.family_id
                WHERE fm1.user_id = auth.uid()
                AND fm2.user_id = ((storage.foldername(name))[1])::uuid
            )
        )
    );

-- 创建存储策略：允许用户删除自己上传的图片
CREATE POLICY "Users can delete their own behavior images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'behavior-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 创建存储策略：允许用户更新自己上传的图片
CREATE POLICY "Users can update their own behavior images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'behavior-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );