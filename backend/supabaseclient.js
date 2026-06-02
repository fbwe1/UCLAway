require("dotenv").config(); // must be first
const { createClient } = require("@supabase/supabase-js");

console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20));

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }
);

module.exports = supabase;