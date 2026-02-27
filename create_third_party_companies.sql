CREATE TABLE third_party_companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  cnpj text,
  contact_name text,
  phone text,
  email text,
  specialty text,
  status text DEFAULT 'Ativo'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE third_party_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON third_party_companies
  FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins" ON third_party_companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'admin_root')
    )
  );

CREATE POLICY "Enable insert access for authenticated users" ON third_party_companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  
CREATE POLICY "Enable update access for authenticated users" ON third_party_companies
  FOR UPDATE USING (auth.role() = 'authenticated');
