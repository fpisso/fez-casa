const EXCEL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTm-Grb7rsoD8w5nYEe1N_MKkHxaO3ogG8Z-b4QCi30HHOZWFzVVXkkaOj19dJcd8muMbibV_wwlKXM/pub?output=csv';

let productos = [];
let carrito = [];

// 1. OBTENER DATOS DEL EXCEL
async function obtenerProductos() {
    try {
        const respuesta = await fetch(EXCEL_URL);
        const datos = await respuesta.text();
        const filas = datos.split(/\r?\n/).slice(1);
        
        productos = filas.map((fila, index) => {
            const columnas = fila.includes(';') ? fila.split(';') : fila.split(',');
            if (columnas.length < 4 || !columnas[1]) return null;
            const limpiar = (texto) => texto ? texto.replace(/^"|"$/g, '').trim() : "";

            return {
                id: index,
                sku: limpiar(columnas[0]),
                nombre: limpiar(columnas[1]),
                categoria: limpiar(columnas[2]) || "General",
                precio: parseInt(limpiar(columnas[3]).replace(/\D/g,'')) || 0,
                descripcion: limpiar(columnas[4]) || "",
                medidas: procesarMedidas(limpiar(columnas[5])),
                imagen: limpiar(columnas[6]) || "https://via.placeholder.com/400x500?text=FEZ+Casa"
            };
        }).filter(p => p !== null && p.precio > 0);
        
        renderizarCategorias();
        renderizarProductos(productos);
    } catch (error) {
        console.error("Error:", error);
    }
}

function procesarMedidas(texto) {
    if (!texto || texto.trim() === "") return [];
    return texto.split('|').map(m => {
        const partes = m.split(':');
        return { 
            talle: partes[0] ? partes[0].trim() : "Opción", 
            extra: partes[1] ? parseInt(partes[1].replace(/\D/g,'')) : 0 
        };
    });
}

// 2. RENDERIZAR
function renderizarCategorias() {
    const categorias = ['Todos', ...new Set(productos.map(p => p.categoria))];
    const contenedor = document.getElementById('filtros-categorias');
    if(!contenedor) return;
    contenedor.innerHTML = categorias.map(cat => `<button class="btn-filtro" onclick="filtrarProductos('${cat}')">${cat}</button>`).join('');
}

function filtrarProductos(cat) {
    const filtrados = (cat === 'Todos') ? productos : productos.filter(p => p.categoria === cat);
    renderizarProductos(filtrados);
}

function renderizarProductos(lista) {
    const grid = document.getElementById('tienda-grid');
    if(!grid) return;
    grid.innerHTML = lista.map(p => `
        <div class="card">
            <div class="sku-tag">Art. ${p.sku}</div> 
            <img src="${p.imagen}" onclick="abrirFicha(${p.id})">
            <h3 onclick="abrirFicha(${p.id})">${p.nombre}</h3>
            <p class="precio-card">$${p.precio.toLocaleString()}</p>
            <button class="btn-card" onclick="clickBotonDirecto(${p.id})">
                ${p.medidas.length > 0 ? 'Ver Opciones' : 'Añadir al Carrito'}
            </button>
        </div>
    `).join('');
}

// 4. LÓGICA DE CLICS Y MODAL
function clickBotonDirecto(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    if (p.medidas.length > 0) {
        abrirFicha(id);
    } else {
        agregarAlCarrito(p.sku, p.nombre, p.precio, "Única");
    }
}

function abrirFicha(id) {
    const p = productos.find(x => x.id === id);
    if(!p) return;

    document.getElementById('modal-titulo').innerHTML = `<small style="color:#888">Art. ${p.sku}</small><br>${p.nombre}`;
    document.getElementById('modal-descripcion').innerText = p.descripcion;
    document.getElementById('modal-img').src = p.imagen;
    
    const divMedidas = document.getElementById('opciones-medidas');
    const btnModal = document.getElementById('btn-agregar-modal');

    if (p.medidas.length > 0) {
        divMedidas.innerHTML = '<h4>Seleccioná el tamaño:</h4>' + p.medidas.map(m => `
            <button class="btn-card" style="background:#eee; color:#333; margin-bottom:8px; width:100%" 
                onclick="agregarAlCarrito('${p.sku}', '${p.nombre}', ${p.precio + m.extra}, '${m.talle}')">
                ${m.talle} (+$${m.extra.toLocaleString()})
            </button>
        `).join('');
        btnModal.style.display = 'none';
    } else {
        divMedidas.innerHTML = '';
        btnModal.style.display = 'block';
        btnModal.onclick = () => agregarAlCarrito(p.sku, p.nombre, p.precio, "Única");
    }

    document.getElementById('modal-producto').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// 5. CARRITO
function agregarAlCarrito(sku, nombre, precio, talle) {
    carrito.push({ sku, nombre, precio, talle });
    actualizarCarritoUI();
    cerrarTodo(); // Esto cierra el modal
    abrirCarrito(); // Esto abre el sidebar para mostrar que se agregó
}

function abrirCarrito() {
    document.getElementById('carrito-sidebar').classList.add('active');
    document.getElementById('overlay').style.display = 'block';
}

function cerrarTodo() {
    document.getElementById('carrito-sidebar').classList.remove('active');
    document.getElementById('modal-producto').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function actualizarCarritoUI() {
    const container = document.getElementById('carrito-items');
    let total = 0;
    container.innerHTML = carrito.map((i, idx) => {
        total += i.precio;
        return `<div class="carrito-item" style="border-bottom:1px solid #eee; padding:10px 0; position:relative">
                    <small>Art. ${i.sku}</small><br>
                    <strong>${i.nombre}</strong> (${i.talle})<br>
                    <span>$${i.precio.toLocaleString()}</span>
                    <button onclick="eliminar(${idx})" style="position:absolute; right:0; top:10px; background:none; border:none; cursor:pointer">🗑️</button>
                </div>`;
    }).join('');

    document.getElementById('cart-total').innerText = `$${total.toLocaleString()}`;
    document.getElementById('cart-count').innerText = carrito.length;
    
    const porc = Math.min((total / 50000) * 100, 100);
    if(document.getElementById('progress-bar')) document.getElementById('progress-bar').style.width = porc + '%';
    if(document.getElementById('envio-msg')) {
        document.getElementById('envio-msg').innerText = total >= 50000 ? "¡Envío GRATIS alcanzado! 🚚" : `Faltan $${(50000 - total).toLocaleString()} para Envío Gratis`;
    }
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

    let msg = `Hola FEZ Casa! Mi pedido:\n\n`;
    carrito.forEach(i => msg += `- [Art. ${i.sku}] ${i.nombre} (${i.talle}): $${i.precio.toLocaleString()}\n`);
    msg += `\nZona: ${zona}\nTotal: ${document.getElementById('cart-total').innerText}`;
    window.open(`https://wa.me/543415150064?text=${encodeURIComponent(msg)}`);
}

// ASIGNAR EVENTOS (Corregido para que coincida con tu HTML)
window.onload = obtenerProductos;
document.getElementById('overlay').onclick = cerrarTodo;
document.getElementById('btn-cerrar-carrito').onclick = cerrarTodo;
document.getElementById('btn-abrir-carrito').onclick = abrirCarrito;
document.querySelector('.cerrar-modal').onclick = cerrarTodo;



