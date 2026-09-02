# Cronograma ILCE — Setup inicial

## 1. Crear el Google Sheet

Creá una hoja nueva en Google Sheets llamada **"Cronograma ILCE — Base de datos"**, con estas pestañas
(el nombre de cada pestaña tiene que ser exacto, es lo que usa el código para encontrarlas):

### Pestaña `Usuarios`
| Email | Nombre | Roles | PasswordHash | Activo | FechaCreacion |
|---|---|---|---|---|---|
| diegolernerdl@gmail.com | Diego Lerner | SuperAdmin | (se completa solo) | TRUE | (se completa solo) |

- **Roles**: uno o más de `Colaborador`, `Admin`, `SuperAdmin`, separados por coma si tiene más de uno.
- **PasswordHash**: se deja vacío al crear el usuario — el primer login pide asignar contraseña (lo armamos en el próximo paso, todavía no está hecho el endpoint para eso).
- **Activo**: `TRUE` o `FALSE`.
- **FechaCreacion**: se completa sola al crear el usuario desde el panel de Accesos (nueva columna — agregala en la fila 1 si no la tenías; los usuarios creados antes de esto van a quedar sin este dato, es normal).

### Pestaña `Historial`
| Fecha | Email | Usuario | Accion | Detalle |
|---|---|---|---|---|

Se completa sola (auditoría de logins y acciones). Dejala solo con los encabezados.

### Pestañas de datos (todavía no conectadas, las migramos en los próximos pasos)
Dejalas creadas con estos encabezados para que estén listas:

- **Clases**: Dia, HoraMin, Codigo, Edicion, Numero, Sala, Label, Duracion, Fecha, Docente, Tematica, Observaciones, Id
- **Feriados**: Fecha, Motivo, Tipo, Bloquea, Id
- **Formaciones**: Codigo, Edicion, FechaInicio, FechaFinal, Estado, MesesCertificacion (opcional) — carga manual, opcional pero recomendada. `Edicion` tiene que ser el mismo número que aparece junto al código en el horario recurrente (ej: para "CDEP 11", `Codigo=CDEP`, `Edicion=11`). Si completás `FechaInicio` (y opcionalmente `FechaFinal` y `Estado=Finalizó`), la pantalla Formaciones usa esos datos reales en vez de adivinar por el número — así detecta bien cuándo una edición ya terminó, incluso si el horario recurrente no se actualizó. `MesesCertificacion` (opcional): por defecto el sistema calcula el vencimiento del proceso de certificación como 1 mes después de finalizar (formaciones cortas) o 4 meses (Coaching Ontológico) — si una edición puntual de CO tiene 2 meses en vez de 4, poné `2` en esta columna para esa fila.
- **Postergaciones**: Codigo, Edicion, Numero, Dia, HoraMin, Sala, Duracion, FechaOriginal, FechaNueva, Motivo, Observaciones, Usuario, FechaRegistro
- **ActividadesCronograma**: Fecha, Dia, Tipo, Curso, NombreCurso, Edicion, HoraMin, HoraTxt, Docente, Tematica, Observaciones, **Sala** (nueva columna — agregala en la fila 1 si no la tenías), Id
- **DocentesCO** (nueva): Edicion, Docente, Staff, FechaAsignacion, Observaciones, Usuario, Id — guarda el historial completo de asignaciones, no solo la actual. Edición: Pau, Sofía (`sofia.salgueiro@institutoilce.com`) y SuperAdmin. El resto solo puede ver.
- **CredencialesZoom** (nueva): Sala, Usuario, Contrasena — cargá ahí el usuario/contraseña de cada una de las 8 salas. Se ve en un panel colapsable dentro de Salas Zoom, para cualquier usuario logueado. Todavía no se puede editar desde la app, solo desde el Sheet directamente.
- **InfoTecnica** (para Clases especiales / Información técnica): Nombre, Formato, Mes, Fecha, Disertante, Horario, FormularioInscripcion, SalaZoom, LinkAcceso, Moderador, Id — estructura real de tu Excel. Los 9 registros que ya pasaste están siempre disponibles en el código (no dependen de que se hayan importado bien al Sheet); lo que se agregue desde la app se guarda en esta pestaña.
- **CronogramaCM** (para el módulo Cronograma CM): Fecha, Dia, HoraMin, Tipo, Detalle, Id — solo Jennifer Rebasti (y SuperAdmin) pueden cargar acá.
- **CampanasCM** (nueva): Titulo, Fecha, Descripcion, Id
- **EnlacesCM** (nueva): Categoria, Titulo, Url, Id
- **NotasCM** (nueva): Texto, Color, Autor, Id

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
- `SESSION_SECRET` → cualquier texto largo random (por ejemplo, generalo con `openssl rand -hex 32` en la terminal). **Obligatorio en producción** — sin esta variable, nadie puede iniciar sesión (la app tira un error de configuración en vez de dejar pasar con un secreto por defecto inseguro). Las sesiones duran 10 horas y se invalidan solas si la contraseña de esa persona cambia mientras tanto.
- `GMAIL_USER` → `coachingeducacionallider@gmail.com` (la misma cuenta que ya usás en tus otras apps para mandar mails)
- `GMAIL_APP_PASSWORD` → la contraseña de aplicación de esa cuenta de Gmail (la misma que ya tenés generada para tus otras apps — no es la contraseña normal de Gmail, es una "contraseña de aplicación" de 16 caracteres)
- `CRON_SECRET` → cualquier texto largo random — protege el endpoint del mail semanal para que no lo pueda disparar cualquiera desde afuera (generalo igual que `SESSION_SECRET`). **Obligatorio en producción** — sin esta variable, el endpoint del cron devuelve un error de configuración en vez de quedar accesible sin protección.

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
