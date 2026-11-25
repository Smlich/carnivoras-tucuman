# Arquitectura del proyecto

## Entrega 0: frontend

```text
Navegador
  └── React + Vite
       ├── componentes de página y catálogo
       ├── catálogo local en src/data
       ├── carrito persistido en localStorage
       └── enlace wa.me con resumen del pedido
```

El navegador mantiene el carrito de este dispositivo. WhatsApp recibe un borrador del pedido; el negocio confirma stock, precio y entrega manualmente. No se reciben pagos ni se crean cuentas en esta entrega.

## Arquitectura objetivo: MERN

```text
React (cliente)
  └── API HTTPS
       └── Node.js + Express
            ├── autenticación OAuth (Google / Facebook)
            ├── validación y reglas de negocio
            └── MongoDB (productos, cuentas, pedidos)
```

El cliente nunca se conecta directamente a MongoDB. El servidor valida cada operación, controla permisos y conserva los secretos de OAuth. Las rutas de administración requieren autorización. Los identificadores y secretos de proveedor viven en variables de entorno del servidor.

## Decisiones de la primera entrega

- Vite permite iniciar con un frontend pequeño y evolucionar sin rehacer la interfaz.
- El catálogo está separado en datos para facilitar su migración posterior a la API.
- El contacto comercial se concentra en WhatsApp hasta definir pagos, entrega y backend.
- No se inventa el acceso social: botones de autenticación solo aparecerán cuando los proveedores estén configurados y el flujo pueda completarse.
- Las imágenes del catálogo son los archivos originales compartidos por Carnívoras Tucumán. No se generan plantas artificiales ni se cambia su contenido.

## Módulos previstos para la API

- Productos: listar, consultar, crear y actualizar disponibilidad.
- Cuentas: OAuth, sesión, perfil y cierre de sesión.
- Pedidos: crear, consultar los propios y actualizar estados desde administración.
- Operaciones: validación, manejo centralizado de errores y registro sin datos sensibles.
