const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const headerTitle = document.getElementById('headerTitle');

function toggleMenu() {
  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
}

menuBtn.addEventListener('click', toggleMenu);
closeMenuBtn.addEventListener('click', toggleMenu);
overlay.addEventListener('click', toggleMenu);

// Sistema de Navegación con Historial (Botón Atrás del celular/PC)
window.navigate = function(sectionId, pushHistory = true) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  
  const titulos = { 
    'inicio': 'INICIO', 'sin-ubicar': 'SIN UBICAR', 'ubicados': 'UBICADOS', 
    'finalizados': 'FINALIZADOS', 'crear': 'CREAR PAQUETE', 'detalle-paquete': 'DETALLE DE PAQUETE' 
  };
  headerTitle.textContent = titulos[sectionId] || '';
  
  if (!sidebar.classList.contains('-translate-x-full')) toggleMenu();
  window.scrollTo(0, 0);

  // Agregar al historial del navegador
  if (pushHistory) {
    history.pushState({ section: sectionId }, '', `#${sectionId}`);
  }
};

// Escuchar el botón "Atrás" del navegador/móvil
window.addEventListener('popstate', (e) => {
  // 1. Si el visor de imagen está abierto, cerrarlo en lugar de cambiar de página
  const imageViewer = document.getElementById('imageViewer');
  if (!imageViewer.classList.contains('hidden')) {
    window.cerrarVisorImagen(false); // Falso para no ensuciar el historial
    return;
  }

  // 2. Navegar a la sección anterior
  if (e.state && e.state.section) {
    navigate(e.state.section, false); // false para no duplicar el historial
  } else {
    navigate('inicio', false); // Por defecto ir al inicio
  }
});

// Guardar el estado inicial al cargar la página
history.replaceState({ section: 'inicio' }, '', '#inicio');