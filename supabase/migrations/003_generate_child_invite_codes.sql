-- 为现有儿童生成邀请码
UPDATE children 
SET child_invite_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT), 1, 8))
WHERE child_invite_code IS NULL;

-- 确保所有新创建的儿童都有邀请码
CREATE OR REPLACE FUNCTION generate_child_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.child_invite_code IS NULL THEN
    NEW.child_invite_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，在插入新儿童时自动生成邀请码
DROP TRIGGER IF EXISTS trigger_generate_child_invite_code ON children;
CREATE TRIGGER trigger_generate_child_invite_code
  BEFORE INSERT ON children
  FOR EACH ROW
  EXECUTE FUNCTION generate_child_invite_code();