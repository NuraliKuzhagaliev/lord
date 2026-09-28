(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) {
        nav.classList.remove('open');
        menu.setAttribute('aria-expanded', 'false');
      }
    });
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px 40px 0px' });
    items.forEach(item => observer.observe(item));
  } else items.forEach(item => item.classList.add('in-view'));

  const title = document.querySelector('.scramble');
  if (title && !reduceMotion) {
    const target = title.dataset.text;
    const letters = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ';
    let running = false;
    title.addEventListener('mouseenter', () => {
      if (running) return;
      running = true;
      let step = 0;
      const timer = setInterval(() => {
        title.textContent = [...target].map((char, i) => i < step ? char : char === ' ' ? ' ' : letters[Math.floor(Math.random() * letters.length)]).join('');
        step += .55;
        if (step > target.length) {
          clearInterval(timer);
          title.textContent = target;
          running = false;
        }
      }, 45);
    });
  }
  const coreCaption = document.querySelector('.core small');
  if (coreCaption && !reduceMotion) {
    const captions = ['VISIBILITY → ACTION', 'RISK → RESPONSE', 'LEARN → IMPROVE'];
    let captionIndex = 0;
    setInterval(() => {
      coreCaption.classList.add('is-changing');
      setTimeout(() => {
        captionIndex = (captionIndex + 1) % captions.length;
        coreCaption.textContent = captions[captionIndex];
        coreCaption.classList.remove('is-changing');
      }, 350);
    }, 3400);
  }
  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);
  let frame = 0;
  const updateProgress = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const available = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (available > 0 ? Math.min(100, scrollY / available * 100) : 0) + '%';
    });
  };
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();

  const destinations = [
    ['Главная', 'Обзор платформы', 'home.html'],
    ['Решения', 'Оценка, защита, обнаружение и реагирование', 'services.html'],
    ['База знаний', 'Практики NIST, CISA и OWASP', 'learn.html'],
    ['Оценка киберриска', 'Интерактивная матрица', 'risk.html'],
    ['Pifagor Lab', 'Формулы и графики', '../templates/calculator.html'],
    ['Cipher Terminal', 'Учебная криптография', '../shift/index.html'],
    ['О проекте', 'Миссия и принципы', 'about/about.html'],
    ['Безопасность и данные', 'Как устроена обработка данных', 'trust.html'],
    ['Личный кабинет', 'Демонстрационный профиль', 'auth/auth.html']
  ];
  const base = location.pathname.includes('/about/') ? '../' : '';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'palette-trigger';
  trigger.textContent = '⌕  БЫСТРЫЙ ПЕРЕХОД   Ctrl K';
  trigger.setAttribute('aria-label', 'Открыть быстрый переход');
  const backdrop = document.createElement('div');
  backdrop.className = 'palette-backdrop';
  backdrop.hidden = true;
  backdrop.innerHTML = '<div class="palette" role="dialog" aria-modal="true" aria-label="Быстрый переход"><div class="palette-header"><span>⌕</span><input type="search" aria-label="Найти раздел" placeholder="Найти раздел или инструмент…"><button class="palette-close" type="button" aria-label="Закрыть">ESC</button></div><div class="palette-results"></div><div class="palette-hint">↑ ↓ выбрать • Enter открыть • Esc закрыть</div></div>';
  document.body.append(trigger, backdrop);
  const footerLinks = document.querySelector('.footer-links');
  if (footerLinks && !footerLinks.querySelector('a[href$="trust.html"]')) {
    const trust = document.createElement('a');
    trust.href = base + 'trust.html';
    trust.textContent = 'Безопасность и данные';
    footerLinks.appendChild(trust);
  }
  const search = backdrop.querySelector('input');
  const results = backdrop.querySelector('.palette-results');
  let lastFocus;
  function renderResults() {
    const query = search.value.trim().toLocaleLowerCase('ru');
    results.replaceChildren();
    const matches = destinations.filter(([label, subtitle]) => (label + ' ' + subtitle).toLocaleLowerCase('ru').includes(query));
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'palette-empty';
      empty.textContent = 'Раздел не найден';
      results.appendChild(empty);
      return;
    }
    for (const [label, subtitle, url] of matches) {
      const link = document.createElement('a');
      link.href = base + url;
      const name = document.createElement('span');
      name.textContent = label;
      const detail = document.createElement('small');
      detail.textContent = subtitle + ' ↗';
      link.append(name, detail);
      results.appendChild(link);
    }
  }
  const open = () => {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    search.value = '';
    renderResults();
    search.focus();
  };
  const close = () => {
    backdrop.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
  };
  trigger.addEventListener('click', open);
  backdrop.querySelector('.palette-close').addEventListener('click', close);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
  search.addEventListener('input', renderResults);
  search.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      const first = results.querySelector('a');
      if (first) location.href = first.href;
    }
    if (event.key === 'ArrowDown') { event.preventDefault(); results.querySelector('a')?.focus(); }
  });
  backdrop.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const focusables = [search, backdrop.querySelector('.palette-close'), ...results.querySelectorAll('a')];
      const index = focusables.indexOf(document.activeElement);
      if (event.shiftKey && index === 0) { event.preventDefault(); focusables.at(-1).focus(); }
      else if (!event.shiftKey && index === focusables.length - 1) { event.preventDefault(); search.focus(); }
    }
    if (event.key === 'ArrowDown' && document.activeElement.closest('.palette-results')) {
      event.preventDefault();
      document.activeElement.nextElementSibling?.focus();
    }
    if (event.key === 'ArrowUp' && document.activeElement.closest('.palette-results')) {
      event.preventDefault();
      (document.activeElement.previousElementSibling || search).focus();
    }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      backdrop.hidden ? open() : close();
    }
  });
})();
