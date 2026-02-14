-- POLICY DE EMERGÊNCIA: PERMITIR LEITURA PÚBLICA (DEBUG)
-- Isso vai confirma se é um problema de Permissão (RLS) ou se os dados não existem.

-- 1. Remover a policy restrita anterior para evitar conflito
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- 2. Criar uma policy aberta temporária
CREATE POLICY "Debug: Allow Read All"
ON profiles FOR SELECT
USING (true);

-- 3. Confirmar que o usuário tem permissão de uso no schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
