// Add only photos from the matching event, with a descriptive caption.
// Example entry: { src: 'images/outreach/club-fair/photo.jpg', caption: 'Introducing model rocketry at the club fair.' }
const outreachAlbums = {
    'outreach-club-fair-2026': [],
    'outreach-camp-liftoff': [],
    'outreach-world-space-week': []
};

const albumGrid = document.querySelector('[data-outreach-album]');
const albumDialog = document.querySelector('.album-dialog');
const photos = outreachAlbums[albumGrid.dataset.outreachAlbum] || [];
if (photos.length) document.querySelector('.album-empty').hidden = true;
photos.forEach(photo => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'outreach-photo';
    button.setAttribute('aria-label', `Enlarge: ${photo.caption}`);
    const image = document.createElement('img');
    image.src = photo.src;
    image.alt = photo.caption;
    image.loading = 'lazy';
    const caption = document.createElement('span');
    caption.textContent = photo.caption;
    button.append(image, caption);
    button.addEventListener('click', () => {
        albumDialog.querySelector('img').src = photo.src;
        albumDialog.querySelector('img').alt = photo.caption;
        albumDialog.querySelector('p').textContent = photo.caption;
        albumDialog.showModal();
    });
    albumGrid.append(button);
});
albumDialog.querySelector('button').addEventListener('click', () => albumDialog.close());
albumDialog.addEventListener('click', event => { if (event.target === albumDialog) albumDialog.close(); });
