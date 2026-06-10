// CONFIGURACIÓN
const SUPABASE_URL = 'https://wmoejlgebchqtchzopuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb2VqbGdlYmNocXRjaHpvcHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Njg0MjksImV4cCI6MjA5MzA0NDQyOX0.lK3BKNmCHlMIDtLWOAwsyvuWNMvIcgQvzUH0IjYZ9y4';

const ADMIN_USERS = [
  { username: 'luis', password: 'LECR1123', nombre: 'Luis Enrique Canul Rosado', rol: 'administrador', id: 1 },
  { username: 'sixto', password: 'sixto2026', nombre: 'Sixto', rol: 'administrador', id: 2 }
];

let App = { user: null, isAdmin: false, supabase: null };

window.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 DOMContentLoaded");
  
  // Ocultar loader después de 500ms
  setTimeout(() => {
    try {
      const loader = document.getElementById('loading-overlay');
      if (loader) {
        console.log("✅ Ocultando loader");
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        loader.style.pointerEvents = 'none';
      }
    } catch (err) {
      console.error("❌ Error ocultando loader:", err);
    }
  }, 500);
  
  // Inicializar Supabase
  try {
    if (window.supabase) {
      App.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log("✅ Supabase conectado");
    } else {
      console.error("❌ Supabase no está disponible");
    }
  } catch (err) {
    console.error("❌ Error inicializando Supabase:", err);
  }
  
  // Mostrar sección de login
  try {
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');
    
    if (loginSection) {
      loginSection.style.display = 'flex';
      console.log("✅ Login section visible");
    } else {
      console.error("❌ No se encontró login-section");
    }
    
    if (appSection) {
      appSection.style.display = 'none';
    }
    
    setupEvents();
    console.log("✅ Event listeners configurados");
  } catch (err) {
    console.error("❌ Error en inicialización:", err);
  }
});

