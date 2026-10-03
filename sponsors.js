const sponsorBelt = document.querySelector('.sponsor-belt');
const sponsorMotionToggle = sponsorBelt.querySelector('.sponsor-motion-toggle');
sponsorMotionToggle.addEventListener('click', () => {
    const paused = sponsorBelt.classList.toggle('is-paused');
    sponsorMotionToggle.setAttribute('aria-pressed', String(paused));
    sponsorMotionToggle.textContent = paused ? 'Play logos' : 'Pause logos';
});
