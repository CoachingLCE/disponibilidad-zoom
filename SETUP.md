# Cronograma ILCE — Setup inicial

## 1. Crear el Google Sheet

Creá una hoja nueva en Google Sheets llamada **"Cronograma ILCE — Base de datos"**, con estas pestañas
(el nombre de cada pestaña tiene que ser exacto, es lo que usa el código para encontrarlas):

### Pestaña `Usuarios`
| Email | Nombre | Roles | PasswordHash | Activo |
|---|---|---|---|---|
| diegolernerdl@gmail.com | Diego Lerner | SuperAdmin | (se completa solo) | TRUE |

- **Roles**: uno o más de `Colaborador`, `Admin`, `SuperAdmin`, separados por coma si tiene más de uno.
- **PasswordHash**: se deja vacío al crear el usuario — el primer login pide asignar contraseña (lo armamos en el próximo paso, todavía no está hecho el endpoint para eso).
- **Activo**: `TRUE` o `FALSE`.

### Pestaña `Historial`
| Fecha | Email | Usuario | Accion | Detalle |
|---|---|---|---|---|

Se completa sola (auditoría de logins y acciones). Dejala solo con los encabezados.

### Pestañas de datos (todavía no conectadas, las migramos en los próximos pasos)
Dejalas creadas con estos encabezados para que estén listas:

- **Clases**: Dia, HoraMin, Codigo, Edicion, Numero, Sala, Label, Duracion, Fecha, Docente, Tematica, Observaciones, Id
- **Feriados**: Fecha, Motivo, Tipo, Bloquea, Id
- **Formaciones**: Codigo, Edicion, FechaInicio, FechaFinal, Estado
- **Postergaciones**: Codigo, Edicion, Numero, Dia, HoraMin, Sala, Duracion, FechaOriginal, FechaNueva, Motivo, Observaciones, Usuario, FechaRegistro
- **ActividadesCronograma**: Fecha, Dia, Tipo, Curso, NombreCurso, Edicion, HoraMin, HoraTxt, Docente, Tematica, Observaciones, Id

## 2. Compartir el Sheet con la cuenta de servicio

Compartí el Sheet (botón "Compartir") con:
```
carga-clases-bot@carga-clases-ilce.iam.gserviceaccount.com
```
con permiso de **Editor**.

## 3. Sacar el ID del Sheet

De la URL del Sheet:
```
https://docs.google.com/spreadsheets/d/EL_ID_VA_ACA/edit
```

## 4. Variables de entorno en Vercel

Cuando importemos este proyecto a Vercel, en **Settings → Environment Variables** agregás:

- `GOOGLE_SHEET_ID` → el ID que sacaste en el paso 3
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` → `carga-clases-bot@carga-clases-ilce.iam.gserviceaccount.com`
- `GOOGLE_PRIVATE_KEY` → la `private_key` del JSON de la cuenta de servicio (pedime que te ayude a extraerla del JSON cuando la tengas a mano; no la pegues en el chat)
- `SESSION_SECRET` → cualquier texto largo random (por ejemplo, generalo con `openssl rand -hex 32` en la terminal)

## 5. Cargar el primer usuario a mano

En la fila 2 de `Usuarios`, poné tu email como `SuperAdmin`, con `Activo = TRUE` y `PasswordHash` vacío.
Todavía falta el endpoint para "asignar contraseña" (lo armamos en el próximo paso junto con el resto
del panel de Accesos) — por ahora el login no va a funcionar hasta que exista un hash ahí. Te aviso
apenas esté listo ese paso para que puedas entrar por primera vez.

## Qué es esto por ahora

Este es el **esqueleto de autenticación**: login con email/contraseña, 3 roles (Colaborador/Admin/
SuperAdmin), token de sesión firmado que cada acción futura va a verificar contra el Sheet en vivo
(así que si desactivás a alguien, se le corta el acceso al toque, no depende de lo que tenga guardado
en su navegador).

Todavía **no están migrados** los módulos de datos (Cronograma, Formaciones, Salas Zoom, Incidencias,
Análisis) — eso es el siguiente paso, migrando uno por uno desde el prototipo HTML actual.
