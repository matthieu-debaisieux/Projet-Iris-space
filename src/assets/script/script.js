const overlay = document.getElementById('dropdown-overlay');
const panel   = document.getElementById('dropdown-panel');
const checkbox = document.querySelector('.swap input');

function openMenu() {
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.remove('translate-x-full'));
}

function closeMenu() {
    panel.classList.add('translate-x-full');
    panel.addEventListener('transitionend', () => {
        overlay.classList.add('hidden');
    }, { once: true });
    if (checkbox) checkbox.checked = false;
}

checkbox?.addEventListener('change', () => {
    checkbox.checked ? openMenu() : closeMenu();
});

document.getElementById('dropdown-backdrop')?.addEventListener('click', closeMenu);
document.getElementById('dropdown-close')?.addEventListener('click', closeMenu);
