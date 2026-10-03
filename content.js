// Public content only. Editing permissions are enforced by Pages CMS and GitHub.
(() => {
    const grid = document.querySelector('.announcements-grid');
    const gallery = document.querySelector('.photo-grid');
    const text = (tag, value, className) => {
        const node = document.createElement(tag);
        node.textContent = typeof value === 'string' ? value : '';
        if (className) node.className = className;
        return node;
    };
    function safeUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return null;
        try {
            const url = new URL(value, document.baseURI);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
        } catch { return null; }
    }
    async function load(path) {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) throw new Error('Content unavailable');
        return response.json();
    }
    load('announcements.json').then(data => {
        if (!Array.isArray(data.announcements)) throw new Error('Invalid announcements');
        const cards = data.announcements.filter(item => item && item.published !== false).map(item => {
            const category = ['urgent', 'meeting', 'info'].includes(item.category) ? item.category : 'info';
            const card = document.createElement('article');
            card.className = `announcement-card ${category}`;
            const header = document.createElement('div');
            header.className = 'announcement-header';
            header.append(text('span', { urgent: 'Launch Event', meeting: 'Meeting', info: 'Info' }[category], 'announcement-type'), text('span', item.when, 'announcement-date'));
            card.append(header, text('h3', item.title), text('p', item.body, 'announcement-body'));
            const imageUrl = safeUrl(item.image);
            if (imageUrl) {
                const image = document.createElement('img');
                image.src = imageUrl;
                image.alt = item.imageAlt || item.title || 'Club announcement';
                image.loading = 'lazy';
                image.className = 'announcement-image';
                card.append(image);
            }
            const linkUrl = safeUrl(item.link);
            if (linkUrl) {
                const link = text('a', item.linkText || 'Learn more →', 'announcement-link');
                link.href = linkUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                card.append(link);
            }
            return card;
        });
        grid.replaceChildren(...(cards.length ? cards : [text('p', 'There are no announcements right now. Check back soon.')]));
    }).catch(() => {
        // Keep the original announcements readable if the content request fails.
        grid.insertAdjacentElement('beforebegin', text('p', 'Latest updates could not be loaded. Please try refreshing.', 'content-status'));
    });
    load('photos.json').then(data => {
        if (!Array.isArray(data.featured)) throw new Error('Invalid gallery');
        const photos = data.featured.flatMap(photo => {
            const url = photo && safeUrl(photo.image);
            if (!url) return [];
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'photo-tile';
            button.dataset.photo = url;
            button.setAttribute('aria-label', `Enlarge: ${photo.caption || 'Club photo'}`);
            const image = document.createElement('img');
            image.src = url;
            image.alt = photo.caption || 'Club photo';
            image.loading = 'lazy';
            button.append(image, text('span', `${photo.caption || 'Club photo'} ↗`));
            return [button];
        });
        gallery.replaceChildren(...photos);
    }).catch(() => {}); // Preserve the existing gallery if content cannot be loaded.
})();
