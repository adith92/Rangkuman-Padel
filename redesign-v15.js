(() => {
const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');
const filters = document.querySelectorAll('[data-venue-filter]');
const venues = document.querySelectorAll('[data-role]');
const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });
menuButton?.addEventListener('click', () => {
const open = nav?.classList.toggle('open');
menuButton.setAttribute('aria-expanded', String(Boolean(open)));
});
nav?.addEventListener('click', (event) => {
if (event.target instanceof HTMLAnchorElement) {
nav.classList.remove('open');
menuButton?.setAttribute('aria-expanded', 'false');
}
});
filters.forEach((button) => {
button.addEventListener('click', () => {
const selected = button.getAttribute('data-venue-filter') || 'all';
filters.forEach((item) => item.classList.toggle('active', item === button));
venues.forEach((venue) => {
const role = venue.getAttribute('data-role');
venue.hidden = selected !== 'all' && selected !== role;
});
});
});
const observer = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
const id = entry.target.getAttribute('id');
nav?.querySelectorAll('a[href^="#"]').forEach((link) => {
link.toggleAttribute('aria-current', link.getAttribute('href') === `#${id}`);
});
});
}, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section));
})();
