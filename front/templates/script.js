// --- ИНИЦИАЛИЗАЦИЯ ГРАФИКА (V10.1 IMPROVED GRID) ---
const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-10, 10, 10, -10],
    axis: true, 
    showCopyright: false,
     pan: {
        enabled: true,   // Разрешить двигать график (Pan)
        needShift: false, // НЕ нужно зажимать Shift (двигаем просто левой кнопкой)
        needTwoFingers: false // Для тачпадов
    }, 
     zoom: {
        enabled: true,   // Разрешить зум
        wheel: true,     // Зум колесиком мыши
        needShift: false, // НЕ нужно зажимать Shift для зума
        factorX: 1.25,   // Скорость зума по X
        factorY: 1.25    // Скорость зума по Y
    },
    
    // Настройки осей
    defaultAxes: {
        x: {
            name: 'X',
            withLabel: true,
            label: { position: 'rt', offset: [-5, 10], color: '#00ff41' }, // Ярко-зеленая буква X
            strokeColor: '#00aa22', // Ось темно-зеленая
            strokeWidth: 2,
            ticks: {
                strokeColor: '#00aa22',
                majorHeight: 10, // Крупные риски
                minorHeight: 4,  // Мелкие риски
                drawLabels: true, // Рисовать цифры
                label: {
                    color: '#00ff41', // Цифры ярко-зеленые
                    offset: [-2, -15],
                    fontSize: 12
                }
            }
        },
        y: {
            name: 'Y',
            withLabel: true,
            label: { position: 'rt', offset: [10, -5], color: '#00ff41' },
            strokeColor: '#00aa22',
            strokeWidth: 2,
            ticks: {
                strokeColor: '#00aa22',
                majorHeight: 10,
                minorHeight: 4,
                drawLabels: true,
                label: {
                    color: '#00ff41',
                    offset: [10, -3],
                    fontSize: 12
                }
            }
        }
    },
    
    // Настройки сетки
    grid: {
        gridX: 1, gridY: 1, // Шаг основной сетки
        strokeColor: '#004400', // Темно-зеленая сетка (фон)
        strokeOpacity: 0.5,
        strokeWidth: 1
    }
});

// Добавляем мелкую сетку (Sub-grid) вручную, т.к. в JSXGraph это отдельный объект
// Это добавит много маленьких квадратиков для точности
board.create('grid', [], {
    gridX: 0.5, gridY: 0.5,
    strokeColor: '#002200', // Очень темная, еле заметная
    strokeOpacity: 0.3,
    strokeWidth: 1,
    layer: 0
});


// Делаем сетку более заметной
board.options.grid.strokeColor = '#444'; 
board.options.grid.strokeOpacity = 0.5;


board.defaultAxes.x.setAttribute({ strokeColor: '#666', ticks: {strokeColor: '#666'} });
board.defaultAxes.y.setAttribute({ strokeColor: '#666', ticks: {strokeColor: '#666'} });
board.options.grid.strokeColor = '#333';
board.options.text.color = '#ccc';

// --- ИНСТРУМЕНТЫ ГЕОМЕТРИИ ---
let geoMode = 'move';
let tempPoints = [];
let eraseMode = false;
const geoCreated = new Set();

function setGeoTool(mode) {
    eraseMode = false;
    document.getElementById('erase-btn').classList.remove('erase-active');
    
    geoMode = mode;
    tempPoints = [];
    document.getElementById('tool-status').innerText = mode.toUpperCase();
}

function toggleEraseMode() {
    eraseMode = !eraseMode;
    geoMode = 'move';
    const btn = document.getElementById('erase-btn');
    
    if (eraseMode) {
        btn.classList.add('erase-active');
        document.getElementById('tool-status').innerText = "ERASER (CLICK OBJECT)";
    } else {
        btn.classList.remove('erase-active');
        document.getElementById('tool-status').innerText = "VIEW";
    }
}