function setupEvents() {
  console.log("📡 Configurando event listeners...");
  
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('username').value.trim().toLowerCase();
      const p = document.getElementById('password').value;
      
      const master = ADMIN_USERS.find(a => a.username === u && a.password === p);
      if (master) {
        loginSuccess(master);
        return;
      }
      
      if (!App.supabase) {
        showToast('❌ Error de conexión', 'error');
        return;
      }
      
      try {
        const { data, error } = await App.supabase.from('usuarios').select('*').eq('username', u).eq('password', p).single();
        if (error || !data) {
          showToast('❌ Credenciales incorrectas', 'error');
        } else {
          loginSuccess(data);
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      App.user = null;
      App.isAdmin = false;
      document.getElementById('app-section').style.display = 'none';
      document.getElementById('login-section').style.display = 'flex';
    });
  }

  // BOTÓN MENÚ HAMBURGUESA
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.toggle('open');
      }
    });
  }

  // CERRAR SIDEBAR AL HACER CLIC FUERA
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-toggle');
    if (sidebar && menuBtn && window.innerWidth < 1024) {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    }
  });
  
  // NAV ITEMS
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      if (!view) return;
      if (e.currentTarget.classList.contains('admin-only') && !App.isAdmin) return showToast('🔐 Solo administradores', 'error');
      
      document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.hidden = true; });
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      
      const target = document.getElementById('view-' + view);
      if (target) { target.classList.add('active'); target.hidden = false; }
      e.currentTarget.classList.add('active');
      
      if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      }
      
      if (view === 'dashboard') loadDashboard();
      if (view === 'inventario') loadInventory();
      if (view === 'bitacora') loadBitacora();
      if (view === 'reportes') loadReportes();
      if (view === 'miembros' && App.isAdmin) loadMembers();
      if (view === 'prestamos' && App.isAdmin) loadPrestamos();
    });
  });
  
  const bitacoraForm = document.getElementById('bitacora-form');
  if (bitacoraForm) {
    bitacoraForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        if (!App.supabase) throw new Error('Sin conexión');
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
  }
  
  const reporteForm = document.getElementById('reporte-form');
  if (reporteForm) {
    reporteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        if (!App.supabase) throw new Error('Sin conexión');
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
  }
  
  const btnExport = document.getElementById('btn-export-excel');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      if (!App.supabase) {
        showToast('Sin conexión', 'error');
        return;
      }
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
      
      showToast('📦 Exportado como CSV', 'success');
    });
  }
  
  const modal = document.getElementById('item-modal');
  const modalClose = document.querySelector('.modal-close');
  if (modalClose && modal) {
    modalClose.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    });
  }
  
  const btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => {
      if (!modal) return showToast('Error: Modal no encontrado', 'error');
      document.getElementById('modal-title').textContent = '➕ Nuevo Equipo';
      document.getElementById('item-form').reset();
      document.getElementById('item-id').value = '';
      document.getElementById('item-error').textContent = '';
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    });
  }
  
  const itemForm = document.getElementById('item-form');
  if (itemForm) {
    itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        if (!App.supabase) throw new Error('Sin conexión');
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
        const itemError = document.getElementById('item-error');
        if (itemError) itemError.textContent = 'Error: ' + err.message;
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  const prestamoForm = document.getElementById('prestamo-form');
  if (prestamoForm) {
    prestamoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!App.supabase) {
        showToast('Sin conexión', 'error');
        return;
      }
      
      try {
        const items = [];
        const itemRows = document.querySelectorAll('.prestamo-item-row');
        
        for (let row of itemRows) {
          const itemId = row.querySelector('.prestamo-item-select').value;
          const cantidad = parseInt(row.querySelector('.prestamo-cantidad').value);
          
          if (itemId && cantidad > 0) {
            const { data: itemData } = await App.supabase
              .from('inventario')
              .select('nombre, cantidad')
              .eq('id', itemId)
              .single();
            
            if (!itemData) {
              throw new Error(`Item no encontrado`);
            }
            
            if (cantidad > itemData.cantidad) {
              throw new Error(`Stock insuficiente para "${itemData.nombre}". Disponible: ${itemData.cantidad}, Solicitado: ${cantidad}`);
            }
            
            items.push({ item_id: itemId, cantidad, nombre: itemData.nombre });
          }
        }
        
        if (items.length === 0) {
          throw new Error('Debes seleccionar al menos un item');
        }
        
        const fechaInicio = document.getElementById('prestamo-fecha-inicio').value;
        const fechaDevolucion = document.getElementById('prestamo-fecha-devolucion').value;
        const motivo = document.getElementById('prestamo-motivo').value;
        
        if (new Date(fechaInicio) > new Date(fechaDevolucion)) {
          throw new Error('La fecha de devolución debe ser posterior a la fecha de préstamo');
        }
        
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
        
        const { data: prestamo, error } = await App.supabase
          .from('prestamos')
          .insert([prestamoData])
          .select()
          .single();
        
        if (error) throw error;
        
        if (App.isAdmin) {
          for (let item of items) {
            await App.supabase.rpc('descontar_stock', {
              p_item_id: item.item_id,
              p_cantidad: item.cantidad
            });
          }
          showToast('✅ Préstamo autorizado y registrado', 'success');
        } else {
          showToast('📋 Solicitud enviada. Espera autorización del administrador', 'success');
        }
        
        e.target.reset();
        document.getElementById('prestamo-items-container').innerHTML = `
          <div class="prestamo-item-row">
            <select class="prestamo-item-select" required>
              <option value="">Seleccionar item...</option>
            </select>
            <input type="number" class="prestamo-cantidad" placeholder="Cant." min="1" value="1" required>
            <button type="button" class="btn-remove-item" onclick="removePrestamoItem(this)">🗑️</button>
          </div>
        `;
        loadPrestamos();
        loadDashboard();
        
      } catch (err) {
        const prestamoError = document.getElementById('prestamo-error');
        if (prestamoError) prestamoError.textContent = err.message;
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  const miembroForm = document.getElementById('miembro-form');
  if (miembroForm) {
    miembroForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        if (!App.supabase) throw new Error('Sin conexión');
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
      } catch (err) {
        showToast('Error Miembros: ' + err.message, 'error');
      }
    });
  }
  
  console.log("✅ Todos los event listeners configurados");
}

