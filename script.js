const EXCEL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTm-Grb7rsoD8w5nYEe1N_MKkHxaO3ogG8Z-b4QCi30HHOZWFzVVXkkaOj19dJcd8muMbibV_wwlKXM/pub?output=csv';

let productos = [];
let carrito = [];

// 1. OBTENER DATOS DEL EXCEL
async function obtenerProductos() {
    try {
        console.log("Conectando a Google Sheets...");
        const respuesta = await fetch(EXCEL_URL);
        
        if (!respuesta.ok) throw new Error("Respuesta de red no ok: " + respuesta.statusText);

        const datos = await respuesta.text();
        
        if (datos.length < 10) throw new Error("El Excel parece estar vacío o no publicado.");

        const filas = datos.split(/\r?\n/).slice(1);
        
       productos = filas.map((fila, index) => {
    // Soporta coma o punto y coma
    const columnas = fila.includes(';') ? fila.split(';') : fila.split(',');
    
    // Ahora chequeamos que tenga al menos 4 columnas (SKU, Nombre, Cat, Precio)
    if (columnas.length < 4 || !columnas[1]) return null;

    const limpiar = (texto) => texto ? texto.replace(/^"|"$/g, '').trim() : "";

    return {
        id: index,
        sku: limpiar(columnas[0]), // Columna A (0)
        nombre: limpiar(columnas[1]), // Columna B (1)
        categoria: limpiar(columnas[2]) || "General", // Columna C (2)
        precio: parseInt(limpiar(columnas[3]).replace(/\D/g,'')) || 0, // Columna D (3)
        descripcion: limpiar(columnas[4]) || "", // Columna E (4)
        medidas: procesarMedidas(limpiar(columnas[5])), // Columna F (5)
        imagen: limpiar(columnas[6]) || "https://via.placeholder.com/400x500?text=FEZ+Casa" // Columna G (6)
    };
}).filter(p => p !== null && p.precio > 0); // Filtramos los que tienen precio 0
        
        console.log("Productos cargados:", productos);
        renderizarCategorias();
        renderizarProductos(productos);

    } catch (error) {
        console.error("Error detallado:", error);
        alert("Error: " + error.message);
    }
}

function procesarMedidas(texto) {
    if (!texto) return [];
    return texto.split('|').map(m => {
        const partes = m.split(':');
        return { 
            talle: partes[0] ? partes[0].trim() : "Opción", 
            extra: partes[1] ? parseInt(partes[1].replace(/\D/g,'')) : 0 
        };
    });
}

// 2. RENDERIZAR CATEGORÍAS
function renderizarCategorias() {
    const categorias = ['Todos', ...new Set(productos.map(p => p.categoria))];
    const contenedor = document.getElementById('filtros-categorias');
    if(!contenedor) return;

    contenedor.innerHTML = categorias.map(cat => `
        <button class="btn-filtro" onclick="filtrarProductos('${cat}')">${cat}</button>
    `).join('');
}

function filtrarProductos(cat) {
    const filtrados = (cat === 'Todos') ? productos : productos.filter(p => p.categoria === cat);
    renderizarProductos(filtrados);
}

// 3. RENDERIZAR PRODUCTOS
function renderizarProductos(lista) {
    const grid = document.getElementById('tienda-grid');
    if(!grid) return;
    grid.innerHTML = lista.map(p => `
        <div class="card">
            <img src="${p.imagen}" onclick="abrirFicha(${p.id})">
            <h3 onclick="abrirFicha(${p.id})">${p.nombre}</h3>
            <p>$${p.precio.toLocaleString()}</p>
            <button class="btn-card" onclick="clickBotonDirecto(${p.id})">
                ${p.medidas.length > 0 ? 'Ver Opciones' : 'Añadir al Carrito'}
            </button>
        </div>
    `).join('');
}

// 4. LÓGICA DE CLICS Y MODAL
function clickBotonDirecto(id) {
    const p = productos.find(x => x.id === id);
    if (p.medidas.length > 0) {
        abrirFicha(id);
    } else {
        agregarAlCarrito(p.nombre, p.precio, "Única");
    }
}

