import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    try {
        const url = new URL(req.url);
        const signature = url.searchParams.get("signature");
        const KIWIFY_TOKEN = "p2937lzrrvk";

        if (signature !== KIWIFY_TOKEN) {
            return new Response("Unauthorized", { status: 401 });
        }

        const payload = await req.json();
        console.log("Kiwify Webhook Payload:", payload);

        // 1. Basic Validation
        const { order_status, product_id, customer } = payload;
        const customerEmail = customer?.email;

        if (order_status !== "paid" && order_status !== "approved") {
            return new Response("Ignored status", { status: 200 });
        }

        if (!customerEmail) {
            return new Response("No customer email", { status: 400 });
        }

        // 2. Map Product ID or Plan Name to Action
        let updateData: any = {};

        // PRODUCT ID for Lifetime
        const ID_VITALICIO = "3IrPND2";

        // NAMES for Subscription Plans (Kiwify sends plan info in the payload)
        const planName = payload.plan?.name;

        if (product_id === ID_VITALICIO) {
            updateData = { has_lifetime_prompt: true };
        } else if (planName === "Ultra Start") {
            updateData = { subscription_tier: "Ultra Start", credits: 20 };
        } else if (planName === "Ultra Pro") {
            updateData = { subscription_tier: "Ultra Pro", credits: 70 };
        } else if (planName === "Ultra Max") {
            updateData = { subscription_tier: "Ultra Max", credits: 180 };
        } else {
            return new Response("Unknown product or plan", { status: 200 });
        }

        // 3. Update Profile in Database
        // We match by email since Kiwify provides the customer email
        const { error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("email", customerEmail);

        if (error) {
            console.error("DB Error:", error);
            return new Response("Database error", { status: 500 });
        }

        return new Response("Success", { status: 200 });

    } catch (err) {
        console.error("Webhook Error:", err);
        return new Response("Internal Server Error", { status: 500 });
    }
});
