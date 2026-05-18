// CONFIGURACIÓN
const SUPABASE_URL = 'https://wmoejlgebchqtchzopuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb2VqbGdlYmNocXRjaHpvcHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Njg0MjksImV4cCI6MjA5MzA0NDQyOX0.lK3BKNmCHlMIDtLWOAwsyvuWNMvIcgQvzUH0IjYZ9y4';

const ADMIN_USERS = [
  { username: 'luis', password: 'LECR1123', nombre: 'Luis Enrique Canul Rosado', rol: 'administrador', id: 1 },
  { username: 'sixto', password: 'sixto2026', nombre: 'Sixto', rol: 'administrador', id: 2 }
];

let App = { user: null, isAdmin: false, supabase: null, inventoryData: [] };

// INICIALIZACIÓN SIMPLE - SIN LOADER
window.addEventListener('DOMContentLoaded', () => {
  console.log("✅ App cargada");
  
  // Asegurar que el login se vea
  document.getElementById('login-section').style.display = 'flex';
  document.getElementById('app-section').style.display = 'none';
  
  // Inicializar Supabase
  try {
    if (window.supabase) {
      App.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log("✅ Supabase listo");
    }
  } catch (e) {
    console.error("❌ Error Supabase:", e);
  }
  
  setupEvents();
});

