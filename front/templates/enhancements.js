(() => {
  const field = document.getElementById('mf');
  const output = document.getElementById('current-result');
  const history = document.getElementById('history-log');
  const legend = document.getElementById('legend-box');
  const precision = document.getElementById('precision');
  const angle = document.getElementById('angle-mode');
  const curves = new Map();
  let lastResult = '';

  function unwrapCommand(source, command, formatter) {
    let start = source.indexOf(command + '{');
    while (start !== -1) {
      let depth = 1, end = start + command.length + 1;
      while (end < source.length && depth) {
        if (source[end] === '{') depth++;
        if (source[end] === '}') depth--;
        end++;
      }
      if (depth) throw new Error('Не закрыта скобка в формуле');
      const inner = source.slice(start + command.length + 1, end - 1);
      const replacement = formatter(inner, source, end);
      source = source.slice(0, start) + replacement.value + source.slice(replacement.end ?? end);
      start = source.indexOf(command + '{');
    }
    return source;
  }

  function normalize(latex) {
    let source = latex.trim().replace(/\\left|\\right|\\,|\\!|\\;|\\:/g, '');
    for (let i = 0; i < 8; i++) {
      if (!source.includes('\\frac{')) break;
      source = unwrapCommand(source, '\\frac', (numerator, full, afterNumerator) => {
        if (full[afterNumerator] !== '{') throw new Error('Укажите знаменатель дроби');
        let depth = 1, end = afterNumerator + 1;
        while (end < full.length && depth) {
          if (full[end] === '{') depth++;
          if (full[end] === '}') depth--;
          end++;
        }
        if (depth) throw new Error('Не закрыт знаменатель дроби');
        return { value: '((' + numerator + ')/(' + full.slice(afterNumerator + 1, end - 1) + '))', end };
      });
    }
    source = unwrapCommand(source, '\\sqrt', inner => ({ value: 'sqrt(' + inner + ')' }));
    source = source.replace(/\\(sin|cos|tan|cot|asin|acos|atan|ln|log|pi|cdot|times)/g, (_, token) => ({
      ln:'log', log:'log10', pi:'pi', cdot:'*', times:'*'
    })[token] || token);
    source = source.replace(/\\mathrm\{([^}]*)\}/g, '$1').replace(/\\operatorname\{([^}]*)\}/g, '$1');
    source = source.replace(/[{}]/g, match => match === '{' ? '(' : ')');
    source = source.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    source = source.replace(/(\d)([a-zA-Z])/g, '$1*$2');
    return source;
  }
  window.parseLatex = normalize;

  const functions = new Set(['sin','cos','tan','cot','asin','acos','atan','sqrt','log','log10','abs','nthRoot','exp','floor','ceil','round']);
  function checkedNode(source, allowX = false) {
    if (source.length > 300) throw new Error('Формула слишком длинная');
    if (!/^[\d\s.a-zA-Z_+\-*/^(),%]+$/.test(source)) throw new Error('Недопустимый символ в формуле');
    const node = math.parse(source);
    const types = new Set(['OperatorNode','ConstantNode','SymbolNode','FunctionNode','ParenthesisNode']);
    node.traverse(child => {
      if (!types.has(child.type)) throw new Error('Эта операция недоступна');
      if (child.type === 'SymbolNode' && !functions.has(child.name) && !['pi','e'].includes(child.name) && !(allowX && child.name === 'x') && !Object.hasOwn(memory, child.name)) {
        throw new Error('Неизвестная переменная: ' + child.name);
      }
      if (child.type === 'FunctionNode' && !functions.has(child.name)) throw new Error('Функция недоступна: ' + child.name);
    });
    return node;
  }
  function scope(extra = {}) {
    const values = { ...memory, ...extra };
    if (angle.value === 'deg') {
      const rad = x => x * Math.PI / 180;
      values.sin = x => Math.sin(rad(x));
      values.cos = x => Math.cos(rad(x));
      values.tan = x => Math.tan(rad(x));
      values.cot = x => 1 / Math.tan(rad(x));
      values.asin = x => Math.asin(x) * 180 / Math.PI;
      values.acos = x => Math.acos(x) * 180 / Math.PI;
      values.atan = x => Math.atan(x) * 180 / Math.PI;
    }
    return values;
  }
  function formatted(value) {
    const number = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(number)) return String(Number(number.toPrecision(Number(precision.value))));
    if (value && typeof value.toString === 'function' && !['Infinity', 'NaN'].includes(value.toString())) return value.toString();
    throw new Error('Результат не является конечным числом');
  }
  function setResult(value, error = false) {
    output.textContent = value;
    output.style.color = error ? '#ff8790' : '#a8f063';
    if (!error) lastResult = value;
  }
  window.log = function(input, result, error = false) {
    const row = document.createElement('div');
    row.className = 'log-item' + (error ? ' error' : '');
    const expression = document.createElement('div');
    expression.textContent = input;
    expression.title = 'Нажмите, чтобы вернуть выражение';
    expression.style.cursor = 'pointer';
    expression.addEventListener('click', () => { field.setValue(input); field.focus(); });
    const value = document.createElement('div');
    value.className = 'log-res';
    value.textContent = '= ' + result;
    row.append(expression, value);
    history.appendChild(row);
    while (history.children.length > 80) history.firstElementChild.remove();
    history.scrollTop = history.scrollHeight;
  };
  window.clearHistory = () => history.replaceChildren();
  window.switchTab = (name, button) => {
    for (const tab of ['main','funcs','vars','geo']) document.getElementById('tab-' + tab).classList.toggle('hidden', tab !== name);
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.toggle('active', tab === button));
    if (name === 'geo') setTimeout(resizeBoard, 0);
  };
  window.solve = () => {
    const latex = field.getValue('latex').trim();
    if (!latex) return;
    try {
      const code = normalize(latex);
      const node = checkedNode(code);
      const result = formatted(node.compile().evaluate(scope()));
      window.log(latex, result);
      setResult(result);
      field.setValue('');
    } catch (error) {
      window.log(latex, error.message, true);
      setResult(error.message, true);
    }
  };
  window.saveVar = () => {
    const nameInput = document.getElementById('var-name');
    const valueInput = document.getElementById('var-val');
    const name = nameInput.value.trim();
    const raw = valueInput.value.trim();
    if (!/^[a-z][a-z0-9_]{0,15}$/i.test(name) || ['x','pi','e',...functions].includes(name)) {
      setResult('Имя: латинские буквы и цифры, кроме x и функций', true);
      return;
    }
    try {
      const code = normalize(raw);
      const value = checkedNode(code).compile().evaluate(scope());
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Переменная должна быть конечным числом');
      memory[name] = value;
      window.renderVars();
      nameInput.value = '';
      valueInput.value = '';
      setResult(name + ' = ' + formatted(value));
    } catch (error) { setResult(error.message, true); }
  };
  window.renderVars = () => {
    const list = document.getElementById('var-list');
    list.replaceChildren();
    for (const [name, value] of Object.entries(memory)) {
      const tag = document.createElement('div');
      tag.className = 'var-tag';
      const insert = document.createElement('button');
      insert.type = 'button';
      insert.textContent = name + ' = ' + formatted(value);
      insert.title = 'Вставить в формулу';
      insert.addEventListener('click', () => typeChar(name));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'del-btn';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Удалить переменную ' + name);
      remove.addEventListener('click', () => { delete memory[name]; window.renderVars(); });
      tag.append(insert, remove);
      list.appendChild(tag);
    }
  };
  window.addToLegend = (name, color, curve) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const dot = document.createElement('span');
    dot.className = 'legend-color';
    dot.style.backgroundColor = color;
    const label = document.createElement('span');
    label.textContent = name;
    label.style.overflowWrap = 'anywhere';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Удалить график ' + name);
    remove.addEventListener('click', () => { board.removeObject(curve); curves.delete(curve); item.remove(); });
    item.append(dot, label, remove);
    legend.appendChild(item);
    curves.set(curve, item);
  };
  window.removeLegendForCurve = curve => {
    curves.get(curve)?.remove();
    curves.delete(curve);
  };
  window.plotGraph = () => {
    const latex = field.getValue('latex').trim();
    if (!latex) return;
    try {
      const code = normalize(latex).replace(/^y\s*=\s*/, '');
      const compiled = checkedNode(code, true).compile();
      const evaluate = x => {
        const value = compiled.evaluate(scope({ x }));
        return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
      };
      if (![0, 1, 2, -1, .5].some(x => Number.isFinite(evaluate(x)))) throw new Error('Нет конечных значений для построения');
      const curve = board.create('functiongraph', [x => { try { return evaluate(x); } catch { return NaN; } }], { strokeColor:currentColor, strokeWidth:3, name:'' });
      window.addToLegend('y = ' + code, currentColor, curve);
      window.log(latex, 'График построен');
      setResult('График построен');
      field.setValue('');
    } catch (error) { window.log(latex, error.message, true); setResult(error.message, true); }
  };
  window.resetBoard = () => {
    for (const curve of curves.keys()) board.removeObject(curve);
    curves.clear();
    for (const object of [...geoCreated].reverse()) {
      try { board.removeObject(object); } catch { /* dependent object already removed */ }
    }
    geoCreated.clear();
    legend.replaceChildren();
    window.log('Полотно', 'Все построения очищены');
  };
  function functionAt() {
    const latex = field.getValue('latex').trim();
    if (!latex) throw new Error('Введите функцию от x');
    const code = normalize(latex).replace(/^y\s*=\s*/, '');
    return { latex, code, node: checkedNode(code, true) };
  }
  function point(id) {
    const value = Number(document.getElementById(id).value);
    if (!Number.isFinite(value)) throw new Error('Укажите конечную точку');
    return value;
  }
  window.differentiateCurrent = () => {
    try {
      const { latex, node } = functionAt();
      const derivative = math.derivative(node, 'x');
      const x = point('calc-point');
      const result = formatted(derivative.compile().evaluate(scope({ x })));
      window.log('d/dx ' + latex + ' | x=' + x, derivative.toString() + ' ; ' + result);
      setResult(result);
    } catch (error) { setResult(error.message, true); }
  };
  window.integrateCurrent = () => {
    try {
      const { latex, node } = functionAt();
      const a = point('calc-lower'), b = point('calc-upper');
      const compiled = node.compile();
      const segments = 1000, step = (b - a) / segments;
      let sum = 0;
      for (let i = 0; i <= segments; i++) {
        const value = compiled.evaluate(scope({ x: a + i * step }));
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Функция не определена на отрезке');
        sum += (i === 0 || i === segments ? 1 : i % 2 ? 4 : 2) * value;
      }
      const result = formatted(sum * step / 3);
      window.log('∫[' + a + ',' + b + '] ' + latex, result + ' (численно)');
      setResult(result);
    } catch (error) { setResult(error.message, true); }
  };
  window.limitCurrent = () => {
    try {
      const { latex, node } = functionAt();
      const x = point('calc-point'), compiled = node.compile();
      const values = [1e-3, 1e-4, 1e-5].map(h => [compiled.evaluate(scope({x:x-h})), compiled.evaluate(scope({x:x+h}))]);
      if (values.some(pair => pair.some(v => typeof v !== 'number' || !Number.isFinite(v)))) throw new Error('Предел не подтверждён численно');
      const [left,right] = values[2];
      if (Math.abs(left-right) > 1e-3 * Math.max(1,Math.abs(left),Math.abs(right))) throw new Error('Левый и правый пределы различаются');
      const result = formatted((left+right)/2);
      window.log('lim x→' + x + ' ' + latex, result + ' (оценка)');
      setResult(result);
    } catch (error) { setResult(error.message, true); }
  };
  window.exportPDF = () => {
    if (typeof html2pdf === 'undefined') { window.print(); return; }
    html2pdf().set({ margin:8, filename:'pifagor-lab.pdf', html2canvas:{ scale:1.5 }, jsPDF:{ unit:'mm',format:'a4',orientation:'landscape' } }).from(document.querySelector('.app-container')).save();
  };
  document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => { field.setValue(button.dataset.example); field.focus(); }));
  document.getElementById('copy-result').addEventListener('click', async () => {
    if (!lastResult) return;
    try { await navigator.clipboard.writeText(lastResult); setResult('Скопировано: ' + lastResult); }
    catch { setResult('Не удалось скопировать', true); }
  });
  document.getElementById('var-val').addEventListener('keydown', event => { if (event.key === 'Enter') window.saveVar(); });
  function resizeBoard() {
    const box = document.getElementById('jxgbox');
    if (box.clientWidth > 0 && box.clientHeight > 0) {
      board.resizeContainer(box.clientWidth, box.clientHeight);
      board.fullUpdate();
    }
  }
  if ('ResizeObserver' in window) new ResizeObserver(resizeBoard).observe(document.getElementById('jxgbox'));
  else window.addEventListener('resize', resizeBoard);
  resizeBoard();
})();
