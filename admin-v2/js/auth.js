document.addEventListener('DOMContentLoaded', async () => {
    const btnLogin = document.getElementById('btnLogin');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('loginError');

    // Giriş İşlemi
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                errorDiv.textContent = 'Lütfen tüm alanları doldurun.';
                return;
            }

            if (typeof db === 'undefined' || !db) {
                errorDiv.textContent = 'Veritabanı bağlantısı hazır değil. Lütfen sayfayı yenileyin.';
                return;
            }

            const { data, error } = await db.auth.signInWithPassword({ email, password });

            if (error) {
                errorDiv.textContent = 'Giriş başarısız: ' + error.message;
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // Oturum Kontrolü (Auth Guard)
    if (window.location.pathname.includes('admin-v2/index.html') || window.location.pathname.endsWith('/admin-v2/')) {
        if (typeof db !== 'undefined' && db && db.auth) {
            const { data: { session } } = await db.auth.getSession();
            if (!session) {
                window.location.href = 'login.html';
            }
        }
    }
});

// Çıkış Yap
window.logout = async function() {
    if (typeof db !== 'undefined' && db && db.auth) {
        await db.auth.signOut();
    }
    localStorage.clear();
    window.location.href = 'login.html';
};
                
