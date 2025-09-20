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

const historialTransacciones = [
    { fecha: '20-Julio-2025', descripcion: 'Pago intereses', monto: 22.00, tipo: 'Credito' },
    { fecha: '22-Julio-2025', descripcion: 'Pago tarjeta de credito', monto: 18.00, tipo: 'Debito' },
    { fecha: '24-Julio-2025', descripcion: 'Retiro ATM', monto: 10.00, tipo: 'Debito' },
    { fecha: '26-Julio-2025', descripcion: 'Transferencia 365', monto: 25.00, tipo: 'Credito' },
    { fecha: '28-Julio-2025', descripcion: 'Pago Del Sur', monto: 50.00, tipo: 'Debito' },
    { fecha: '30-Julio-2025', descripcion: 'Pago planilla', monto: 800.00, tipo: 'Credito' },
    { fecha: '02-Agosto-2025', descripcion: 'Pago de intereses', monto: 23.00, tipo: 'Credito' },
    { fecha: '04-Agosto-2025', descripcion: 'Pago de tarjeta de credito', monto: 200.00, tipo: 'Debito' },
    { fecha: '06-Agosto-2025', descripcion: 'Transferencia 365', monto: 35.00, tipo: 'Credito' },
    { fecha: '08-Agosto-2025', descripcion: 'Pago ANDA', monto: 10.00, tipo: 'Debito' }
];

document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('chartTransacciones').getContext('2d');
    let chartInstance = null;

    function renderLineChart(labels, data) {
        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Evolución del Saldo ($)',
                    data: data, 
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolución del Saldo a lo Largo del Tiempo'
                    }
                }
            }
        });
    }

    document.getElementById('btnGrafica').addEventListener('click', () => {
        let saldoAcumulado = 1000; 
        const saldoEvolucion = [];
        const fechas = [];

        historialTransacciones.forEach(t => {
            if (t.tipo === 'Credito') {
                saldoAcumulado += t.monto;
            } else {
                saldoAcumulado -= t.monto;
            }
            saldoEvolucion.push(saldoAcumulado.toFixed(2));
            fechas.push(t.fecha);
        });

        renderLineChart(fechas, saldoEvolucion);
        $('#graficaModal').modal('show');
    });
});
