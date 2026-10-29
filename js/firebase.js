import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- PEGA AQUÍ TU CONFIGURACIÓN ---
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "ptgunknown.firebaseapp.com",
  projectId: "ptgunknown",
  storageBucket: "ptgunknown.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const paquetesRef = collection(db, "paquetes");

window.paquetesData = []; 
let isMultiMode = false;
let selectedIds = new Set();
let visibleIds = []; 

onSnapshot(paquetesRef, (snapshot) => {
  window.paquetesData = [];
  snapshot.forEach(doc => { window.paquetesData.push({ id: doc.id, ...doc.data() }); });
  window.renderSinUbicar();
  window.renderUbicados();
  window.renderFinalizados();
});

function cumpleFiltroTexto(p, filtroTexto) {
  if (!filtroTexto) return true;
  return p.id.toLowerCase().includes(filtroTexto) ||
        (p.Casilla && p.Casilla.toLowerCase().includes(filtroTexto)) ||
        (p.Courier && p.Courier.toLowerCase().includes(filtroTexto)) ||
        (p.NombreCliente && p.NombreCliente.toLowerCase().includes(filtroTexto)) ||
        (p.TituloSolicitud && p.TituloSolicitud.toLowerCase().includes(filtroTexto));
}

// --- RENDER: SIN UBICAR ---
window.renderSinUbicar = function() {
  const grid = document.getElementById('gridSinUbicar');
  const noResultsMsg = document.getElementById('noResultsMsgSU');
  const filtroTexto = document.getElementById('searchInput').value.toLowerCase().trim();
  const filtroUbi = document.getElementById('filtroUbicacion').value;
  grid.innerHTML = '';
  visibleIds = [];
  let count = 0;

  window.paquetesData.forEach(p => {
    if (p.Estado !== "SinUbicar") return;
    if (filtroUbi && p.Ubicacion !== filtroUbi) return;
    if (!cumpleFiltroTexto(p, filtroTexto)) return;
    visibleIds.push(p.id);
    count++;

    const isChecked = selectedIds.has(p.id) ? 'checked' : '';
    const imgHtml = p.ImagenURL 
      ? `<div class="relative w-full h-40 mb-4 bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-gray-700">
           <img src="${p.ImagenURL}" class="w-full h-full object-cover cursor-pointer" onclick="abrirVisorImagen(event, '${p.ImagenURL}')" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
           <div class="hidden text-gray-500 italic text-sm text-center px-2">*No se encontró la imagen*</div>
         </div>`
      : `<div class="w-full h-40 mb-4 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-center text-gray-500 italic text-sm">*No se encontró la imagen*</div>`;

    const borderColor = (isMultiMode && selectedIds.has(p.id)) ? 'border-blue-500 border-2' : 'border-gray-700';
    const card = document.createElement('article');
    card.id = `card-su-${p.id}`; // ID para la animación
    card.className = `bg-gray-800 border ${borderColor} rounded-2xl p-4 shadow-lg flex flex-col transition cursor-pointer hover:border-gray-500 relative`;
    card.onclick = () => { if (isMultiMode) window.toggleSelect(p.id); else window.abrirDetalle(p, 'sin-ubicar'); };

    const checkOverlay = isMultiMode 
      ? `<div class="absolute top-4 left-4 z-10 p-1 bg-gray-800 rounded-full border border-gray-600 shadow-md">
            <input type="checkbox" class="custom-checkbox block" ${isChecked} onclick="event.stopPropagation(); window.toggleSelect('${p.id}')">
         </div>` : '';

    card.innerHTML = `
      ${checkOverlay}
      ${imgHtml}
      <div class="flex flex-col gap-1 mb-4 text-base">
        <p><span class="text-gray-400">Trk:</span> <span class="font-mono text-white font-semibold">${p.id}</span></p>
        <div class="flex justify-between mt-1">
          <p><span class="text-gray-400">Courier:</span> ${p.Courier}</p>
          <p><span class="text-gray-400">Casilla:</span> ${p.Casilla || 'N/A'}</p>
        </div>
        <p><span class="text-gray-400">Ubicación:</span> ${p.Ubicacion}</p>
      </div>
      <div class="mt-auto flex gap-2 ${isMultiMode ? 'hidden' : ''}">
        <button class="flex-1 bg-transparent border border-gray-400 hover:bg-gray-700 rounded-lg py-3 text-base transition" onclick="actualizarEstadoAnimado(event, '${p.id}', 'ListoProcesar', 'card-su-${p.id}')">Listo p/ procesar</button>
        <button class="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 text-base transition" onclick="actualizarEstadoAnimado(event, '${p.id}', 'Procesado', 'card-su-${p.id}')">Procesar</button>
      </div>
    `;
    grid.appendChild(card);
  });
  document.getElementById('countSinUbicar').textContent = `Unknown (${count})`;
  count === 0 ? noResultsMsg.classList.remove('hidden') : noResultsMsg.classList.add('hidden');
};