function setupEvents() {
  // Toggle sidebar en mobile
  document.getElementById('menu-toggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('sidebar')?.classList.toggle('open');
  });
  
  // Cerrar sidebar al hacer click fuera
  document.getElementById('main-content')?.addEventListener('click', () => {
    if (window.innerWidth < 1024) document.getElementById('sidebar')?.classList.remove('open');
  });
  
  // Login Form
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) errorDiv.textContent = '';
    
    // Check admins locales
    const master = ADMIN_USERS.find(a => a.username === u && a.password === p);
    if (master) { loginSuccess(master); return; }
    
    // Check DB
    if (!App.supabase) return showToast('❌ Sin conexión a base de datos', 'error');
    
    try {
      const { data, error } = await App.supabase.from('usuarios').select('*').eq('username', u).eq('password', p).single();
      if (error || !data) {
        if (errorDiv) errorDiv.textContent = ' Credenciales incorrectas';
        showToast('❌ Usuario o contraseña incorrectos', 'error');
      } else {
        loginSuccess(data);
      }
    } catch (err) {
      if (errorDiv) errorDiv.textContent = '❌ Error de conexión';
      showToast('❌ Error de conexión', 'error');
    }
  });
  
  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    App.user = null;
    App.isAdmin = false;
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
  });
  
  // Navegación
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      if (!view) return;
      if (e.currentTarget.classList.contains('admin-only') && !App.isAdmin) {
        showToast('🔐 Solo administradores', 'error');
        return;
      }
      
      document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.hidden = true; });
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      
      const target = document.getElementById('view-' + view);
      if (target) { target.classList.add('active'); target.hidden = false; }
      e.currentTarget.classList.add('active');
      
      if (window.innerWidth < 1024) document.getElementById('sidebar')?.classList.remove('open');
      
      if (view === 'dashboard') loadDashboard();
      if (view === 'inventario') loadInventory();
      if (view === 'bitacora') loadBitacora();
      if (view === 'reportes') loadReportes();
      if (view === 'miembros' && App.isAdmin) loadMembers();
      if (view === 'prestamos' && App.isAdmin) loadPrestamos();
    });
  });
  
  // 🔍 EVENTOS DE BÚSQUEDA EN INVENTARIO
  const searchInput = document.getElementById('inventory-search');
  const searchClear = document.getElementById('search-clear');
  const searchReset = document.getElementById('search-reset');
  const noResults = document.getElementById('inventory-no-results');
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      filterInventory(term);
      if (searchClear) searchClear.hidden = term === '';
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        filterInventory('');
        if (searchClear) searchClear.hidden = true;
        searchInput.blur();
      }
    });
  }
  
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        filterInventory('');
        searchClear.hidden = true;
        searchInput.focus();
      }
    });
  }
  
  if (searchReset) {
    searchReset.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        filterInventory('');
        if (searchClear) searchClear.hidden = true;
        if (noResults) noResults.hidden = true;
      }
    });
  }
  
  // Bitácora Submit
  document.getElementById('bitacora-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!App.supabase) return showToast('❌ Sin conexión', 'error');
    try {
      const { error } = await App.supabase.from('bitacoras').insert([{
        usuario_id: App.user.id,
        nombre_usuario: App.user.nombre || App.user.username,
        titulo: document.getElementById('bitacora-titulo').value,
        actividad: document.getElementById('bitacora-actividad').value,
        categoria: document.getElementById('bitacora-categoria').value,
        fecha: new Date().toISOString()
      }]);
      if (error) throw error;
      showToast('✅ Bitácora guardada', 'success');
      e.target.reset();
      loadBitacora(); loadDashboard();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  });
  
  // Reportes Submit
  document.getElementById('reporte-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!App.supabase) return showToast('❌ Sin conexión', 'error');
    try {
      const { error } = await App.supabase.from('reportes').insert([{
        usuario_id: App.user.id,
        nombre_usuario: App.user.nombre || App.user.username,
        titulo: document.getElementById('reporte-titulo').value,
        descripcion: document.getElementById('reporte-descripcion').value,
        categoria: document.getElementById('reporte-categoria').value,
        urgencia: document.getElementById('reporte-urgencia').value,
        estado: 'abierto',
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      showToast('🚨 Reporte creado', 'success');
      e.target.reset();
      loadReportes(); loadDashboard();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  });
  
  // Exportar Excel
  document.getElementById('btn-export-excel')?.addEventListener('click', async () => {
    if (!App.supabase) return showToast(' Sin conexión', 'error');
    const { data } = await App.supabase.from('inventario').select('*');
    if (!data?.length) return showToast('Sin datos para exportar', 'warning');
    
    const headers = Object.keys(data[0]);
    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      });
      csvContent += values.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Inventario_' + new Date().toISOString().slice(0,10) + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(' Exportado como CSV', 'success');
  });
  
  // Modal Inventario
  const modal = document.getElementById('item-modal');
  document.querySelector('.modal-close')?.addEventListener('click', () => {
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
  });
  
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  });
  
  document.getElementById('btn-add-item')?.addEventListener('click', () => {
    if (!modal) return showToast('Error: Modal no encontrado', 'error');
    document.getElementById('modal-title').textContent = '➕ Nuevo Equipo';
    document.getElementById('item-form').reset();
    document.getElementById('item-id').value = '';
    document.getElementById('item-error').textContent = '';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  });
  
  document.getElementById('item-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!App.supabase) return showToast('❌ Sin conexión', 'error');
    try {
      let id = document.getElementById('item-id').value;
      const item = {
        nombre: document.getElementById('item-nombre').value,
        numero_serie: document.getElementById('item-serie').value || 'N/A',
        cantidad: parseInt(document.getElementById('item-cantidad').value) || 1,
        funciona: document.getElementById('item-funciona').value,
        estado: document.getElementById('item-estado').value,
        categoria: document.getElementById('item-categoria').value,
        datasheet: document.getElementById('item-datasheet').value,
        comentarios: document.getElementById('item-comentarios').value,
        foto_url: document.getElementById('item-foto').value
      };
      
      if (id) {
        await App.supabase.from('inventario').update(item).eq('id', id);
        showToast('✅ Actualizado', 'success');
      } else {
        const cleanName = item.nombre.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
        id = 'LAB-' + cleanName + '-' + Date.now().toString().slice(-6);
        item.id = id;
        item.created_at = new Date().toISOString();
        const { error } = await App.supabase.from('inventario').insert([item]);
        if (error) throw error;
        showToast('✅ Creado', 'success');
      }
      if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
      loadInventory();
    } catch (err) {
      document.getElementById('item-error').textContent = 'Error: ' + err.message;
      showToast('Error: ' + err.message, 'error');
    }
  });
  
  // Préstamos Submit
  document.getElementById('prestamo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!App.supabase) return showToast('❌ Sin conexión', 'error');
    try {
      const items = [];
      const itemRows = document.querySelectorAll('.prestamo-item-row');
      for (let row of itemRows) {
        const itemId = row.querySelector('.prestamo-item-select').value;
        const cantidad = parseInt(row.querySelector('.prestamo-cantidad').value);
        if (itemId && cantidad > 0) {
          const { data: itemData } = await App.supabase.from('inventario').select('nombre, cantidad').eq('id', itemId).single();
          if (!itemData) throw new Error(`Item no encontrado`);
          if (cantidad > itemData.cantidad) throw new Error(`Stock insuficiente`);
          items.push({ item_id: itemId, cantidad, nombre: itemData.nombre });
        }
      }
      if (items.length === 0) throw new Error('Debes seleccionar al menos un item');
      
      const fechaInicio = document.getElementById('prestamo-fecha-inicio').value;
      const fechaDevolucion = document.getElementById('prestamo-fecha-devolucion').value;
      const motivo = document.getElementById('prestamo-motivo').value;
      
      if (new Date(fechaInicio) > new Date(fechaDevolucion)) throw new Error('Fecha inválida');
      
      const estado = App.isAdmin ? 'autorizado' : 'pendiente';
      const prestamoData = {
        usuario_id: App.user.id,
        nombre_solicitante: App.user.nombre_completo || App.user.username,
        items: items,
        fecha_prestamo: fechaInicio,
        fecha_devolucion: fechaDevolucion,
        motivo: motivo,
        estado: estado,
        autorizado_por: App.isAdmin ? App.user.id : null,
        created_at: new Date().toISOString()
      };
      
      const { data: prestamo, error } = await App.supabase.from('prestamos').insert([prestamoData]).select().single();
      if (error) throw error;
      
      if (App.isAdmin) {
        for (let item of items) {
          await App.supabase.rpc('descontar_stock', { p_item_id: item.item_id, p_cantidad: item.cantidad });
        }
        showToast('✅ Préstamo autorizado', 'success');
      } else {
        showToast('📋 Solicitud enviada', 'success');
      }
      
      e.target.reset();
      document.getElementById('prestamo-items-container').innerHTML = `
        <div class="prestamo-item-row">
          <select class="prestamo-item-select" required><option value="">Seleccionar item...</option></select>
          <input type="number" class="prestamo-cantidad" placeholder="Cant." min="1" value="1" required>
          <button type="button" class="btn-remove-item" onclick="removePrestamoItem(this)">🗑️</button>
        </div>
      `;
      loadPrestamos(); loadDashboard();
    } catch (err) {
      document.getElementById('prestamo-error').textContent = err.message;
      showToast('Error: ' + err.message, 'error');
    }
  });
  
  // Miembros Submit
  document.getElementById('miembro-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!App.supabase) return showToast('❌ Sin conexión', 'error');
    try {
      const { error } = await App.supabase.from('usuarios').insert([{
        username: document.getElementById('miembro-username').value.trim(),
        password: document.getElementById('miembro-password').value,
        nombre_completo: document.getElementById('miembro-nombre').value.trim(),
        rol: document.getElementById('miembro-rol').value,
        area: document.getElementById('miembro-area').value.trim(),
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      showToast('✅ Miembro creado', 'success');
      e.target.reset();
      loadMembers();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  });
}

function loginSuccess(user) {
  App.user = user;
  App.isAdmin = user.rol === 'administrador';
  
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'block';
  document.getElementById('user-display').textContent = user.nombre?.split(' ')[0] || user.username;
  
  const badge = document.getElementById('role-badge');
  badge.textContent = user.rol;
  badge.className = App.isAdmin ? 'role-badge admin' : 'role-badge';
  
  updateAdminUI();
  loadDashboard();
  
  document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.hidden = true; });
  const dashboard = document.getElementById('view-dashboard');
  if (dashboard) { dashboard.classList.add('active'); dashboard.hidden = false; }
  
  showToast(`✅ Bienvenido ${user.nombre?.split(' ')[0] || user.username}`, 'success');
}

