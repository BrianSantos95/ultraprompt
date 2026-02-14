-- 1. Habilitar RLS na tabela profiles (garantia)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Limpar todas as policies antigas para evitar conflitos (Singular e Plural para garantir)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Drops para Admin (cobrindo variações de nomes antigos)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

-- Outros drops de limpeza
DROP POLICY IF EXISTS "Service role can do everything" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- 3. Criar Policy: Usuário vê seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- 4. Criar Policy: Usuário atualiza seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 5. Criar Policy: Usuário pode criar seu perfil (caso não exista)
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 6. Criar Policy: Admin (othonbrian@gmail.com) vê TODOS os perfis
CREATE POLICY "Admin can view all profiles" 
ON profiles FOR SELECT 
USING (auth.jwt() ->> 'email' = 'othonbrian@gmail.com');

-- 7. Criar Policy: Admin edita TODOS os perfis (dar créditos, banir, etc)
CREATE POLICY "Admin can update all profiles" 
ON profiles FOR UPDATE 
USING (auth.jwt() ->> 'email' = 'othonbrian@gmail.com');

-- 8. Garantir permissões básicas
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