board.on('down', function(e) {
    if (eraseMode) {
        let el = board.getAllUnderMouse(e)[0];
        
        // ПРОВЕРКА: Не удалять оси и их текст
        if (el) {
            // Если это ось, сетка или фон - выходим
            if (el.id.includes('axis') || el.id.includes('grid') || el.type === JXG.OBJECT_TYPE_AXIS) return;
            // Если это цифра на оси (у них обычно нет имени или спец. атрибуты)
            // В JSXGraph тексты осей - это часть оси, но иногда они отдельные.
            // Проверка: удалять только Точки, Линии, Круги, Графики функций
            const allowedTypes = [
                JXG.OBJECT_TYPE_POINT, 
                JXG.OBJECT_TYPE_LINE, 
                JXG.OBJECT_TYPE_CIRCLE, 
                JXG.OBJECT_TYPE_CURVE, // Графики функций
                JXG.OBJECT_TYPE_TEXT // Обычный текст (но надо аккуратно)
            ];
            
            if (allowedTypes.includes(el.type) && !el.getAttribute('fixed')) {
                 // Доп. защита: не удалять если это подпись оси (обычно они заблокированы)
                 board.removeObject(el);
                 geoCreated.delete(el);
                 window.removeLegendForCurve?.(el);
                 
                 // Если удалили график, надо бы и из легенды убрать (но это сложно найти соответствие)
                 // Проще нажать "Очистить все" или перезагрузить для полной очистки.
            }
        }
        return;
    }

    if (geoMode === 'move') return;

    let coords = getMouseCoords(e);
    
    // === ВОТ ЗДЕСЬ ИЗМЕНЕНИЯ ===
    if (geoMode === 'point') {
        // Используем currentColor вместо жесткого цвета
        geoCreated.add(board.create('point', coords, {name:'', size:3, color: currentColor}));
    } 
    else if (['line', 'circle'].includes(geoMode)) {
        // Точки для построения тоже делаем выбранным цветом
        let p = board.create('point', coords, {name:'', size:3, color: currentColor});
        geoCreated.add(p);
        tempPoints.push(p);
        
        if (tempPoints.length === 2) {
            // Если построили линию - используем currentColor
            if (geoMode === 'line') {
                geoCreated.add(board.create('line', [tempPoints[0], tempPoints[1]], {
                    strokeColor: currentColor, 
                    strokeWidth: 2
                }));
            }
            // Если построили круг - используем currentColor
            if (geoMode === 'circle') {
                geoCreated.add(board.create('circle', [tempPoints[0], tempPoints[1]], {
                    strokeColor: currentColor, 
                    strokeWidth: 2
                }));
            }
            tempPoints = []; // Сброс временных точек
        }
    }
});

function getMouseCoords(e) {
    let cPos = board.getCoordsTopLeftCorner(e);
    let absPos = JXG.getPosition(e);
    let dx = absPos[0] - cPos[0];
    let dy = absPos[1] - cPos[1];
    return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board).usrCoords.slice(1);
}
function createPoint(coords) { return board.create('point', coords, {name:'', size:3, color:'#00bcd4'}); }


// --- КАЛЬКУЛЯТОР ---
const mf = document.getElementById('mf');
let memory = {};

function insertCmd(cmd) { mf.executeCommand(['insert', cmd]); mf.focus(); }
function typeChar(char) { mf.executeCommand(['insert', char]); mf.focus(); }
function clearAll() { mf.setValue(''); }
function backspace() { mf.executeCommand('deleteBackward'); mf.focus(); }

// === ОБНОВЛЕННЫЙ БЛОК ВЫЧИСЛЕНИЙ И ГРАФИКИ ===

function solve() {
    let latex = mf.getValue('latex');
    if (!latex) return;
    
    let code = parseLatex(latex);
    
    try {
        let res;
        // Algebrite обязателен для интегралов
        if (code.includes('integral') || code.includes('d(') || code.includes('limit')) {
             // Подставляем переменные
             let script = "";
             for(let k in memory) script += `${k}=${memory[k]}\n`;
             script += code;
             
             res = Algebrite.run(script);
        } else {
             // Обычная математика
             res = math.evaluate(code, memory);
        }

        // Фикс для комплексных чисел или странных объектов
        if (typeof res === 'object') res = res.toString();
        
        log(latex, res);
        mf.setValue('');
    } catch(e) {
        log(latex, `<span style="color:#f00">Error</span>`);
        console.error(e);
    }
}



let currentColor = '#00bcd4'; // Цвет по умолчанию (Cyan)