function updateAdminUI() {
  document.querySelectorAll('.admin-only').forEach(el => el.hidden = !App.isAdmin);
}

async function loadDashboard() {
  if (!App.supabase) return;
  try {
    const { count: inv } = await App.supabase.from('inventario').select('*', { count: 'exact', head: true });
    const { count: mem } = await App.supabase.from('usuarios').select('*', { count: 'exact', head: true });
    const { count: rep } = await App.supabase.from('reportes').select('*', { count: 'exact', head: true }).eq('estado', 'abierto');
    
    document.getElementById('stat-inventory').textContent = inv || 0;
    document.getElementById('stat-members').textContent = mem || 0;
    document.getElementById('stat-reports').textContent = rep || 0;
    
    const { data: bits } = await App.supabase.from('bitacoras').select('*').order('fecha', { ascending: false }).limit(5);
    const bitList = document.getElementById('dashboard-bitacora-list');
    if (bitList) {
      bitList.innerHTML = bits && bits.length > 0 ? bits.map(b => 
        `<li class="activity-item"><span class="time">${new Date(b.fecha).toLocaleString()}</span><strong>${b.titulo || 'Sin título'}</strong></li>`
      ).join('') : '<li class="text-muted">Sin registros</li>';
    }
    
    const { data: reps } = await App.supabase.from('reportes').select('*').order('created_at', { ascending: false }).limit(5);
    const repList = document.getElementById('dashboard-reportes-list');
    if (repList) {
      const colors = { alto: '#ff0040', medio: '#ffaa00', bajo: '#00cc66' };
      repList.innerHTML = reps && reps.length > 0 ? reps.map(r => 
        `<li class="activity-item" style="border-left:4px solid ${colors[r.urgencia] || '#00d4ff'}"><span class="time">${new Date(r.created_at).toLocaleString()}</span><strong>${r.titulo}</strong></li>`
      ).join('') : '<li class="text-muted">Sin reportes</li>';
    }
    
    const { count: loans } = await App.supabase.from('prestamos').select('*', { count: 'exact', head: true }).in('estado', ['autorizado', 'pendiente']);
    document.getElementById('stat-loans').textContent = loans || 0;
    
    const { data: prestamos } = await App.supabase.from('prestamos').select('*').eq('estado', 'autorizado').order('created_at', { ascending: false }).limit(5);
    const prestamosList = document.getElementById('dashboard-prestamos-list');
    if (prestamosList) {
      prestamosList.innerHTML = prestamos && prestamos.length > 0 ? prestamos.map(p => 
        `<li class="activity-item"><span class="time">${new Date(p.fecha_prestamo).toLocaleDateString()}</span><strong>${p.nombre_solicitante}</strong></li>`
      ).join('') : '<li class="text-muted">Sin préstamos</li>';
    }
    
    const devolucionesList = document.getElementById('dashboard-devoluciones-list');
    if (devolucionesList) devolucionesList.innerHTML = '<li class="text-muted">Sin devoluciones</li>';
  } catch (err) { console.error("Error dashboard:", err); }
}