// --- RENDER: UBICADOS ---
window.renderUbicados = function() {
  const grid = document.getElementById('gridUbicados');
  const noResultsMsg = document.getElementById('noResultsMsgUbi');
  const filtroTexto = document.getElementById('searchInputUbi').value.toLowerCase().trim();
  const filtroEstado = document.getElementById('filtroEstadoUbi').value;
  const filtroContestado = document.getElementById('filtroContestadoUbi').value;
  grid.innerHTML = '';
  let count = 0;

  window.paquetesData.forEach(p => {
    const esUbicado = (p.Estado === "ListoProcesar" || p.Estado === "Procesado") && !(p.Estado === "Procesado" && p.Contestado === true);
    if (!esUbicado) return;
    if (filtroEstado && p.Estado !== filtroEstado) return;
    if (filtroContestado === "true" && p.Contestado !== true) return;
    if (filtroContestado === "false" && p.Contestado === true) return;
    if (!cumpleFiltroTexto(p, filtroTexto)) return;
    count++;

    const btnProcesarHtml = p.Estado !== 'Procesado' 
      ? `<button id="btn-proc-${p.id}" class="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-base transition" onclick="accionUbicadosAnimado(event, '${p.id}', 'Procesado')">Procesar</button>` : '';
    const btnContestarHtml = p.Contestado !== true 
      ? `<button id="btn-cont-${p.id}" class="w-full bg-transparent border border-gray-400 hover:bg-gray-700 text-white rounded-lg py-2.5 text-base transition" onclick="accionUbicadosAnimado(event, '${p.id}', 'Contestar')">Contestar</button>` : '';

    const card = document.createElement('article');
    card.id = `card-ubi-${p.id}`; // ID para animación
    card.className = "bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col relative overflow-hidden transition";
    card.innerHTML = `
      <div class="pr-[110px]">
        <p class="font-mono text-base mb-1 text-white"><span class="text-gray-400">Trk:</span> ${p.id}</p>
        <p class="text-base mb-1 text-gray-200"><span class="text-gray-400">Plataforma:</span> ${p.PlataformaSolicitud}</p>
        <p class="text-base mb-1 text-gray-200 truncate"><span class="text-gray-400">Título:</span> ${p.TituloSolicitud}</p>
        <p id="txt-estado-${p.id}" class="text-base mb-1 text-blue-400 transition"><span class="text-gray-400">Estado:</span> ${p.Estado === 'ListoProcesar' ? 'Listo p/ procesar' : 'Procesado'}</p>
        <p id="txt-contestado-${p.id}" class="text-base mb-1 text-gray-200 transition"><span class="text-gray-400">Contestado:</span> ${p.Contestado ? 'Sí' : 'No'}</p>
      </div>
      <div class="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 w-[100px]">
        ${btnProcesarHtml}
        ${btnContestarHtml}
        <button class="w-full bg-gray-700 border border-gray-500 hover:bg-gray-600 text-white rounded-lg py-2.5 text-base transition" onclick="window.abrirDetalle(window.paquetesData.find(x => x.id === '${p.id}'), 'ubicados')">Detalles</button>
      </div>
    `;
    grid.appendChild(card);
  });
  document.getElementById('countUbicados').textContent = `Unknown (${count})`;
  count === 0 ? noResultsMsg.classList.remove('hidden') : noResultsMsg.classList.add('hidden');
};

