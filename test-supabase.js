import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fdezpdgtxmhijsfupajj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZXpwZGd0eG1oaWpzZnVwYWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTE1NjMsImV4cCI6MjA4NTg4NzU2M30.iMWdiC5km2Hxj81whQnHBsqYZ1f2o2qcWSIHoH2Qsyg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing technicians update...');
    const { data: techData, error: techError } = await supabase
        .from('technicians')
        .update({ specialty: 'Mecânica' })
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select();

    console.log('Technicians update result:', techData?.length, techError);

    console.log('Testing third_party_companies update...');
    const { data: thirdData, error: thirdError } = await supabase
        .from('third_party_companies')
        .update({ specialty: 'Mecânica' })
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select();

    console.log('Third party update result:', thirdData?.length, thirdError);

    // Fetch one third party company just to see if we can read
    const { data: fetchThird } = await supabase.from('third_party_companies').select('*').limit(1);
    console.log('Can read third party?', fetchThird?.length > 0);

    if (fetchThird && fetchThird.length > 0) {
        console.log('Trying to update a specific third party...');
        const { data: specificData, error: specificError } = await supabase
            .from('third_party_companies')
            .update({ specialty: fetchThird[0].specialty })
            .eq('id', fetchThird[0].id)
            .select();
        console.log('Specific update result:', specificData?.length, specificError);
    }
}

test();
