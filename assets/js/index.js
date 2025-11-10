document.addEventListener('DOMContentLoaded', () => {
  // Helpers
  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  function validarPIN(pin) {
    return /^\d{4}$/.test(pin);
  }
  function mostrarAlerta({icon, title, text, html}) {
    Swal.fire({
      icon: icon,
      title: title,
      text: text || undefined,
      html: html || undefined,
      confirmButtonText: 'OK',
      confirmButtonColor: '#007bff',
      buttonsStyling: true
    });
  }

  // ==================================================================
  // --- Login (Modificado para validar a Ash y crear estado) ---
  // ==================================================================
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    const usuario = document.getElementById('username').value.trim();
    const pin = document.getElementById('password').value.trim();

    // 1. Validaciones básicas
    if(!usuario || !pin){
      mostrarAlerta({
        icon:'error',
        title:'Error',
        text:'Debes ingresar tu usuario y tu PIN.'
      });
      return;
    }

    if(!validarPIN(pin)){
      mostrarAlerta({
        icon:'error',
        title:'Error',
        text:'El PIN debe tener exactamente 4 dígitos numéricos.'
      });
      return;
    }

    // 2. Validación específica de usuario
    const validUser = "Ash Ketchum";
    const validPIN = "1234";
    const userAccount = "1234-5678-9012";
    const initialBalance = 500.00;
    // Esta es la clave que historial.js y analisis.html esperan leer
    const storageKey = "pokemonBank"; 

    if (usuario !== validUser || pin !== validPIN) {
      mostrarAlerta({
        icon: 'error',
        title: 'Credenciales incorrectas',
        text: 'Usuario o PIN no válido. (Solo "Ash Ketchum" / "1234" pueden ingresar).'
      });
      return;
    }

    // 3. Si el login es correcto, inicializa el localStorage (si no existe)
    // Esto asegura que los $500 y la info del usuario se carguen
    if (!localStorage.getItem(storageKey)) {
      const initialState = {
        user: {
          name: validUser,
          account: userAccount
        },
        balance: initialBalance,
        transactions: [] // Inicia sin transacciones
      };
      localStorage.setItem(storageKey, JSON.stringify(initialState));
      
      // Limpia la clave antigua que usa acciones.js para evitar conflictos
      localStorage.removeItem('HistorialDelUsuario'); 
    }

    // 4. Redirección
    loginForm.reset();
    window.location.href = `acciones.html?usuario=${encodeURIComponent(usuario)}`;
  });
  // ==================================================================
  // --- Fin de la modificación de Login ---
  // ==================================================================


  // Términos
  document.getElementById('linkTerminos').addEventListener('click', function(e){
    e.preventDefault();
    mostrarAlerta({
      icon: 'info',
      title: 'Términos y condiciones',
      text: 'Al aceptar los términos, aceptas las condiciones de uso de Pokémon Bank.'
    });
  });

  // Recuperar PIN
  const forgotForm = document.getElementById('forgotForm');
  forgotForm.addEventListener('submit', function(e){
    e.preventDefault();
    const email = document.getElementById('recoverEmail').value.trim();
    if(!validarEmail(email)){
      mostrarAlerta({icon:'error',title:'Error',text:'Por favor ingresa un correo válido.'});
      return;
    }
    $('#forgotModal').modal('hide');
    mostrarAlerta({icon:'success',title:'Enviado',text:`Se ha enviado un enlace de recuperación a ${email}`});
    forgotForm.reset();
  });

  // Crear cuenta
  const crearForm = document.getElementById('formCrearCuenta');
  crearForm.addEventListener('submit', function(e){
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const pin = document.getElementById('pin').value.trim();

    if(!nombre || !apellido || !validarEmail(correo) || !validarPIN(pin)){
      mostrarAlerta({icon:'error',title:'Error',text:'Por favor ingresa un correo válido y/o un PIN de 4 dígitos numéricos.'});
      return;
    }

    $('#crearCuentaModal').modal('hide');
    mostrarAlerta({
      icon: 'success',
      title: 'Cuenta creada',
      html: `Usuario: <strong>${nombre} ${apellido}</strong><br>¡Bienvenido a Pokémon Bank!`
    });

    crearForm.reset();
  });
});