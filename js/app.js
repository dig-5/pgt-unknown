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

window.navigate = function(sectionId, pushHistory = true) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  
  const titulos = { 
    'inicio': 'INICIO', 'unknowns': 'UNKNOWNS', 'ubicados': 'UBICADOS', 
    'finalizados': 'FINALIZADOS', 'crear': 'CREAR PAQUETE', 
    'sin-ubicar': 'NO ENCONTRADOS', 'detalle-paquete': 'DETALLE DE PAQUETE' 
  };
  headerTitle.textContent = titulos[sectionId] || '';
  
  if (!sidebar.classList.contains('-translate-x-full')) toggleMenu();
  window.scrollTo(0, 0);

  if (pushHistory) {
    history.pushState({ section: sectionId }, '', `#${sectionId}`);
  }
};

window.addEventListener('popstate', (e) => {
  const imageViewer = document.getElementById('imageViewer');
  if (!imageViewer.classList.contains('hidden')) {
    window.cerrarVisorImagen(false); 
    return;
  }
  if (e.state && e.state.section) navigate(e.state.section, false); 
  else navigate('inicio', false); 
});

history.replaceState({ section: 'inicio' }, '', '#inicio');
