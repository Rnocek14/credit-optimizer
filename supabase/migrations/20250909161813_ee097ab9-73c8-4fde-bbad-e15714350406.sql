-- Enable RLS on remaining tables and add policies
ALTER TABLE block_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;  
ALTER TABLE partner_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alt_credit_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Add public read policies for all new tables
CREATE POLICY "Public read access to block_outcomes" ON block_outcomes FOR SELECT USING (true);
CREATE POLICY "Public read access to program_outcomes" ON program_outcomes FOR SELECT USING (true);
CREATE POLICY "Public read access to partner_rules" ON partner_rules FOR SELECT USING (true);
CREATE POLICY "Public read access to alt_credit_options" ON alt_credit_options FOR SELECT USING (true);
CREATE POLICY "Public read access to entry_roles" ON entry_roles FOR SELECT USING (true);
CREATE POLICY "Public read access to role_requirements" ON role_requirements FOR SELECT USING (true);
CREATE POLICY "Public read access to portfolio_projects" ON portfolio_projects FOR SELECT USING (true);

-- Add service role management policies
CREATE POLICY "Service role can manage block_outcomes" ON block_outcomes FOR ALL USING (true);
CREATE POLICY "Service role can manage program_outcomes" ON program_outcomes FOR ALL USING (true);
CREATE POLICY "Service role can manage partner_rules" ON partner_rules FOR ALL USING (true);
CREATE POLICY "Service role can manage alt_credit_options" ON alt_credit_options FOR ALL USING (true);
CREATE POLICY "Service role can manage entry_roles" ON entry_roles FOR ALL USING (true);
CREATE POLICY "Service role can manage role_requirements" ON role_requirements FOR ALL USING (true);
CREATE POLICY "Service role can manage portfolio_projects" ON portfolio_projects FOR ALL USING (true);