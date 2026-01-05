document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    // Credenciales hardcodeadas (según requerimiento)
    // Usuario: estiloapple33
    // Pass: estilo33
    if (user === 'estiloapple33' && pass === 'estilo33') {
        // Login exitoso
        localStorage.setItem('estilo_admin_auth', 'true');
        localStorage.setItem('estilo_admin_user', user);

        errorMsg.classList.remove('visible');

        // Redirigir al dashboard
        window.location.href = 'index.html';
    } else {
        // Error de login
        errorMsg.textContent = 'Credenciales incorrectas';
        errorMsg.classList.add('visible');

        // Efecto visual de error
        const btn = document.querySelector('.btn-login');
        btn.style.backgroundColor = 'var(--danger)';
        setTimeout(() => {
            btn.style.backgroundColor = '';
        }, 500);
    }
});

// Comprobar si ya está logueado para redirigir si intenta entrar al login
if (localStorage.getItem('estilo_admin_auth') === 'true') {
    window.location.href = 'index.html';
}