// --- RENDER: FINALIZADOS ---
window.renderFinalizados = function() {
  const grid = document.getElementById('gridFinalizados');
  const noResultsMsg = document.getElementById('noResultsMsgFin');
  const filtroTexto = document.getElementById('searchInputFin').value.toLowerCase().trim();
  grid.innerHTML = '';
  let count = 0;

  window.paquetesData.forEach(p => {
    if (p.Estado !== "Procesado" || p.Contestado !== true) return;
    if (!cumpleFiltroTexto(p, filtroTexto)) return;
    count++;
    const card = document.createElement('article');
    card.className = "bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col relative overflow-hidden";
    card.innerHTML = `
      <div class="pr-[110px]">
        <p class="font-mono text-base mb-1 text-white"><span class="text-gray-400">Trk:</span> ${p.id}</p>
        <p class="text-base mb-1 text-gray-200"><span class="text-gray-400">Plataforma:</span> ${p.PlataformaSolicitud}</p>
        <p class="text-base mb-1 text-gray-200 truncate"><span class="text-gray-400">Título:</span> ${p.TituloSolicitud}</p>
        <p class="text-base mb-1 text-green-400"><span class="text-gray-400">Estado:</span> Procesado</p>
        <p class="text-base mb-1 text-green-400"><span class="text-gray-400">Contestado:</span> Sí</p>
      </div>
      <div class="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 w-[100px]">
        <button class="w-full bg-gray-700 border border-gray-500 hover:bg-gray-600 text-white rounded-lg py-2.5 text-base transition" onclick="window.abrirDetalle(window.paquetesData.find(x => x.id === '${p.id}'), 'finalizados')">Detalles</button>
      </div>
    `;
    grid.appendChild(card);
  });
  document.getElementById('countFinalizados').textContent = `Unknown (${count})`;
  count === 0 ? noResultsMsg.classList.remove('hidden') : noResultsMsg.classList.add('hidden');
};


// --- EVENTOS (Filtros) ---
document.getElementById('searchInput').addEventListener('input', window.renderSinUbicar);
document.getElementById('filtroUbicacion').addEventListener('change', window.renderSinUbicar);
document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
  document.getElementById('searchInput').value = "";
  document.getElementById('filtroUbicacion').value = "";
  window.renderSinUbicar();
});
document.getElementById('searchInputUbi').addEventListener('input', window.renderUbicados);
document.getElementById('filtroEstadoUbi').addEventListener('change', window.renderUbicados);
document.getElementById('filtroContestadoUbi').addEventListener('change', window.renderUbicados);
document.getElementById('searchInputFin').addEventListener('input', window.renderFinalizados);


// --- ACTUALIZACIONES CON ANIMACIONES ---

// 1. Animación individual en Sin Ubicar (Desvanece todo el bloque)
window.actualizarEstadoAnimado = function(event, id, nuevoEstado, cardId) {
  event.stopPropagation();
  const card = document.getElementById(cardId);
  card.classList.add('fade-out'); // Inicia animación visual
  
  setTimeout(async () => {
    try { await updateDoc(doc(db, "paquetes", id), { Estado: nuevoEstado }); } 
    catch (error) { alert("Error: " + error.message); card.classList.remove('fade-out'); }
  }, 300); // 300ms = tiempo de la transición
};

// 2. Animaciones Dinámicas en Ubicados
window.accionUbicadosAnimado = function(event, id, accion) {
  event.stopPropagation();
  const paquete = window.paquetesData.find(p => p.id === id);
  const card = document.getElementById(`card-ubi-${id}`);
  
  // Si al hacer la acción el paquete termina en Procesado + Contestado = true, desaparece el bloque entero
  const seVaAFinalizados = (accion === 'Procesado' && paquete.Contestado === true) || 
                           (accion === 'Contestar' && paquete.Estado === 'Procesado');

  if (seVaAFinalizados) {
    card.classList.add('fade-out');
  } else {
    // Si no se va, solo desvanece el botón específico que se clickeó
    if (accion === 'Procesado') {
        const btn = document.getElementById(`btn-proc-${id}`);
        if(btn) btn.classList.add('fade-out');
        const txt = document.getElementById(`txt-estado-${id}`);
        if(txt) { txt.classList.add('fade-out'); setTimeout(() => { txt.innerHTML = `<span class="text-gray-400">Estado:</span> Procesado`; txt.classList.remove('fade-out'); }, 300); }
    } else {
        const btn = document.getElementById(`btn-cont-${id}`);
        if(btn) btn.classList.add('fade-out');
        const txt = document.getElementById(`txt-contestado-${id}`);
        if(txt) { txt.classList.add('fade-out'); setTimeout(() => { txt.innerHTML = `<span class="text-gray-400">Contestado:</span> Sí`; txt.classList.remove('fade-out'); }, 300); }
    }
  }

  // Esperar animación y subir a Firebase
  setTimeout(async () => {
    try {
      if (accion === 'Procesado') await updateDoc(doc(db, "paquetes", id), { Estado: 'Procesado' });
      else await updateDoc(doc(db, "paquetes", id), { Contestado: true });
    } catch (error) { alert("Error: " + error.message); }
  }, 300);
};


