📦 Perfume Inventory & Sales Management System
📋 Descripción del Proyecto
Sistema completo de gestión de inventario, ventas y finanzas para un negocio de perfumes. Desarrollado para un emprendimiento real, permite controlar costos, ventas a crédito, abonos y la gestión del fondo de socios.

🎯 Características Principales
🔐 Autenticación y Seguridad
Login con JWT y bcrypt

Encriptación de contraseñas

Rutas protegidas por autenticación

🧪 Gestión de Inventario
CRUD completo de perfumes

Cálculo automático de costos:

Costo unitario = Precio proveedor + (Costo envío / Piezas del lote)

Ganancia unitaria automática

Stock en tiempo real

Seguimiento de proveedores y notas

💰 Sistema de Ventas Inteligente
Ventas al contado o a plazos con abonos

Cálculo automático del total

Historial de abonos por venta

Estado de liquidación (porcentaje pagado)

Validación de stock disponible

📊 Dashboard Financiero
Dinero en caja: Cobrado de ventas - Retirado del fondo

Por cobrar: Saldo pendiente de todas las ventas

Capital en inventario: Costo de productos no vendidos

Stock total: Piezas disponibles

Valor de stock a precio público

🏦 Fondo de Socios
Registro de ingresos y retiros

Saldo automático del fondo

Validación: no permite retirar más de lo disponible en caja

Mensajes de estado (te sobra / te falta dinero)

Edición y eliminación de movimientos

🏦 Módulo de Ahorro
Configuración de meta de ahorro

Registro de movimientos de ahorro

Seguimiento del progreso

🛠️ Tecnologías Utilizadas
Backend
Node.js + Express.js

Supabase (Base de datos PostgreSQL)

JWT para autenticación

bcryptjs para encriptación

CORS para comunicación con frontend

Frontend
React.js (Vite)

CSS personalizado con diseño oscuro elegante

Lucide React para iconos

Fetch API para peticiones HTTP

Base de Datos (Supabase)
Tablas: usuarios, perfumes, ventas, abonos, fondo_movimientos, ahorro_config, ahorro_movimientos
