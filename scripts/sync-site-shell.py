"""Keep static navigation fallback consistent across the plain HTML pages.

The interactive tool catalog itself lives in front/homepage/tools-catalog.js.
Run this script after changing the shared header design.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / "front"
HOME = FRONT / "homepage"
PAGES = [*HOME.rglob("*.html"), FRONT / "templates/calculator.html", FRONT / "shift/index.html"]

MARK = '''<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 44 44" fill="none"><path d="M22 2.5 39 12v20L22 41.5 5 32V12L22 2.5Z" stroke="currentColor" stroke-width="1.7"/><path d="M14 12v19h16" stroke="currentColor" stroke-width="3.8" stroke-linecap="square"/></svg></span>'''

TOOLS = [
    ("Оценка киберриска", "Сценарий, вероятность и влияние", "/homepage/risk.html", "LIKELIHOOD × IMPACT / ПРИОРИТЕТЫ", "RISK"),
    ("Pifagor Lab", "Калькулятор, графики и переменные", "/templates/calculator.html", "ФОРМУЛЫ / ГРАФИКИ / ПЕРЕМЕННЫЕ", "LAB"),
    ("Cipher Terminal", "Учебная криптография", "/shift/index.html", "ШИФРОВАНИЕ / ОБУЧЕНИЕ", "EDU"),
    ("Чат с ИИ", "Вопросы по кибербезопасности", "/homepage/assistant.html", "ВОПРОСЫ / ОБЪЯСНЕНИЯ / ПРАКТИКА", "AI"),
]


def brand(href: str) -> str:
    return f'<a class="brand" href="{href}" aria-label="LORD Security — главная">{MARK}<span class="brand-wordmark">LORD<span class="brand-sub">SECURITY</span></span></a>'


def header(page: Path) -> str:
    route = "/" + page.relative_to(FRONT).as_posix()
    home_route = "/homepage/home.html"
    links = [
        ("Главная", home_route),
        ("Решения", "/homepage/services.html"),
        ("База знаний", "/homepage/learn.html"),
        ("О проекте", "/homepage/about/about.html"),
    ]
    def navlink(label: str, href: str) -> str:
        active = ' class="is-active" aria-current="page"' if route == href else ""
        return f'<a href="{href}"{active}>{label}</a>'
    dropdown = "".join(
        f'<a href="{href}"{(" class=\"is-active\" aria-current=\"page\"" if route == href else "")}><span>{name}<small>{subtitle}</small></span><span class="tool-link-arrow" aria-hidden="true">↗</span></a>'
        for name, subtitle, href, _, _ in TOOLS
    )
    tool_active = " is-active" if route in {item[2] for item in TOOLS} else ""
    cta_active = ' is-active' if route == '/homepage/risk.html' else ''
    parts = [
        '<header class="site-header">',
        brand(home_route),
        '<button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="main-nav"><span></span><span></span><span></span></button>',
        '<nav id="main-nav" class="main-nav" aria-label="Основная навигация">',
        *(navlink(label, href) for label, href in links[:3]),
        f'<div class="nav-tools"><button class="nav-tools-trigger{tool_active}" type="button" aria-expanded="false" aria-controls="tools-menu">Инструменты <span class="nav-tools-indicator" aria-hidden="true"></span></button><div class="tools-dropdown" id="tools-menu" aria-label="Список инструментов">{dropdown}</div></div>',
        navlink(*links[3]),
        '<div class="lang-switch" role="group" aria-label="Language / Язык"><button type="button" data-lang="en" aria-label="English">EN</button><button type="button" data-lang="ru" aria-label="Русский">RU</button></div>',
        '</nav>',
        f'<a class="header-cta{cta_active}" href="/homepage/risk.html">Оценить риск <span class="cta-arrow" aria-hidden="true">↗</span></a>',
        '</header>',
    ]
    return "".join(parts)


for page in PAGES:
    raw = page.read_text(encoding="utf-8-sig")
    updated = raw
    shared = header(page)
    for pattern in (
        r'<header class="site-header">.*?</header>',
        r'<header class="lab-header">.*?</header>',
        r'<nav class="navbar"[^>]*>.*?</nav>',
    ):
        updated, count = re.subn(pattern, lambda _: shared, updated, count=1, flags=re.DOTALL)
        if count:
            break
    else:
        raise RuntimeError(f"No navigation header in {page}")

    # The old mark also appears in footers; update it without changing links.
    updated = re.sub(r'<a class="brand" href="([^"]+)"[^>]*>.*?</a>',
                     lambda match: brand(match.group(1)), updated, flags=re.DOTALL)
    updated = re.sub(r'(<(?:div|span) class="(?:section-kicker|lab-kicker|shift-kicker)">)\s*/\s*', r'\1', updated)

    if page == HOME / "home.html":
        rows = "".join(
            f'<a href="{href}" class="tool-row reveal"><span class="tool-index">{index:02d}</span><span class="tool-name">{name}<small>{meta}</small></span><span class="tool-tag">{tag}</span><span class="tool-arr" aria-hidden="true">↗</span></a>'
            for index, (name, _, href, meta, tag) in enumerate(TOOLS, 1)
        )
        updated = re.sub(r'(<div class="tool-list">).*?(</div></section>)',
                         lambda m: m.group(1) + rows + m.group(2), updated, count=1, flags=re.DOTALL)

    if page == HOME / "risk.html":
        updated = updated.replace('<button class="button ghost" type="reset">Сбросить</button><button class="button primary" type="button" id="print-report">Печать отчёта ↗</button>',
            '<button class="button ghost" type="reset"><span class="button-icon" aria-hidden="true">↺</span> Сбросить</button><button class="button primary" type="button" id="print-report"><span class="button-icon" aria-hidden="true">⎙</span> Печать отчёта</button>')

    css_base = "../homepage/" if page.parent in {FRONT / "templates", FRONT / "shift"} else "../" if page.parent in {HOME / "about", HOME / "auth"} else ""
    if 'navigation.css' not in updated:
        updated = updated.replace('</head>', f'<link rel="stylesheet" href="{css_base}navigation.css"><link rel="stylesheet" href="{css_base}site-polish.css"></head>', 1)
    if 'tools-catalog.js' not in updated:
        tool_script = f'<script src="{css_base}tools-catalog.js" defer></script>'
        site_script = f'<script src="{css_base}site.js" defer></script>'
        if site_script in updated:
            updated = updated.replace(site_script, tool_script + site_script, 1)
        else:
            updated = updated.replace('</body>', tool_script + site_script + '</body>', 1)
    i18n_script = f'<script src="{css_base}i18n.js" defer></script>'
    if 'i18n.js' not in updated:
        updated = updated.replace(f'<script src="{css_base}tools-catalog.js" defer></script>', i18n_script + f'<script src="{css_base}tools-catalog.js" defer></script>', 1)
    page.write_text(updated, encoding="utf-8")
    print(page.relative_to(ROOT).as_posix())
