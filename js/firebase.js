import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE ---
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
  window.renderUnknowns();
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

function generarHtmlImagen(url) {
  return url 
    ? `<div class="relative w-full h-40 mb-4 bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-gray-700">
         <img src="${url}" class="w-full h-full object-cover cursor-pointer" onclick="abrirVisorImagen(event, '${url}')" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
         <div class="hidden text-gray-500 italic text-sm text-center px-2">*No se encontró la imagen*</div>
       </div>`
    : `<div class="w-full h-40 mb-4 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-center text-gray-500 italic text-sm">*No se encontró la imagen*</div>`;
}

// --- RENDER: UNKNOWNS (Estado: Desconocido) ---
window.renderUnknowns = function() {
  const grid = document.getElementById('gridUnknowns');
  const noResultsMsg = document.getElementById('noResultsMsgUnk');
  const filtroTexto = document.getElementById('searchInputUnk').value.toLowerCase().trim();
  const filtroUbi = document.getElementById('filtroUbicacionUnk').value;
  grid.innerHTML = '';
  visibleIds = [];
  let count = 0;

  window.paquetesData.forEach(p => {
    if (p.Estado !== "Desconocido") return;
    if (filtroUbi && p.Ubicacion !== filtroUbi) return;
    if (!cumpleFiltroTexto(p, filtroTexto)) return;
    visibleIds.push(p.id);
    count++;

    const isChecked = selectedIds.has(p.id) ? 'checked' : '';
    const borderColor = (isMultiMode && selectedIds.has(p.id)) ? 'border-blue-500 border-2' : 'border-gray-700';
    
    const card = document.createElement('article');
    card.id = `card-unk-${p.id}`;
    card.className = `bg-gray-800 border ${borderColor} rounded-2xl p-4 shadow-lg flex flex-col transition cursor-pointer hover:border-gray-500 relative`;
    card.onclick = () => { if (isMultiMode) window.toggleSelect(p.id); else window.abrirDetalle(p, 'unknowns'); };

    const checkOverlay = isMultiMode 
      ? `<div class="absolute top-4 left-4 z-10 p-1 bg-gray-800 rounded-full border border-gray-600 shadow-md">
            <input type="checkbox" class="custom-checkbox block" ${isChecked} onclick="event.stopPropagation(); window.toggleSelect('${p.id}')">
         </div>` : '';

    card.innerHTML = `
      ${checkOverlay}
      ${generarHtmlImagen(p.ImagenURL)}
      <div class="flex flex-col gap-1 mb-4 text-base">
        <p><span class="text-gray-400">Trk:</span> <span class="font-mono text-white font-semibold">${p.id}</span></p>
        <div class="flex justify-between mt-1">
          <p><span class="text-gray-400">Courier:</span> ${p.Courier}</p>
          <p><span class="text-gray-400">Casilla:</span> ${p.Casilla || 'N/A'}</p>
        </div>
        <p><span class="text-gray-400">Ubicación:</span> ${p.Ubicacion}</p>
      </div>
      <div class="mt-auto flex gap-2 ${isMultiMode ? 'hidden' : ''}">
        <button class="flex-1 bg-transparent border border-gray-400 hover:bg-gray-700 rounded-lg py-3 text-base transition" onclick="actualizarEstadoAnimado(event, '${p.id}', 'SinUbicar', 'card-unk-${p.id}')">No Encontrado</button>
        <button class="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 text-base transition" onclick="actualizarEstadoAnimado(event, '${p.id}', 'Listo', 'card-unk-${p.id}')">Listo</button>
      </div>
    `;
    grid.appendChild(card);
  });
  document.getElementById('countUnknowns').textContent = `Unknown (${count})`;
  count === 0 ? noResultsMsg.classList.remove('hidden') : noResultsMsg.classList.add('hidden');
};

