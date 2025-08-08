import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

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
    const { action, ...data } = await req.json();
    logger.info("Payment function called", { action });

    switch (action) {
      case "create-subscription":
        return await createSubscription(req, data);
      case "create-consultation-payment":
        return await createConsultationPayment(req, data);
      case "mark-cash-payment":
        return await markCashPayment(req, data);
      case "mark-manual-payment":
        return await markManualPayment(req, data);
      case "check-subscription":
        return await checkSubscription(req, data);
      case "webhook":
        return await handleWebhook(req);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (_error) {
    logger.error("Payment function error");
    return new Response(
      JSON.stringify({ error: "Internal error", hint: "payments failed" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function createSubscription(req: Request, data: any) {
  console.log("Creating subscription with data:", data);
  
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    console.error("User authentication error:", userError);
    throw new Error("User not authenticated");
  }

  console.log("Authenticated user:", userData.user.email);

  const { plan } = data; // 'monthly' or 'annual'
  
  // Get payment settings from database
  console.log("Fetching payment settings...");
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("payment_settings")
    .select("monthly_price, annual_price")
    .single();

  if (settingsError) {
    console.error("Settings error:", settingsError);
    throw new Error("Could not fetch payment settings");
  }
  
  console.log("Payment settings:", settings);
  
  const amount = plan === "annual" 
    ? Math.round(settings.annual_price * 100) 
    : Math.round(settings.monthly_price * 100); // Convert to centavos

  console.log(`Creating ${plan} subscription for ${amount} centavos`);

  // Check if customer exists
  const customers = await stripe.customers.list({
    email: userData.user.email!,
    limit: 1,
  });

  let customerId;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    console.log("Found existing customer:", customerId);
  } else {
    const customer = await stripe.customers.create({
      email: userData.user.email!,
      metadata: { user_id: userData.user.id },
    });
    customerId = customer.id;
    console.log("Created new customer:", customerId);
  }

  // Create subscription checkout session
  console.log("Creating Stripe checkout session...");
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "mxn",
          product_data: {
            name: `Suscripción ${plan === "annual" ? "Anual" : "Mensual"} - Be My Doctor`,
          },
          unit_amount: amount,
          recurring: { interval: plan === "annual" ? "year" : "month" },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${req.headers.get("origin")}/dashboard/doctor?payment=success`,
    cancel_url: `${req.headers.get("origin")}/dashboard/doctor?payment=cancelled`,
    metadata: {
      user_id: userData.user.id,
      plan,
    },
  });

  console.log("Checkout session created:", session.id);

  return new Response(
    JSON.stringify({ url: session.url }),
    { headers: corsHeaders }
  );
}

async function createConsultationPayment(req: Request, data: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData.user) throw new Error("User not authenticated");

  const { appointmentId, amount } = data;

  // Get appointment details
  const { data: appointment } = await supabaseAdmin
    .from("appointments")
    .select("*, doctor_profiles!inner(consultation_fee)")
    .eq("id", appointmentId)
    .single();

  if (!appointment) throw new Error("Appointment not found");

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: "mxn",
    metadata: {
      appointment_id: appointmentId,
      patient_id: userData.user.id,
      doctor_id: appointment.doctor_user_id,
    },
  });

  // Create consultation payment record
  const { error } = await supabaseAdmin
    .from("consultation_payments")
    .insert({
      appointment_id: appointmentId,
      patient_user_id: userData.user.id,
      doctor_user_id: appointment.doctor_user_id,
      amount,
      payment_method: "stripe",
      stripe_payment_intent_id: paymentIntent.id,
      status: "pending",
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    }),
    { headers: corsHeaders }
  );
}

async function markCashPayment(req: Request, data: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData.user) throw new Error("User not authenticated");

  // Verify user is assistant or admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (!profile || !["assistant", "admin"].includes(profile.role)) {
    throw new Error("Unauthorized");
  }

  const { appointmentId, amount } = data;

  const { error } = await supabaseAdmin
    .from("consultation_payments")
    .upsert({
      appointment_id: appointmentId,
      patient_user_id: data.patientId,
      doctor_user_id: data.doctorId,
      amount,
      payment_method: "cash",
      status: "paid",
      paid_at: new Date().toISOString(),
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: corsHeaders }
  );
}

async function markManualPayment(req: Request, data: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData.user) throw new Error("User not authenticated");

  // Verify user is assistant, admin, or doctor
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (!profile || !["assistant", "admin", "doctor"].includes(profile.role)) {
    throw new Error("Unauthorized");
  }

  const { appointmentId, amount, patientId, doctorId, paymentMethod } = data;

  console.log("Recording manual payment:", { appointmentId, amount, paymentMethod });

  const { error } = await supabaseAdmin
    .from("consultation_payments")
    .upsert({
      appointment_id: appointmentId,
      patient_user_id: patientId,
      doctor_user_id: doctorId,
      amount,
      payment_method: paymentMethod,
      status: "paid",
      paid_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Error recording manual payment:", error);
    throw error;
  }

  // Update appointment price to reflect actual amount paid
  const { error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .update({ price: amount })
    .eq("id", appointmentId);

  if (appointmentError) {
    console.error("Error updating appointment price:", appointmentError);
    // Don't throw here as payment was already recorded
  }

  console.log("Manual payment recorded successfully");

  return new Response(
    JSON.stringify({ success: true }),
    { headers: corsHeaders }
  );
}

async function checkSubscription(req: Request, data: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData.user) throw new Error("User not authenticated");

  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return new Response(
    JSON.stringify({ 
      hasActiveSubscription: !!subscription,
      subscription: subscription || null
    }),
    { headers: corsHeaders }
  );
}

async function handleWebhook(req: Request) {
  console.log("Webhook received");
  
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("No Stripe signature found");
    throw new Error("No Stripe signature found");
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
    throw new Error("Webhook signature verification failed");
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
        return new Response("No user_id found", { status: 400, headers: corsHeaders });
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
        throw error;
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
      throw error;
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
      throw error;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: corsHeaders,
  });
}