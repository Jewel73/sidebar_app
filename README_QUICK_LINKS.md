# Sidebar App - Quick Links Extension

## Descripción

Esta extensión permite crear **Quick Links** directos en el sidebar principal de Frappe, eliminando la necesidad de hacer doble click (Workspace → Link). Los Quick Links se comportan como Workspaces normales pero redirigen directamente al destino.

## Características

✅ Soporte para **5 tipos de links**:
- **DocType**: Acceso directo a listas de DocTypes
- **Page**: Acceso directo a páginas del sistema
- **Report**: Acceso directo a reportes
- **Workspace**: Acceso directo a otros Workspaces
- **URL**: Enlaces externos con opción de abrir en nueva pestaña

✅ **Totalmente integrado** con el Workspace existente:
- Aparece en la lista de Workspaces
- Soporta drag & drop para reordenar
- Funciona con Parent para crear jerarquías
- Botones de Edit/Duplicate/Hide/Delete disponibles
- Respeta permisos y roles

✅ **Visual differentiation**:
- Indicador visual con barra lateral azul
- Badge en el ícono para identificar quick links
- Resaltado especial en modo edición

## Instalación

Los cambios ya están aplicados. Para verificar:

1. **Reiniciar bench** (si es necesario):
   ```bash
   cd /workspace/development/frappe-bench
   bench restart
   ```

2. **Limpiar caché**:
   ```bash
   bench clear-cache
   ```

## Uso

### Crear un Quick Link

1. Ve a **Workspace List** (`/app/workspace`)
2. Click **New** o edita un Workspace existente
3. Scroll hasta encontrar la sección **"Quick Link Settings"**
4. Activa el checkbox **"Is Quick Link"**
5. Configura el Quick Link:

#### Ejemplo 1: Link directo a DocType "Club Customer"
```
Title: Club Customer
Icon: users
Public: ✓
Sequence ID: 1.5 (para ordenar)
Is Quick Link: ✓
Link Type: DocType
Link To: Club Customer
```

#### Ejemplo 2: Link directo a un Report
```
Title: Sales Report
Icon: small-file
Public: ✓
Is Quick Link: ✓
Link Type: Report
Link To: Sales Analytics
```

#### Ejemplo 3: Link a URL externa
```
Title: Google Drive
Icon: folder
Public: ✓
Is Quick Link: ✓
Link Type: URL
URL: https://drive.google.com
Open in New Tab: ✓
```

#### Ejemplo 4: Link a otro Workspace
```
Title: Go to Tools
Icon: tool
Public: ✓
Is Quick Link: ✓
Link Type: Workspace
Workspace: Tools
```

#### Ejemplo 5: Link a una Page
```
Title: Permissions Manager
Icon: lock
Public: ✓
Is Quick Link: ✓
Link Type: Page
Link To: permission-manager
```

### Características del Quick Link

- **Click directo**: Un solo click abre el destino
- **Drag & Drop**: Reorganiza con drag & drop como cualquier Workspace
- **Jerarquía**: Usa el campo "Parent" para crear sub-items
- **Editable**: Usa el botón "..." para Edit/Duplicate/Hide/Delete
- **Permisos**: Respeta los roles configurados en el Workspace

## Validación de tipos de link

### DocType
- Abre la **List View** del DocType: `/app/[doctype-slug]`
- Requiere permiso de lectura sobre el DocType

### Page
- Abre la **Page** del sistema: `/app/[page-slug]`
- Ejemplos: `permission-manager`, `user-settings`, `data-import`

### Report
- Detecta automáticamente si es Query Report o Report Builder
- Query Report: `/app/query-report/[report-slug]`
- Report Builder: `/app/List/[ref-doctype]/Report/[report-name]`

### Workspace
- Abre otro Workspace (público o privado)
- Public Workspace: `/app/[workspace-slug]`
- Private Workspace: `/app/private/[workspace-slug]`

### URL
- Acepta URLs completas: `https://example.com`
- Checkbox "Open in New Tab" para abrir en nueva pestaña
- Perfecto para documentación externa, Google Drive, etc.

## Estructura de archivos

```
sidebar_app/
├── fixtures/
│   └── custom_field.json          # Custom Fields en Workspace
├── overrides/
│   ├── __init__.py
│   └── desktop.py                 # Override del backend
├── public/
│   ├── css/
│   │   └── sidebar_app.css        # Estilos para quick links
│   └── js/
│       └── sidebar_app.js         # Override del frontend
└── hooks.py                       # Configuración de hooks
```

## Campos Custom agregados al Workspace

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `is_quick_link` | Check | Activa el modo Quick Link |
| `quick_link_type` | Select | Tipo: DocType/Page/Report/Workspace/URL |
| `quick_link_to` | Dynamic Link | Destino para DocType/Page/Report |
| `quick_link_workspace` | Link | Workspace destino |
| `quick_link_url` | Data | URL externa |
| `quick_link_open_new_tab` | Check | Abrir URL en nueva pestaña |

## Diferencias: Workspace normal vs Quick Link

| Característica | Workspace Normal | Quick Link |
|----------------|------------------|------------|
| Click en sidebar | Abre página de Workspace con contenido EditorJS | Redirige directamente al destino |
| Contenido | Puede tener cards, shortcuts, charts, etc. | No tiene contenido (vacío) |
| Botón Edit | Edita el contenido del Workspace | Edita la configuración del Quick Link |
| Uso recomendado | Páginas dashboard con múltiples widgets | Acceso directo a un solo destino |

## Troubleshooting

### El Quick Link no aparece en el sidebar
- Verifica que `Public` esté activado (o que sea para tu usuario)
- Revisa que no esté en `Hidden`
- Chequea que tengas permisos sobre el destino
- Limpia caché: `bench clear-cache`

### Al hacer click se abre un Workspace vacío
- Asegúrate de que `Is Quick Link` esté activado
- Verifica que el campo `Link Type` y `Link To` estén configurados
- Refresca el navegador (Ctrl+Shift+R)

### No veo los campos "Quick Link Settings"
- Ejecuta: `bench migrate`
- Limpia caché: `bench clear-cache`
- Rebuild: `bench build --app sidebar_app`

### El link no funciona correctamente
- **DocType**: Verifica que el DocType exista y tengas permisos
- **Page**: Asegúrate de usar el slug correcto (sin espacios, minúsculas)
- **Report**: El reporte debe estar habilitado
- **URL**: Debe ser una URL completa con https://

## Ejemplos prácticos

### Crear acceso directo a "Users"
```
Title: Users
Icon: user
Public: ✓
Sequence ID: 2.0
Is Quick Link: ✓
Link Type: DocType
Link To: User
```

### Crear link a documentación externa
```
Title: Frappe Docs
Icon: book
Public: ✓
Sequence ID: 99.0
Is Quick Link: ✓
Link Type: URL
URL: https://docs.frappe.io
Open in New Tab: ✓
```

### Crear sub-menu con jerarquía
```
1. Workspace padre:
   Title: Configuración
   Public: ✓
   Is Quick Link: No (workspace normal con contenido)

2. Quick Link hijo:
   Title: Permisos
   Parent: Configuración
   Public: ✓
   Is Quick Link: ✓
   Link Type: Page
   Link To: permission-manager
```

## Soporte

Para reportar issues o sugerencias:
- GitHub: https://github.com/tu-repo/sidebar_app/issues
- Email: jonathan@jcastillo.pro

---

**Desarrollado para Frappe Framework**
Versión: 1.0.0
Compatible con: Frappe v14+
