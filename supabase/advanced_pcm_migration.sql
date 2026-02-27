-- Add Advanced PCM Fields to work_orders
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS maintenance_type VARCHAR(50) DEFAULT 'Corretiva',
ADD COLUMN IF NOT EXISTS response_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS parts_cost NUMERIC DEFAULT 0;

-- Optional: You could update existing records if you wanted default values 
-- UPDATE work_orders SET maintenance_type = 'Corretiva' WHERE maintenance_type IS NULL;
-- UPDATE work_orders SET response_hours = 0 WHERE response_hours IS NULL;
-- UPDATE work_orders SET estimated_hours = 1 WHERE estimated_hours IS NULL AND priority = 'Alta';
-- UPDATE work_orders SET parts_cost = 0 WHERE parts_cost IS NULL;
