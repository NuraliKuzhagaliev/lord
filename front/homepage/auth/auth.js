document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('auth-form');
  const profileName = document.getElementById('profile-username');
  const base = '/api';
  const request = async (path, options = {}) => {
    const response = await fetch(base + path, { credentials: 'same-origin', ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
    return data;
  };
  if (form) {
    const title = document.getElementById('form-title');
    const message = document.getElementById('error-msg');
    const switchButton = document.getElementById('switch-btn');
    let signup = new URLSearchParams(location.search).get('mode') === 'signup';
    const render = () => {
      title.textContent = signup ? 'Создать аккаунт' : 'Войти в аккаунт';
      switchButton.textContent = signup ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться';
      message.textContent = '';
      document.getElementById('password').autocomplete = signup ? 'new-password' : 'current-password';
    };
    switchButton.addEventListener('click', () => { signup = !signup; render(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      message.textContent = 'Отправка…';
      try {
        await request(signup ? '/register' : '/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (signup) {
          signup = false; render();
          message.textContent = 'Аккаунт создан. Теперь войдите.';
          form.reset();
        } else location.href = 'profile.html';
      } catch (error) { message.textContent = error.message; }
    });
    render();
  }
  if (profileName) {
    request('/profile').then(data => {
      profileName.textContent = data.username;
      document.getElementById('profile-role').textContent = data.role;
      document.getElementById('profile-id').textContent = '#UID-' + data.id;
      document.getElementById('profile-date').textContent = new Date(data.created_at + 'Z').toLocaleDateString('ru-RU');
    }).catch(() => { location.href = 'auth.html'; });
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try { await request('/logout', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' }); }
      finally { location.href = '../home.html'; }
    });
  }
});
