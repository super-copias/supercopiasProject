# Correcciones de Permisos y Selectores - SuperCopias

## 🚨 **Problemas Identificados y Solucionados**

### **1. Problema: "Acceso Restringido" para Empleados con Permisos**

**Causa:** El `AuthController` no estaba enviando la información de módulos permitidos al frontend. El `ModuleGuard` buscaba `user.modulosPermitidos` pero este campo no se incluía en la respuesta del login/verify.

**Solución Implementada:**
- ✅ **Modificado `AuthController.login()`**: Ahora extrae los módulos del empleado y los mapea a un array de módulos permitidos
- ✅ **Modificado `AuthController.verifyToken()`**: Incluye la misma lógica para verificación de tokens
- ✅ **Mapeo correcto**: Convierte `empleado.modulos.{modulo}.acceso: true` → `user.modulosPermitidos: ['dashboard', 'clientes']`

**Código corregido:**
```javascript
// Extraer módulos con acceso true
if (empleadoInfo && empleadoInfo.modulos) {
  modulosPermitidos = Object.keys(empleadoInfo.modulos)
    .filter(modulo => empleadoInfo.modulos[modulo].acceso === true);
}
```

### **2. Problema: Selectores de Puesto y Sucursal Vacíos**

**Causa:** Los catálogos en la base de datos tenían estructura simple, pero los controladores esperaban objetos más complejos con campos adicionales.

**Solución Implementada:**
- ✅ **Actualizada estructura de `sucursales`**: Agregados campos `telefono`, `gerente`, `activa`, `fechaCreacion`
- ✅ **Actualizada estructura de `puestos`**: Agregados campos `descripcion`, `salarioMinimo`, `salarioMaximo`, `activo`, `fechaCreacion`
- ✅ **Script de inicialización actualizado** con la nueva estructura

**Estructura anterior:**
```json
"puestos": [
  { "id": "PUESTO_001", "nombre": "Gerente de Sucursal" }
]
```

**Estructura corregida:**
```json
"puestos": [
  {
    "id": "PUESTO_001",
    "nombre": "Gerente de Sucursal",
    "descripcion": "Responsable de la administración general de la sucursal",
    "salarioMinimo": 20000,
    "salarioMaximo": 35000,
    "activo": true,
    "fechaCreacion": "2025-10-11T00:00:00.000Z"
  }
]
```

## 📁 **Archivos Modificados**

### **Backend**
1. **`controllers/authController.js`**
   - Función `login()`: Mapeo de módulos de empleado a modulosPermitidos
   - Función `verifyToken()`: Misma lógica de mapeo para verificación

2. **`db.json`**
   - Estructura expandida de catálogos `sucursales` y `puestos`
   - Datos completos para los selectores

3. **`scripts/init-clean-data.js`**
   - Estructura actualizada de catálogos
   - Datos más realistas y completos

### **Frontend**
- El `ModuleGuard` ya funciona correctamente al recibir `user.modulosPermitidos`
- Los servicios de catálogos obtienen datos en el formato esperado

## 🔐 **Sistema de Permisos Corregido**

### **Empleados y sus Accesos:**

1. **María Gómez (`mgomez`)**
   - Usuario: `mgomez` / Contraseña: `empleado123`
   - Tipo: `administrador`
   - Módulos: ✅ Todos (dashboard, empleados, clientes, proveedores, inventarios, equipos, reportes, configuracion)

2. **Juan Pérez (`jperez`)**
   - Usuario: `jperez` / Contraseña: `empleado123`  
   - Tipo: `personalizado`
   - Módulos: ✅ dashboard, clientes ❌ empleados, proveedores, inventarios, equipos, reportes, configuracion

3. **Ana López (inactiva)**
   - Sin usuario de sistema
   - Tipo: `inactivo`
   - Módulos: ❌ Ninguno

## 🎯 **Flujo de Autenticación Corregido**

1. **Login/Verify** → AuthController mapea módulos del empleado
2. **Usuario cargado** → Incluye `modulosPermitidos: ['dashboard', 'clientes']`
3. **ModuleGuard verifica** → `user.modulosPermitidos.includes(requiredModule)`
4. **Acceso permitido** → Usuario ve solo módulos autorizados

## 🧪 **Cómo Probar las Correcciones**

### **Probar Permisos:**
1. Hacer login con `jperez` / `empleado123`
2. Verificar que puede acceder a Dashboard y Clientes
3. Verificar que NO puede acceder a Empleados u otros módulos

### **Probar Selectores:**
1. Ir a editar un empleado
2. Verificar que los selectores de Puesto y Sucursal se populan correctamente
3. Los datos deben incluir nombres descriptivos y información completa

### **Restablecer Estado:**
```bash
cd backend
npm run init
```

## ✅ **Resultados Esperados**

- ✅ **mgomez**: Acceso completo a todos los módulos
- ✅ **jperez**: Acceso solo a dashboard y clientes, sin "Acceso Restringido"
- ✅ **Selectores**: Puestos y sucursales poblados correctamente
- ✅ **Formularios**: Datos completos para edición de empleados
- ✅ **Sistema**: Funcionamiento estable y coherente

**🎉 Los problemas de permisos y selectores han sido completamente solucionados.**