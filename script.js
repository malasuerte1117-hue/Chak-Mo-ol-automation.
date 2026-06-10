// ============================================
// CHAK' MO'OL - Club de Robótica
// ============================================

const SUPABASE_URL = 'https://wmoejlgebchqtchzopuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb2VqbGdlYmNocXRjaHpvcHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Njg0MjksImV4cCI6MjA5MzA0NDQyOX0.lK3BKNmCHlMIDtLWOAwsyvuWNMvIcgQvzUH0IjYZ9y4';

const ADMIN_USERS = [
  { username: 'luis', password: 'LECR1123', nombre: 'Luis Enrique Canul Rosado', rol: 'administrador', id: 1 },
  { username: 'sixto', password: 'sixto2026', nombre: 'Sixto', rol: 'administrador', id: 2 }
];

let App = { user: null, isAdmin: false, supabase: null };

// ============================================
// OCULTAR LOADER - SIEMPRE SE EJECUTA
// ============================================
function hideLoader() {
  try {
    var loader = document.getElementById('loading-overlay');
    if (loader) {
      loader.style.display = 'none';
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
    }
  } catch(e) {
    console.error('Error ocultando loader:', e);
  }
}

// Ocultar loader después de 1 segundo (forzado)
setTimeout(hideLoader, 1000);

