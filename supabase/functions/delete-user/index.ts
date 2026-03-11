import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase variables not set')
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // Ensure the caller is authenticated AND is an admin/root
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const token = authHeader.replace(/^Bearer\s+/i, '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized caller' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Verify caller role in users table
        const { data: callerData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
        if (!callerData || (callerData.role !== 'admin' && callerData.role !== 'admin_root')) {
            return new Response(JSON.stringify({ error: 'Forbidden: caller is not admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Parse the request
        const { userId } = await req.json()
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Missing userId to delete' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // First delete from Auth
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteAuthError) {
            // It might not exist in Auth, let's proceed to public anyway just in case
            console.log('Error deleting from auth.users (might not exist):', deleteAuthError)
        }

        // Then delete from public.users natively
        const { error: deletePublicError } = await supabaseAdmin.from('users').delete().eq('id', userId)
        if (deletePublicError) {
            console.log('Error deleting from public.users:', deletePublicError);
            return new Response(JSON.stringify({ error: deletePublicError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
