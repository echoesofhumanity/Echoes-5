document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btnLogin');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('loginError');

    if (!btnLogin) return;

    btnLogin.addEventListener('click', async (e) => {
        e.preventDefault();

        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!email || !password) {
            errorDiv.textContent = 'Lütfen e-posta ve şifrenizi girin.';
            return;
        }

        errorDiv.style.color = '#3b82f6';
        errorDiv.textContent = 'Giriş yapılıyor, lütfen bekleyin...';

        try {
            const client = window.supabaseClient || (window.supabase && window.supabase.createClient ? 
                window.supabase.createClient(window.ECHOES_SUPABASE_URL, window.ECHOES_SUPABASE_PUBLISHABLE_KEY) : null);

            if (!client) {
                throw new Error('Supabase istemcisi başlatılamadı.');
            }

            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            errorDiv.style.color = '#22c55e';
            errorDiv.textContent = 'Giriş başarılı! Yönlendiriliyorsunuz...';
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (err) {
            errorDiv.style.color = '#ef4444';
            errorDiv.textContent = 'Giriş Hatası: ' + (err.message || 'Bilinmeyen bir hata oluştu.');
        }
    });
});