// ============================================
// INICIALIZACIÓN
// ============================================
function initApp() {
  console.log('🚀 Iniciando aplicación...');
  
  try {
    var loginSection = document.getElementById('login-section');
    var appSection = document.getElementById('app-section');
    
    if (loginSection) loginSection.style.display = 'flex';
    if (appSection) appSection.style.display = 'none';
    
    if (window.supabase) {
      App.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('✅ Supabase inicializado');
    } else {
      console.warn('⚠️ Supabase no disponible');
    }
    
    setupEvents();
    console.log('✅ App lista');
  } catch(e) {
    console.error('❌ Error en init:', e);
  } finally {
    hideLoader();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEvents() {
  console.log(' Configurando eventos...');
  
  // LOGIN
  var loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleLogin();
    });
  }
  
  // LOGOUT
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      App.user = null;
      App.isAdmin = false;
      var appSection = document.getElementById('app-section');
      var loginSection = document.getElementById('login-section');
      if (appSection) appSection.style.display = 'none';
      if (loginSection) loginSection.style.display = 'flex';
    });
  }
  
  // MENÚ HAMBURGUESA (MÓVIL)
  var menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      var sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.toggle('open');
      }
    });
  }
  
  // CERRAR SIDEBAR AL HACER CLIC FUERA
  document.addEventListener('click', function(e) {
    var sidebar = document.getElementById('sidebar');
    var menuBtn = document.getElementById('menu-toggle');
    if (sidebar && menuBtn && window.innerWidth < 1024) {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    }
  });
  
  // NAVEGACIÓN
  var navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var view = e.currentTarget.getAttribute('data-view');
      if (!view) return;
      
      if (e.currentTarget.classList.contains('admin-only') && !App.isAdmin) {
        showToast(' Solo administradores', 'error');
        return;
      }
      
      document.querySelectorAll('.view').forEach(function(v) { 
        v.classList.remove('active'); 
        v.hidden = true; 
      });
      
      document.querySelectorAll('.nav-item').forEach(function(n) { 
        n.classList.remove('active'); 
      });
      
      var target = document.getElementById('view-' + view);
      if (target) { 
        target.classList.add('active'); 
        target.hidden = false; 
      }
      e.currentTarget.classList.add('active');
      
      // Cerrar sidebar en móvil
      if (window.innerWidth < 1024) {
        var sidebar = document.getElementById('sidebar');
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
  
  // FORM BITÁCORA
  var bitacoraForm = document.getElementById('bitacora-form');
  if (bitacoraForm) {
    bitacoraForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!App.supabase) { showToast('Sin conexión', 'error'); return; }
      try {
        await App.supabase.from('bitacoras').insert([{
          usuario_id: App.user.id,
          nombre_usuario: App.user.nombre || App.user.username,
          titulo: document.getElementById('bitacora-titulo').value,
          actividad: document.getElementById('bitacora-actividad').value,
          categoria: document.getElementById('bitacora-categoria').value,
          fecha: new Date().toISOString()
        }]);
        showToast('✅ Bitácora guardada', 'success');
        this.reset();
        loadBitacora();
        loadDashboard();
      } catch(err) {
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  // FORM REPORTE
  var reporteForm = document.getElementById('reporte-form');
  if (reporteForm) {
    reporteForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!App.supabase) { showToast('Sin conexión', 'error'); return; }
      try {
        await App.supabase.from('reportes').insert([{
          usuario_id: App.user.id,
          nombre_usuario: App.user.nombre || App.user.username,
          titulo: document.getElementById('reporte-titulo').value,
          descripcion: document.getElementById('reporte-descripcion').value,
          categoria: document.getElementById('reporte-categoria').value,
          urgencia: document.getElementById('reporte-urgencia').value,
          estado: 'abierto',
          created_at: new Date().toISOString()
        }]);
        showToast('🚨 Reporte creado', 'success');
        this.reset();
        loadReportes();
        loadDashboard();
      } catch(err) {
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  // EXPORTAR EXCEL
  var btnExport = document.getElementById('btn-export-excel');
  if (btnExport) {
    btnExport.addEventListener('click', async function() {
      if (!App.supabase) { showToast('Sin conexión', 'error'); return; }
      try {
        var result = await App.supabase.from('inventario').select('*');
        var data = result.data;
        if (!data || data.length === 0) { showToast('Sin datos', 'warning'); return; }
        
        var headers = Object.keys(data[0]);
        var csv = headers.join(',') + '\n';
        
        data.forEach(function(row) {
          var values = headers.map(function(h) {
            var val = row[h];
            return typeof val === 'string' && val.includes(',') ? '"' + val + '"' : val;
          });
          csv += values.join(',') + '\n';
        });
        
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Inventario.csv';
        a.click();
        showToast('📦 Exportado', 'success');
      } catch(err) {
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  // MODAL ITEM
  var modal = document.getElementById('item-modal');
  var modalClose = document.querySelector('.modal-close');
  if (modalClose && modal) {
    modalClose.addEventListener('click', function() {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    });
  }
  
  var btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem && modal) {
    btnAddItem.addEventListener('click', function() {
      document.getElementById('modal-title').textContent = '➕ Nuevo Equipo';
      document.getElementById('item-form').reset();
      document.getElementById('item-id').value = '';
      var itemError = document.getElementById('item-error');
      if (itemError) itemError.textContent = '';
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    });
  }
  
  // FORM ITEM
  var itemForm = document.getElementById('item-form');
  if (itemForm) {
    itemForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!App.supabase) { showToast('Sin conexión', 'error'); return; }
      try {
        var id = document.getElementById('item-id').value;
        var item = {
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
          var cleanName = item.nombre.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
          id = 'LAB-' + cleanName + '-' + Date.now().toString().slice(-6);
          item.id = id;
          item.created_at = new Date().toISOString();
          await App.supabase.from('inventario').insert([item]);
          showToast('✅ Creado', 'success');
        }
        
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }
        loadInventory();
      } catch(err) {
        var itemError = document.getElementById('item-error');
        if (itemError) itemError.textContent = 'Error: ' + err.message;
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  // FORM PRÉSTAMO
  var prestamoForm = document.getElementById('prestamo-form');
  if (prestamoForm) {
    prestamoForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!App.supabase) { showToast('Sin conexión', 'error'); return; }
      try {
        var items = [];
        var itemRows = document.querySelectorAll('.prestamo-item-row');
        
        for (var i = 0; i < itemRows.length; i++) {
          var row = itemRows[i];
          var itemId = row.querySelector('.prestamo-item-select').value;
          var cantidad = parseInt(row.querySelector('.prestamo-cantidad').value);
          
          if (itemId && cantidad > 0) {
            var itemResult = await App.supabase.from('inventario').select('nombre, cantidad').eq('id', itemId).single();
            var itemData = itemResult.data;
            
            if (!itemData) throw new Error('Item no encontrado');
            if (cantidad > itemData.cantidad) throw new Error('Stock insuficiente');
            
            items.push({ item_id: itemId, cantidad: cantidad, nombre: itemData.nombre });
          }
        }
        
        if (items.length === 0) throw new Error('Selecciona al menos un item');
        
        var fechaInicio = document.getElementById('prestamo-fecha-inicio').value;
        var fechaDevolucion = document.getElementById('prestamo-fecha-devolucion').value;
        var motivo = document.getElementById('prestamo-motivo').value;
        
        if (new Date(fechaInicio) > new Date(fechaDevolucion)) {
          throw new Error('Fecha inválida');
        }
        
        var prestamoData = {
          usuario_id: App.user.id,
          nombre_solicitante: App.user.nombre_completo || App.user.username,
          items: items,
          fecha_prestamo: fechaInicio,
          fecha_devolucion: fechaDevolucion,
          motivo: motivo,
          estado: App.isAdmin ? 'autorizado' : 'pendiente',
          autorizado_por: App.isAdmin ? App.user.id : null,
          created_at: new Date().toISOString()
        };
        
        await App.supabase.from('prestamos').insert([prestamoData]).select().single();
        
        if (App.isAdmin) {
          for (var j = 0; j < items.length; j++) {
            await App.supabase.rpc('descontar_stock', {
              p_item_id: items[j].item_id,
              p_cantidad: items[j].cantidad
            });
          }
          showToast('✅ Préstamo autorizado', 'success');
        } else {
          showToast('📋 Solicitud enviada', 'success');
        }
        
        this.reset();
        var container = document.getElementById('prestamo-items-container');
        if (container) {
          container.innerHTML = '<div class="prestamo-item-row"><select class="prestamo-item-select" required><option value="">Seleccionar item...</option></select><input type="number" class="prestamo-cantidad" placeholder="Cant." min="1" value="1" required><button type="button" class="btn-remove-item" onclick="removePrestamoItem(this)">🗑️</button></div>';
        }
        loadPrestamos();
        loadDashboard();
      } catch(err) {
        var prestamoError = document.getElementById('prestamo-error');
        if (prestamoError) prestamoError.textContent = err.message;
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  // FORM MIEMBRO
  var miembroForm = document.getElementById('miembro-form');
  if (miembroForm) {
    miembroForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!App.supabase) { showToast('Sin conexión', 'error'); return; }
      try {
        await App.supabase.from('usuarios').insert([{
          username: document.getElementById('miembro-username').value.trim(),
          password: document.getElementById('miembro-password').value,
          nombre_completo: document.getElementById('miembro-nombre').value.trim(),
          rol: document.getElementById('miembro-rol').value,
          area: document.getElementById('miembro-area').value.trim(),
          created_at: new Date().toISOString()
        }]);
        showToast('✅ Miembro creado', 'success');
        this.reset();
        loadMembers();
      } catch(err) {
        showToast('Error: ' + err.message, 'error');
      }
    });
  }
  
  console.log('✅ Eventos configurados');
}

// ============================================
// LOGIN
// ============================================
function handleLogin() {
  var username = document.getElementById('username').value.trim().toLowerCase();
  var password = document.getElementById('password').value;
  
  for (var i = 0; i < ADMIN_USERS.length; i++) {
    if (ADMIN_USERS[i].username === username && ADMIN_USERS[i].password === password) {
      loginSuccess(ADMIN_USERS[i]);
      return;
    }
  }
  
  if (!App.supabase) {
    showToast('❌ Sin conexión', 'error');
    return;
  }
  
  App.supabase.from('usuarios').select('*').eq('username', username).eq('password', password).single()
    .then(function(result) {
      if (result.error || !result.data) {
        showToast('❌ Credenciales incorrectas', 'error');
      } else {
        loginSuccess(result.data);
      }
    })
    .catch(function(err) {
      showToast('Error: ' + err.message, 'error');
    });
}

function loginSuccess(user) {
  console.log('🔐 Login:', user);
  App.user = user;
  App.isAdmin = user.rol === 'administrador';
  
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'block';
  
  var userDisplay = document.getElementById('user-display');
  if (userDisplay) userDisplay.textContent = user.nombre.split(' ')[0];
  
  var badge = document.getElementById('role-badge');
  if (badge) {
    badge.textContent = user.rol;
    badge.className = App.isAdmin ? 'role-badge admin' : 'role-badge';
  }
  
  updateAdminUI();
  loadDashboard();
  
  document.querySelectorAll('.view').forEach(function(v) { 
    v.classList.remove('active'); 
    v.hidden = true; 
  });
  
  var dashboard = document.getElementById('view-dashboard');
  if (dashboard) { 
    dashboard.classList.add('active'); 
    dashboard.hidden = false; 
  }
}

function updateAdminUI() {
  document.querySelectorAll('.admin-only').forEach(function(el) { 
    el.hidden = !App.isAdmin; 
  });
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
  if (!App.supabase) return;
  
  try {
    var invResult = await App.supabase.from('inventario').select('*', { count: 'exact', head: true });
    var memResult = await App.supabase.from('usuarios').select('*', { count: 'exact', head: true });
    var repResult = await App.supabase.from('reportes').select('*', { count: 'exact', head: true }).eq('estado', 'abierto');
    
    var statInv = document.getElementById('stat-inventory');
    var statMem = document.getElementById('stat-members');
    var statRep = document.getElementById('stat-reports');
    var statLoans = document.getElementById('stat-loans');
    
    if (statInv) statInv.textContent = invResult.count || 0;
    if (statMem) statMem.textContent = memResult.count || 0;
    if (statRep) statRep.textContent = repResult.count || 0;
    
    var loansResult = await App.supabase.from('prestamos').select('*', { count: 'exact', head: true }).in('estado', ['autorizado', 'pendiente', 'devolucion_pendiente']);
    if (statLoans) statLoans.textContent = loansResult.count || 0;
  } catch (err) {
    console.error("Error stats:", err);
  }
  
  try {
    var bitsResult = await App.supabase.from('bitacoras').select('*').order('fecha', { ascending: false }).limit(5);
    var bitList = document.getElementById('dashboard-bitacora-list');
    if (bitList) {
      if (bitsResult.data && bitsResult.data.length > 0) {
        bitList.innerHTML = bitsResult.data.map(function(b) {
          return '<li class="activity-item"><span class="time">' + new Date(b.fecha).toLocaleString() + '</span><strong>' + (b.titulo || 'Sin título') + '</strong><small style="color:#666;display:block;margin-top:4px">' + (b.actividad ? b.actividad.substring(0,60) : '') + (b.actividad && b.actividad.length > 60 ? '...' : '') + '</small></li>';
        }).join('');
      } else {
        bitList.innerHTML = '<li class="text-muted">Sin registros</li>';
      }
    }
  } catch (err) {
    console.error("Error bitacora:", err);
  }
  
  try {
    var repsResult = await App.supabase.from('reportes').select('*').order('created_at', { ascending: false }).limit(5);
    var repList = document.getElementById('dashboard-reportes-list');
    if (repList) {
      var colors = { alto: '#ff0040', medio: '#ffaa00', bajo: '#00cc66' };
      if (repsResult.data && repsResult.data.length > 0) {
        repList.innerHTML = repsResult.data.map(function(r) {
          return '<li class="activity-item" style="border-left:4px solid ' + (colors[r.urgencia] || '#00d4ff') + '"><span class="time">' + new Date(r.created_at).toLocaleString() + '</span><strong style="color:' + (colors[r.urgencia] || '#00d4ff') + '">[' + (r.urgencia || 'N/A').toUpperCase() + ']</strong><span style="color:#333"> ' + (r.titulo || 'Sin título') + '</span>' + (r.estado === 'cerrado' ? '<small style="color:#28a745;margin-left:8px">✓ Cerrado</small>' : '') + '</li>';
        }).join('');
      } else {
        repList.innerHTML = '<li class="text-muted">Sin reportes</li>';
      }
    }
  } catch (err) {
    console.error("Error reportes:", err);
  }
  
  try {
    var prestamosResult = await App.supabase.from('prestamos').select('*').eq('estado', 'autorizado').order('created_at', { ascending: false }).limit(5);
    var prestamosList = document.getElementById('dashboard-prestamos-list');
    if (prestamosList) {
      if (prestamosResult.data && prestamosResult.data.length > 0) {
        prestamosList.innerHTML = prestamosResult.data.map(function(p) {
          var itemsText = p.items ? p.items.map(function(i) { return i.nombre + ' (x' + i.cantidad + ')'; }).join(', ') : 'Sin items';
          return '<li class="activity-item"><span class="time">' + new Date(p.fecha_prestamo).toLocaleDateString() + '</span><strong>📤 ' + p.nombre_solicitante + '</strong><small style="color:#666;display:block;margin-top:4px">' + itemsText + '</small><small style="color:#00cc66">Devolución: ' + new Date(p.fecha_devolucion).toLocaleDateString() + '</small></li>';
        }).join('');
      } else {
        prestamosList.innerHTML = '<li class="text-muted">Sin préstamos</li>';
      }
    }
  } catch (err) {
    console.error("Error prestamos:", err);
  }
  
  try {
    var devResult = await App.supabase.from('prestamos').select('*').eq('estado', 'devuelto').order('fecha_confirmacion', { ascending: false }).limit(5);
    var devList = document.getElementById('dashboard-devoluciones-list');
    if (devList) {
      if (devResult.data && devResult.data.length > 0) {
        devList.innerHTML = devResult.data.map(function(d) {
          var itemsText = d.items ? d.items.map(function(i) { return i.nombre + ' (x' + i.cantidad + ')'; }).join(', ') : 'Sin items';
          return '<li class="activity-item"><span class="time">' + new Date(d.fecha_confirmacion).toLocaleDateString() + '</span><strong>📥 ' + d.nombre_solicitante + '</strong><small style="color:#666;display:block;margin-top:4px">' + itemsText + '</small><small style="color:#28a745">✓ Devuelto</small></li>';
        }).join('');
      } else {
        devList.innerHTML = '<li class="text-muted">Sin devoluciones</li>';
      }
    }
  } catch (err) {
    console.error("Error devoluciones:", err);
  }
}

// ============================================
// BITÁCORA
// ============================================
async function loadBitacora() {
  if (!App.supabase) return;
  try {
    var result = await App.supabase.from('bitacoras').select('*').order('fecha', { ascending: false });
    var tbody = document.getElementById('bitacora-body');
    if (!tbody) return;
    
    if (result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map(function(b) {
        return '<tr><td>' + new Date(b.fecha).toLocaleString() + '</td><td>' + b.nombre_usuario + '</td><td>' + b.titulo + '</td><td>' + b.categoria + '</td><td>' + b.actividad + '</td><td>' + (App.isAdmin ? '<button class="btn-sm" onclick="deleteBitacora(\'' + b.id + '\')">🗑️</button>' : '-') + '</td></tr>';
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">Sin registros</td></tr>';
    }
  } catch (err) {
    console.error("Error loadBitacora:", err);
  }
}

// ============================================
// REPORTES
// ============================================
async function loadReportes() {
  if (!App.supabase) return;
  try {
    var result = await App.supabase.from('reportes').select('*').order('created_at', { ascending: false });
    var container = document.getElementById('reportes-list');
    if (!container) return;
    
    var colors = { alto: '#ff0040', medio: '#ffaa00', bajo: '#00ff88' };
    
    if (result.data && result.data.length > 0) {
      container.innerHTML = result.data.map(function(r) {
        return '<div class="report-card ' + (r.estado === 'cerrado' ? 'closed' : '') + '"><div class="report-header"><span class="report-urgencia" style="background:' + colors[r.urgencia] + '">' + r.urgencia.toUpperCase() + '</span><span class="status status-' + r.estado + '">' + r.estado + '</span></div><h4>' + r.titulo + '</h4><p>' + r.descripcion + '</p><div class="report-meta"><span> ' + r.nombre_usuario + '</span><span>📁 ' + r.categoria + '</span></div>' + (App.isAdmin && r.estado !== 'cerrado' ? '<div class="report-actions"><button class="btn-primary btn-sm" onclick="closeReport(\'' + r.id + '\')">✅ Cerrar</button></div>' : '') + '</div>';
      }).join('');
    } else {
      container.innerHTML = '<p>Sin reportes</p>';
    }
  } catch (err) {
    console.error("Error loadReportes:", err);
  }
}

// ============================================
// INVENTARIO
// ============================================
async function loadInventory() {
  if (!App.supabase) return;
  try {
    var result = await App.supabase.from('inventario').select('*');
    var tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    
    if (result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map(function(i) {
        return '<tr><td><code>' + i.id + '</code></td><td>' + i.nombre + '</td><td>' + (i.numero_serie || 'N/A') + '</td><td>' + i.cantidad + '</td><td><span class="status status-' + i.funciona + '">' + (i.funciona || 'desconocido') + '</span></td><td><span class="status status-' + i.estado + '">' + i.estado + '</span></td><td>' + (i.datasheet ? '<a href="' + i.datasheet + '" target="_blank" class="btn-sm">📄 Ver</a>' : '-') + '</td><td>' + (i.comentarios ? '<button class="btn-sm" onclick="viewComments(\'' + (i.comentarios||'').replace(/'/g, "\\'") + '\')">💬 Ver</button>' : '-') + '</td><td><button class="btn-sm" onclick="editItem(\'' + i.id + '\')">✏️</button>' + (App.isAdmin ? '<button class="btn-sm" onclick="deleteItem(\'' + i.id + '\')" style="color:#ff0040">🗑️</button>' : '') + '</td></tr>';
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="10">Sin registros</td></tr>';
    }
  } catch (err) {
    console.error("Error loadInventory:", err);
  }
}

// ============================================
// MIEMBROS
// ============================================
async function loadMembers() {
  if (!App.supabase) return;
  try {
    var result = await App.supabase.from('usuarios').select('*').order('username');
    var tbody = document.getElementById('miembros-body');
    if (!tbody) return;
    
    if (result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map(function(m) {
        return '<tr><td>' + m.id + '</td><td>@' + m.username + '</td><td>' + (m.nombre_completo || '-') + '</td><td><span class="role-badge ' + (m.rol === 'administrador' ? 'admin' : '') + '">' + m.rol + '</span></td><td>' + (m.area || '-') + '</td><td>' + (App.isAdmin && m.username !== 'luis' && m.username !== 'sixto' ? '<button class="btn-sm" onclick="deleteMember(\'' + m.username + '\')" style="color:#ff0040">🗑️</button>' : '🔒') + '</td></tr>';
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">Sin registros</td></tr>';
    }
  } catch (err) {
    console.error("Error loadMembers:", err);
  }
}

// ============================================
// PRÉSTAMOS
// ============================================
window.addPrestamoItem = async function() {
  var container = document.getElementById('prestamo-items-container');
  if (!container) return;
  var newRow = document.createElement('div');
  newRow.className = 'prestamo-item-row';
  newRow.innerHTML = '<select class="prestamo-item-select" required><option value="">Cargando...</option></select><input type="number" class="prestamo-cantidad" placeholder="Cant." min="1" value="1" required><button type="button" class="btn-remove-item" onclick="removePrestamoItem(this)">🗑️</button>';
  container.appendChild(newRow);
  await loadPrestamoItems(newRow.querySelector('.prestamo-item-select'));
};

window.removePrestamoItem = function(btn) {
  var rows = document.querySelectorAll('.prestamo-item-row');
  if (rows.length > 1) {
    btn.parentElement.remove();
  } else {
    showToast('Debe haber al menos un item', 'warning');
  }
};

async function loadPrestamoItems(selectElement) {
  if (!App.supabase || !selectElement) return;
  try {
    var result = await App.supabase.from('inventario').select('id, nombre, cantidad').gt('cantidad', 0);
    if (result.data && result.data.length > 0) {
      selectElement.innerHTML = '<option value="">Seleccionar item...</option>' + result.data.map(function(item) {
        return '<option value="' + item.id + '" data-stock="' + item.cantidad + '">' + item.nombre + ' (Disp: ' + item.cantidad + ')</option>';
      }).join('');
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
  if (!confirm((authorize ? 'AUTORIZAR' : 'DENEGAR') + ' este préstamo?')) return;
  
  try {
    if (authorize) {
      var prestamoResult = await App.supabase.from('prestamos').select('items').eq('id', loanId).single();
      var prestamo = prestamoResult.data;
      
      for (var i = 0; i < prestamo.items.length; i++) {
        await App.supabase.rpc('descontar_stock', {
          p_item_id: prestamo.items[i].item_id,
          p_cantidad: prestamo.items[i].cantidad
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
  if (!confirm('¿Solicitar devolución?')) return;
  
  try {
    await App.supabase.from('prestamos').update({
      estado: 'devolucion_pendiente',
      fecha_devolucion_real: new Date().toISOString()
    }).eq('id', loanId);
    
    showToast('📋 Devolución solicitada', 'success');
    loadPrestamos();
    loadDashboard();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.confirmReturn = async function(loanId) {
  if (!App.supabase) return;
  if (!confirm('¿Confirmar devolución?')) return;
  
  try {
    var prestamoResult = await App.supabase.from('prestamos').select('items').eq('id', loanId).single();
    var prestamo = prestamoResult.data;
    
    for (var i = 0; i < prestamo.items.length; i++) {
      await App.supabase.rpc('regresar_stock', {
        p_item_id: prestamo.items[i].item_id,
        p_cantidad: prestamo.items[i].cantidad
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
    var itemSelects = document.querySelectorAll('.prestamo-item-select');
    for (var i = 0; i < itemSelects.length; i++) {
      await loadPrestamoItems(itemSelects[i]);
    }
    
    var query;
    if (App.isAdmin) {
      query = App.supabase.from('prestamos').select('*');
    } else {
      query = App.supabase.from('prestamos').select('*').eq('usuario_id', App.user.id);
    }
    
    var result = await query.order('created_at', { ascending: false });
    var data = result.data;
    
    var tbody = document.getElementById('prestamos-body');
    var pendientesBody = document.getElementById('prestamos-pendientes-body');
    var pendientesSection = document.getElementById('prestamos-pendientes-section');
    
    if (tbody) {
      if (data && data.length > 0) {
        var misPrestamos = data.filter(function(p) {
          return App.isAdmin || p.estado === 'autorizado' || p.estado === 'devolucion_pendiente';
        });
        
        tbody.innerHTML = misPrestamos.map(function(l) {
          var itemsList = l.items.map(function(i) { return i.nombre + ' (x' + i.cantidad + ')'; }).join(', ');
          var acciones = '';
          
          if (l.estado === 'autorizado') {
            acciones = '<button class="btn-sm" onclick="requestReturn(\'' + l.id + '\')">🔄 Solicitar Devolución</button>';
          } else if (l.estado === 'devolucion_pendiente') {
            acciones = '<span class="status status-pendiente">⏳ Esperando</span>';
          }
          
          return '<tr><td><code>' + l.id + '</code></td><td>' + itemsList + '</td><td>' + new Date(l.fecha_prestamo).toLocaleDateString() + '</td><td>' + new Date(l.fecha_devolucion).toLocaleDateString() + '</td><td><span class="status status-' + l.estado + '">' + l.estado + '</span></td><td>' + acciones + '</td></tr>';
        }).join('');
        
        if (misPrestamos.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6">Sin préstamos activos</td></tr>';
        }
      } else {
        tbody.innerHTML = '<tr><td colspan="6">Sin préstamos</td></tr>';
      }
    }
    
    if (App.isAdmin && pendientesBody && pendientesSection) {
      var pendientes = data.filter(function(p) { return p.estado === 'pendiente'; });
      
      if (pendientes.length > 0) {
        pendientesSection.hidden = false;
        pendientesBody.innerHTML = pendientes.map(function(l) {
          var itemsList = l.items.map(function(i) { return i.nombre + ' (x' + i.cantidad + ')'; }).join(', ');
          return '<tr><td><code>' + l.id + '</code></td><td>' + l.nombre_solicitante + '</td><td>' + itemsList + '</td><td>' + new Date(l.fecha_prestamo).toLocaleDateString() + '</td><td>' + new Date(l.fecha_devolucion).toLocaleDateString() + '</td><td><button class="btn-sm" onclick="authorizeLoan(\'' + l.id + '\', true)">✅ Autorizar</button> <button class="btn-sm" onclick="authorizeLoan(\'' + l.id + '\', false)">❌ Denegar</button></td></tr>';
        }).join('');
      } else {
        pendientesSection.hidden = true;
      }
    }
    
    if (App.isAdmin && tbody) {
      var devolucionesPendientes = data.filter(function(p) { return p.estado === 'devolucion_pendiente'; });
      
      devolucionesPendientes.forEach(function(l) {
        var row = document.createElement('tr');
        var itemsList = l.items.map(function(i) { return i.nombre + ' (x' + i.cantidad + ')'; }).join(', ');
        row.innerHTML = '<td><code>' + l.id + '</code></td><td>' + itemsList + '</td><td>' + new Date(l.fecha_prestamo).toLocaleDateString() + '</td><td>' + new Date(l.fecha_devolucion).toLocaleDateString() + '</td><td><span class="status status-devolucion_pendiente">⏳ Devolución Pendiente</span></td><td><button class="btn-sm" onclick="confirmReturn(\'' + l.id + '\')">✅ Confirmar Devolución</button></td>';
        tbody.appendChild(row);
      });
    }
    
  } catch (err) {
    console.error("Error loadPrestamos:", err);
  }
}

// ============================================
// FUNCIONES GLOBALES
// ============================================
window.editItem = async function(id) {
  if (!App.supabase) return;
  console.log("✏️ Editando:", id);
  
  if (!id) {
    showToast('Error: ID inválido', 'error');
    return;
  }
  
  try {
    var result = await App.supabase.from('inventario').select('*').eq('id', id).single();
    var item = result.data;
    
    if (!item) {
      showToast('Item no encontrado', 'error');
      return;
    }
    
    var modal = document.getElementById('item-modal');
    if (!modal) {
      showToast('Modal no encontrado', 'error');
      return;
    }
    
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
    var itemError = document.getElementById('item-error');
    if (itemError) itemError.textContent = '';
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  } catch (err) {
    console.error("Error editItem:", err);
    showToast('Error: ' + err.message, 'error');
  }
};

window.viewComments = function(txt) {
  if (txt && txt.trim()) {
    alert('📝 COMENTARIOS:\n\n' + txt);
  } else {
    showToast('Sin comentarios', 'info');
  }
};

window.deleteItem = async function(id) {
  if (!App.supabase) return;
  if (!confirm('¿Eliminar?')) return;
  try {
    await App.supabase.from('inventario').delete().eq('id', id);
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
  if (!confirm('¿Eliminar a ' + username + '?')) return;
  if (username === 'luis' || username === 'sixto') {
    showToast('🔒 No puedes eliminar admins', 'error');
    return;
  }
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

function showToast(msg, type) {
  if (type === void 0) type = 'info';
  var d = document.createElement('div');
  d.className = 'toast ' + type;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(function() { d.remove(); }, 3000);
}
