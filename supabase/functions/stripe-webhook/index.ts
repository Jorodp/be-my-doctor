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
    console.log("Webhook received");
    
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

    console.log("Processing event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      console.log("Checkout session completed:", session.id);
      
      if (session.mode === "subscription") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        console.log("Retrieved subscription:", subscription.id);
        
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        
        if (!userId) {
          console.error("No user_id in session metadata");
          return new Response("No user_id found", { status: 400 });
        }

        // Create subscription record
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            plan: plan || "monthly",
            status: "active",
            amount: subscription.items.data[0].price.unit_amount! / 100,
            currency: subscription.currency,
            starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
            ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
          });

        if (error) {
          console.error("Error creating subscription record:", error);
          return new Response("Error creating subscription", { status: 500 });
        }

        console.log("Subscription record created for user:", userId);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      console.log("Subscription updated:", subscription.id);
      
      // Update subscription in database
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: subscription.status,
          ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("Error updating subscription:", error);
        return new Response("Error updating subscription", { status: 500 });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      console.log("Subscription cancelled:", subscription.id);
      
      // Mark subscription as cancelled
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "cancelled",
          ends_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("Error cancelling subscription:", error);
        return new Response("Error cancelling subscription", { status: 500 });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});