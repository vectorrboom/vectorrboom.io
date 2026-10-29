(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Theme preference; failures (e.g. privacy mode) should never break the site.
  const themeToggle = $('#themeToggle');
  const setThemeLabel = () => {
    const isDark = document.documentElement.dataset.theme !== 'light';
    $('.theme-label', themeToggle).textContent = isDark ? 'Light mode' : 'Dark mode';
    $('.theme-icon', themeToggle).textContent = isDark ? '☼' : '☾';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  };
  setThemeLabel();
  themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('portfolio-theme', next); } catch (_) {}
    setThemeLabel();
  });

  // Mobile navigation.
  const menuToggle = $('#menuToggle');
  const nav = $('.desktop-nav');
  menuToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  $$('.desktop-nav a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Reading progress.
  const progress = $('#progress');
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0}%`;
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // Reveal elements on scroll, with a fallback for older browsers.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(el => observer.observe(el));
  } else {
    revealItems.forEach(el => el.classList.add('visible'));
  }

  // Gallery filtering.
  const filterButtons = $$('.filter-chip');
  const cards = $$('.gallery-card');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    filterButtons.forEach(item => item.classList.toggle('active', item === button));
    const filter = button.dataset.filter;
    cards.forEach(card => { card.hidden = filter !== 'all' && card.dataset.category !== filter; });
  }));

  // Accessible gallery lightbox.
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxTitle = $('#lightboxTitle');
  const lightboxDescription = $('#lightboxDescription');
  let activeIndex = 0;
  let previousFocus = null;
  const visibleCards = () => cards.filter(card => !card.hidden);
  const showCard = index => {
    const visible = visibleCards();
    if (!visible.length) return;
    activeIndex = (index + visible.length) % visible.length;
    const card = visible[activeIndex];
    lightboxImage.src = card.dataset.image;
    lightboxImage.alt = card.querySelector('img')?.alt || card.dataset.title || 'Portfolio photograph';
    lightboxTitle.textContent = card.dataset.title || '';
    lightboxDescription.textContent = card.dataset.description || '';
  };
  const openLightbox = card => {
    previousFocus = document.activeElement;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showCard(visibleCards().indexOf(card));
    $('#lightboxClose').focus();
  };
  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lightboxImage.removeAttribute('src');
    previousFocus?.focus?.();
  };
  cards.forEach(card => card.addEventListener('click', () => openLightbox(card)));
  $('#lightboxClose').addEventListener('click', closeLightbox);
  $('#lightboxPrev').addEventListener('click', () => showCard(activeIndex - 1));
  $('#lightboxNext').addEventListener('click', () => showCard(activeIndex + 1));
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (!lightbox.classList.contains('open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showCard(activeIndex - 1);
    if (event.key === 'ArrowRight') showCard(activeIndex + 1);
  });

  // Prefilled email links. URLSearchParams safely encodes line breaks and special characters.
  const bookingSubject = 'Book a shoot with vectorrboom';
  const bookingBody = [
    'Hi there,',
    '',
    'I would like to book a shoot for <Event/Pet-Photoshoot/Pre-wedding/Birthday/Baby-Shower etc...> on <date>.',
    'Kindly do reach out on my number <contact number>.',
    '',
    'Regards,',
    '<your name>'
  ].join('\n');
  const concernSubject = 'Report a concern';
  const concernBody = [
    'Hi Vectorrboom,',
    '',
    'I would like to report a concern regarding your website or photography services.',
    '',
    'Concern details: <please describe the concern>',
    'Relevant page or link (if any): <URL>',
    'Date noticed: <date>',
    'Your contact number (optional): <contact number>',
    '',
    'Regards,',
    '<your name>'
  ].join('\n');
  const mailto = (subject, body) => `mailto:vectorrboom@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  ['#bookingEmail', '#bookingEmailSecondary'].forEach(selector => {
    const link = $(selector);
    if (link) link.href = mailto(bookingSubject, bookingBody);
  });
  const concernLink = $('#concernEmail');
  if (concernLink) concernLink.href = mailto(concernSubject, concernBody);

  $('#year').textContent = new Date().getFullYear();
})();
