// ==================================================================
// --- INICIO: Nuevo Sistema de Estado Unificado ---
// ==================================================================

// Clave principal (la misma que usa index.js, historial.js, analisis.html)
const storageKey = "pokemonBank";

// Objeto de estado global para esta página
let estado = {
  user: { name: "Invitado", account: "000000" },
  balance: 0.00,
  transactions: []
};

let saldoVisible = true;

// Carga el estado desde localStorage
function cargarEstado() {
  try {
    const guardado = localStorage.getItem(storageKey);
    if (guardado) {
      estado = JSON.parse(guardado);
      // Asegurarnos que los números son números
      estado.balance = Number(estado.balance || 0);
      if (!Array.isArray(estado.transactions)) {
          estado.transactions = [];
      }
    } else {
      // Si no hay nada (p.ej. no pasó por login), mostrar alerta y redirigir
      Swal.fire({
        icon: 'error',
        title: 'Error de Sesión',
        text: 'No se pudo cargar la información de la cuenta. Por favor, inicia sesión.',
        confirmButtonColor: '#007bff'
      }).then(() => {
        window.location.href = 'index.html';
      });
    }
  } catch (e) {
    console.error("Error cargando estado:", e);
    // Redirigir si el estado está corrupto
    window.location.href = 'index.html';
  }
}

// Guarda el estado completo en localStorage
function guardarEstado() {
  localStorage.setItem(storageKey, JSON.stringify(estado));
}

// Actualiza la UI con el saldo del estado
function actualizarSaldo(){
  const disponible = estado.balance;
  document.getElementById('saldoReal').textContent = `$${estado.balance.toFixed(2)}`;
  document.getElementById('saldoDisponible').textContent = `$${disponible.toFixed(2)}`;
  document.getElementById('saldoValor').textContent = saldoVisible ? `$${estado.balance.toFixed(2)}` : '****';
}

// Registra la transacción EN EL ESTADO unificado
function registrarTransaccion(tipo, monto, servicio = null) {
  // El formato debe ser compatible con historial.js y analisis.html
  const transaccion = {
    id: `tx_${new Date().getTime()}_${estado.transactions.length + 1}`,
    type: tipo, // "Deposito", "Retiro", "Pago"
    service: servicio, // p.ej. "💧 Anda"
    amount: parseFloat(monto),
    dateISO: new Date().toISOString(),
    balanceAfter: estado.balance // El saldo *después* de la operación
  };
  
  estado.transactions.push(transaccion);
  guardarEstado(); // Guarda el estado actualizado
}
// ==================================================================
// --- FIN: Nuevo Sistema de Estado Unificado ---
// ==================================================================


// --- Inicialización al cargar la página ---
cargarEstado();
actualizarSaldo();

// Mostrar nombre de usuario y número de cuenta del estado
const params = new URLSearchParams(window.location.search);
const usuario = params.get("usuario") || estado.user.name || "Invitado";
document.getElementById("saludoUsuario").textContent = `Hola, ${usuario}!`;
document.getElementById("numeroCuentaValor").textContent = estado.user.account || "1234-5678-9012";

// Alerta de bienvenida
Swal.fire({
  icon: "info",
  title: `Bienvenido ${usuario} a Pokémon Bank`,
  text: "Selecciona una operación para comenzar.",
  confirmButtonText: "Continuar",
  confirmButtonColor: "#007bff",
});


// Toggle saldo
document.getElementById("toggleSaldo").addEventListener("click", () => {
  saldoVisible = !saldoVisible;
  actualizarSaldo(); // Llama a la función que usa el 'estado'
  document.getElementById("toggleSaldo").classList.toggle("fa-eye");
  document.getElementById("toggleSaldo").classList.toggle("fa-eye-slash");
});


// Validar monto (Helper de tu archivo original)
function validarMonto(monto){ return /^\d+(\.\d{1,2})?$/.test(monto); }

// Alerta (Helper de tu archivo original)
function mostrarAlerta({icon,title,text,html}) {
  Swal.fire({icon,title,text:text||undefined,html,confirmButtonText:'OK',confirmButtonColor:'#007bff'});
}