function setColor(hex, el) {
    currentColor = hex;
    // Визуальное обновление активной кнопки
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

function plotGraph() {
    let latex = mf.getValue('latex');
    if (!latex) return;

    let code = parseLatex(latex).replace(/^y=/, '');
    
    // Формируем красивое название (y = ...)
    let labelText = latex.startsWith('y=') ? latex : `y=${latex}`;

    try {
        let expr = math.compile(code);
        
        // Тест на ошибки
        let scopeTest = { x: 0, ...memory };
        let testVal = expr.evaluate(scopeTest);
        if (typeof testVal !== 'number' && isNaN(testVal)) throw new Error("NaN");

        // Строим график с ВЫБРАННЫМ ЦВЕТОМ
        let curve = board.create('functiongraph', [
            function(x_val) { 
                try { return expr.evaluate({ x: x_val, ...memory }); } 
                catch(e) { return NaN; }
            }
        ], { 
            strokeColor: currentColor, // <--- ИСПОЛЬЗУЕМ ВЫБРАННЫЙ ЦВЕТ
            strokeWidth: 3,
            name: labelText 
        });

        // ДОБАВЛЯЕМ В ЛЕГЕНДУ
        addToLegend(labelText, currentColor);

        log(latex, "Plotted");
        mf.setValue(''); 
        
    } catch(e) { 
        log(latex, `<span style="color:#ff3333">Error</span>`);
    }
}

// ФУНКЦИЯ ДОБАВЛЕНИЯ В ЛЕГЕНДУ
function addToLegend(name, color) {
    const box = document.getElementById('legend-box');
    const item = document.createElement('div');
    item.className = 'legend-item';
    const marker = document.createElement('span');
    marker.className = 'legend-color';
    marker.style.backgroundColor = color;
    item.append(marker, document.createTextNode(name));
    box.appendChild(item);
}

// Вспомогательная: Очистка легенды при сбросе графика
function resetBoard() { 
    JXG.JSXGraph.freeBoard(board); 
    document.getElementById('legend-box').replaceChildren();
    location.reload(); 
}




// === ИСПРАВЛЕННЫЙ ПАРСЕР ===
// === УЛУЧШЕННЫЙ ПАРСЕР LATEX ===
// === УЛУЧШЕННЫЙ ПАРСЕР LaTeX -> Algebrite/MathJS ===
function parseLatex(s) {
    console.log("Raw LaTeX:", s);
    
    // 0. ПРЕДВАРИТЕЛЬНАЯ ОЧИСТКА
    s = s.replace(/\\left|\\right|\\,|\\!|\\;|\\:|\\mathnormal|\\mathrm|\\text/g, '');
    s = s.replace(/\\placeholder\{?\}/g, '');
    s = s.replace(/\^\{?([0-9]+)\}?/g, '^$1'); // x^2
    
    // 1. ИНТЕГРАЛЫ (САМОЕ СЛОЖНОЕ)
    // Удаляем dx
    s = s.replace(/d[a-z]\b/g, ''); 

    // С определенными пределами \int_{a}^{b} expr
    // RegExp ловит: \int_{...}^{...} ...
    s = s.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}\s*(.+)/g, 'integral($3, x, $1, $2)');
    
    // С простыми пределами (одна цифра) \int_0^1 expr
    s = s.replace(/\\int_([0-9a-z]+)\^([0-9a-z]+)\s*(.+)/g, 'integral($3, x, $1, $2)');

    // Неопределенный интеграл
    s = s.replace(/\\int\s*(.+)/g, 'integral($1, x)');

    // 2. ЛОГАРИФМЫ
    // \log_{2} 8 -> log(8)/log(2) (так надежнее для всех движков)
    s = s.replace(/\\log_\{?([0-9a-z\.]+)\}?\(?([0-9a-z\.]+)\)?/g, '(log($2)/log($1))');
    // \log (без основания) -> log10
    s = s.replace(/\\log/g, 'log10');
    // \ln -> log (натуральный)
    s = s.replace(/\\ln/g, 'log');

    // 3. ФУНКЦИИ И ОПЕРАТОРЫ
    s = s.replace(/\\pi/g, 'pi');
    s = s.replace(/\\cdot/g, '*');
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
    s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'nthRoot($2, $1)');
    s = s.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
    
    // 4. ТРИГОНОМЕТРИЯ (Убираем слэши)
    ['sin', 'cos', 'tan', 'cot'].forEach(f => {
        s = s.replace(new RegExp('\\\\' + f, 'g'), f);
    });

    // 5. АВТО-УМНОЖЕНИЕ (Разделение слипшихся)
    // 15x -> 15*x, но не ломая integral(15x...)
    // Поэтому делаем это АККУРАТНО
    // Сначала защищаем ключевые слова
    s = s.replace(/integral/g, 'INT_TEMP');
    s = s.replace(/log/g, 'LOG_TEMP');
    s = s.replace(/sqrt/g, 'SQRT_TEMP');
    
    // Теперь разделяем: цифра+буква
    s = s.replace(/([0-9])([a-z])/gi, '$1*$2');
    
    // Возвращаем ключевые слова
    s = s.replace(/INT_TEMP/g, 'integral');
    s = s.replace(/LOG_TEMP/g, 'log');
    s = s.replace(/SQRT_TEMP/g, 'sqrt');
    
    console.log("Parsed:", s);
    return s;
}




