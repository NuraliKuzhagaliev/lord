// Context help for the educational cipher terminal; no remote API key is shipped.
document.addEventListener('DOMContentLoaded', () => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-orb';
  button.textContent = '?';
  button.setAttribute('aria-label', 'Открыть справку');
  const panel = document.createElement('aside');
  panel.className = 'help-panel';
  panel.hidden = true;
  panel.innerHTML = '<strong>О лаборатории шифрования</strong><p>Классические шифры здесь представлены для обучения. Для реальных данных используйте современные проверенные протоколы и инструменты.</p><a href="../homepage/learn.html">Открыть базу знаний ↗</a>';
  const style = document.createElement('style');
  style.textContent = '.help-orb{position:fixed;bottom:24px;left:24px;z-index:50;width:48px;height:48px;border-radius:50%;background:#a8f063;border:0;color:#0a1710;font:700 25px Arial;box-shadow:0 0 25px rgba(168,240,99,.35)}.help-panel{position:fixed;bottom:82px;left:24px;z-index:50;width:min(340px,calc(100vw - 48px));padding:22px;background:#101a21;border:1px solid #a8f063;color:#e6f1eb;box-shadow:0 20px 40px #0008}.help-panel[hidden]{display:none}.help-panel p{font-size:13px;color:#a5b8ad}.help-panel a{color:#a8f063}';
  button.addEventListener('click', () => { panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', String(!panel.hidden)); });
  document.head.append(style);
  document.body.append(button, panel);
});
