
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vjpecdcsviekabrsimyx.supabase.co';
const supabaseKey = 'sb_publishable_Kc8O-iqJYeXwFu6tmGxPhQ_E5PjWrIH';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking latest contacts...");
    const { data: contacts, error: cError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (cError) console.error(cError);
    else console.log(JSON.stringify(contacts, null, 2));

    console.log("\nChecking latest records...");
    const { data: records, error: rError } = await supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (rError) console.error(rError);
    else console.log(JSON.stringify(records, null, 2));
}

checkData();
