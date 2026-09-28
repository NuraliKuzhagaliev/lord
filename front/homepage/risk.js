(() => {
  const ids = ['exposure', 'threat', 'business', 'data', 'controls'];
  const fields = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const form = document.getElementById('risk-form');
  const matrix = document.getElementById('risk-matrix');
  const scenario = document.getElementById('scenario');
  const levels = score => score <= 4 ? ['НИЗКИЙ РИСК', 'low'] : score <= 9 ? ['УМЕРЕННЫЙ РИСК', 'medium'] : score <= 16 ? ['ВЫСОКИЙ РИСК', 'high'] : ['КРИТИЧЕСКИЙ РИСК', 'critical'];
  for (let likelihood = 5; likelihood >= 1; likelihood--) {
    for (let impact = 1; impact <= 5; impact++) {
      const cell = document.createElement('div');
      const score = likelihood * impact;
      cell.className = 'matrix-cell ' + levels(score)[1];
      cell.textContent = score;
      cell.dataset.likelihood = likelihood;
      cell.dataset.impact = impact;
      matrix.appendChild(cell);
    }
  }
  const setText = (id, value) => { document.getElementById(id).textContent = value; };
  function update() {
    const v = Object.fromEntries(ids.map(id => [id, Number(fields[id].value)]));
    ids.forEach(id => setText(id + '-value', v[id]));
    const base = Math.round((v.exposure + v.threat) / 2);
    const reduction = Math.floor((v.controls - 1) / 2);
    const likelihood = Math.max(1, base - reduction);
    const impact = Math.max(v.business, v.data);
    const score = likelihood * impact;
    const [label, category] = levels(score);
    setText('score', String(score).padStart(2, '0'));
    setText('base-likelihood', base + ' / 5');
    setText('adjusted-likelihood', likelihood + ' / 5');
    setText('impact-score', impact + ' / 5');
    const level = document.getElementById('risk-level');
    level.textContent = label;
    level.className = 'risk-level ' + category;
    setText('scenario-summary', scenario.value.trim() || 'Сценарий пока не указан.');
    matrix.querySelectorAll('.matrix-cell').forEach(cell => cell.classList.toggle('active', Number(cell.dataset.likelihood) === likelihood && Number(cell.dataset.impact) === impact));
    const recommendations = [];
    if (v.exposure >= 3) recommendations.push('Уточните внешние точки входа и уменьшите доступность критичных интерфейсов.');
    if (v.threat >= 3) recommendations.push('Проверьте актуальные сценарии атаки и достаточность обнаружения.');
    if (v.controls <= 3) recommendations.push('Проверьте на практике MFA, минимальные права, обновления и резервное копирование.');
    if (v.business >= 4 || v.data >= 4) recommendations.push('Согласуйте план реагирования, владельцев решений и допустимое время восстановления.');
    if (score >= 10) recommendations.push('Запланируйте детальную экспертную оценку этого сценария в первую очередь.');
    if (!recommendations.length) recommendations.push('Сохраните свидетельства работоспособности мер и пересматривайте оценку при изменениях.');
    const list = document.getElementById('recommendation-list');
    list.replaceChildren(...recommendations.map(message => {
      const li = document.createElement('li');
      li.textContent = message;
      return li;
    }));
  }
  form.addEventListener('input', update);
  form.addEventListener('reset', () => setTimeout(update, 0));
  document.getElementById('print-report').addEventListener('click', () => window.print());
  update();
})();
