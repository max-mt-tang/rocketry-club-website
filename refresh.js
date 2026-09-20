const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.nav-menu');
function closeMenu() { toggle.classList.remove('active'); menu.classList.remove('active'); toggle.setAttribute('aria-expanded', 'false'); }
toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.classList.toggle('active', open); menu.classList.toggle('active', open); toggle.setAttribute('aria-expanded', String(open)); });
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => { if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu(); });
const dialog = document.querySelector('.photo-dialog');
document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => { const img = button.querySelector('img'); dialog.querySelector('img').src = button.dataset.photo; dialog.querySelector('img').alt = img.alt; dialog.querySelector('p').textContent = img.alt; dialog.showModal(); }));
dialog.querySelector('button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
