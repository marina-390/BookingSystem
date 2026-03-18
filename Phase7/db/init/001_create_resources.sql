CREATE TABLE IF NOT EXISTS resources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  available BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_unit TEXT,

  -- Optional audit fields
  created_by_user_id BIGINT NULL,
  updated_by_user_id BIGINT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_resources_created_by_user
    FOREIGN KEY (created_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_resources_updated_by_user
    FOREIGN KEY (updated_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- Enforce unique names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS resources_name_unique_ci
ON resources (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_resources_created_by_user_id
ON resources (created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_resources_updated_by_user_id
ON resources (updated_by_user_id);

-- Insert sample resources
INSERT INTO resources (name, description, available, price, price_unit)
VALUES
  ('Meeting Room A', 'Small conference room with 10 seats', true, 50.00, 'per hour'),
  ('Projector', 'High-end projector for presentations', true, 100.00, 'per day'),
  ('Laptop', 'MacBook Pro for work', true, 25.00, 'per day'),
  ('Parking Spot', 'Premium parking spot near entrance', true, 15.00, 'per day'),
  ('Meeting Room B', 'Large conference room with 30 seats', true, 100.00, 'per hour')
ON CONFLICT DO NOTHING;