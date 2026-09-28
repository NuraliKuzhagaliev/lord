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
        status.textContent = result?.configured ? 'КЛЮЧ ЗАДАН • НЕ ПРОВЕРЕН' : 'ИИ ПОКА НЕ ПОДКЛЮЧЁН';
        status.classList.toggle('is-unavailable', !result?.configured);
      })
      .catch(() => { status.textContent = 'СТАТУС НЕИЗВЕСТЕН'; });
  }

  function appendMessage(label, body, kind) {
    const item = document.createElement('div');
    item.className = `assistant-message assistant-message-${kind}`;
    const heading = document.createElement('span');
    heading.className = 'message-label';
    heading.textContent = label;
    const paragraph = document.createElement(kind === 'system' ? 'div' : 'p');
    if (kind === 'system') paragraph.className = 'assistant-reply';
    paragraph.textContent = body;
    item.append(heading, paragraph);
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    return paragraph;
  }

  function renderReply(container, answer) {
    container.replaceChildren();
    const lines = String(answer || '').replace(/\r\n?/g, '\n').split('\n');
    let list = null;
    let paragraph = [];

    function inline(parent, value) {
      const source = value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      const tokens = source.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|`[^`\n]+`)/g);
      tokens.forEach(token => {
        const bold = token.match(/^(?:\*\*(.*?)\*\*|__(.*?)__)$/);
        const italic = token.match(/^\*([^*]+)\*$/);
        const code = token.match(/^`([^`]+)`$/);
        if (bold || italic || code) {
          const element = document.createElement(bold ? 'strong' : italic ? 'em' : 'code');
          element.textContent = (bold && (bold[1] || bold[2])) || (italic && italic[1]) || (code && code[1]);
          parent.append(element);
        } else if (token) {
          parent.append(document.createTextNode(token));
        }
      });
    }

    function flushParagraph() {
      if (!paragraph.length) return;
      const element = document.createElement('p');
      inline(element, paragraph.join(' '));
      container.append(element);
      paragraph = [];
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) {
        flushParagraph();
        list = null;
        continue;
      }

      const tableStart = /^\|.*\|$/.test(line) && /^\|?[\s:|-]+\|?$/.test((lines[index + 1] || '').trim());
      if (tableStart) {
        flushParagraph();
        list = null;
        const tableWrap = document.createElement('div');
        tableWrap.className = 'assistant-table-wrap';
        const table = document.createElement('table');
        const header = line.slice(1, -1).split('|').map(cell => cell.trim());
        const headRow = document.createElement('tr');
        header.forEach(cell => {
          const heading = document.createElement('th');
          inline(heading, cell);
          headRow.append(heading);
        });
        const thead = document.createElement('thead');
        thead.append(headRow);
        table.append(thead);
        const tbody = document.createElement('tbody');
        index += 2;
        while (index < lines.length && /^\|.*\|$/.test(lines[index].trim())) {
          const row = document.createElement('tr');
          lines[index].trim().slice(1, -1).split('|').forEach(cell => {
            const entry = document.createElement('td');
            inline(entry, cell.trim());
            row.append(entry);
          });
          tbody.append(row);
          index += 1;
        }
        table.append(tbody);
        tableWrap.append(table);
        container.append(tableWrap);
        index -= 1;
        continue;
      }

      const heading = line.match(/^#{1,4}\s+(.+)$/);
      if (heading) {
        flushParagraph();
        list = null;
        const element = document.createElement('h3');
        inline(element, heading[1]);
        container.append(element);
        continue;
      }

      const bullet = line.match(/^[-*•]\s+(.+)$/);
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (bullet || numbered) {
        flushParagraph();
        const type = numbered ? 'ol' : 'ul';
        if (!list || list.tagName.toLowerCase() !== type) {
          list = document.createElement(type);
          container.append(list);
        }
        const item = document.createElement('li');
        inline(item, (bullet || numbered)[1]);
        list.append(item);
        continue;
      }

      list = null;
      paragraph.push(line.replace(/^>\s?/, ''));
    }
    flushParagraph();
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
      if (response.ok) renderReply(reply, result.answer);
      else reply.textContent = result.error || 'Не удалось получить ответ.';
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
