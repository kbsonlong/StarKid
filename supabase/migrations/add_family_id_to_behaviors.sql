-- Add family_id column to behaviors table
ALTER TABLE behaviors ADD COLUMN family_id UUID;

-- Add foreign key constraint to families table
ALTER TABLE behaviors ADD CONSTRAINT fk_behaviors_family_id 
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;