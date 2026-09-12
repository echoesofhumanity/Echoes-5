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
            errorDiv.style.color = '#ef4444';
            errorDiv.textContent = 'Lütfen e-posta ve şifrenizi girin.';
            return;
        }

        errorDiv.style.color = '#3b82f6';
        errorDiv.textContent = 'Giriş yapılıyor, lütfen bekleyin...';

        try {
            /*
             * Supabase client, supabase-config.js tarafından
             * window.db olarak oluşturuluyor.
             */
            const client = window.db;

            if (!client) {
                throw new Error(
                    'Supabase bağlantısı başlatılamadı. Lütfen sayfayı yenileyin.'
                );
            }

            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            if (!data || !data.session) {
                throw new Error(
                    'Giriş tamamlandı ancak oturum oluşturulamadı.'
                );
            }

            errorDiv.style.color = '#22c55e';
            errorDiv.textContent =
                'Giriş başarılı! Yönlendiriliyorsunuz...';

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (err) {
            console.error('Supabase Login Error:', err);

            errorDiv.style.color = '#ef4444';
            errorDiv.textContent =
                'Giriş Hatası: ' +
                (err && err.message
                    ? err.message
                    : 'Bilinmeyen bir hata oluştu.');
        }
    });
});