// --- VISOR DE IMÁGENES Y ZOOM ---
window.abrirVisorImagen = function(event, url) {
  event.stopPropagation(); 
  history.pushState({ view: 'imagen' }, '', '#imagen'); // Añadir al historial
  const viewerImg = document.getElementById('viewerImg');
  viewerImg.src = url;
  viewerImg.classList.remove('scale-200');
  viewerImg.classList.replace('cursor-zoom-out', 'cursor-zoom-in');
  document.getElementById('imageViewer').classList.replace('hidden', 'flex');
};

window.cerrarVisorImagen = function(triggerBack = true) {
  document.getElementById('imageViewer').classList.replace('flex', 'hidden');
  if (triggerBack) history.back(); // Solo sacar del historial si lo cerró con el botón/fondo
};

window.toggleZoom = function(img) {
  if(img.classList.contains('scale-200')) {
    img.classList.remove('scale-200');
    img.classList.replace('cursor-zoom-out', 'cursor-zoom-in');
  } else {
    img.classList.add('scale-200');
    img.classList.replace('cursor-zoom-in', 'cursor-zoom-out');
  }
};


// --- DETALLES DE PAQUETE ---
window.abrirDetalle = function(p, vistaOrigen) {
  history.pushState({ section: 'detalle-paquete' }, '', '#detalle-paquete');
  
  const contenedor = document.getElementById('detalleContenedor');
  const imgHtml = p.ImagenURL 
      ? `<div class="relative w-full h-64 mb-6 bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-gray-700">
           <img src="${p.ImagenURL}" class="w-full h-full object-cover cursor-pointer" onclick="abrirVisorImagen(event, '${p.ImagenURL}')" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
           <div class="hidden text-gray-500 italic text-base text-center px-2">*No se encontró la imagen*</div>
         </div>`
      : `<div class="w-full h-64 mb-6 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-center text-gray-500 italic text-base">*No se encontró la imagen*</div>`;

  let fechaStr = "N/A";
  if (p.FechaCreacion && p.FechaCreacion.toDate) fechaStr = p.FechaCreacion.toDate().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  
  let estadoTxt = p.Estado === 'SinUbicar' ? 'Sin Ubicar' : p.Estado === 'ListoProcesar' ? 'Listo p/ procesar' : 'Procesado';
  const contestadoTxt = p.Contestado ? 'Sí' : 'No';

  let htmlInfo = `
    ${imgHtml}
    <div class="space-y-3 mb-6 flex-1 text-base">
      <p class="text-gray-300 font-mono"><span class="font-bold text-gray-400 font-sans">Tracking:</span> ${p.id}</p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Courier:</span> ${p.Courier}</p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Casilla:</span> ${p.Casilla || 'N/A'}</p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Cliente:</span> ${p.NombreCliente || 'N/A'}</p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Ubicación:</span> ${p.Ubicacion}</p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Plataforma:</span> ${p.PlataformaSolicitud}</p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Título Solicitud:</span> ${p.TituloSolicitud}</p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Estado:</span> <span class="text-blue-400">${estadoTxt}</span></p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Contestado:</span> ${contestadoTxt}</p>
      <p class="text-gray-300"><span class="font-bold text-gray-400">Fecha Creado:</span> ${fechaStr}</p>
    </div>
  `;

  let htmlBotones = '';
  if (vistaOrigen === 'sin-ubicar') {
    htmlBotones = `
      <div class="flex gap-4 mt-auto">
        <button onclick="actualizarDesdeDetalle('${p.id}', 'ListoProcesar')" class="flex-1 bg-transparent border border-gray-400 hover:bg-gray-700 text-white rounded-lg py-3.5 text-base font-semibold transition">Listo p/ procesar</button>
        <button onclick="actualizarDesdeDetalle('${p.id}', 'Procesado')" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3.5 text-base font-semibold transition">Procesar</button>
      </div>
    `;
  } 
  else if (vistaOrigen === 'ubicados') {
    const btnProc = p.Estado !== 'Procesado' ? `<button onclick="actualizarDesdeDetalle('${p.id}', 'Procesado')" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3.5 text-base font-semibold transition">Procesar</button>` : '';
    const btnCont = p.Contestado !== true ? `<button onclick="contestarDesdeDetalle('${p.id}')" class="flex-1 bg-transparent border border-gray-400 hover:bg-gray-700 text-white rounded-lg py-3.5 text-base font-semibold transition">Contestar</button>` : '';
    htmlBotones = `<div class="flex gap-4 mt-auto">${btnCont}${btnProc}</div>`;
  }

  contenedor.innerHTML = htmlInfo + htmlBotones;
  
  // Usar la función interna para no crear otra entrada duplicada de historia
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById('detalle-paquete').classList.add('active');
  document.getElementById('headerTitle').textContent = 'DETALLE DE PAQUETE';
  window.scrollTo(0, 0);
};

