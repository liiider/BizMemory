
const { createClient } = require('@supabase/supabase-js');

// Config
const supabaseUrl = 'https://vjpecdcsviekabrsimyx.supabase.co';
const supabaseKey = 'sb_publishable_Kc8O-iqJYeXwFu6tmGxPhQ_E5PjWrIH';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBadContacts() {
    console.log("Starting database repair...");

    // 1. Find all contacts with suspicious names
    const { data: contacts, error: cError } = await supabase
        .from('contacts')
        .select('*')
        .or('name.eq.{,name.eq.Unknown'); // Check for "{" or "Unknown"

    if (cError) {
        console.error("Error fetching contacts:", cError);
        return;
    }

    console.log(`Found ${contacts.length} suspicious contacts.`);

    for (const contact of contacts) {
        console.log(`Processing contact: ${contact.id} (${contact.name})`);

        // 2. Get the latest record for this contact to re-parse data
        const { data: records, error: rError } = await supabase
            .from('records')
            .select('*')
            .eq('contact_id', contact.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (rError || !records || records.length === 0) {
            console.log(`  No records found for contact ${contact.id}, skipping.`);
            continue;
        }

        const record = records[0];
        let analysisData = record.analysis_result;
        let newName = null;
        let newSummary = null;

        // 3. Logic: Extract Name from Analysis Result
        // Try direct object access
        if (analysisData && typeof analysisData === 'object') {
            newName = analysisData.name || analysisData.person || analysisData.contact_name;
            newSummary = analysisData.summary || analysisData.description;
        }

        // Try raw extraction if object access failed or if it's a string
        if (!newName && record.analysis_result) {
            const raw = typeof record.analysis_result === 'string'
                ? record.analysis_result
                : JSON.stringify(record.analysis_result);

            // Try to find JSON block
            const match = raw.match(/{[\s\S]*"name"\s*:\s*"([^"]+)"[\s\S]*}/);
            if (match && match[1]) {
                newName = match[1];
            } else {
                // Fallback regex for simple "name": "Value" pattern anywhere
                const simpleMatch = raw.match(/"name"\s*:\s*"([^"]+)"/);
                if (simpleMatch) newName = simpleMatch[1];
            }
        }

        // 4. Update if we found a valid name
        if (newName && newName !== '{' && newName !== 'Unknown') {
            console.log(`  -> Fixing Name: "${contact.name}" -> "${newName}"`);

            const { error: uError } = await supabase
                .from('contacts')
                .update({
                    name: newName,
                    summary: newSummary || contact.summary // Keep old summary if new one not found
                })
                .eq('id', contact.id);

            if (uError) console.error(`  Failed to update: ${uError.message}`);
            else console.log(`  Success!`);
        } else {
            console.log(`  Could not extract valid name. Raw data:`, JSON.stringify(analysisData).substring(0, 100) + "...");
        }
    }

    console.log("Repair complete.");
}

fixBadContacts();