// UI
function switchTab(name) {
    document.getElementById('tab-main').classList.add('hidden');
    document.getElementById('tab-funcs').classList.add('hidden');
    document.getElementById('tab-vars').classList.add('hidden');
    document.getElementById('tab-geo').classList.add('hidden');
    document.getElementById('tab-' + name).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function log(req, res) {
    const logBox = document.getElementById('history-log');
    const div = document.createElement('div');
    div.className = 'log-item';
    const expression = document.createElement('div');
    expression.textContent = req;
    const result = document.createElement('div');
    result.className = 'log-res';
    result.textContent = '= ' + res;
    div.append(expression, result);
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}



// --- ЛОГИКА ПЕРЕМЕННЫХ (ОБНОВЛЕННАЯ) ---

function saveVar() {
    let name = document.getElementById('var-name').value.trim();
    let valStr = document.getElementById('var-val').value.trim();
    
    if (name && valStr) {
        // Мы НЕ вычисляем значение сейчас. Мы сохраняем выражение.
        // Это позволяет делать зависимости: a = 5, b = a * 2. 
        // Если потом изменить a, b пересчитается само при следующем использовании.
        
        // Если ввели LaTeX (слэши), парсим в код. Если нет - оставляем как есть.
        let code = valStr.includes('\\') ? parseLatex(valStr) : valStr;

        memory[name] = code; // Сохраняем формулу/число как строку
        
        renderVars();
        
        document.getElementById('var-name').value = '';
        document.getElementById('var-val').value = '';
    }
}


// Новая функция удаления
function deleteVar(name) {
    delete memory[name];
    renderVars();
}

// Новая функция редактирования (заполняет поля)
function editVar(name) {
    document.getElementById('var-name').value = name;
    document.getElementById('var-val').value = memory[name];
}

function renderVars() {
    const list = document.getElementById('var-list');
    list.replaceChildren();
    
    for(let k in memory) {
        let tag = document.createElement('div');
        tag.className = 'var-tag';
        
        // HTML: Имя = Значение + Кнопка удаления (крестик)
        // event.stopPropagation() нужен, чтобы клик по крестику не считался кликом по переменной
        const value = document.createElement('span');
        value.textContent = k + ' = ' + memory[k];
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'del-btn';
        remove.textContent = '×';
        remove.addEventListener('click', event => { event.stopPropagation(); deleteVar(k); });
        tag.append(value, remove);
        
        // Одиночный клик: Вставить переменную в формулу
        tag.onclick = () => typeChar(k);
        
        // Двойной клик: Редактировать
        tag.ondblclick = () => editVar(k);
        
        list.appendChild(tag);
    }
}
// --- ОБРАБОТКА ENTER ---
// Ждем пока загрузится DOM
document.addEventListener('DOMContentLoaded', () => {
    const mf = document.getElementById('mf');

    // MathLive событие 'beforeinput' или перехват клавиш
    mf.addEventListener('keydown', (evt) => {
        // Проверяем, нажат ли Enter
        if (evt.key === 'Enter') {
            evt.preventDefault(); // Чтобы не переносил строку
            solve(); // Вызываем решение
        }
    });

    // Дополнительно: фокусируемся на поле при старте
    mf.focus();
});
function clearHistory() {
    document.getElementById('history-log').replaceChildren();
}



function exportPDF() { html2pdf().from(document.body).save('math.pdf'); }