async function loadBitacora() {
  if (!App.supabase) return;
  try {
    const { data } = await App.supabase.from('bitacoras').select('*').order('fecha', { ascending: false });
    const tbody = document.getElementById('bitacora-body');
    if (!tbody) return;
    tbody.innerHTML = data && data.length > 0 ? data.map(b => `
      <tr><td>${new Date(b.fecha).toLocaleString()}</td><td>${b.nombre_usuario}</td><td>${b.titulo}</td><td>${b.categoria}</td><td>${b.actividad}</td><td>${App.isAdmin ? `<button class="btn-sm" onclick="deleteBitacora('${b.id}')">🗑️</button>` : '-'}</td></tr>
    `).join('') : '<tr><td colspan="6">Sin registros</td></tr>';
  } catch (err) { console.error("Error:", err); }
}

async function loadReportes() {
  if (!App.supabase) return;
  try {
    const { data } = await App.supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('reportes-list');
    if (!container) return;
    const colors = { alto: '#ff0040', medio: '#ffaa00', bajo: '#00ff88' };
    container.innerHTML = data && data.length > 0 ? data.map(r => `
      <div class="report-card ${r.estado === 'cerrado' ? 'closed' : ''}">
        <div class="report-header"><span class="report-urgencia" style="background:${colors[r.urgencia]}">${r.urgencia.toUpperCase()}</span><span>${r.estado}</span></div>
        <h4>${r.titulo}</h4><p>${r.descripcion}</p>
        ${App.isAdmin && r.estado !== 'cerrado' ? `<button class="btn-primary btn-sm" onclick="closeReport('${r.id}')">✅ Cerrar</button>` : ''}
      </div>
    `).join('') : '<p>Sin reportes</p>';
  } catch (err) { console.error("Error:", err); }
}

