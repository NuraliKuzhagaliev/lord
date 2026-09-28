(() => {
  const form = document.getElementById('assistant-form');
  const input = document.getElementById('assistant-input');
  const messages = document.getElementById('assistant-messages');
  const send = document.getElementById('assistant-send');
  const status = document.getElementById('assistant-status');
  if (!form || !input || !messages || !send) return;

  if (status) {
    fetch('/api/assistant/status', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        status.textContent = result?.available ? 'ИИ ПОДКЛЮЧЁН' : 'ИИ ПОКА НЕ ПОДКЛЮЧЁН';
        status.classList.toggle('is-unavailable', !result?.available);
      })
      .catch(() => { status.textContent = 'СТАТУС НЕИЗВЕСТЕН'; });
  }

  function appendMessage(label, body, kind) {
    const item = document.createElement('div');
    item.className = `assistant-message assistant-message-${kind}`;
    const heading = document.createElement('span');
    heading.className = 'message-label';
    heading.textContent = label;
    const paragraph = document.createElement('p');
    paragraph.textContent = body;
    item.append(heading, paragraph);
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    return paragraph;
  }

  document.querySelectorAll('[data-prompt]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.prompt;
      input.focus();
    });
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || send.disabled) return;
    input.value = '';
    appendMessage('ВЫ', message, 'user');
    const reply = appendMessage('LORD / ASSISTANT', 'Подготавливаю ответ…', 'system');
    send.disabled = true;
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message, language: window.LORD_LANG === 'en' ? 'en' : 'ru' })
      });
      const result = await response.json();
      reply.textContent = response.ok ? result.answer : (result.error || 'Не удалось получить ответ.');
      if (!response.ok) reply.parentElement.classList.add('assistant-message-error');
    } catch {
      reply.textContent = 'Связь с помощником временно недоступна.';
      reply.parentElement.classList.add('assistant-message-error');
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
})();