window.actualizarDesdeDetalle = async function(id, nuevoEstado) {
  await updateDoc(doc(db, "paquetes", id), { Estado: nuevoEstado });
  history.back(); // Simular volver atrás (esto nos retorna a ubicados/sin-ubicar)
};

window.contestarDesdeDetalle = async function(id) {
  await updateDoc(doc(db, "paquetes", id), { Contestado: true });
  history.back();
};

// --- LÓGICA DE SELECCIÓN MÚLTIPLE MASIVA ANIMADA ---
window.toggleSelect = function(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  actualizarCheckboxMaestro();
  window.renderSinUbicar(); 
};

function actualizarCheckboxMaestro() {
  const chkSelectAll = document.getElementById('chkSelectAll');
  if (visibleIds.length > 0 && visibleIds.every(x => selectedIds.has(x))) chkSelectAll.checked = true;
  else chkSelectAll.checked = false;
}

document.getElementById('chkSelectAll').addEventListener('change', (e) => {
  if (e.target.checked) visibleIds.forEach(id => selectedIds.add(id));
  else visibleIds.forEach(id => selectedIds.delete(id));
  window.renderSinUbicar();
});

document.getElementById('btnToggleMulti').addEventListener('click', () => {
  isMultiMode = !isMultiMode;
  if (!isMultiMode) { selectedIds.clear(); document.getElementById('chkSelectAll').checked = false; }
  document.getElementById('btnToggleMulti').textContent = isMultiMode ? "Desactivar s/ múltiple" : "Selección múltiple";
  document.getElementById('multiActionsHeader').classList.toggle('hidden', !isMultiMode);
  window.renderSinUbicar();
});

window.procesarMultiples = function(nuevoEstado) {
  if (selectedIds.size === 0) return alert("Selecciona al menos un paquete");
  const confirmacion = confirm(`¿Mover ${selectedIds.size} paquetes a "${nuevoEstado}"?`);
  if (!confirmacion) return;

  // 1. Animamos todos los seleccionados
  selectedIds.forEach(id => {
    const card = document.getElementById(`card-su-${id}`);
    if (card) card.classList.add('fade-out');
  });

  // 2. Esperamos y enviamos el batch
  setTimeout(async () => {
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => { batch.update(doc(db, "paquetes", id), { Estado: nuevoEstado }); });
      await batch.commit();
      
      selectedIds.clear();
      isMultiMode = false;
      document.getElementById('chkSelectAll').checked = false;
      document.getElementById('btnToggleMulti').textContent = "Selección múltiple";
      document.getElementById('multiActionsHeader').classList.add('hidden');
      window.renderSinUbicar();
    } catch (error) { alert("Error masivo: " + error.message); }
  }, 300);
};

// --- CREAR PAQUETE ---
const formCrear = document.getElementById('formCrearPaquete');
formCrear.addEventListener('submit', async (e) => {
  e.preventDefault();
  const trackingRaw = document.getElementById('inputTracking').value.trim();
  const trackingClean = trackingRaw.replace(/\//g, "-");
  const btn = document.getElementById('btnGuardar');
  btn.disabled = true; btn.textContent = "Guardando...";
  try {
    const paqueteDatos = {
      Courier: document.getElementById('inputCourier').value,
      Casilla: document.getElementById('inputCasilla').value.trim(),
      Ubicacion: document.getElementById('inputUbicacion').value,
      PlataformaSolicitud: document.getElementById('inputPlataforma').value,
      TituloSolicitud: document.getElementById('inputTitulo').value.trim(),
      ImagenURL: document.getElementById('inputImagenURL').value.trim(),
      Estado: "SinUbicar", Contestado: false, FechaCreacion: serverTimestamp()
    };
    const nombreCliente = document.getElementById('inputNombreCliente').value.trim();
    if (nombreCliente !== "") paqueteDatos.NombreCliente = nombreCliente;

    await setDoc(doc(db, "paquetes", trackingClean), paqueteDatos);
    alert("¡Paquete " + trackingClean + " creado exitosamente!");
    formCrear.reset();
  } catch (error) { alert("Error: " + error.message); } 
  finally { btn.disabled = false; btn.textContent = "Crear"; document.getElementById('inputTracking').focus(); }
});