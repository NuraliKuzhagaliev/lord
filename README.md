# LORD Security

Интерактивный сайт о практической кибербезопасности. Главная страница находится в `front/homepage/home.html`. Разделы «Решения», «База знаний», «О проекте», «Безопасность и данные», экспресс оценка риска, математическая лаборатория и учебный шифратор работают как обычные статические страницы.

## Запуск

- Быстрый просмотр страниц: `node serve-static.js` → http://127.0.0.1:4173. Если порт занят, задайте переменную `PORT` (например, `$env:PORT=4174; node serve-static.js` в PowerShell).
- Полный запуск с аккаунтами и опциональным AI API: установите Python 3.11+, создайте новое окружение и выполните `pip install -r back/server/requirements.txt`, затем `python back/server/app.py` → http://127.0.0.1:5000. Старое окружение в `back/server/venv` содержит пути прежнего компьютера, поэтому создайте новое.

Для развёртывания задайте `LORD_SECRET_KEY` (длинная случайная строка), `LORD_HTTPS_ONLY=1` при HTTPS, `LORD_PUBLIC_ORIGIN` при работе за обратным прокси, при необходимости `LORD_DB_PATH` и `LORD_GROQ_API_KEY`. AI ключ не передаётся браузеру. Если ключа нет, endpoint сообщает, что помощник не настроен. **Ранее опубликованный в браузерном JavaScript ключ нужно отозвать и перевыпустить у провайдера**: удаление из файлов не делает его снова секретным.

## Публичный сервер

Render запускает приложение командой `gunicorn --chdir back/server app:app --bind 0.0.0.0:$PORT` после `pip install -r back/server/requirements.txt`. Проверка доступности: `/healthz`.

Для аккаунтов на Render используется отдельный проект Supabase. SQL схема находится в `back/server/supabase_schema.sql`; функции доступны только при знании серверного `LORD_DB_GATE_KEY`. Задайте `LORD_HOSTED=1`, `LORD_HTTPS_ONLY=1`, `LORD_SECRET_KEY`, `LORD_SUPABASE_URL`, `LORD_SUPABASE_PUBLISHABLE_KEY` и `LORD_DB_GATE_KEY` в переменных Render. Без настроенного удалённого хранилища публичный сервер не принимает регистрацию и вход, чтобы не сохранять аккаунты в непостоянный файл.

Новые интерактивные инструменты добавляются в `front/homepage/tools-catalog.js`: из этого списка автоматически строятся меню «Инструменты», раздел «Проверьте гипотезу сами» и быстрый поиск. После изменения общей статической шапки запустите `python scripts/sync-site-shell.py`, чтобы обновить HTML запасного отображения. Страница «Чат с ИИ» использует `/api/assistant`; для ответов нужен новый `LORD_GROQ_API_KEY` в переменных Render.

## Границы инструментов

- Экспресс оценка риска выполняется локально и помогает сравнить сценарии. Это не аудит и не точная оценка ущерба.
- Pifagor Lab использует MathLive, Math.js и JSXGraph из CDN. Калькулятор не отправляет формулы на сервер.
- В Cipher Terminal современные режимы AES-GCM и RSA-OAEP работают через Web Crypto API на HTTPS или localhost. Классические шифры предназначены только для обучения. Не вводите реальные секреты в учебные примеры.
- Демонстрационный аккаунт использует HttpOnly cookie. Для реального публичного сервиса дополнительно нужны TLS, внешняя инфраструктура секретов, мониторинг, резервное копирование, CSRF стратегия под конкретный домен и проверка безопасности перед запуском.

Проверка локальных ссылок: `node scripts/check-links.js`. Синтаксис скриптов: `node --check <файл.js>`.

## Источники методологии

- [NIST CSF 2.0](https://www.nist.gov/cyberframework)
- [CISA Cybersecurity Performance Goals](https://www.cisa.gov/cybersecurity-performance-goals)
- [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)
