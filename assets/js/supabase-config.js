window.ECHOES_SUPABASE_URL =
    "https://nlawhidxubnmoxtcxbiq.supabase.co";

window.ECHOES_SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_DOfon3O30rpsPnuNyk88jg_vUjsvG2n";

if (typeof supabase !== 'undefined') {
    window.db = supabase.createClient(
        window.ECHOES_SUPABASE_URL,
        window.ECHOES_SUPABASE_PUBLISHABLE_KEY
    );
}