function abrirFicha(id) {
    const p = productos.find(x => x.id === id);
    if(!p) return;

    document.getElementById('modal-titulo').innerText = p.nombre;
    document.getElementById('modal-descripcion').innerText = p.descripcion;
    document.getElementById('modal-img').src = p.imagen;
    
    const divMedidas = document.getElementById('opciones-medidas');
    const btnModal = document.getElementById('btn-agregar-modal');

    if (p.medidas.length > 0) {
        divMedidas.innerHTML = '<h4>Seleccioná el tamaño:</h4>' + p.medidas.map(m => `
            <button class="btn-card" style="background:#eee; color:#444; margin-bottom:8px" 
                onclick="agregarAlCarrito('${p.nombre}', ${p.precio + m.extra}, '${m.talle}')">
                ${m.talle} (+$${m.extra.toLocaleString()})
            </button>
        `).join('');
        btnModal.style.display = 'none';
    } else {
        divMedidas.innerHTML = '';
        btnModal.style.display = 'block';
        btnModal.onclick = () => agregarAlCarrito(p.nombre, p.precio, "Única");
    }

    document.getElementById('modal-producto').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// 5. CARRITO
function agregarAlCarrito(nombre, precio, talle) {
    carrito.push({ nombre, precio, talle });
    actualizarCarritoUI();
    cerrarTodo();
    document.getElementById('carrito-sidebar').classList.add('active');
    document.getElementById('overlay').style.display = 'block';
}

function cerrarTodo() {
    document.getElementById('carrito-sidebar').classList.remove('active');
    const modal = document.getElementById('modal-producto');
    if(modal) modal.style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function actualizarCarritoUI() {
    const container = document.getElementById('carrito-items');
    let total = 0;
    container.innerHTML = carrito.map((i, idx) => {
        total += i.precio;
        return `<div style="border-bottom:1px solid #eee; padding:15px 0; position:relative">
                    <strong>${i.nombre}</strong><br>
                    <small>Talle: ${i.talle}</small><br>
                    <span>$${i.precio.toLocaleString()}</span>
                    <button onclick="eliminar(${idx})" style="position:absolute; right:0; top:15px; border:none; background:none; cursor:pointer">🗑️</button>
                </div>`;
    }).join('');

    document.getElementById('cart-total').innerText = `$${total.toLocaleString()}`;
    document.getElementById('cart-count').innerText = carrito.length;

    const porc = Math.min((total / 50000) * 100, 100);
    const progressBar = document.getElementById('progress-bar');
    if(progressBar) progressBar.style.width = porc + '%';
    
    const envMsg = document.getElementById('envio-msg');
    if(envMsg) envMsg.innerText = total >= 50000 ? "¡Envío GRATIS alcanzado! 🚚" : `Faltan $${(50000 - total).toLocaleString()} para Envío Gratis`;
}

function eliminar(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

function validarYEnviar() {
    const nombre = document.getElementById('nombre-cliente').value;
    const zona = document.getElementById('select-zona').value;

    if (!nombre) { alert("Por favor, dejanos tu nombre."); return; }
    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }

    let msg = `Hola FEZ Casa! Mi nombre es ${nombre}.\nQuiero realizar un pedido:\n\n`;
    carrito.forEach(i => msg += `- ${i.nombre} (${i.talle}): $${i.precio.toLocaleString()}\n`);
    msg += `\nZona de entrega: ${zona}\nTotal: ${document.getElementById('cart-total').innerText}`;
    
    window.open(`https://wa.me/543482XXXXXX?text=${encodeURIComponent(msg)}`);
}

// ASIGNAR EVENTOS
window.onload = obtenerProductos;

document.getElementById('overlay').onclick = cerrarTodo;
document.getElementById('btn-cerrar-carrito').onclick = cerrarTodo;
document.querySelector('.cerrar-modal').onclick = cerrarTodo;
document.getElementById('btn-abrir-carrito').onclick = () => {
    document.getElementById('carrito-sidebar').classList.add('active');
    document.getElementById('overlay').style.display = 'block';

};
