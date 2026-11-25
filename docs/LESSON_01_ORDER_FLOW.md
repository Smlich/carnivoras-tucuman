# Lección 1 — Seguir un pedido de principio a fin

## Objetivo

Poder explicar dónde empieza una tarjeta de producto y cómo termina convertida en un mensaje de WhatsApp.

## Recorrido del código

1. `src/data/products.js` contiene los datos iniciales: nombre, especie, precio y foto.
2. `src/components/ProductCatalog.jsx` pide el catálogo a la API y muestra los datos locales si la API todavía no está disponible.
3. `src/components/ProductCard.jsx` recibe un producto y llama a `onAdd` cuando se presiona “Agregar”.
4. `src/App.jsx` pasa el producto al hook del carrito.
5. `src/hooks/use-cart.js` guarda producto y cantidad en el estado y en `localStorage`.
6. `src/components/CartDrawer.jsx` presenta el pedido y calcula el total de referencia.
7. `src/utils/whatsapp.js` arma el texto y codifica el enlace `wa.me`.

## Conceptos clave

- **Props:** datos o acciones que un componente recibe de su padre.
- **Estado:** valores que cambian y provocan que React vuelva a dibujar la interfaz.
- **Persistencia local:** localStorage permite conservar el carrito en ese navegador; no sincroniza dispositivos ni sirve como base de datos de pedidos.
- **Confianza:** el total del navegador es solo una referencia. Si luego hay pagos online, el servidor deberá volver a calcular el precio con datos de MongoDB.

## Práctica breve

1. Cambia la descripción de un producto en `src/data/products.js`.
2. Revisa que el texto aparezca en la tarjeta del catálogo.
3. Agrega ese producto al pedido y recarga la página.
4. Explica qué parte guarda el pedido y qué parte construye el mensaje.
