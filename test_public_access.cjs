
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fdezpdgtxmhijsfupajj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZXpwZGd0eG1oaWpzZnVwYWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTE1NjMsImV4cCI6MjA4NTg4NzU2M30.iMWdiC5km2Hxj81whQnHBsqYZ1f2o2qcWSIHoH2Qsyg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAccess() {
    console.log('Testing public access to work_orders...');
    const { data, error } = await supabase.from('work_orders').select('id').limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Success! Data found:', data);
    }
}

testAccess();
