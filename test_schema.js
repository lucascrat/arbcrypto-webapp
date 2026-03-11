const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://qyagfghcnzenvbhbtsvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5YWdmZ2hjbnplbnZiaGJ0c3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDU2NjksImV4cCI6MjA4MzMyMTY2OX0.k_cVE7tLn23NIuuMJlCdWw97F_ZkPpz7SS7d-MleJVc";

// 1. Try with default (public) schema
const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Try with arbcrypto schema in config
const supabaseArb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'arbcrypto' }
});

async function testTables() {
    console.log('--- Testing Table Access ---');

    // Test 1: Public Client -> Public Table (expecting failure if tables are hidden)
    try {
        const { data, error } = await supabasePublic.from('user_settings').select('count', { count: 'exact', head: true });
        console.log('Public Client -> Default Table:', error ? `Error: ${error.message}` : `Success (Count: ${data})`);
    } catch (e) { console.log('Public Exception:', e.message); }

    // Test 2: Public Client -> Arbcrypto Table (explicit schema)
    try {
        const { data, error } = await supabasePublic.schema('arbcrypto').from('user_settings').select('count', { count: 'exact', head: true });
        console.log('Public Client -> .schema("arbcrypto"):', error ? `Error: ${error.message}` : `Success (Count: ${data})`);
    } catch (e) { console.log('Explicit Schema Exception:', e.message); }

    // Test 3: Arbcrypto Client -> Default Table
    try {
        const { data, error } = await supabaseArb.from('user_settings').select('count', { count: 'exact', head: true });
        console.log('Arb Client -> Default Table:', error ? `Error: ${error.message}` : `Success (Count: ${data})`);
    } catch (e) { console.log('Arb Client Exception:', e.message); }
}

testTables();
