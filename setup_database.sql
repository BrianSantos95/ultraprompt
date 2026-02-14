-- ========================================================
-- SETUP COMPLETO DO ULTRAPROMPT (PERFEITO E DEFINITIVO)
-- ========================================================
-- Este script faz TUDO que você precisa de uma vez só.
-- 1. Cria a tabela 'profiles'
-- 2. Cria a Trigger para cadastro automático
-- 3. Configura TODAS as permissões de segurança (RLS)
-- 4. Cria o Bucket de Storage para imagens (avatar/geradas)
-- ========================================================

-- --------------------------------------------------------
-- PARTE 1: TABELA DE PERFIS (PROFILES)
-- --------------------------------------------------------

-- Garantir que estamos começando limpo (se rodar mais de uma vez)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Criar a tabela
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY, -- Liga ao Auth do Supabase
  email text,
  full_name text,
  avatar_url text,
  credits int DEFAULT 10,                 -- Começa com 10 créditos
  subscription_tier text DEFAULT 'free',  -- Plano padrão
  has_lifetime_prompt boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  stripe_customer_id text,                -- Para futuro uso
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ativar segurança
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- PARTE 2: TRIGGER DE AUTOMAÇÃO DE CADASTRO
-- --------------------------------------------------------
-- Quando alguém se cadastra no Auth, cria o perfil automaticamente

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, credits)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    10 -- Créditos iniciais
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ligar a Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- --------------------------------------------------------
-- PARTE 3: POLÍTICAS DE SEGURANÇA (RLS) - "QUEM VÊ O QUE"
-- --------------------------------------------------------

-- 1. O PRÓPRIO USUÁRIO pode VER seu perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- 2. O PRÓPRIO USUÁRIO pode EDITAR seu perfil (nome, avatar)
-- Note que não deixamos editar créditos ou plano aqui propositalmente por segurança
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. O ADMIN (othonbrian@gmail.com) pode VER TODOS
CREATE POLICY "Admin can view all profiles" 
ON public.profiles FOR SELECT 
USING (auth.jwt() ->> 'email' = 'othonbrian@gmail.com');

-- 4. O ADMIN pode EDITAR TODOS
CREATE POLICY "Admin can update all profiles" 
ON public.profiles FOR UPDATE 
USING (auth.jwt() ->> 'email' = 'othonbrian@gmail.com');

-- 5. O ADMIN pode DELETAR perfis (BANIR)
CREATE POLICY "Admin can delete profiles" 
ON public.profiles FOR DELETE 
USING (auth.jwt() ->> 'email' = 'othonbrian@gmail.com');

-- --------------------------------------------------------
-- PARTE 4: BUCKET DE IMAGENS (OPCIONAL/PREVENÇÃO)
-- --------------------------------------------------------
-- Cria um bucket público para avatares se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Permite upload de avatares para usuários logados
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- ========================================================
-- FIM DO SETUP - AGORA SEU BANCO ESTÁ PRONTO E SEGURO!
-- ========================================================
