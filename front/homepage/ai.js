// Optional assistant: requests are handled by the same-origin server.
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('ai-input');
  const output = document.getElementById('ai-text-content');
  const box = document.getElementById('ai-response');
  if (!input || !output || !box) return;
  input.addEventListener('keydown', async event => {
    if (event.key !== 'Enter') return;
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    box.style.display = 'block';
    output.textContent = 'Обработка запроса…';
    try {
      const response = await fetch('/api/assistant', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message}), credentials:'same-origin'
      });
      const data = await response.json();
      output.textContent = response.ok ? data.answer : data.error;
    } catch { output.textContent = 'Сервис временно недоступен.'; }
  });
});
