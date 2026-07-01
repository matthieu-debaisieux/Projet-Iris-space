// ── Connexion (page de login) ───────────────────────────────────────────────────
const loginBtn = document.getElementById('login-btn');

function handleLogin() {
    const email    = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const errorEl  = document.getElementById('login-error');

    if (email === 'admin' && password === 'admin') {
        window.location.href = './src/assets/pages/administration/AdminAccueil.html';
    } else if (errorEl) {
        errorEl.classList.remove('hidden');
    }
}

loginBtn?.addEventListener('click', handleLogin);
document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
});
