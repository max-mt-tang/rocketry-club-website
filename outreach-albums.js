// Album content is maintained through the club editor, without editing HTML.
(() => {
    const grid = document.querySelector('[data-outreach-album], [data-photo-album]');
    if (!grid) return;
    const keys = {
        'outreach-club-fair-2026': 'clubFair',
        'outreach-camp-liftoff': 'campLiftoff',
        'outreach-world-space-week': 'worldSpaceWeek'
    };
    const key = grid.dataset.photoAlbum || keys[grid.dataset.outreachAlbum];
    const status = document.querySelector('.album-empty');
    const managedSection = grid.closest('.managed-album');
    let dialog = document.querySelector('.album-dialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.className = 'album-dialog';
        dialog.setAttribute('aria-label', 'Club photo');
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'album-close';
        close.textContent = 'Close ✕';
        const image = document.createElement('img');
        image.alt = '';
        dialog.append(close, image, document.createElement('p'));
        document.body.append(dialog);
    }
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    fetch('photos.json', { cache: 'no-cache' }).then(response => {
        if (!response.ok) throw new Error('Photos unavailable');
        return response.json();
    }).then(data => {
        if (!Array.isArray(data[key])) throw new Error('Invalid photo album');
        const photos = data[key].flatMap(photo => {
            if (!photo || typeof photo.image !== 'string' || !photo.image.trim()) return [];
            try {
                const url = new URL(photo.image, document.baseURI);
                return ['https:', 'http:'].includes(url.protocol) ? [{ ...photo, image: url.href }] : [];
            } catch { return []; }
        });
        if (photos.length) {
            status.hidden = true;
            if (managedSection) managedSection.hidden = false;
        }
        photos.forEach(photo => {
            const caption = typeof photo.caption === 'string' ? photo.caption : 'Club photo';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'outreach-photo';
            button.setAttribute('aria-label', `Enlarge: ${caption}`);
            const image = document.createElement('img');
            image.src = photo.image;
            image.alt = caption;
            image.loading = 'lazy';
            const label = document.createElement('span');
            label.textContent = caption;
            button.append(image, label);
            button.addEventListener('click', () => {
                dialog.querySelector('img').src = photo.image;
                dialog.querySelector('img').alt = caption;
                dialog.querySelector('p').textContent = caption;
                dialog.showModal();
            });
            grid.append(button);
        });
    }).catch(() => {
        status.hidden = false;
        status.textContent = 'Photos could not be loaded. Please try refreshing.';
        if (managedSection) managedSection.hidden = false;
    });
})();
