-- Script de Reparação Automática do Perfil Admin
-- Este script vai procurar seu usuário na tabela de autenticação e forçar a criação/atualização do perfil.

DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- 1. Buscar o ID do usuário pelo email
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'othonbrian@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- 2. Inserir ou Atualizar o perfil
        INSERT INTO public.profiles (id, email, credits, subscription_tier, has_lifetime_prompt, full_name)
        VALUES (
            target_user_id, 
            'othonbrian@gmail.com', 
            100,             -- Definindo 100 créditos
            'Ultra Max',     -- Definindo plano máximo
            true,            -- Com acesso vitalício
            'Admin Othon'    -- Nome padrão
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            credits = 100,
            subscription_tier = 'Ultra Max',
            has_lifetime_prompt = true,
            email = 'othonbrian@gmail.com';
            
        RAISE NOTICE 'Perfil do Admin (othonbrian@gmail.com) reparado com sucesso!';
    ELSE
        RAISE NOTICE 'Usuário othonbrian@gmail.com não encontrado na tabela auth.users. Verifique se o email está correto.';
    END IF;
END $$;
