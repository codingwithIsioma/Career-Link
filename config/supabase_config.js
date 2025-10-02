const { supabase_key, supabase_url } = require("./dotenv");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(supabase_url, supabase_key);

module.exports = supabase;