// Depósito (Modificado para usar el estado)
function depositar(e) {
  e.preventDefault();
  const montoDepositado = document.getElementById('montoDeposito').value.trim(); 
  const monto = parseFloat(montoDepositado);
  const constraints = {
    monto: {presence: { message: "No puede estar vacio"}, numericality: {greaterThan: 0, message: "Debe ser un numero mayor a 0."}}
  };

  const error = validate({ monto: montoDepositado}, constraints); 

  if(error) {
    mostrarAlerta({icon: "error", title: "Monto invalido", text: `El monto ${error.monto[0]}`})
    return; 
  }

  Swal.fire({
    icon: "question", title: "Deseas realizar este deposito?", text: `Monto: $${monto.toFixed(2)}`,
    showCancelButton: true, confirmButtonText: "Si, continuar", confirmButtonColor: "#dc3545",
  }).then((result) => {
    if(result.isConfirmed) {
      estado.balance += monto; // Modifica el estado
      registrarTransaccion('Deposito', monto, null); // Registra en el estado
      actualizarSaldo(); // Actualiza UI desde el estado

      $('#depositoModal').modal('hide'); 
      document.getElementById('montoDeposito').value = "";
      mostrarAlerta({icon: "success", title: "El deposito fue exitoso", text: `El deposito de $${monto.toFixed(2)} fue exitoso.` });
    }
  });
}


// Retiro (Modificado para usar el estado)
function Retiro(e) {
  e.preventDefault(); 
  const montoRetirado = document.getElementById('montoRetiro').value.trim(); 
  const monto = parseFloat(montoRetirado);

  const constraints ={
    monto: {presence: { message: "No puede estar vacio"}, numericality: {greaterThan: 0, message: "Debe ser un numero mayor a 0."}}
  }; 

  const error = validate({monto: montoRetirado}, constraints); 

  if(error) {
    mostrarAlerta({icon: "error", title: "Monto invalido", text: `El monto ${error.monto[0]}`})
  }

  if(monto > estado.balance) { // Valida contra el estado
    mostrarAlerta({icon: "error", title: "Saldo insuficiente", text: "No puedes retirar más dinero del que tienes disponible."});
    return;
  }

    Swal.fire({
    icon: "warning", title: "Deseas realizar este returo?", text: `Monto: $${monto.toFixed(2)}`,
    showCancelButton: true, confirmButtonText: "Si, continuar", cancelButtonText: "Cancelar", confirmButtonColor: "#dc3545",
  }).then((result) => {
    if(result.isConfirmed) {
      estado.balance -= monto; // Modifica el estado
      registrarTransaccion('Retiro', monto, null); // Registra en el estado
      actualizarSaldo(); // Actualiza UI desde el estado

      $('#retiroModal').modal('hide'); 
      document.getElementById('montoRetiro').value = ""; 
      mostrarAlerta({icon: "success", title: "El retiro fue exitoso", text: `El retiro de $${monto.toFixed(2)} fue exitoso.` });
    }
  });
}

// ================== Pago de servicios (lógica original) ==================
const proveedores = {
  Agua: ["💧 Anda"],
  Electricidad: ["⚡ Del Sur", "⚡ CAESS", "⚡ Clesa"],
  Telefonia: ["📱 Movistar", "📱 Digicel", "📱 Claro"],
  Cable: ["📡 Claro", "📡 Tigo", "📡 Salnet"],
};

document.getElementById("servicio").addEventListener("change", function () {
  const sel = this.value;
  const provSelect = document.getElementById("proveedor");
  provSelect.innerHTML = '<option value="">--Selecciona un proveedor--</option>';
  if (sel && proveedores[sel]) {
    proveedores[sel].forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      provSelect.appendChild(opt);
    });
  }
});


