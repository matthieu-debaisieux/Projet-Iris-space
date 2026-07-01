const contactModal = document.getElementById('contact-modal');
        const openContactModalBtn = document.getElementById('open-contact-modal');
        const closeContactModalBtn = document.getElementById('close-contact-modal');
        const confirmContactCloseBtn = document.getElementById('confirm-contact-close');

        function openContactModal() {
            contactModal.classList.remove('hidden');
            contactModal.classList.add('flex');
            document.body.classList.add('overflow-hidden');
        }

        function closeContactModal() {
            contactModal.classList.add('hidden');
            contactModal.classList.remove('flex');
            document.body.classList.remove('overflow-hidden');
        }

        openContactModalBtn?.addEventListener('click', openContactModal);
        closeContactModalBtn?.addEventListener('click', closeContactModal);
        confirmContactCloseBtn?.addEventListener('click', closeContactModal);

        contactModal?.addEventListener('click', (event) => {
            if (event.target === contactModal) {
                closeContactModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeContactModal();
            }
        });