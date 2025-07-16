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
    const { action, ...data } = await req.json();

    switch (action) {
      case "create-subscription":
        return await createSubscription(req, data);
      case "create-consultation-payment":
        return await createConsultationPayment(req, data);
      case "mark-cash-payment":
        return await markCashPayment(req, data);
      case "check-subscription":
        return await checkSubscription(req, data);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (error) {
    console.error("Payment function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function createSubscription(req: Request, data: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData.user) throw new Error("User not authenticated");

  const { plan } = data; // 'monthly' or 'annual'
  
  // Get payment settings from database
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("payment_settings")
    .select("monthly_price, annual_price")
    .single();

  if (settingsError) throw new Error("Could not fetch payment settings");
  
  const amount = plan === "annual" 
    ? Math.round(settings.annual_price * 100) 
    : Math.round(settings.monthly_price * 100); // Convert to centavos

  // Check if customer exists
  const customers = await stripe.customers.list({
    email: userData.user.email!,
    limit: 1,
  });

  let customerId;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email: userData.user.email!,
      metadata: { user_id: userData.user.id },
    });
    customerId = customer.id;
  }

  // Create subscription checkout session
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