function loginSuccess(user) {
  console.log("🔐 Login exitoso:", user);
  App.user = user;
  App.isAdmin = user.rol === 'administrador';
  
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'block';
  document.getElementById('user-display').textContent = user.nombre.split(' ')[0];
  
  const badge = document.getElementById('role-badge');
  if (badge) {
    badge.textContent = user.rol;
    badge.className = App.isAdmin ? 'role-badge admin' : 'role-badge';
  }
  
  updateAdminUI();
  loadDashboard();
  
  document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.hidden = true; });
  const dashboard = document.getElementById('view-dashboard');
  if (dashboard) { dashboard.classList.add('active'); dashboard.hidden = false; }
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
    
    const statInv = document.getElementById('stat-inventory');
    const statMem = document.getElementById('stat-members');
    const statRep = document.getElementById('stat-reports');
    
    if (statInv) statInv.textContent = inv || 0;
    if (statMem) statMem.textContent = mem || 0;
    if (statRep) statRep.textContent = rep || 0;
  } catch (err) {
    console.error("Error cargando stats:", err);
  }
  
  try {
    const { data: bits, error: bitError } = await App.supabase
      .from('bitacoras')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(5);
    
    if (bitError) throw bitError;
    
    const bitList = document.getElementById('dashboard-bitacora-list');
    if (bitList) {
      if (bits && bits.length > 0) {
        bitList.innerHTML = bits.map(b => 
          `<li class="activity-item">
            <span class="time">${new Date(b.fecha).toLocaleString()}</span>
            <strong>${b.titulo || 'Sin título'}</strong>
            <small style="color:#666;display:block;margin-top:4px">${b.actividad?.substring(0,60) || ''}${b.actividad?.length > 60 ? '...' : ''}</small>
          </li>`
        ).join('');
      } else {
        bitList.innerHTML = '<li class="text-muted">Sin registros de bitácora</li>';
      }
    }
  } catch (err) {
    console.error("❌ Error cargando bitácoras:", err);
    const bitList = document.getElementById('dashboard-bitacora-list');
    if (bitList) bitList.innerHTML = '<li class="text-muted">Error al cargar</li>';
  }
  
  try {
    const { data: reps, error: repError } = await App.supabase
      .from('reportes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (repError) throw repError;
    
    const repList = document.getElementById('dashboard-reportes-list');
    if (repList) {
      const colors = { alto: '#ff0040', medio: '#ffaa00', bajo: '#00cc66' };
      
      if (reps && reps.length > 0) {
        repList.innerHTML = reps.map(r => 
          `<li class="activity-item" style="border-left:4px solid ${colors[r.urgencia] || '#00d4ff'}">
            <span class="time">${new Date(r.created_at).toLocaleString()}</span>
            <strong style="color:${colors[r.urgencia] || '#00d4ff'}">[${(r.urgencia || 'N/A').toUpperCase()}]</strong>
            <span style="color:#333"> ${r.titulo || 'Sin título'}</span>
            ${r.estado === 'cerrado' ? '<small style="color:#28a745;margin-left:8px">✓ Cerrado</small>' : ''}
          </li>`
        ).join('');
      } else {
        repList.innerHTML = '<li class="text-muted">Sin reportes recientes</li>';
      }
    }
  } catch (err) {
    console.error("❌ Error cargando reportes:", err);
    const repList = document.getElementById('dashboard-reportes-list');
    if (repList) repList.innerHTML = '<li class="text-muted">Error al cargar</li>';
  }
  
  try {
    const { count: loans } = await App.supabase
      .from('prestamos')
      .select('*', { count: 'exact', head: true })
      .in('estado', ['autorizado', 'pendiente', 'devolucion_pendiente']);
    const statLoans = document.getElementById('stat-loans');
    if (statLoans) statLoans.textContent = loans || 0;
    
    const { data: prestamos } = await App.supabase
      .from('prestamos')
      .select('*')
      .eq('estado', 'autorizado')
      .order('created_at', { ascending: false })
      .limit(5);
    
    const prestamosList = document.getElementById('dashboard-prestamos-list');
    if (prestamosList) {
      if (prestamos && prestamos.length > 0) {
        prestamosList.innerHTML = prestamos.map(p => {
          const itemsText = p.items?.map(i => `${i.nombre} (x${i.cantidad})`).join(', ') || 'Sin items';
          return `
            <li class="activity-item">
              <span class="time">${new Date(p.fecha_prestamo).toLocaleDateString()}</span>
              <strong>📤 ${p.nombre_solicitante}</strong>
              <small style="color:#666;display:block;margin-top:4px">${itemsText}</small>
              <small style="color:#00cc66">Devolución: ${new Date(p.fecha_devolucion).toLocaleDateString()}</small>
            </li>`;
        }).join('');
      } else {
        prestamosList.innerHTML = '<li class="text-muted">Sin préstamos activos</li>';
      }
    }
  } catch (err) {
    console.error("Error cargando préstamos:", err);
  }
  
  try {
    const { data: devoluciones } = await App.supabase
      .from('prestamos')
      .select('*')
      .eq('estado', 'devuelto')
      .order('fecha_confirmacion', { ascending: false })
      .limit(5);
    
    const devolucionesList = document.getElementById('dashboard-devoluciones-list');
    if (devolucionesList) {
      if (devoluciones && devoluciones.length > 0) {
        devolucionesList.innerHTML = devoluciones.map(d => {
          const itemsText = d.items?.map(i => `${i.nombre} (x${i.cantidad})`).join(', ') || 'Sin items';
          return `
            <li class="activity-item">
              <span class="time">${new Date(d.fecha_confirmacion).toLocaleDateString()}</span>
              <strong>📥 ${d.nombre_solicitante}</strong>
              <small style="color:#666;display:block;margin-top:4px">${itemsText}</small>
              <small style="color:#28a745">✓ Devuelto</small>
            </li>`;
        }).join('');
      } else {
        devolucionesList.innerHTML = '<li class="text-muted">Sin devoluciones recientes</li>';
      }
    }
  } catch (err) {
    console.error("Error cargando devoluciones:", err);
  }
}

