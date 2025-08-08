import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("No Stripe signature found");
      return new Response("No Stripe signature found", { status: 400 });
    }

    const body = await req.text();
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }


    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      if (session.mode === "subscription") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan || session.metadata?.plan_type;
        if (!userId) {
          return new Response("user_id missing", { status: 400 });
        }
        const subscriptionData = {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          plan: plan || "monthly",
          status: "active",
          amount: subscription.items.data[0].price.unit_amount! / 100,
          currency: subscription.currency,
          starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
          ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        };
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .insert(subscriptionData);
        if (error) {
          return new Response("DB insert error", { status: 500 });
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: subscription.status,
          ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      if (error) {
        return new Response("DB update error", { status: 500 });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "cancelled",
          ends_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      if (error) {
        return new Response("DB cancel error", { status: 500 });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Internal error", hint: "stripe-webhook failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});