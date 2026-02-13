-- 1. Habilitar RLS na tabela profiles (caso não esteja)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remover policies antigas que podem estar causando conflito ou lentidão (loop infinito)
-- Se der erro dizendo que não existe, pode ignorar
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 3. Criar policies otimizadas e sem recursão

-- Qualquer usuário logado pode ver seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- O usuário pode atualizar seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- O Admin (identificado pelo email fixo no token) pode ver TODOS os perfis
-- Isso é ultra rápido e evita loops infinitos
CREATE POLICY "Admin can view all profiles" 
ON profiles FOR SELECT 
USING (auth.jwt() ->> 'email' = 'othonbrian@gmail.com');

-- O Admin pode atualizar qualquer perfil (banir, dar créditos)
CREATE POLICY "Admin can update all profiles" 
ON profiles FOR UPDATE 
USING (auth.jwt() ->> 'email' = 'othonbrian@gmail.com');
