document.addEventListener('DOMContentLoaded', async () => {
    const feedContainer = document.getElementById('portalFeed');
    if (!feedContainer) return;

    try {
        // Supabase'den yayınlanmış içerikleri çek
        const { data: items, error } = await db
            .from('content_items')
            .select('*, categories(name, slug)')
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!items || items.length === 0) {
            feedContainer.innerHTML = '<p style="text-align:center; color:#888;">Henüz yayınlanmış bir içerik bulunmuyor.</p>';
            return;
        }

        // İçerikleri HTML olarak ekrana bas
        feedContainer.innerHTML = items.map(item => `
            <article class="content-card" style="border: 1px solid #333; margin-bottom: 20px; padding: 15px; border-radius: 8px;">
                ${item.cover_image_url ? `<img src="${item.cover_image_url}" style="max-width:100%; height:auto; border-radius:4px; margin-bottom:10px;">` : ''}
                <span style="font-size:12px; color:#888; text-transform:uppercase;">${item.categories?.name || item.type}</span>
                <h2 style="margin: 8px 0;">${item.title}</h2>
                <p style="line-height: 1.6;">${item.summary}</p>
                <div style="font-size:12px; color:#666; margin-top:10px;">
                    <span>Dil: ${item.language.toUpperCase()}</span> | 
                    <span>Tarih: ${new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
            </article>
        `).join('');

    } catch (err) {
        console.error('Akış yüklenirken hata:', err.message);
    }
});

