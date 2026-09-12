// Global Çıkış Yap Fonksiyonu (Her koşulda çalışır)
window.logout = async function() {
    try {
        if (typeof db !== 'undefined' && db && db.auth) {
            await db.auth.signOut();
        }
    } catch (err) {
        console.error('Çıkış yapılırken hata oluştu:', err);
    } finally {
        // Hata oluşsa bile kullanıcıyı kesin olarak giriş sayfasına yönlendir
        window.location.href = 'login.html';
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const btnLogin = document.getElementById('btnLogin');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('loginError');

    // 1. Giriş Sayfasındaysak (login.html)
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                errorDiv.textContent = 'Lütfen tüm alanları doldurun.';
                return;
            }

            try {
                const { data, error } = await db.auth.signInWithPassword({ email, password });
                if (error) {
                    errorDiv.textContent = 'Giriş başarısız: ' + error.message;
                } else {
                    window.location.href = 'index.html';
                }
            } catch (err) {
                errorDiv.textContent = 'Bağlantı hatası: ' + err.message;
            }
        });
    }

    // 2. Admin Sayfasındaysak (index.html) - Oturum Kontrolü (Auth Guard)
    if (window.location.pathname.includes('admin-v2/index.html') || window.location.pathname.endsWith('/admin-v2/')) {
        try {
            if (typeof db !== 'undefined' && db && db.auth) {
                const { data: { session } } = await db.auth.getSession();
                if (!session) {
                    window.location.href = 'login.html';
                }
            }
        } catch (err) {
            console.error('Oturum kontrol hatası:', err);
        }
    }
});