async function loadBitacora() {
  if (!App.supabase) return;
  try {
    const { data } = await App.supabase.from('bitacoras').select('*').order('fecha', { ascending: false });
    const tbody = document.getElementById('bitacora-body');
    if (!tbody) return;
    
    if (data && data.length > 0) {
      tbody.innerHTML = data.map(b => `
        <tr>
          <td>${new Date(b.fecha).toLocaleString()}</td>
          <td>${b.nombre_usuario}</td>
          <td>${b.titulo}</td>
          <td>${b.categoria}</td>
          <td>${b.actividad}</td>
          <td>${App.isAdmin ? `<button class="btn-sm" onclick="deleteBitacora('${b.id}')">🗑️</button>` : '-'}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">Sin registros</td></tr>';
    }
  } catch (err) {
    console.error("Error loadBitacora:", err);
  }
}

async function loadReportes() {
  if (!App.supabase) return;
  try {
    const { data } = await App.supabase.from('reportes').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('reportes-list');
    if (!container) return;
    
    const colors = { alto: '#ff0040', medio: '#ffaa00', bajo: '#00ff88' };
    
    if (data && data.length > 0) {
      container.innerHTML = data.map(r => `
        <div class="report-card ${r.estado === 'cerrado' ? 'closed' : ''}">
          <div class="report-header">
            <span class="report-urgencia" style="background:${colors[r.urgencia]}">${r.urgencia.toUpperCase()}</span>
            <span class="status status-${r.estado}">${r.estado}</span>
          </div>
          <h4>${r.titulo}</h4>
          <p>${r.descripcion}</p>
          <div class="report-meta">
            <span>👤 ${r.nombre_usuario}</span>
            <span>📁 ${r.categoria}</span>
          </div>
          ${App.isAdmin && r.estado !== 'cerrado' ? 
            `<div class="report-actions"><button class="btn-primary btn-sm" onclick="closeReport('${r.id}')">✅ Cerrar</button></div>` : ''}
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p>Sin reportes</p>';
    }
  } catch (err) {
    console.error("Error loadReportes:", err);
  }
}

async function loadInventory() {
  if (!App.supabase) return;
  try {
    const { data } = await App.supabase.from('inventario').select('*');
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    
    if (data && data.length > 0) {
      tbody.innerHTML = data.map(i => `
        <tr>
          <td><code>${i.id}</code></td>
          <td>${i.nombre}</td>
          <td>${i.numero_serie || 'N/A'}</td>
          <td>${i.cantidad}</td>
          <td><span class="status status-${i.funciona}">${i.funciona || 'desconocido'}</span></td>
          <td><span class="status status-${i.estado}">${i.estado}</span></td>
          <td>${i.datasheet ? `<a href="${i.datasheet}" target="_blank" class="btn-sm">📄 Ver</a>` : '-'}</td>
          <td>${i.comentarios ? `<button class="btn-sm" onclick="viewComments('${(i.comentarios||'').replace(/'/g, "\\'")}')">💬 Ver</button>` : '-'}</td>
          <td>
            <button class="btn-sm" onclick="editItem('${i.id}')">✏️</button>
            ${App.isAdmin ? `<button class="btn-sm" onclick="deleteItem('${i.id}')" style="color:#ff0040">🗑️</button>` : ''}
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="10">Sin registros</td></tr>';
    }
  } catch (err) {
    console.error("Error loadInventory:", err);
  }
}

async function loadMembers() {
  if (!App.supabase) return;
  try {
    const { data } = await App.supabase.from('usuarios').select('*').order('username');
    const tbody = document.getElementById('miembros-body');
    if (!tbody) return;
    
    if (data && data.length > 0) {
      tbody.innerHTML = data.map(m => `
        <tr>
          <td>${m.id}</td>
          <td>@${m.username}</td>
          <td>${m.nombre_completo || '-'}</td>
          <td><span class="role-badge ${m.rol === 'administrador' ? 'admin' : ''}">${m.rol}</span></td>
          <td>${m.area || '-'}</td>
          <td>${App.isAdmin && m.username !== 'luis' && m.username !== 'sixto' ? 
            `<button class="btn-sm" onclick="deleteMember('${m.username}')" style="color:#ff0040">🗑️</button>` : '🔒'}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">Sin registros</td></tr>';
    }
  } catch (err) {
    console.error("Error loadMembers:", err);
  }
}

window.addPrestamoItem = async function() {
  const container = document.getElementById('prestamo-items-container');
  if (!container) return;
  const newRow = document.createElement('div');
  newRow.className = 'prestamo-item-row';
  newRow.innerHTML = `
    <select class="prestamo-item-select" required>
      <option value="">Cargando...</option>
    </select>
    <input type="number" class="prestamo-cantidad" placeholder="Cant." min="1" value="1" required>
    <button type="button" class="btn-remove-item" onclick="removePrestamoItem(this)">🗑️</button>
  `;
  container.appendChild(newRow);
  
  await loadPrestamoItems(newRow.querySelector('.prestamo-item-select'));
};

window.removePrestamoItem = function(btn) {
  const rows = document.querySelectorAll('.prestamo-item-row');
  if (rows.length > 1) {
    btn.parentElement.remove();
  } else {
    showToast('Debe haber al menos un item', 'warning');
  }
};

async function loadPrestamoItems(selectElement) {
  if (!App.supabase || !selectElement) return;
  try {
    const { data } = await App.supabase
      .from('inventario')
      .select('id, nombre, cantidad')
      .gt('cantidad', 0);
    
    if (data && data.length > 0) {
      selectElement.innerHTML = '<option value="">Seleccionar item...</option>' + 
        data.map(item => `<option value="${item.id}" data-stock="${item.cantidad}">${item.nombre} (Disp: ${item.cantidad})</option>`).join('');
    } else {
      selectElement.innerHTML = '<option value="">Sin items disponibles</option>';
    }
  } catch (err) {
    console.error("Error cargando items:", err);
    selectElement.innerHTML = '<option value="">Error al cargar</option>';
  }
}

window.authorizeLoan = async function(loanId, authorize) {
  if (!App.supabase) return;
  if (!confirm(`${authorize ? 'AUTORIZAR' : 'DENEGAR'} este préstamo?`)) return;
  
  try {
    if (authorize) {
      const { data: prestamo } = await App.supabase
        .from('prestamos')
        .select('items')
        .eq('id', loanId)
        .single();
      
      for (let item of prestamo.items) {
        await App.supabase.rpc('descontar_stock', {
          p_item_id: item.item_id,
          p_cantidad: item.cantidad
        });
      }
      
      await App.supabase.from('prestamos').update({
        estado: 'autorizado',
        autorizado_por: App.user.id,
        fecha_autorizacion: new Date().toISOString()
      }).eq('id', loanId);
      
      showToast('✅ Préstamo autorizado', 'success');
    } else {
      await App.supabase.from('prestamos').update({
        estado: 'denegado',
        autorizado_por: App.user.id,
        fecha_autorizacion: new Date().toISOString()
      }).eq('id', loanId);
      
      showToast('❌ Préstamo denegado', 'success');
    }
    
    loadPrestamos();
    loadDashboard();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.requestReturn = async function(loanId) {
  if (!App.supabase) return;
  if (!confirm('¿Solicitar devolución de este préstamo?')) return;
  
  try {
    await App.supabase.from('prestamos').update({
      estado: 'devolucion_pendiente',
      fecha_devolucion_real: new Date().toISOString()
    }).eq('id', loanId);
    
    showToast('📋 Devolución solicitada. Espera confirmación del administrador', 'success');
    loadPrestamos();
    loadDashboard();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.confirmReturn = async function(loanId) {
  if (!App.supabase) return;
  if (!confirm('¿Confirmar que los items fueron devueltos en buen estado?')) return;
  
  try {
    const { data: prestamo } = await App.supabase
      .from('prestamos')
      .select('items')
      .eq('id', loanId)
      .single();
    
    for (let item of prestamo.items) {
      await App.supabase.rpc('regresar_stock', {
        p_item_id: item.item_id,
        p_cantidad: item.cantidad
      });
    }
    
    await App.supabase.from('prestamos').update({
      estado: 'devuelto',
      confirmado_por: App.user.id,
      fecha_confirmacion: new Date().toISOString()
    }).eq('id', loanId);
    
    showToast('✅ Devolución confirmada', 'success');
    loadPrestamos();
    loadInventory();
    loadDashboard();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

async function loadPrestamos() {
  if (!App.supabase) return;
  try {
    console.log("🔄 Cargando préstamos...");
    
    const itemSelects = document.querySelectorAll('.prestamo-item-select');
    for (let select of itemSelects) {
      await loadPrestamoItems(select);
    }
    
    let query;
    if (App.isAdmin) {
      query = App.supabase.from('prestamos').select('*');
    } else {
      query = App.supabase.from('prestamos').select('*').eq('usuario_id', App.user.id);
    }
    
    const { data } = await query.order('created_at', { ascending: false });
    
    const tbody = document.getElementById('prestamos-body');
    const pendientesBody = document.getElementById('prestamos-pendientes-body');
    const pendientesSection = document.getElementById('prestamos-pendientes-section');
    
    if (tbody) {
      if (data && data.length > 0) {
        const misPrestamos = data.filter(p => 
          App.isAdmin || p.estado === 'autorizado' || p.estado === 'devolucion_pendiente'
        );
        
        tbody.innerHTML = misPrestamos.map(l => {
          const itemsList = l.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ');
          let acciones = '';
          
          if (l.estado === 'autorizado') {
            acciones = `<button class="btn-sm" onclick="requestReturn('${l.id}')">🔄 Solicitar Devolución</button>`;
          } else if (l.estado === 'devolucion_pendiente') {
            acciones = '<span class="status status-pendiente">⏳ Esperando confirmación</span>';
          }
          
          return `
            <tr>
              <td><code>${l.id}</code></td>
              <td>${itemsList}</td>
              <td>${new Date(l.fecha_prestamo).toLocaleDateString()}</td>
              <td>${new Date(l.fecha_devolucion).toLocaleDateString()}</td>
              <td><span class="status status-${l.estado}">${l.estado}</span></td>
              <td>${acciones}</td>
            </tr>
          `;
        }).join('');
        
        if (misPrestamos.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6">Sin préstamos activos</td></tr>';
        }
      } else {
        tbody.innerHTML = '<tr><td colspan="6">Sin préstamos</td></tr>';
      }
    }
    
    if (App.isAdmin && pendientesBody && pendientesSection) {
      const pendientes = data.filter(p => p.estado === 'pendiente');
      
      if (pendientes.length > 0) {
        pendientesSection.hidden = false;
        pendientesBody.innerHTML = pendientes.map(l => {
          const itemsList = l.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ');
          return `
            <tr>
              <td><code>${l.id}</code></td>
              <td>${l.nombre_solicitante}</td>
              <td>${itemsList}</td>
              <td>${new Date(l.fecha_prestamo).toLocaleDateString()}</td>
              <td>${new Date(l.fecha_devolucion).toLocaleDateString()}</td>
              <td>
                <button class="btn-sm btn-success" onclick="authorizeLoan('${l.id}', true)">✅ Autorizar</button>
                <button class="btn-sm btn-danger" onclick="authorizeLoan('${l.id}', false)">❌ Denegar</button>
              </td>
            </tr>
          `;
        }).join('');
      } else {
        pendientesSection.hidden = true;
      }
    }
    
    if (App.isAdmin && tbody) {
      const devolucionesPendientes = data.filter(p => p.estado === 'devolucion_pendiente');
      
      devolucionesPendientes.forEach(l => {
        const row = document.createElement('tr');
        const itemsList = l.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ');
        row.innerHTML = `
          <td><code>${l.id}</code></td>
          <td>${itemsList}</td>
          <td>${new Date(l.fecha_prestamo).toLocaleDateString()}</td>
          <td>${new Date(l.fecha_devolucion).toLocaleDateString()}</td>
          <td><span class="status status-devolucion_pendiente">⏳ Devolución Pendiente</span></td>
          <td><button class="btn-sm btn-success" onclick="confirmReturn('${l.id}')">✅ Confirmar Devolución</button></td>
        `;
        tbody.appendChild(row);
      });
    }
    
  } catch (err) {
    console.error("Error loadPrestamos:", err);
  }
}

window.editItem = async function(id) {
  if (!App.supabase) return;
  console.log("✏️ Editando ID:", id);
  
  if (!id) {
    return showToast('Error: ID no válido', 'error');
  }
  
  try {
    const { data: item, error } = await App.supabase
      .from('inventario')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !item) {
      console.error("❌ Error al buscar:", error);
      return showToast('Item no encontrado', 'error');
    }
    
    const modal = document.getElementById('item-modal');
    if (!modal) return showToast('Modal no encontrado', 'error');
    
    document.getElementById('modal-title').textContent = '✏️ Editar: ' + item.nombre;
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
    const itemError = document.getElementById('item-error');
    if (itemError) itemError.textContent = '';
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    console.log("✅ Modal abierto");
  } catch (err) {
    console.error("Error editItem:", err);
    showToast('Error: ' + err.message, 'error');
  }
};

window.viewComments = function(txt) {
  if (txt && txt.trim()) alert('📝 COMENTARIOS:\n\n' + txt);
  else showToast('Sin comentarios', 'info');
};

window.deleteItem = async function(id) {
  if (!App.supabase) return;
  if (!confirm('¿Eliminar?')) return;
  try {
    const { error } = await App.supabase.from('inventario').delete().eq('id', id);
    if (error) throw error;
    showToast('🗑️ Eliminado', 'success');
    loadInventory();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.deleteBitacora = async function(id) {
  if (!App.supabase) return;
  if (!confirm('¿Eliminar?')) return;
  try {
    await App.supabase.from('bitacoras').delete().eq('id', id);
    showToast('🗑️ Eliminado', 'success');
    loadBitacora();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.deleteMember = async function(username) {
  if (!App.supabase) return;
  if (!confirm(`¿Eliminar a ${username}?`)) return;
  if (username === 'luis' || username === 'sixto') return showToast('🔒 No puedes eliminar admins', 'error');
  try {
    await App.supabase.from('usuarios').delete().eq('username', username);
    showToast('🗑️ Eliminado', 'success');
    loadMembers();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.closeReport = async function(id) {
  if (!App.supabase) return;
  try {
    await App.supabase.from('reportes').update({ estado: 'cerrado' }).eq('id', id);
    showToast('✅ Cerrado', 'success');
    loadReportes();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

function inferCategory(n) {
  n = n.toLowerCase();
  if (n.includes('sensor')) return 'sensores';
  if (n.includes('plc') || n.includes('variador') || n.includes('fuente') || n.includes('interruptor') || n.includes('switch')) return 'electronica';
  if (n.includes('piston') || n.includes('cilindro') || n.includes('neumatico')) return 'mecanica';
  if (n.includes('guante') || n.includes('cable') || n.includes('herramienta')) return 'herramientas';
  return 'otros';
}

function showToast(msg, type = 'info') {
  const d = document.createElement('div');
  d.className = `toast ${type}`;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}
