(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  const toolCatalog = Array.isArray(window.LORD_TOOLS) ? window.LORD_TOOLS : [];
  const toolText = (tool, field) => window.LORD_LANG === 'en' ? (tool[field + 'En'] || tool[field]) : tool[field];
  const currentPath = location.pathname === '/' ? '/homepage/home.html' : location.pathname;

  function makeToolLink(tool) {
    const link = document.createElement('a');
    link.href = tool.href;
    if (currentPath === tool.href) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
    const text = document.createElement('span');
    text.textContent = toolText(tool, 'name');
    const detail = document.createElement('small');
    detail.textContent = toolText(tool, 'subtitle');
    text.append(detail);
    const arrow = document.createElement('span');
    arrow.className = 'tool-link-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    link.append(text, arrow);
    return link;
  }

  const toolsMenu = document.querySelector('.nav-tools');
  const toolsTrigger = document.querySelector('.nav-tools-trigger');
  const toolsDropdown = document.querySelector('.tools-dropdown');
  if (toolCatalog.length && toolsDropdown) toolsDropdown.replaceChildren(...toolCatalog.map(makeToolLink));
  if (toolsMenu && toolsTrigger) {
    if (toolCatalog.some(tool => tool.href === currentPath)) toolsTrigger.classList.add('is-active');
    const closeTools = () => {
      toolsMenu.classList.remove('is-open');
      toolsTrigger.setAttribute('aria-expanded', 'false');
    };
    toolsTrigger.addEventListener('click', event => {
      event.stopPropagation();
      const open = toolsMenu.classList.toggle('is-open');
      toolsTrigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', event => { if (!toolsMenu.contains(event.target)) closeTools(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeTools(); });
    toolsMenu.addEventListener('mouseleave', () => {
      if (!toolsMenu.contains(document.activeElement)) closeTools();
    });
  }

  const toolList = document.querySelector('.tool-list');
  if (toolCatalog.length && toolList) {
    const rows = toolCatalog.map((tool, index) => {
      const link = document.createElement('a');
      link.href = tool.href;
      link.className = 'tool-row reveal';
      const number = document.createElement('span');
      number.className = 'tool-index';
      number.textContent = String(index + 1).padStart(2, '0');
      const name = document.createElement('span');
      name.className = 'tool-name';
      name.textContent = toolText(tool, 'name');
      const meta = document.createElement('small');
      meta.textContent = toolText(tool, 'meta');
      name.append(meta);
      const tag = document.createElement('span');
      tag.className = 'tool-tag';
      tag.textContent = tool.tag;
      const arrow = document.createElement('span');
      arrow.className = 'tool-arr';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(number, name, tag, arrow);
      return link;
    });
    toolList.replaceChildren(...rows);
  }

  document.querySelectorAll('.main-nav > a, .header-cta').forEach(link => {
    if (new URL(link.href).pathname === currentPath) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });
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
    ['Главная', 'Обзор платформы', '/homepage/home.html'],
    ['Решения', 'Оценка, защита, обнаружение и реагирование', '/homepage/services.html'],
    ['База знаний', 'Практики NIST, CISA и OWASP', '/homepage/learn.html'],
    ...toolCatalog.map(tool => [toolText(tool, 'name'), toolText(tool, 'subtitle'), tool.href]),
    ['О проекте', 'Миссия и принципы', '/homepage/about/about.html'],
    ['Безопасность и данные', 'Как устроена обработка данных', '/homepage/trust.html'],
    ['Личный кабинет', 'Демонстрационный профиль', '/homepage/auth/auth.html']
  ];
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'palette-trigger';
  trigger.setAttribute('aria-label', window.LORD_LANG === 'en' ? 'Open quick navigation' : 'Открыть быстрый переход');
  const triggerIcon = document.createElement('span');
  triggerIcon.className = 'palette-trigger-icon';
  triggerIcon.setAttribute('aria-hidden', 'true');
  triggerIcon.textContent = '⌕';
  const triggerLabel = document.createElement('span');
  triggerLabel.textContent = window.LORD_LANG === 'en' ? 'Quick navigation' : 'Быстрый переход';
  const triggerShortcut = document.createElement('kbd');
  triggerShortcut.textContent = 'Ctrl K';
  trigger.append(triggerIcon, triggerLabel, triggerShortcut);
  const backdrop = document.createElement('div');
  backdrop.className = 'palette-backdrop';
  backdrop.hidden = true;
  backdrop.innerHTML = '<div class="palette" role="dialog" aria-modal="true" aria-label="Быстрый переход"><div class="palette-header"><span>⌕</span><input type="search" aria-label="Найти раздел" placeholder="Найти раздел или инструмент…"><button class="palette-close" type="button" aria-label="Закрыть">ESC</button></div><div class="palette-results"></div><div class="palette-hint">↑ ↓ выбрать • Enter открыть • Esc закрыть</div></div>';
  document.body.append(trigger, backdrop);
  function buildFooter() {
    const english = window.LORD_LANG === 'en';
    const label = (ru, en) => english ? en : ru;
    const footer = document.querySelector('.site-footer') || document.createElement('footer');
    footer.className = 'site-footer';
    footer.replaceChildren();

    const atmosphere = document.createElement('div');
    atmosphere.className = 'footer-atmosphere';
    atmosphere.setAttribute('aria-hidden', 'true');
    const grid = document.createElement('span');
    const orbit = document.createElement('span');
    atmosphere.append(grid, orbit);

    const top = document.createElement('div');
    top.className = 'footer-topline';
    const eyebrow = document.createElement('span');
    eyebrow.textContent = 'LORD / SECURITY PLATFORM';
    const descriptor = document.createElement('span');
    descriptor.textContent = label('Ясность в каждом решении', 'Clarity at every decision');
    top.append(eyebrow, descriptor);

    const main = document.createElement('div');
    main.className = 'footer-main';
    const identity = document.createElement('div');
    identity.className = 'footer-identity';
    const brand = document.querySelector('.site-header .brand')?.cloneNode(true);
    if (brand) {
      brand.href = '/homepage/home.html';
      identity.append(brand);
    }
    const statement = document.createElement('p');
    statement.className = 'footer-statement';
    statement.textContent = label(
      'Понимайте риск. Проверяйте гипотезы. Принимайте решения с опорой на метод.',
      'Understand risk. Test assumptions. Make decisions with a clear method.'
    );
    const action = document.createElement('a');
    action.className = 'footer-action';
    action.href = '/homepage/risk.html';
    action.textContent = label('Начать оценку риска', 'Start a risk assessment');
    const actionArrow = document.createElement('span');
    actionArrow.setAttribute('aria-hidden', 'true');
    actionArrow.textContent = '↗';
    action.append(actionArrow);
    identity.append(statement, action);

    function link(name, href, external = false) {
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.textContent = name;
      if (external) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        const arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = ' ↗';
        anchor.append(arrow);
      }
      if (new URL(anchor.href).pathname === currentPath) anchor.setAttribute('aria-current', 'page');
      return anchor;
    }

    function column(title, entries, className = '') {
      const nav = document.createElement('nav');
      nav.className = `footer-column ${className}`.trim();
      nav.setAttribute('aria-label', title);
      const heading = document.createElement('h2');
      heading.textContent = title;
      nav.append(heading);
      entries.forEach(([name, href, external]) => nav.append(link(name, href, external)));
      return nav;
    }

    const explore = column(label('Платформа', 'Platform'), [
      [label('Главная', 'Home'), '/homepage/home.html'],
      [label('Решения', 'Solutions'), '/homepage/services.html'],
      [label('База знаний', 'Knowledge base'), '/homepage/learn.html'],
      [label('О проекте', 'About'), '/homepage/about/about.html'],
      [label('Безопасность и данные', 'Security & data'), '/homepage/trust.html']
    ]);
    const tools = column(label('Инструменты', 'Tools'), toolCatalog.map(tool => [toolText(tool, 'name'), tool.href]), 'footer-tools');
    const sources = column(label('Источники и проект', 'Sources & project'), [
      ['NIST CSF 2.0', 'https://www.nist.gov/cyberframework', true],
      ['CISA Cybersecurity Goals', 'https://www.cisa.gov/cybersecurity-performance-goals', true],
      ['OWASP Top 10', 'https://owasp.org/www-project-top-ten/', true],
      [label('Код проекта на GitHub', 'Project on GitHub'), 'https://github.com/NuraliKuzhagaliev/lord', true]
    ]);
    main.append(identity, explore, tools, sources);

    const bottom = document.createElement('div');
    bottom.className = 'footer-bottom';
    const copyright = document.createElement('span');
    copyright.textContent = `© ${new Date().getFullYear()} LORD Security`;
    const note = document.createElement('span');
    note.textContent = label('Образовательная платформа. Критичные решения проверяйте независимо.', 'Educational platform. Verify critical decisions independently.');
    const backToTop = document.createElement('button');
    backToTop.className = 'footer-back-to-top';
    backToTop.type = 'button';
    backToTop.textContent = label('Наверх ↑', 'Back to top ↑');
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' }));
    bottom.append(copyright, note, backToTop);
    footer.append(atmosphere, top, main, bottom);
    if (!footer.isConnected) document.body.append(footer);
  }
  buildFooter();
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
      link.href = url;
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
