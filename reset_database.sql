-- 1. LIMPEZA TOTAL (CUIDADO: ISSO APAGA TOOS OS PERFIS EXISTENTES)
TRUNCATE TABLE public.profiles CASCADE;

-- 2. GARANTIR A ESTRUTURA DA TABELA
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  credits int DEFAULT 10,
  subscription_tier text DEFAULT 'free',
  has_lifetime_prompt boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. RESETAR RLS (Desativar e remover policies antigas conflitantes)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname); 
    END LOOP; 
END $$;

-- 4. TRIGGER AUTOMÁTICA (CRUCIAL PARA NOVOS USUÁRIOS)
-- Esta função cria automaticamente o perfil quando alguém se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, credits)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    10 -- Créditos padrão para novos usuários
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar a trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. HABILITAR E CONFIGURAR RLS (SEGURANÇA MODERNA)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5.1. Usuários podem ver e editar APENAS o próprio perfil
CREATE POLICY "User Access Own Profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id);

-- 5.2. O Admin (seu email) pode ver e editar TUDO
CREATE POLICY "Admin Access All"
ON public.profiles
FOR ALL
USING (auth.jwt() ->> 'email' = 'othonbrian@gmail.com');

-- 5.3. Service Role (Backend) tem acesso total
CREATE POLICY "Service Role Access"
ON public.profiles
FOR ALL
USING (auth.role() = 'service_role');
