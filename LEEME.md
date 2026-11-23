# Eventos Digitales MX · Cotizador de invitaciones

## Abrir y publicar en GitHub Pages

1. Extrae el ZIP completo y abre `index.html` en Chrome, Edge, Firefox o Safari. Conserva los archivos y la carpeta `assets` juntos.
2. En `config.js` completa `whatsapp` con el número oficial de la empresa, usando el prefijo 52 seguido de sus diez dígitos, sin espacios ni signos. `privacyContact` puede contener el correo comercial para solicitudes de privacidad.
3. Para GitHub Pages, copia a la raíz del repositorio `index.html`, `estilos.css`, `config.js`, `catalogo.js`, `cotizador.js` y la carpeta `assets/`. La carpeta `backend/` y esta guía son para el equipo.
4. En **Settings → Pages**, selecciona **Deploy from a branch**, la rama donde subiste los archivos y **/(root)**. Guarda la selección y abre la URL que GitHub muestra cuando termine el despliegue.

[Documentación de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Cotizaciones y entrega

- El precio estimado se muestra como un único total. En `catalogo.js`, `PRICING` agrupa las bandas, asignaciones y tarifas provisionales de módulos. GitHub Pages ejecuta el cálculo en el navegador, así que sus reglas pueden inspeccionarse en el código. Si necesitas que sean confidenciales incluso para quien abre el código fuente, aloja el cálculo en el servidor. Confirma el alcance y el estimado antes de cerrar el pedido.
- La selección inicial vale $299. Música, galería, sobre, itinerario y mesa de regalos en conjunto valen $500. Formularios con registro, invitaciones individuales, QR, álbum y otros sistemas ajustan el estimado según los módulos y el alcance. Los proyectos especiales pasan a cotización personalizada.
- El sitio toma las selecciones compatibles del borrador v4 al abrirlo en el mismo origen. Las preguntas de una función se guardan para recuperarlas si vuelves a agregarla. El resumen omite las respuestas a funciones desactivadas.
- El resumen se descarga como texto legible para abrirlo o compartirlo desde el teléfono. El mensaje de WhatsApp es breve. Para transferir todos los detalles cuando el backend esté apagado, comparte también la ficha o los enlaces de materiales. Con el WhatsApp del negocio vacío, el botón abre el selector de destinatarios de WhatsApp y debe configurarse antes de activar anuncios.
- El navegador guarda el borrador de texto en el dispositivo. Los archivos quedan en la pestaña y deben seleccionarse de nuevo después de recargar. El modo demostración muestra miniaturas y archivos pendientes de compartir. Si activas el servicio de recepción, el folio aparece cuando se confirma el guardado. Si configuras el chat público, el cliente puede abrirlo opcionalmente con su folio. El envío automático del PDF se configura por separado.

## Activar solicitudes con archivos en Supabase

Necesitas un proyecto de Supabase, el dominio definitivo del cotizador y un widget de Cloudflare Turnstile para ese dominio. Puedes usar el subdominio del sitio en GitHub Pages. Conserva la clave secreta de Turnstile únicamente en Supabase.

1. Abre el editor SQL de Supabase y ejecuta `backend/bucket.sql`. Crea el bucket privado `cotizaciones-privadas` y restringe su acceso directo para roles públicos.
2. En la terminal abre la carpeta `backend`. Con la CLI de Supabase instalada e iniciada, ejecuta `supabase link --project-ref TU_PROJECT_REF`.
3. En los secretos del proyecto configura `COTIZADOR_ORIGIN` con el dominio completo del cotizador (por ejemplo, `https://TU-USUARIO.github.io`, sin la ruta del repositorio ni la barra final), y `TURNSTILE_SECRET` con la clave secreta del widget. La función usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno administrado por Supabase.
4. Ejecuta `supabase functions deploy recibir-cotizacion` desde `backend`. La configuración permite que el público invoque la función sin iniciar sesión. La función exige la verificación de Turnstile y comprueba el origen y el nombre de host antes de escribir en el almacenamiento.
5. En `config.js`, coloca la URL HTTPS de la función en `uploadEndpoint` y la clave pública del widget en `turnstileSiteKey`. Vuelve a publicar solo los archivos del sitio. Usando el dominio publicado, envía una solicitud con un archivo de prueba y confirma que puedes abrir el folio desde **Storage → cotizaciones-privadas** con acceso de administración.
6. Borra la carpeta del folio de prueba desde Storage tras confirmar la recepción. En la operación normal, busca el folio por el mensaje de WhatsApp. El archivo `solicitud.json` contiene la ficha, la fecha efectiva de recepción y la lista de materiales de la solicitud.

El servicio admite hasta 10 archivos, hasta 8 MB por archivo y 20 MB en conjunto. Comprueba la firma de los formatos permitidos y guarda cada solicitud en un prefijo privado. Conserva los archivos como material no confiable para revisión. La firma identifica el tipo y no sustituye un escaneo de seguridad al abrir documentos de terceros. Para videos más grandes, usa un enlace privado compartido con el negocio.

[Despliegue de Edge Functions](https://supabase.com/docs/guides/functions/deploy) · [Configuración de Edge Functions](https://supabase.com/docs/guides/functions/function-configuration) · [Validación de Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## Privacidad y conservación

Completa el canal de privacidad, revisa el texto con los datos del responsable y confirma antes de recibir pedidos que la práctica del negocio coincide con el aviso. El plazo inicial para cotizaciones sin contratar es de 90 días y se edita en `config.js`. La conservación es operativa: revisa Storage regularmente y elimina la carpeta del folio vencido y cualquier carpeta de prueba o intento recuperable que no aparezca en su `solicitud.json`. Usa Storage para eliminar los objetos físicos. Si un cliente solicita eliminación, borra también las copias conservadas por el negocio cuando corresponda. Evita compartir enlaces públicos de materiales y conserva las credenciales fuera del repositorio.

## Verificación realizada

- Chrome de escritorio y tamaño móvil de 375 píxeles útiles. Se comprobó el precio fijo, la navegación por etapas, los controles condicionales, la persistencia tras recarga y el resumen editable.
- Pruebas locales del motor para las cinco bandas, el precio personalizado, módulos avanzados, reglas compartidas y cambios de selección.
- Pruebas del servicio con almacenamiento y verificación simulados. Se verificaron el rechazo de formatos que no coinciden, la limpieza tras una carga parcial y reintentos concurrentes con un solo folio.
- El envío real a WhatsApp requiere las credenciales de Meta y la recepción en Supabase requiere la configuración anterior. La prueba con un equipo móvil físico se puede realizar desde la URL publicada.


## Envío automático del PDF por WhatsApp

Cada solicitud recibida genera `EDMX-….pdf` en la misma carpeta privada del folio. El PDF incluye datos de contacto, selección, estimado y la lista de archivos recibidos. Las fotos y videos se descargan en Storage. Con la integración activada, el servidor envía el PDF como documento al WhatsApp **+52 613 113 9589**. El cliente solo toca «Enviar mi solicitud» y ve su folio.

1. Configura y publica el backend de Supabase y Turnstile según la sección anterior.
2. En WhatsApp Business Platform, registra un número emisor distinto del número receptor. Obtén su **Phone Number ID** y un token con permiso `whatsapp_business_messaging`. Si usas el emisor de prueba de Meta, agrega y verifica el destino en su lista de destinatarios de prueba.
3. En WhatsApp Manager, solicita aprobación de una plantilla llamada `edmx_nueva_cotizacion`, en español de México (`es_MX`), con encabezado de tipo **Documento** y un cuerpo fijo sin variables. Texto sugerido: «Recibiste una nueva solicitud de Eventos Digitales MX. Consulta el PDF adjunto para revisar los detalles.» Usa un PDF de ejemplo sin datos personales al solicitar la aprobación.
4. Agrega `META_WHATSAPP_TOKEN` y `META_WHATSAPP_PHONE_ID` a los secretos de la función en Supabase. Opcionalmente configura `META_WHATSAPP_TEMPLATE`, `META_WHATSAPP_LANGUAGE` y `META_GRAPH_VERSION` si difieren de `edmx_nueva_cotizacion`, `es_MX` y `v27.0`. Vuelve a desplegar la función con sus archivos `index.ts`, `pdf.ts` y `whatsapp.ts`. Mantén el token fuera de GitHub y del navegador.
5. Envía una solicitud con datos ficticios desde el sitio publicado. Confirma que ves el PDF como documento dentro de WhatsApp y en Storage. Verifica que el folio coincida y elimina las copias de prueba.

El PDF se guarda en Storage aunque WhatsApp esté desactivado o Meta rechace el envío. Cuando se intenta enviar, puedes revisar `whatsapp.json` en el folio. El estado `aceptado_por_meta` indica que Meta devolvió un identificador de mensaje, no que el documento haya llegado al teléfono. Si figura `sin_confirmar` o solo existe `whatsapp-intento.json`, revisa el chat antes de reenviar manualmente el PDF desde Storage. La marca evita duplicar el envío cuando la misma solicitud se reintenta.

Antes de activar la recepción, confirma que el destino está bajo control del negocio. Incluye las copias de PDF en WhatsApp en el proceso de eliminación de datos.

[WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview/) · [Plantillas con documentos](https://www.postman.com/meta/whatsapp-business-platform/request/2qbotrb/send-message-template-media)
