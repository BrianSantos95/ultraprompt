-- 1. Verificar se o perfil do admin existe (Substitua o email se necessário)
SELECT * FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'othonbrian@gmail.com');

-- 2. Verificar se a trigger de criação de usuário existe
SELECT event_object_table, trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users' OR event_object_table = 'profiles';

-- 3. Habilitar RLS novamente para garantir
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Política de Debug Temporária (apenas para testar se é RLS)
-- Se isso funcionar, o problema é nas policies anteriores.
-- DROP POLICY IF EXISTS "Debug Read All" ON profiles;
-- CREATE POLICY "Debug Read All" ON profiles FOR SELECT USING (true);