// --- RENDER: NUEVO SIN UBICAR (Estado: SinUbicar) ---
window.renderSinUbicar = function() {
  const grid = document.getElementById('gridSinUbicar');
  const noResultsMsg = document.getElementById('noResultsMsgSU');
  const filtroTexto = document.getElementById('searchInputSU').value.toLowerCase().trim();
  const filtroCourier = document.getElementById('filtroCourierSU').value;
  grid.innerHTML = '';
  let count = 0;

  window.paquetesData.forEach(p => {
    if (p.Estado !== "SinUbicar") return;
    if (filtroCourier && p.Courier !== filtroCourier) return;
    if (!cumpleFiltroTexto(p, filtroTexto)) return;
    count++;

    const card = document.createElement('article');
    card.id = `card-su-${p.id}`;
    card.className = `bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-lg flex flex-col transition cursor-pointer hover:border-gray-500`;
    card.onclick = () => window.abrirDetalle(p, 'sin-ubicar');

    card.innerHTML = `
      ${generarHtmlImagen(p.ImagenURL)}
      <div class="flex flex-col gap-1 mb-4 text-base">
        <p><span class="text-gray-400">Trk:</span> <span class="font-mono text-white font-semibold">${p.id}</span></p>
        <div class="flex justify-between mt-1">
          <p><span class="text-gray-400">Courier:</span> ${p.Courier}</p>
          <p><span class="text-gray-400">Casilla:</span> ${p.Casilla || 'N/A'}</p>
        </div>
      </div>
      <div class="mt-auto">
        <button class="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 text-base transition" onclick="actualizarEstadoAnimado(event, '${p.id}', 'Listo', 'card-su-${p.id}')">Listo</button>
      </div>
    `;
    grid.appendChild(card);
  });
  document.getElementById('countSinUbicar').textContent = `Unknown (${count})`;
  count === 0 ? noResultsMsg.classList.remove('hidden') : noResultsMsg.classList.add('hidden');
};

// --- RENDER: UBICADOS (Estado: Listo y !Contestado) ---
window.renderUbicados = function() {
  const grid = document.getElementById('gridUbicados');
  const noResultsMsg = document.getElementById('noResultsMsgUbi');
  const filtroTexto = document.getElementById('searchInputUbi').value.toLowerCase().trim();
  grid.innerHTML = '';
  let count = 0;

  window.paquetesData.forEach(p => {
    if (p.Estado !== "Listo" || p.Contestado === true) return;
    if (!cumpleFiltroTexto(p, filtroTexto)) return;
    count++;

    const card = document.createElement('article');
    card.id = `card-ubi-${p.id}`;
    card.className = "bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col relative overflow-hidden transition";
    card.innerHTML = `
      <div class="pr-[110px]">
        <p class="font-mono text-base mb-1 text-white"><span class="text-gray-400">Trk:</span> ${p.id}</p>
        <p class="text-base mb-1 text-gray-200"><span class="text-gray-400">Plataforma:</span> ${p.PlataformaSolicitud}</p>
        <p class="text-base mb-1 text-gray-200 truncate"><span class="text-gray-400">Título:</span> ${p.TituloSolicitud}</p>
        <p class="text-base mb-1 text-blue-400 transition"><span class="text-gray-400">Estado:</span> Listo</p>
      </div>
      <div class="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 w-[100px]">
        <button id="btn-cont-${p.id}" class="w-full bg-transparent border border-gray-400 hover:bg-gray-700 text-white rounded-lg py-2.5 text-base transition" onclick="accionUbicadosAnimado(event, '${p.id}')">Contestar</button>
        <button class="w-full bg-gray-700 border border-gray-500 hover:bg-gray-600 text-white rounded-lg py-2.5 text-base transition" onclick="window.abrirDetalle(window.paquetesData.find(x => x.id === '${p.id}'), 'ubicados')">Detalles</button>
      </div>
    `;
    grid.appendChild(card);
  });
  document.getElementById('countUbicados').textContent = `Unknown (${count})`;
  count === 0 ? noResultsMsg.classList.remove('hidden') : noResultsMsg.classList.add('hidden');
};

