const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.nav-menu');
function closeMenu() { toggle.classList.remove('active'); menu.classList.remove('active'); toggle.setAttribute('aria-expanded', 'false'); }
toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.classList.toggle('active', open); menu.classList.toggle('active', open); toggle.setAttribute('aria-expanded', String(open)); });
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => { if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu(); });
const dialog = document.querySelector('.photo-dialog');
document.querySelector('.photo-grid').addEventListener('click', event => { const button = event.target.closest('button[data-photo]'); if (!button) return; const img = button.querySelector('img'); dialog.querySelector('img').src = button.dataset.photo; dialog.querySelector('img').alt = img.alt; dialog.querySelector('p').textContent = img.alt; dialog.showModal(); });
dialog.querySelector('button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

// White branding over the hero; blue branding on a solid header after scroll.
const navbar = document.querySelector('.navbar');
const brandImages = navbar.querySelectorAll('[data-light-src]');
let solidHeader;
function updateHeader() {
    const solid = window.scrollY > 40 || toggle.getAttribute('aria-expanded') === 'true';
    if (solid === solidHeader) return;
    solidHeader = solid;
    navbar.classList.toggle('scrolled', solid);
    brandImages.forEach(image => { image.src = solid ? image.dataset.darkSrc : image.dataset.lightSrc; });
}
window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('pageshow', updateHeader);
new MutationObserver(updateHeader).observe(toggle, { attributes: true, attributeFilter: ['aria-expanded'] });
brandImages.forEach(image => { const preload = new Image(); preload.src = image.dataset.darkSrc; });
updateHeader();

// Advance every six seconds; explicit pause persists through manual navigation.
const frames = Array.from(document.querySelectorAll('.hero-frame'));
const slideControls = document.querySelector('.hero-slideshow-controls');
const playback = slideControls.querySelector('.slideshow-toggle');
const positionLabel = slideControls.querySelector('.slide-position');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let slideIndex = 0;
let playing = !reducedMotion.matches;
let slideTimer;
function scheduleSlide() {
    window.clearTimeout(slideTimer);
    if (playing && !document.hidden) slideTimer = window.setTimeout(() => showHeroSlide(slideIndex + 1), 6000);
}
function showHeroSlide(index) {
    slideIndex = (index + frames.length) % frames.length;
    frames.forEach((frame, i) => {
        frame.classList.toggle('is-current', i === slideIndex);
        frame.setAttribute('aria-hidden', String(i !== slideIndex));
    });
    positionLabel.textContent = `${String(slideIndex + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}`;
    scheduleSlide();
}
function setPlayback(value) {
    playing = value;
    playback.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
    playback.querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
    positionLabel.setAttribute('aria-live', playing ? 'off' : 'polite');
    scheduleSlide();
}
playback.addEventListener('click', () => setPlayback(!playing));
slideControls.querySelector('.slideshow-previous').addEventListener('click', () => showHeroSlide(slideIndex - 1));
slideControls.querySelector('.slideshow-next').addEventListener('click', () => showHeroSlide(slideIndex + 1));
document.addEventListener('visibilitychange', scheduleSlide);
reducedMotion.addEventListener('change', event => { if (event.matches) setPlayback(false); });
slideControls.hidden = false;
setPlayback(playing);
