(() => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  const themeLabel = themeToggle.querySelector('.theme-label');
  const setTheme = theme => {
    root.dataset.theme = theme;
    try { localStorage.setItem('portfolio-theme', theme); } catch (_) {}
    const light = theme === 'light';
    themeIcon.textContent = light ? '☾' : '☼';
    themeLabel.textContent = light ? 'Dark mode' : 'Light mode';
    document.querySelector('meta[name="theme-color"]').content = light ? '#f4f2ec' : '#101010';
    themeToggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  };
  setTheme(root.dataset.theme || 'dark');
  themeToggle.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  const progress = document.getElementById('progress');
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? window.scrollY / max * 100 : 0) + '%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealEls.forEach(el => observer.observe(el));
  } else revealEls.forEach(el => el.classList.add('is-visible'));

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
      const filter = chip.dataset.filter;
      document.querySelectorAll('.gallery-card').forEach(card => {
        card.hidden = filter !== 'all' && card.dataset.category !== filter;
      });
    });
  });

  const lightbox = document.getElementById('lightbox');
  const lbImage = document.getElementById('lightboxImage');
  const lbTitle = document.getElementById('lightboxTitle');
  const lbDescription = document.getElementById('lightboxDescription');
  const cards = [...document.querySelectorAll('.gallery-card')];
  let currentIndex = 0;
  const visibleCards = () => cards.filter(c => !c.hidden);
  const openAt = card => {
    currentIndex = visibleCards().indexOf(card);
    showImage();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('lightboxClose').focus();
  };
  const showImage = () => {
    const list = visibleCards();
    if (!list.length) return;
    currentIndex = (currentIndex + list.length) % list.length;
    const card = list[currentIndex];
    lbImage.src = card.dataset.image;
    lbImage.alt = card.querySelector('img').alt;
    lbTitle.textContent = card.dataset.title;
    lbDescription.textContent = card.dataset.description;
  };
  const close = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  cards.forEach(card => card.addEventListener('click', () => openAt(card)));
  document.getElementById('lightboxClose').addEventListener('click', close);
  document.getElementById('lightboxPrev').addEventListener('click', () => { currentIndex--; showImage(); });
  document.getElementById('lightboxNext').addEventListener('click', () => { currentIndex++; showImage(); });
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') { currentIndex++; showImage(); }
    if (e.key === 'ArrowLeft') { currentIndex--; showImage(); }
  });

  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.desktop-nav');
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false');
  }));
  document.getElementById('year').textContent = new Date().getFullYear();
})();
