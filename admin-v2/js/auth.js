document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btnLogin');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('loginError');

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            errorDiv.style.whiteSpace = 'pre-wrap';
            errorDiv.style.textAlign = 'left';
            errorDiv.style.fontSize = '11px';
            errorDiv.textContent = '--- TEŞHİS TESTİ BAŞLATILDI ---\n';

            const url = window.ECHOES_SUPABASE_URL;
            const key = window.ECHOES_SUPABASE_PUBLISHABLE_KEY;

            errorDiv.textContent += `1. Target URL: "${url}"\n`;
            errorDiv.textContent += `2. Key Var Mı: ${!!key}\n`;
            errorDiv.textContent += `3. DB Objesi: ${typeof db !== 'undefined' && !!db}\n`;

            if (!url) {
                errorDiv.textContent += 'SONUÇ: URL Tanımsız!\n';
                return;
            }

            // Test A: Doğrudan Sunucu Erişilebilirliği (Yalın Fetch)
            try {
                errorDiv.textContent += '4. Sunucuya Doğrudan İstek Atılıyor...\n';
                const testRes = await fetch(`${url}/auth/v1/health`, {
                    headers: { 'apikey': key || '' }
                });
                errorDiv.textContent += `5. Sunucu Yanıtı: HTTP ${testRes.status} (${testRes.statusText})\n`;
            } catch (netErr) {
                errorDiv.textContent += `AĞ HATASI: ${netErr.name} - ${netErr.message}\n`;
                errorDiv.textContent += `Online Durumu: ${navigator.onLine ? 'İnternet Var' : 'İnternet Yok'}\n`;
                return;
            }

            // Test B: SDK Giriş Testi
            try {
                errorDiv.textContent += '6. SDK Giriş Deneniyor...\n';
                const { data, error } = await db.auth.signInWithPassword({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                });

                if (error) {
                    errorDiv.textContent += `AUTH HATASI: ${error.message} (Kod: ${error.status})\n`;
                } else {
                    errorDiv.textContent += 'BAŞARILI! Yönlendiriliyor...\n';
                    window.location.href = 'index.html';
                }
            } catch (sdkErr) {
                errorDiv.textContent += `SDK İSTİSNA: ${sdkErr.name} - ${sdkErr.message}\n`;
            }
        });
    }
});
            
