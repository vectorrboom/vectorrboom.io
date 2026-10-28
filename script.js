(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Set this to your GA4 Measurement ID (Admin → Data streams → Web).
  // Reports are available only to people signed into the Google Analytics property.
  const GA_MEASUREMENT_ID = 'G-REPLACE_ME';
  const CONSENT_KEY = 'vectorrboom-analytics-consent-v1';
  let analyticsReady = false;

  function track(eventName, params = {}) {
    if (analyticsReady && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }

  function loadAnalytics() {
    if (analyticsReady || !/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID) || GA_MEASUREMENT_ID === 'G-REPLACE_ME') return;
    analyticsReady = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(tag);
  }

  function storeConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
    const banner = $('#analyticsConsent');
    if (banner) banner.hidden = true;
    if (value === 'accepted') loadAnalytics();
    track('analytics_consent_updated', { consent_choice: value });
  }

  function buildConsentBanner() {
    let saved = null;
    try { saved = localStorage.getItem(CONSENT_KEY); } catch (_) {}
    if (saved === 'accepted') { loadAnalytics(); return; }
    if (saved === 'rejected') return;

    const banner = document.createElement('section');
    banner.id = 'analyticsConsent';
    banner.className = 'analytics-consent';
    banner.setAttribute('aria-label', 'Analytics privacy choice');
    banner.innerHTML = `
      <div class="analytics-consent-copy">
        <strong>Your privacy matters</strong>
        <p>With your permission, Google Analytics helps me understand overall visits and whether people find this portfolio through Google, Instagram or other links. It may use cookies and collect usage, device and approximate location information. <a href="privacy.html">Read the privacy notice</a>.</p>
      </div>
      <div class="analytics-consent-actions">
        <button type="button" class="consent-accept">Allow analytics</button>
        <button type="button" class="consent-reject">Reject</button>
      </div>`;
    document.body.appendChild(banner);
    $('.consent-accept', banner).addEventListener('click', () => storeConsent('accepted'));
    $('.consent-reject', banner).addEventListener('click', () => storeConsent('rejected'));
  }

  // Theme preference.
  const themeToggle = $('#themeToggle');
  const setThemeLabel = () => {
    if (!themeToggle) return;
    const isDark = document.documentElement.dataset.theme !== 'light';
    const label = $('.theme-label', themeToggle);
    const icon = $('.theme-icon', themeToggle);
    if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
    if (icon) icon.textContent = isDark ? '☼' : '☾';
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
    if (!nav) return;
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  $$('.desktop-nav a').forEach(link => link.addEventListener('click', () => {
    nav?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Reading progress bar (if present).
  const progress = $('#progress');
  if (progress) {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0}%`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // Scroll reveals.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealItems.forEach(el => observer.observe(el));
  } else revealItems.forEach(el => el.classList.add('visible'));

  // The home page may use a static gallery; the dedicated portfolio page has its own dynamic gallery.
  const filterButtons = $$('.filter-chip[data-filter]');
  const cards = $$('.gallery-card');
  const homeCount = $('#homeAllCount');
  if (homeCount) homeCount.textContent = String($('#homePreviewGrid')?.querySelectorAll('.gallery-card').length || 0);
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter || 'all';
    filterButtons.filter(item => item.closest('#homePreviewGrid') || item.closest('.gallery-controls')).forEach(item => item.classList.toggle('active', item === button));
    cards.forEach(card => { card.hidden = filter !== 'all' && card.dataset.category !== filter; });
    track('gallery_filter', { category: filter });
  }));

  // Optional static-gallery lightbox, if those elements exist on a page.
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxTitle = $('#lightboxTitle');
  const lightboxDescription = $('#lightboxDescription');
  let activeIndex = 0;
  let previousFocus = null;
  const visibleCards = () => cards.filter(card => !card.hidden);
  const showCard = index => {
    const visible = visibleCards();
    if (!visible.length || !lightboxImage) return;
    activeIndex = (index + visible.length) % visible.length;
    const card = visible[activeIndex];
    lightboxImage.src = card.dataset.image;
    lightboxImage.alt = card.querySelector('img')?.alt || card.dataset.title || 'Portfolio photograph';
    if (lightboxTitle) lightboxTitle.textContent = card.dataset.title || '';
    if (lightboxDescription) lightboxDescription.textContent = card.dataset.description || '';
  };
  const openLightbox = card => {
    if (!lightbox) return;
    previousFocus = document.activeElement;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showCard(visibleCards().indexOf(card));
    $('#lightboxClose')?.focus();
    track('portfolio_image_open', { image_category: card.dataset.category || 'unspecified' });
  };
  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lightboxImage?.removeAttribute('src');
    previousFocus?.focus?.();
  };
  cards.forEach(card => card.addEventListener('click', () => openLightbox(card)));
  $('#lightboxClose')?.addEventListener('click', closeLightbox);
  $('#lightboxPrev')?.addEventListener('click', () => showCard(activeIndex - 1));
  $('#lightboxNext')?.addEventListener('click', () => showCard(activeIndex + 1));
  lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (lightbox?.classList.contains('open')) closeLightbox();
      $('#photoLightbox')?.classList.remove('open');
    }
    if (lightbox?.classList.contains('open') && event.key === 'ArrowLeft') showCard(activeIndex - 1);
    if (lightbox?.classList.contains('open') && event.key === 'ArrowRight') showCard(activeIndex + 1);
  });

  // Prefilled email links; never send the visitor's email/message contents to analytics.
  const bookingSubject = 'Book a shoot with vectorrboom';
  const bookingBody = [
    'Hi there,', '',
    'I would like to book a shoot for <Event/Pet-Photoshoot/Pre-wedding/Birthday/Baby-Shower etc...> on <date>.',
    'Kindly do reach out on my number <contact number>.', '', 'Regards,', '<your name>'
  ].join('\n');
  const concernSubject = 'Report a concern';
  const concernBody = [
    'Hi Vectorrboom,', '',
    'I would like to report a concern regarding your website or photography services.', '',
    'Concern details: <please describe the concern>', 'Relevant page or link (if any): <URL>',
    'Date noticed: <date>', 'Your contact number (optional): <contact number>', '', 'Regards,', '<your name>'
  ].join('\n');
  const mailto = (subject, body) => `mailto:vectorrboom@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  ['#bookingEmail', '#bookingEmailSecondary'].forEach(selector => {
    const link = $(selector);
    if (link) {
      link.href = mailto(bookingSubject, bookingBody);
      link.addEventListener('click', () => track('booking_email_click', { contact_method: 'email' }));
    }
  });
  const concernLink = $('#concernEmail');
  if (concernLink) {
    concernLink.href = mailto(concernSubject, concernBody);
    concernLink.addEventListener('click', () => track('concern_email_click', { contact_method: 'email' }));
  }

  // Track only safe, high-level outbound link metadata. Do not send names, phone numbers or form contents.
  $$('a[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes('instagram.com')) link.addEventListener('click', () => track('social_outbound_click', { platform: 'instagram' }));
    else if (href.includes('pinterest.')) link.addEventListener('click', () => track('social_outbound_click', { platform: 'pinterest' }));
  });

  $('#year') && ($('#year').textContent = new Date().getFullYear());
  buildConsentBanner();

  // Privacy page can reopen consent controls so visitors can change their choice.
  $('#changeAnalyticsConsent')?.addEventListener('click', () => {
    try { localStorage.removeItem(CONSENT_KEY); } catch (_) {}
    const existing = $('#analyticsConsent');
    existing?.remove();
    buildConsentBanner();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
})();
