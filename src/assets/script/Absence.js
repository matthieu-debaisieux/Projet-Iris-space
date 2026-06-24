document.addEventListener('DOMContentLoaded', () => {
 
  let activeId = null; // id de l'élève actuellement affiché
 
  function closeDetailRow() {
    const existing = document.getElementById('detail-row');
    if (existing) existing.remove();
    activeId = null;
  }
 
  function openDetailRow(studentTd) {
    const id = studentTd.dataset.student;
    const studentRow = studentTd.closest('tr');
    const template = document.getElementById('card-' + id);
    if (!template || !studentRow) return;
 
    // Si on reclique sur le même élève, on referme juste
    if (activeId === id) {
      closeDetailRow();
      return;
    }
 
    // Ferme la card précédente s'il y en a une ouverte
    closeDetailRow();
 
    // Clone le contenu du gabarit (sans la classe "hidden")
    const clone = template.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove('hidden');
    clone.classList.remove('mt-4'); // plus besoin de marge, on est dans le tableau
 
    // Construit la nouvelle ligne du tableau
    const newRow = document.createElement('tr');
    newRow.id = 'detail-row';
 
    const newCell = document.createElement('td');
    newCell.colSpan = 2;
    newCell.className = 'p-0 bg-gray-50';
 
    const wrapper = document.createElement('div');
    wrapper.className = 'p-4';
    wrapper.appendChild(clone);
 
    newCell.appendChild(wrapper);
    newRow.appendChild(newCell);
 
    // Insère la nouvelle ligne juste après la ligne de l'élève
    studentRow.insertAdjacentElement('afterend', newRow);
 
    // Le bouton "Fermer" à l'intérieur du clone doit fermer cette ligne
    const closeBtn = clone.querySelector('.close-card');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDetailRow);
    }
 
    activeId = id;
  }
 
  // Clic sur le nom de l'élève
  document.querySelectorAll('.student-name').forEach(td => {
    td.addEventListener('click', () => openDetailRow(td));
  });
 
});