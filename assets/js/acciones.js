let saldoReal = 1000.00;
let saldoVisible = true;
const numeroCuenta = "1234-5678-9012";

document.getElementById('numeroCuentaValor').textContent = numeroCuenta;

const params = new URLSearchParams(window.location.search);
const usuario = params.get('usuario') || "Invitado";
document.getElementById('saludoUsuario').textContent = `Hola, ${usuario}!`;

function actualizarSaldo() {
  const disponible = saldoReal;
  document.getElementById('saldoReal').textContent = `$${saldoReal.toFixed(2)}`;
  document.getElementById('saldoDisponible').textContent = `$${disponible.toFixed(2)}`;
  document.getElementById('saldoValor').textContent = saldoVisible ? `$${saldoReal.toFixed(2)}` : '****';
}

actualizarSaldo();

function mostrarAlerta({icon, title, text, html}) {
  Swal.fire({
    icon,
    title,
    text: text || undefined,
    html,
    confirmButtonText: 'OK',
    confirmButtonColor: '#007bff'
  });
}

document.getElementById('toggleSaldo').addEventListener('click', () => {
  saldoVisible = !saldoVisible;
  document.getElementById('saldoValor').textContent = saldoVisible ? `$${saldoReal.toFixed(2)}` : '****';
  document.getElementById('toggleSaldo').classList.toggle('fa-eye');
  document.getElementById('toggleSaldo').classList.toggle('fa-eye-slash');
});

function validarMonto(monto) {
  return /^\d+(\.\d{1,2})?$/.test(monto);
}

document.getElementById('formDeposito').addEventListener('submit', e => {
  e.preventDefault();
  const monto = document.getElementById('montoDeposito').value;
  if (validarMonto(monto) && parseFloat(monto) > 0) {
    saldoReal += parseFloat(monto);
    actualizarSaldo();
    $('#depositoModal').modal('hide');
    document.getElementById('montoDeposito').value = '';
    mostrarAlerta({icon: 'success', title: 'Depósito exitoso', text: `Se depositaron $${parseFloat(monto).toFixed(2)}`});
  } else {
    mostrarAlerta({icon: 'error', title: 'Error', text: 'El monto debe ser válido y con hasta 2 decimales.'});
  }
});

document.getElementById('formRetiro').addEventListener('submit', e => {
  e.preventDefault();
  const monto = document.getElementById('montoRetiro').value;
  if (validarMonto(monto) && parseFloat(monto) > 0 && parseFloat(monto) <= saldoReal) {
    saldoReal -= parseFloat(monto);
    actualizarSaldo();
    $('#retiroModal').modal('hide');
    document.getElementById('montoRetiro').value = '';
    mostrarAlerta({icon: 'success', title: 'Retiro exitoso', text: `Se retiraron $${parseFloat(monto).toFixed(2)}`});
  } else {
    mostrarAlerta({icon: 'error', title: 'Error', text: 'Monto inválido o saldo insuficiente.'});
  }
});

const proveedores = {
  Agua: ["💧 Anda"],
  Electricidad: ["⚡ Del Sur", "⚡ CAESS", "⚡ Clesa"],
  Telefonia: ["📱 Movistar", "📱 Digicel", "📱 Claro"],
  Cable: ["📡 Claro", "📡 Tigo", "📡 Salnet"]
};

document.getElementById('servicio').addEventListener('change', function() {
  const sel = this.value;
  const provSelect = document.getElementById('proveedor');
  provSelect.innerHTML = '<option value="">--Selecciona un proveedor--</option>';
  if (sel && proveedores[sel]) {
    proveedores[sel].forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      provSelect.appendChild(opt);
    });
  }
});

document.getElementById('formPago').addEventListener('submit', e => {
  e.preventDefault();
  const monto = document.getElementById('montoServicio').value;
  const servicio = document.getElementById('servicio').value;
  const proveedor = document.getElementById('proveedor').value;
  if (validarMonto(monto) && parseFloat(monto) > 0 && parseFloat(monto) <= saldoReal && servicio && proveedor) {
    saldoReal -= parseFloat(monto);
    actualizarSaldo();
    $('#pagoModal').modal('hide');
    document.getElementById('montoServicio').value = '';
    document.getElementById('servicio').value = '';
    document.getElementById('proveedor').value = '';
    mostrarAlerta({icon: 'success', title: 'Pago exitoso', text: `Se pagó $${parseFloat(monto).toFixed(2)} de ${servicio} a ${proveedor}`});
  } else {
    mostrarAlerta({icon: 'error', title: 'Error', text: 'Monto inválido, saldo insuficiente o servicio/proveedor no seleccionado.'});
  }
});

document.getElementById('btnSalir').addEventListener('click', () => {
  window.location.href = 'index.html';
});

document.getElementById('btnHistorial').addEventListener('click', () => {
  const usuarioParam = encodeURIComponent(usuario);
  window.location.href = `historial.html?usuario=${usuarioParam}`;
});

document.getElementById('btnGrafica').addEventListener('click', () => {
  $('#graficaModal').modal('show');
  const ctx = document.getElementById('chartTransacciones').getContext('2d');
  if (window.chartInstance) window.chartInstance.destroy();
  window.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Depósitos', 'Retiros', 'Pagos'],
      datasets: [{
        label: 'Cantidad de transacciones',
        data: [5, 3, 2],
        backgroundColor: ['#28a745', '#dc3545', '#007bff']
      }]
    },
    options: {responsive: true}
  });
});
