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
    Plan?: { // Kiwify as vezes manda com maiuscula
        name: string;
        [key: string]: any;
    };
    plan?: {
        name: string;
        [key: string]: any;
    }; // Garantir compatibilidade com variações
    [key: string]: any;
}

// Definição de Tipos para a Tabela Profiles
interface ProfileUpdate {
    has_lifetime_prompt?: boolean;
    subscription_tier?: "Ultra Start" | "Ultra Pro" | "Ultra Max" | null;
    credits?: number;
}

// Inicialização com Fallback
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

        // SEGURANÇA: Token secreto do Kiwify
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
        const { order_status, product_id, customer } = payload;
        // Kiwify pode mandar 'Plan' ou 'plan'
        const planData = payload.plan || payload.Plan;
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

        // Configuração de IDs
        const ID_VITALICIO = "3IrPND2";

        // Lógica de Decisão
        if (product_id === ID_VITALICIO) {
            console.log(`Detected Lifetime Product purchase for ${customerEmail}`);
            updateData = { has_lifetime_prompt: true };
        }

        // Verifica assinatura INDEPENDENTE do produto ID (caso o produto mude mas o plano se mantenha)
        if (planData?.name) {
            const planNameNormalized = planData.name.trim().toLowerCase();
            console.log(`Detected Subscription Plan: ${planData.name} (normalized: ${planNameNormalized})`);

            switch (planNameNormalized) {
                case "ultra start":
                    updateData = { ...updateData, subscription_tier: "Ultra Start", credits: 20 };
                    break;
                case "ultra pro":
                    updateData = { ...updateData, subscription_tier: "Ultra Pro", credits: 70 };
                    break;
                case "ultra max":
                    updateData = { ...updateData, subscription_tier: "Ultra Max", credits: 180 };
                    break;
                default:
                    console.warn("Unknown plan name:", planData.name);
            }
        }

        // Se não houve alteração
        if (Object.keys(updateData).length === 0) {
            console.log("No relevant actions found for this payload.");
            return new Response("No action taken", { status: 200 });
        }

        // 3. Atualizar Profile
        console.log(`Updating profile for ${customerEmail} with:`, JSON.stringify(updateData));

        const { data, error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("email", customerEmail)
            .select();

        if (error) {
            console.error("Supabase DB Error:", error);
            return new Response("Database error", { status: 500 });
        }

        if (!data || data.length === 0) {
            console.warn(`User with email ${customerEmail} not found in profiles (User needs to sign up locally first).`);
            // Retornamos 200 para confirmação de recebimento, mesmo sem usuário
            return new Response("User not found", { status: 200 });
        }

        console.log("Update successful. New profile state:", data[0]);

        return new Response("Success", { status: 200 });

    } catch (err) {
        console.error("Webhook Critical Failure:", err);
        return new Response("Internal Server Error", { status: 500 });
    }
});