// --- RENDER: FINALIZADOS (Contestado === true) ---
window.renderFinalizados = function() {
  const grid = document.getElementById('gridFinalizados');
  const noResultsMsg = document.getElementById('noResultsMsgFin');
  const filtroTexto = document.getElementById('searchInputFin').value.toLowerCase().trim();
  grid.innerHTML = '';
  let count = 0;

  window.paquetesData.forEach(p => {
    if (p.Contestado !== true) return;
    if (!cumpleFiltroTexto(p, filtroTexto)) return;
    count++;
    
    const card = document.createElement('article');
    card.className = "bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col relative overflow-hidden";
    card.innerHTML = `
      <div class="pr-[110px]">
        <p class="font-mono text-base mb-1 text-white"><span class="text-gray-400">Trk:</span> ${p.id}</p>
        <p class="text-base mb-1 text-gray-200"><span class="text-gray-400">Plataforma:</span> ${p.PlataformaSolicitud}</p>
        <p class="text-base mb-1 text-gray-200 truncate"><span class="text-gray-400">Título:</span> ${p.TituloSolicitud}</p>
        <p class="text-base mb-1 text-green-400"><span class="text-gray-400">Estado:</span> Finalizado</p>
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
document.getElementById('searchInputUnk').addEventListener('input', window.renderUnknowns);
document.getElementById('filtroUbicacionUnk').addEventListener('change', window.renderUnknowns);
document.getElementById('btnLimpiarFiltrosUnk').addEventListener('click', () => {
  document.getElementById('searchInputUnk').value = ""; document.getElementById('filtroUbicacionUnk').value = "";
  window.renderUnknowns();
});
document.getElementById('searchInputSU').addEventListener('input', window.renderSinUbicar);
document.getElementById('filtroCourierSU').addEventListener('change', window.renderSinUbicar);
document.getElementById('searchInputUbi').addEventListener('input', window.renderUbicados);
document.getElementById('searchInputFin').addEventListener('input', window.renderFinalizados);


// --- ACTUALIZACIONES Y ANIMACIONES ---
window.actualizarEstadoAnimado = function(event, id, nuevoEstado, cardId) {
  event.stopPropagation();
  const card = document.getElementById(cardId);
  card.classList.add('fade-out');
  setTimeout(async () => {
    try { await updateDoc(doc(db, "paquetes", id), { Estado: nuevoEstado }); } 
    catch (error) { alert("Error: " + error.message); card.classList.remove('fade-out'); }
  }, 300);
};

window.accionUbicadosAnimado = function(event, id) {
  event.stopPropagation();
  const card = document.getElementById(`card-ubi-${id}`);
  card.classList.add('fade-out');
  setTimeout(async () => {
    try { await updateDoc(doc(db, "paquetes", id), { Contestado: true }); } 
    catch (error) { alert("Error: " + error.message); }
  }, 300);
};

// --- VISOR DE IMÁGENES Y ZOOM ---
window.abrirVisorImagen = function(event, url) {
  event.stopPropagation(); 
  history.pushState({ view: 'imagen' }, '', '#imagen');
  const viewerImg = document.getElementById('viewerImg');
  viewerImg.src = url;
  viewerImg.classList.remove('scale-200');
  viewerImg.classList.replace('cursor-zoom-out', 'cursor-zoom-in');
  document.getElementById('imageViewer').classList.replace('hidden', 'flex');
};
window.cerrarVisorImagen = function(triggerBack = true) {
  document.getElementById('imageViewer').classList.replace('flex', 'hidden');
  if (triggerBack) history.back();
};
window.toggleZoom = function(img) {
  if(img.classList.contains('scale-200')) { img.classList.remove('scale-200'); img.classList.replace('cursor-zoom-out', 'cursor-zoom-in'); } 
  else { img.classList.add('scale-200'); img.classList.replace('cursor-zoom-in', 'cursor-zoom-out'); }
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
  
  let estadoTxt = p.Estado === 'Desconocido' ? 'Desconocido' : p.Estado === 'SinUbicar' ? 'No Encontrado' : 'Listo';
  if (p.Contestado) estadoTxt = 'Finalizado';
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
  if (vistaOrigen === 'unknowns') {
    htmlBotones = `
      <div class="flex gap-4 mt-auto">
        <button onclick="actualizarDesdeDetalle('${p.id}', 'SinUbicar')" class="flex-1 bg-transparent border border-gray-400 hover:bg-gray-700 text-white rounded-lg py-3.5 text-base font-semibold transition">No Encontrado</button>
        <button onclick="actualizarDesdeDetalle('${p.id}', 'Listo')" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3.5 text-base font-semibold transition">Listo</button>
      </div>`;
  } else if (vistaOrigen === 'sin-ubicar') {
    htmlBotones = `
      <div class="flex gap-4 mt-auto">
        <button onclick="actualizarDesdeDetalle('${p.id}', 'Listo')" class="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3.5 text-base font-semibold transition">Listo</button>
      </div>`;
  } else if (vistaOrigen === 'ubicados') {
    htmlBotones = `<div class="flex gap-4 mt-auto">
      <button onclick="contestarDesdeDetalle('${p.id}')" class="w-full bg-transparent border border-gray-400 hover:bg-gray-700 text-white rounded-lg py-3.5 text-base font-semibold transition">Contestar</button>
    </div>`;
  }

  contenedor.innerHTML = htmlInfo + htmlBotones;
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById('detalle-paquete').classList.add('active');
  document.getElementById('headerTitle').textContent = 'DETALLE DE PAQUETE';
  window.scrollTo(0, 0);
};

window.actualizarDesdeDetalle = async function(id, nuevoEstado) { await updateDoc(doc(db, "paquetes", id), { Estado: nuevoEstado }); history.back(); };
window.contestarDesdeDetalle = async function(id) { await updateDoc(doc(db, "paquetes", id), { Contestado: true }); history.back(); };

// --- SELECCIÓN MÚLTIPLE (Unknowns) ---
window.toggleSelect = function(id) {
  if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  actualizarCheckboxMaestro(); window.renderUnknowns(); 
};
function actualizarCheckboxMaestro() {
  const chkSelectAll = document.getElementById('chkSelectAll');
  chkSelectAll.checked = visibleIds.length > 0 && visibleIds.every(x => selectedIds.has(x));
}
document.getElementById('chkSelectAll').addEventListener('change', (e) => {
  if (e.target.checked) visibleIds.forEach(id => selectedIds.add(id)); else visibleIds.forEach(id => selectedIds.delete(id));
  window.renderUnknowns();
});
document.getElementById('btnToggleMulti').addEventListener('click', () => {
  isMultiMode = !isMultiMode;
  if (!isMultiMode) { selectedIds.clear(); document.getElementById('chkSelectAll').checked = false; }
  document.getElementById('btnToggleMulti').textContent = isMultiMode ? "Desactivar s/ múltiple" : "Selección múltiple";
  document.getElementById('multiActionsHeader').classList.toggle('hidden', !isMultiMode);
  window.renderUnknowns();
});

window.procesarMultiples = function(nuevoEstado) {
  if (selectedIds.size === 0) return alert("Selecciona al menos un paquete");
  if (!confirm(`¿Mover ${selectedIds.size} paquetes a "${nuevoEstado}"?`)) return;
  selectedIds.forEach(id => { const card = document.getElementById(`card-unk-${id}`); if (card) card.classList.add('fade-out'); });

  setTimeout(async () => {
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => { batch.update(doc(db, "paquetes", id), { Estado: nuevoEstado }); });
      await batch.commit();
      selectedIds.clear(); isMultiMode = false; document.getElementById('chkSelectAll').checked = false;
      document.getElementById('btnToggleMulti').textContent = "Selección múltiple";
      document.getElementById('multiActionsHeader').classList.add('hidden');
      window.renderUnknowns();
    } catch (error) { alert("Error masivo: " + error.message); }
  }, 300);
};

// --- CREAR PAQUETE (Validación de Duplicados) ---
const formCrear = document.getElementById('formCrearPaquete');
formCrear.addEventListener('submit', async (e) => {
  e.preventDefault();
  const trackingRaw = document.getElementById('inputTracking').value.trim();
  const trackingClean = trackingRaw.replace(/\//g, "-");
  const btn = document.getElementById('btnGuardar');
  btn.disabled = true; btn.textContent = "Guardando...";
  
  try {
    const docRef = doc(db, "paquetes", trackingClean);
    const docSnap = await getDoc(docRef);
    
    // Validación para evitar duplicados / sobrescritura
    if (docSnap.exists()) {
      alert(`⚠️ El paquete con el tracking ${trackingClean} ya está registrado en el sistema.`);
      btn.disabled = false; btn.textContent = "Crear";
      return;
    }

    const paqueteDatos = {
      Courier: document.getElementById('inputCourier').value,
      Casilla: document.getElementById('inputCasilla').value.trim(),
      Ubicacion: document.getElementById('inputUbicacion').value,
      PlataformaSolicitud: document.getElementById('inputPlataforma').value,
      TituloSolicitud: document.getElementById('inputTitulo').value.trim(),
      ImagenURL: document.getElementById('inputImagenURL').value.trim(),
      Estado: "Desconocido", Contestado: false, FechaCreacion: serverTimestamp()
    };
    const nombreCliente = document.getElementById('inputNombreCliente').value.trim();
    if (nombreCliente !== "") paqueteDatos.NombreCliente = nombreCliente;

    await setDoc(docRef, paqueteDatos);
    alert("¡Paquete " + trackingClean + " creado exitosamente!");
    formCrear.reset();
  } catch (error) { alert("Error: " + error.message); } 
  finally { btn.disabled = false; btn.textContent = "Crear"; document.getElementById('inputTracking').focus(); }
});
