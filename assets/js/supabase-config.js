window.ECHOES_SUPABASE_URL = "https://nlawhidxubmnoxtcxbia.supabase.co";
window.ECHOES_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_D0fon3030rpsPnuNyk88jg_vUjsvG2n";

if (typeof supabase !== 'undefined') {
    window.db = supabase.createClient(window.ECHOES_SUPABASE_URL, window.ECHOES_SUPABASE_PUBLISHABLE_KEY);
}
