import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rvsoeuwlgnovcmemlmqz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c29ldXdsZ25vdmNtZW1sbXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NDcxNDUsImV4cCI6MjA2ODEyMzE0NX0.NotJXMGJzXOmRQbSjFqkHlSDjvUT-0T2YyJFMNmXCCk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