// 🔍 LÓGICA DE FILTRADO DE INVENTARIO
function filterInventory(searchTerm) {
  const tbody = document.getElementById('inventory-body');
  const noResults = document.getElementById('inventory-no-results');
  if (!tbody) return;
  
  if (!searchTerm || searchTerm.trim() === '') {
    renderInventoryTable(App.inventoryData);
    if (noResults) noResults.hidden = true;
    return;
  }
  
  const term = searchTerm.toLowerCase();
  const filtered = App.inventoryData.filter(item => {
    return (item.nombre || '').toLowerCase().includes(term) || 
           (item.numero_serie || '').toLowerCase().includes(term) || 
           (item.categoria || '').toLowerCase().includes(term) || 
           (item.comentarios || '').toLowerCase().includes(term);
  });
  
  if (filtered.length > 0) {
    renderInventoryTable(filtered);
    if (noResults) noResults.hidden = true;
  } else {
    tbody.innerHTML = '';
    if (noResults) noResults.hidden = false;
  }
}

function renderInventoryTable(data) {
  const tbody = document.getElementById('inventory-body');
  if (!tbody) return;
  tbody.innerHTML = data && data.length > 0 ? data.map(i => `
    <tr>
      <td><code>${i.id}</code></td><td>${i.nombre}</td><td>${i.numero_serie || 'N/A'}</td><td>${i.cantidad}</td>
      <td><span class="status status-${i.funciona}">${i.funciona || 'desconocido'}</span></td>
      <td><span class="status status-${i.estado}">${i.estado}</span></td>
      <td>${i.datasheet ? `<a href="${i.datasheet}" target="_blank" class="btn-sm"></a>` : '-'}</td>
      <td>${i.comentarios ? `<button class="btn-sm" onclick="viewComments('${(i.comentarios||'').replace(/'/g, "\\'")}')"></button>` : '-'}</td>
      <td><button class="btn-sm" onclick="editItem('${i.id}')">✏️</button>${App.isAdmin ? `<button class="btn-sm" onclick="deleteItem('${i.id}')" style="color:#ff0040">🗑️</button>` : ''}</td>
    </tr>
  `).join('') : '<tr><td colspan="9">Sin registros</td></tr>';
}

async function loadInventory() {
  if (!App.supabase) {
    const tbody = document.getElementById('inventory-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9">⚠️ Sin conexión</td></tr>';
    return;
  }
  
  try {
    const { data } = await App.supabase.from('inventario').select('*');
    App.inventoryData = data || [];
    
    const searchInput = document.getElementById('inventory-search');
    const searchClear = document.getElementById('search-clear');
    const noResults = document.getElementById('inventory-no-results');
    
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.hidden = true;
    if (noResults) noResults.hidden = true;
    
    renderInventoryTable(App.inventoryData);
  } catch (err) {
    console.error("Error:", err);
    const tbody = document.getElementById('inventory-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9">Error al cargar</td></tr>';
  }
}

async function loadMembers() {
  if (!App.supabase) return;
  try {
    const { data } = await App.supabase.from('usuarios').select('*').order('username');
    const tbody = document.getElementById('miembros-body');
    if (!tbody) return;
    tbody.innerHTML = data && data.length > 0 ? data.map(m => `
      <tr><td>${m.id}</td><td>@${m.username}</td><td>${m.nombre_completo || '-'}</td><td>${m.rol}</td><td>${m.area || '-'}</td>
      <td>${App.isAdmin && m.username !== 'luis' && m.username !== 'sixto' ? `<button class="btn-sm" onclick="deleteMember('${m.username}')" style="color:#ff0040">️</button>` : ''}</td></tr>
    `).join('') : '<tr><td colspan="6">Sin registros</td></tr>';
  } catch (err) { console.error("Error:", err); }
}

window.addPrestamoItem = async function() {
  const container = document.getElementById('prestamo-items-container');
  const newRow = document.createElement('div');
  newRow.className = 'prestamo-item-row';
  newRow.innerHTML = `<select class="prestamo-item-select" required><option value="">Cargando...</option></select><input type="number" class="prestamo-cantidad" placeholder="Cant." min="1" value="1" required><button type="button" class="btn-remove-item" onclick="removePrestamoItem(this)">🗑️</button>`;
  container.appendChild(newRow);
  await loadPrestamoItems(newRow.querySelector('.prestamo-item-select'));
};

window.removePrestamoItem = function(btn) {
  const rows = document.querySelectorAll('.prestamo-item-row');
  if (rows.length > 1) btn.parentElement.remove();
  else showToast('Debe haber al menos un item', 'warning');
};

async function loadPrestamoItems(selectElement) {
  if (!App.supabase) return;
  try {
    const { data } = await App.supabase.from('inventario').select('id, nombre, cantidad').gt('cantidad', 0);
    if (data && data.length > 0) {
      selectElement.innerHTML = '<option value="">Seleccionar...</option>' + data.map(item => `<option value="${item.id}">${item.nombre} (${item.cantidad})</option>`).join('');
    } else {
      selectElement.innerHTML = '<option value="">Sin items</option>';
    }
  } catch (err) {
    selectElement.innerHTML = '<option value="">Error</option>';
  }
}

window.authorizeLoan = async function(loanId, authorize) {
  if (!App.supabase || !confirm(`${authorize ? '¿AUTORIZAR' : '¿DENEGAR'}?`)) return;
  try {
    if (authorize) {
      const { data: prestamo } = await App.supabase.from('prestamos').select('items').eq('id', loanId).single();
      for (let item of prestamo.items) {
        await App.supabase.rpc('descontar_stock', { p_item_id: item.item_id, p_cantidad: item.cantidad });
      }
      await App.supabase.from('prestamos').update({ estado: 'autorizado', autorizado_por: App.user.id, fecha_autorizacion: new Date().toISOString() }).eq('id', loanId);
      showToast('✅ Autorizado', 'success');
    } else {
      await App.supabase.from('prestamos').update({ estado: 'denegado' }).eq('id', loanId);
      showToast('❌ Denegado', 'success');
    }
    loadPrestamos(); loadDashboard();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.requestReturn = async function(loanId) {
  if (!App.supabase || !confirm('¿Solicitar devolución?')) return;
  try {
    await App.supabase.from('prestamos').update({ estado: 'devolucion_pendiente' }).eq('id', loanId);
    showToast('📋 Devolución solicitada', 'success');
    loadPrestamos();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.confirmReturn = async function(loanId) {
  if (!App.supabase || !confirm('¿Confirmar devolución?')) return;
  try {
    const { data: prestamo } = await App.supabase.from('prestamos').select('items').eq('id', loanId).single();
    for (let item of prestamo.items) {
      await App.supabase.rpc('regresar_stock', { p_item_id: item.item_id, p_cantidad: item.cantidad });
    }
    await App.supabase.from('prestamos').update({ estado: 'devuelto', confirmado_por: App.user.id, fecha_confirmacion: new Date().toISOString() }).eq('id', loanId);
    showToast('✅ Devolución confirmada', 'success');
    loadPrestamos(); loadInventory(); loadDashboard();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

async function loadPrestamos() {
  if (!App.supabase) return;
  try {
    const itemSelects = document.querySelectorAll('.prestamo-item-select');
    for (let select of itemSelects) await loadPrestamoItems(select);
    
    let query = App.isAdmin ? App.supabase.from('prestamos').select('*') : App.supabase.from('prestamos').select('*').eq('usuario_id', App.user.id);
    const { data } = await query.order('created_at', { ascending: false });
    
    const tbody = document.getElementById('prestamos-body');
    const pendientesBody = document.getElementById('prestamos-pendientes-body');
    const pendientesSection = document.getElementById('prestamos-pendientes-section');
    
    if (tbody && data) {
      const misPrestamos = data.filter(p => App.isAdmin || p.estado === 'autorizado' || p.estado === 'devolucion_pendiente');
      tbody.innerHTML = misPrestamos.length > 0 ? misPrestamos.map(l => {
        const itemsList = l.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ');
        let acciones = l.estado === 'autorizado' ? `<button class="btn-sm" onclick="requestReturn('${l.id}')">🔄 Devolver</button>` : (l.estado === 'devolucion_pendiente' ? '<span>⏳ Pendiente</span>' : '');
        return `<tr><td><code>${l.id}</code></td><td>${itemsList}</td><td>${new Date(l.fecha_prestamo).toLocaleDateString()}</td><td>${new Date(l.fecha_devolucion).toLocaleDateString()}</td><td>${l.estado}</td><td>${acciones}</td></tr>`;
      }).join('') : '<tr><td colspan="6">Sin préstamos</td></tr>';
    }
    
    if (App.isAdmin && pendientesBody && pendientesSection) {
      const pendientes = data.filter(p => p.estado === 'pendiente');
      if (pendientes.length > 0) {
        pendientesSection.hidden = false;
        pendientesBody.innerHTML = pendientes.map(l => `<tr><td>${l.id}</td><td>${l.nombre_solicitante}</td><td>${l.items.map(i => i.nombre).join(', ')}</td><td colspan="3"><button class="btn-sm" onclick="authorizeLoan('${l.id}', true)">✅</button><button class="btn-sm" onclick="authorizeLoan('${l.id}', false)">❌</button></td></tr>`).join('');
      } else {
        pendientesSection.hidden = true;
      }
    }
  } catch (err) { console.error("Error:", err); }
}

window.editItem = async function(id) {
  if (!App.supabase || !id) return showToast('Error', 'error');
  try {
    const { data: item } = await App.supabase.from('inventario').select('*').eq('id', id).single();
    if (!item) return showToast('No encontrado', 'error');
    
    const modal = document.getElementById('item-modal');
    document.getElementById('modal-title').textContent = '✏️ Editar';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-nombre').value = item.nombre || '';
    document.getElementById('item-serie').value = item.numero_serie || '';
    document.getElementById('item-cantidad').value = item.cantidad || 1;
    document.getElementById('item-funciona').value = item.funciona || 'desconocido';
    document.getElementById('item-estado').value = item.estado || 'disponible';
    document.getElementById('item-categoria').value = item.categoria || 'otros';
    document.getElementById('item-datasheet').value = item.datasheet || '';
    document.getElementById('item-comentarios').value = item.comentarios || '';
    document.getElementById('item-foto').value = item.foto_url || '';
    document.getElementById('item-error').textContent = '';
    
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.viewComments = function(txt) {
  alert(txt || 'Sin comentarios');
};

window.deleteItem = async function(id) {
  if (!App.supabase || !confirm('¿Eliminar?')) return;
  try {
    await App.supabase.from('inventario').delete().eq('id', id);
    showToast('🗑️ Eliminado', 'success');
    loadInventory();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.deleteBitacora = async function(id) {
  if (!App.supabase || !confirm('¿Eliminar?')) return;
  try {
    await App.supabase.from('bitacoras').delete().eq('id', id);
    showToast('🗑️ Eliminado', 'success');
    loadBitacora();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.deleteMember = async function(username) {
  if (!App.supabase || !confirm(`¿Eliminar ${username}?`) || username === 'luis' || username === 'sixto') return;
  try {
    await App.supabase.from('usuarios').delete().eq('username', username);
    showToast('🗑️ Eliminado', 'success');
    loadMembers();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.closeReport = async function(id) {
  if (!App.supabase) return;
  try {
    await App.supabase.from('reportes').update({ estado: 'cerrado' }).eq('id', id);
    showToast('✅ Cerrado', 'success');
    loadReportes();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

function showToast(msg, type = 'info') {
  const d = document.createElement('div');
  d.className = `toast ${type}`;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}
