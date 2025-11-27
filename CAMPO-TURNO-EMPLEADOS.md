# Campo "Turno" en Módulo de Empleados

## Resumen de Cambios
**Fecha:** 26 de noviembre de 2025  
**Descripción:** Se agregó el campo "Turno" al módulo de empleados para identificar si el empleado trabaja en turno matutino o vespertino.

---

## 1. Base de Datos

### Cambios en la tabla `empleados`
- **Nueva columna:** `turno VARCHAR(20) NOT NULL`
- **Valores permitidos:** 'Matutino', 'Vespertino'
- **Constraint:** `empleados_turno_check` que valida los valores permitidos
- **Valor por defecto:** 'Matutino' para registros existentes

### Script de migración
- **Ubicación:** `backend/scripts/add-turno-empleados.sql`
- **Contenido:**
  - Agregar columna turno con restricción CHECK
  - Actualizar registros existentes con valor 'Matutino'
  - Hacer el campo NOT NULL después de la actualización
  - Agregar comentario descriptivo

### Verificación
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'empleados' 
AND column_name = 'turno';
```

---

## 2. Backend (Node.js + Express)

### Archivos modificados

#### `backend/controllers/empleadosController.js`

**Función `createEmpleado`:**
- Extracción del campo `turno` del `req.body`
- Agregado en el INSERT con valor por defecto 'Matutino'
- Posición en el array de valores: índice 6

**Función `updateEmpleado`:**
- Agregado el campo turno en la lógica de actualización dinámica
- Validación incluida en los campos permitidos para actualizar

**Función `getEmpleado`:**
- El campo turno ya se incluye automáticamente en el SELECT de empleados
- Agregado en la respuesta `empleadoCompleto.turno`

---

## 3. Frontend (Angular)

### Archivos modificados

#### `frontend/src/app/modules/empleados/empleados-form.component.ts`

**Template HTML:**
```html
<div class="mb-3">
  <label class="form-label">Turno *</label>
  <select class="form-select" formControlName="turno" [class.is-invalid]="isInvalid('turno')">
    <option value="">Seleccione un turno</option>
    <option value="Matutino">Matutino</option>
    <option value="Vespertino">Vespertino</option>
  </select>
  <div class="invalid-feedback" *ngIf="isInvalid('turno')">
    Debe seleccionar un turno
  </div>
</div>
```

**FormGroup:**
- Agregado control: `turno: ['Matutino', Validators.required]`
- Valor por defecto: 'Matutino'

**Método `populateForm`:**
- Agregado: `turno: empleado.turno || 'Matutino'`

#### `frontend/src/app/modules/empleados/empleados-table/empleados-table.component.html`

**Vista Desktop (tabla):**
- Agregada columna "Turno" en el header
- Ajustadas proporciones de columnas (7%, 18%, 11%, 14%, 13%, 13%, 9%, 8%, 7%)
- Agregada celda con valor: `{{e.turno || '-'}}`

**Vista Mobile (tarjetas):**
- Agregado en el grid de información:
```html
<div class="col-6">
  <small class="text-muted d-block">Turno</small>
  <span class="fw-medium">{{e.turno || 'N/A'}}</span>
</div>
```

#### `frontend/src/app/modules/empleados/empleado-detail-modal.component.ts`

**Sección Laboral:**
- Agregado campo turno después de "Sucursal":
```html
<div class="info-item">
  <span class="label">Turno:</span>
  <span class="value">{{empleado.turno || 'No definido'}}</span>
</div>
```

#### `frontend/src/app/modules/empleados/empleados-table/empleados-table.component.ts`

**Función `generatePrintContent`:**
- Agregado en la sección "Información Laboral" del documento de impresión:
```html
<div class="info-row">
  <div class="info-label">Turno:</div>
  <div class="info-value">${empleado.turno || 'No especificado'}</div>
</div>
```

---

## 4. Archivo BD_SUPERCOPIAS.sql

### Actualización
- Generado dump completo con: `pg_dump -U postgres -d supercopias --clean --if-exists --no-owner --no-privileges`
- Incluye:
  - Definición de columna turno con constraint CHECK
  - Comentario descriptivo en la columna
  - Datos actualizados de empleados con el campo turno

### Verificación realizada
```powershell
Get-Content backend\BD_SUPERCOPIAS.sql | Select-String -Pattern "turno"
```
Confirmado que el campo aparece correctamente con:
- Definición de columna
- Constraint de validación
- Comentario descriptivo

---

## 5. Base de Datos Local

### Estado actual
✅ Campo turno agregado y actualizado  
✅ Empleados existentes actualizados con valor 'Matutino'  
✅ Restricción CHECK aplicada correctamente  
✅ Campo marcado como NOT NULL

### Comando de aplicación
```bash
psql -U postgres -d supercopias -f backend/scripts/add-turno-empleados.sql
```

**Resultado:**
```
ALTER TABLE
COMMENT
UPDATE 2
ALTER TABLE
 column_name |     data_type     | is_nullable
-------------+-------------------+-------------
 turno       | character varying | NO
```

---

## 6. Impacto en el Sistema

### Funcionalidades actualizadas
✅ Formulario de creación de empleados  
✅ Formulario de edición de empleados  
✅ Tabla de listado (vista desktop y mobile)  
✅ Modal de detalle de empleado  
✅ Documento de impresión  
✅ API de backend (GET, POST, PUT)  

### Validaciones implementadas
- **Base de datos:** Solo acepta 'Matutino' o 'Vespertino'
- **Frontend:** Campo requerido con opciones predefinidas
- **Backend:** Valor por defecto 'Matutino' si no se proporciona

### Compatibilidad
- ✅ Registros existentes actualizados automáticamente
- ✅ No rompe funcionalidades previas
- ✅ BD_SUPERCOPIAS.sql listo para producción

---

## 7. Archivos Modificados (Resumen)

### Base de Datos
- ✅ `backend/scripts/add-turno-empleados.sql` (creado)
- ✅ `backend/BD_SUPERCOPIAS.sql` (actualizado)

### Backend
- ✅ `backend/controllers/empleadosController.js`

### Frontend
- ✅ `frontend/src/app/modules/empleados/empleados-form.component.ts`
- ✅ `frontend/src/app/modules/empleados/empleados-table/empleados-table.component.html`
- ✅ `frontend/src/app/modules/empleados/empleados-table/empleados-table.component.ts`
- ✅ `frontend/src/app/modules/empleados/empleado-detail-modal.component.ts`

---

## 8. Próximos Pasos

### Para usar en desarrollo
1. ✅ Base de datos ya actualizada
2. ✅ Backend ya modificado
3. ✅ Frontend ya modificado
4. Reiniciar backend: `npm run dev` (en carpeta backend)
5. El frontend se actualizará automáticamente

### Para desplegar a producción
1. Aplicar script: `backend/scripts/add-turno-empleados.sql` en base de datos de producción
2. O restaurar desde: `backend/BD_SUPERCOPIAS.sql`
3. Desplegar código de backend y frontend

---

## Notas Técnicas

- El campo turno es obligatorio (NOT NULL)
- Solo acepta dos valores predefinidos mediante constraint CHECK
- Valor por defecto: 'Matutino'
- El campo se muestra en todas las vistas relevantes del módulo
- Compatible con registros anteriores mediante migración automática