// PagoServicios (Modificado para usar el estado)
function PagoServicios(e) {
  e.preventDefault(); 
  const montoPago = document.getElementById('montoServicio').value.trim();
  const servicio = document.getElementById('servicio').value; 
  const proveedor = document.getElementById('proveedor').value;
  const monto = parseFloat(montoPago);

  const constraints = {
    monto: {presence: { message: "No puede estar vacio"}, numericality: {greaterThan: 0, message: "Debe ser un numero mayor a 0."}},
    servicio: { presence: {message: "Debe ser seleccionado." }}, 
    proveedor: { presence: {message: "Debe ser seleccionado"}}
  }; 

  const datos = {monto: montoPago, servicio: servicio, proveedor: proveedor};
  const error = validate(datos, constraints); 

  if(error) {
    const mensajeError = Object.keys(error).map(key => `${key.charAt(0).toUpperCase() + key.slice(1)} ${error[key][0]}`).join('<br>');
    mostrarAlerta({ icon: 'error', title: 'Error de Validación', html: `Por favor corrige:<br>${mensajeError}` });
    return; 
  }

  if (monto > estado.balance) { // Valida contra el estado
    mostrarAlerta({ icon: 'error', title: 'Saldo insuficiente', text: `Fondos insuficientes`});
    return;
  }

  Swal.fire({
    icon: "warning", title: "Deseas realizar este pago", text: `Pago de: $${monto.toFixed(2)} a ${proveedor} por ${servicio}?`,
    showCancelButton: true, confirmButtonText: "Si, continuar", cancelButtonText: "Cancelar", confirmButtonColor: "#dc3545",
  }).then((result) => {
    if(result.isConfirmed) {
      estado.balance -= monto; // Modifica el estado
      // Registra en el estado (formato compatible con analisis.html)
      registrarTransaccion('Pago', monto, `${servicio} (${proveedor})`); 
      actualizarSaldo(); // Actualiza UI desde el estado

      $('#pagoModal').modal('hide'); 
      document.getElementById('montoServicio').value = '';
      document.getElementById('servicio').value = ''; 
      document.getElementById('proveedor').value = ''; 
      mostrarAlerta({icon: "success", title: "El pago fue exitoso", text: `El pago de $${monto.toFixed(2)} por el servicio de ${servicio} a ${proveedor} fue exitoso.` });
    }
  });
}

// --- Asignación de eventos (original) ---
document.getElementById('formDeposito').addEventListener('submit', depositar); 
document.getElementById('formRetiro').addEventListener('submit', Retiro); 
document.getElementById('formPago').addEventListener('submit', PagoServicios); 

// --- Botón Salir (Modificado para Resetear localStorage) ---
document.getElementById('btnSalir').addEventListener('click', () => {
  
  Swal.fire({
    title: '¿Cerrar Sesión?',
    text: "¿Deseas también resetear todos los datos de la cuenta (saldo y transacciones)?",
    icon: 'warning',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonColor: '#dc3545',
    denyButtonColor: '#007bff',
    cancelButtonText: 'Cancelar',
    confirmButtonText: 'Sí, Salir y Resetear',
    denyButtonText: 'Solo Salir'
  }).then((result) => {
    // Clave unificada
    const storageKey = "pokemonBank";

    if (result.isConfirmed) {
      // Opción: Salir y Resetear
      localStorage.removeItem(storageKey);
      // También borramos la clave antigua por si acaso
      localStorage.removeItem('HistorialDelUsuario'); 
      window.location.href = 'index.html';

    } else if (result.isDenied) {
      // Opción: Solo Salir
      window.location.href = 'index.html';
    }
    // Si es "Cancelar", no hace nada
  });
});


// --- Botones de navegación (original) ---
document.getElementById('btnHistorial').addEventListener('click', () => {
    const usuarioParam = encodeURIComponent(usuario);
    window.location.href = `historial.html?usuario=${usuarioParam}`;
});

document.getElementById('btnGrafica').addEventListener('click',()=>{
    $('#graficaModal').modal('show');
    const ctx = document.getElementById('chartTransacciones').getContext('2d');
    if(window.chartInstance) window.chartInstance.destroy();
    
    // NOTA: Esta gráfica sigue usando datos fijos.
    // Para conectarla al estado, necesitarías un análisis similar al de analisis.html
    window.chartInstance = new Chart(ctx,{
        type:'bar',
        data:{labels:['Depósitos','Retiros','Pagos'],datasets:[{label:'Cantidad de transacciones',data:[5,3,2],backgroundColor:['#28a745','#dc3545','#007bff']}]},
        options:{responsive:true}
    });
});
