const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase URL or Key is missing. Storage features will not work.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
