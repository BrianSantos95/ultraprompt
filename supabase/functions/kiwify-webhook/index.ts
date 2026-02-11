import { createClient } from "@supabase/supabase-js";

// Polyfill para garantir que o editor não reclame do "Deno"
declare const Deno: {
    env: { get(key: string): string | undefined };
    serve(handler: (req: Request) => Promise<Response> | Response): void;
};

// Definição de Tipos para o Payload do Kiwify (Parcial)
interface KiwifyPayload {
    order_status: string;
    product_id: string;
    customer: {
        email: string;
        [key: string]: any;
    };
    plan?: {
        name: string;
        [key: string]: any;
    };
    [key: string]: any;
}

// Definição de Tipos para a Tabela Profiles
interface ProfileUpdate {
    has_lifetime_prompt?: boolean;
    subscription_tier?: "Ultra Start" | "Ultra Pro" | "Ultra Max" | null;
    credits?: number;
}

// Inicialização com Fallback para evitar erros de tipagem no editor
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase Environment Variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
    try {
        const url = new URL(req.url);
        const signature = url.searchParams.get("signature");

        // SEGURANÇA: Token deve vir de variável de ambiente. 
        // fallback para o valor hardcoded apenas para manter compatibilidade imediata, mas altere no Supabase Secrets!
        const KIWIFY_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_SECRET") || "p2937lzrrvk";

        if (signature !== KIWIFY_TOKEN) {
            console.error("Signature mismatch. Received:", signature);
            return new Response("Unauthorized", { status: 401 });
        }

        if (req.method !== 'POST') {
            return new Response("Method not allowed", { status: 405 });
        }

        let payload: KiwifyPayload;
        try {
            payload = await req.json();
        } catch (e) {
            return new Response("Invalid JSON payload", { status: 400 });
        }

        console.log("Kiwify Webhook Payload:", JSON.stringify(payload));

        // 1. Validação Básica
        const { order_status, product_id, customer, plan } = payload;
        const customerEmail = customer?.email;

        // Verificar status
        const VALID_STATUSES = ["paid", "approved"];
        if (!VALID_STATUSES.includes(order_status)) {
            console.log("Ignoring status:", order_status);
            return new Response("Ignored status", { status: 200 });
        }

        if (!customerEmail) {
            console.error("No customer email in payload");
            return new Response("No customer email", { status: 400 });
        }

        // 2. Mapeamento de Produto/Plano para Ação
        let updateData: ProfileUpdate = {};

        // Configuração de Produtos e Planos
        const ID_VITALICIO = "3IrPND2";

        if (product_id === ID_VITALICIO) {
            updateData = { has_lifetime_prompt: true };
        } else if (plan?.name) {
            switch (plan.name) {
                case "Ultra Start":
                    updateData = { subscription_tier: "Ultra Start", credits: 20 };
                    break;
                case "Ultra Pro":
                    updateData = { subscription_tier: "Ultra Pro", credits: 70 };
                    break;
                case "Ultra Max":
                    updateData = { subscription_tier: "Ultra Max", credits: 180 };
                    break;
                default:
                    console.log("Unknown plan name:", plan.name);
            }
        }

        // Se não houve alteração nos dados relevantes, encerra.
        if (Object.keys(updateData).length === 0) {
            console.log("No relevant product or plan action found for:", product_id, plan?.name);
            return new Response("No action taken", { status: 200 });
        }

        // 3. Atualizar Profile no Banco
        console.log(`Updating profile for ${customerEmail} with:`, updateData);

        const { data, error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("email", customerEmail)
            .select();

        if (error) {
            console.error("DB Error:", error);
            return new Response("Database error", { status: 500 });
        }

        // Verificar se alguma linha foi realmente afetada
        if (!data || data.length === 0) {
            console.warn(`User with email ${customerEmail} not found in profiles.`);
            // Retornamos 200 para a Kiwify não ficar tentando reenviar, pois é um erro de "negócio" (usuário não cadastrado)
            return new Response("User not found", { status: 200 });
        }

        console.log("Update successful:", data);

        return new Response("Success", { status: 200 });

    } catch (err) {
        console.error("Webhook Internal Error:", err);
        return new Response("Internal Server Error", { status: 500 });
    }
});
