'use strict';

const STEPS = ['Celebración','Estilo','Apertura','Funciones','Tu evento','Materiales','Contacto','Resumen'];
const STORAGE_KEY = 'edmx_cotizador_v5';
const LEGACY_KEY = 'edmx_brief_v4';
const MAX_FILES = 10;
const MAX_FILE = 8 * 1024 * 1024;
const MAX_TOTAL = 20 * 1024 * 1024;
const FILE_TYPES = {
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif',
  pdf:'application/pdf', mp4:'video/mp4', mov:'video/quicktime', mp3:'audio/mpeg', wav:'audio/wav'
};
const PALETTES = [['Lavanda y marfil','#bea6cf'],['Verde olivo y arena','#8d9672'],['Vino y champán','#744052'],['Rosa y perla','#d7a6ba'],['Azul y plata','#657eab']];
const EVENT_NAME = {boda:'Nombres de la pareja',xv:'Nombre de la quinceañera',baby:'Nombre de la futura mamá',
  revelacion:'Nombres de los futuros papás',corporativo:'Nombre de la empresa',escolar:'Nombre de la escuela'};
const EVENT_DETAILS = {
  boda:[['familia','Padrinos o familiares'],['ceremony','Hora de la ceremonia','time'],['reception','Hora de la recepción','time']],
  xv:[['familia','Padres y padrinos'],['ceremony','Hora de la misa','time'],['vals','Hora del vals','time'],['reception','Hora de la recepción','time']],
  baby:[['dynamics','Juegos o dinámicas del baby shower','area']],
  revelacion:[['dynamics','Cómo quieres hacer la revelación','area']],
  corporativo:[['organization','Logo o enlace a materiales de marca','url'],['registration','Indicaciones de registro','area']],
  escolar:[['organization','Logo o enlace a materiales de la escuela','url'],['registration','Indicaciones de registro','area']]
};
const EVENT_FIELDS = [
  ['nameEvent','Nombres en la invitación'],['date','Fecha del evento','date'],['time','Hora de inicio','time'],
  ['city','Ciudad y estado'],['venue','Salón o lugar'],['address','Dirección'],['mapsLink','Enlace de Google Maps','url'],
  ['guests','Invitados aproximados','number'],['outfit','Código de vestimenta'],['delivery','Fecha deseada de entrega','date'],
  ['textInvitation','Mensaje principal','area']
];

function blank() {
  return {event:'', opening:'directa', styles:[], features:[...INCLUDED], config:{rsvpType:'whatsapp'},
    venues:[{}], contactPreferred:'whatsapp', progress:0, current:0, consent:false};
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const legacy = saved ? null : JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    const previous = saved || legacy;
    if (!previous) return blank();
    const migrated = {...blank(), ...previous, config:{...blank().config,...previous.config}};
    migrated.features = Array.isArray(previous.features) ? previous.features.filter(id => itemLabel(FEATURES,id)) : [...INCLUDED];
    migrated.styles = Array.isArray(previous.styles) ? previous.styles.filter(id => itemLabel(STYLES,id)).slice(0,3) : [];
    if (!itemLabel(EVENTS,migrated.event)) migrated.event = '';
    if (!itemLabel(OPENINGS,migrated.opening)) migrated.opening = 'directa';
    if (legacy) {
      migrated.features = [...new Set(['datos', ...migrated.features])];
      migrated.city = legacy.address;
      delete migrated.address;
      if (legacy.otherVenue) {
        migrated.features = [...new Set([...migrated.features,'sedes'])];
        migrated.venues = [{name:legacy.otherVenue, date:legacy.otherDate, time:legacy.otherTime}];
      }
      migrated.contactPreferred = legacy.config?.contactPreferred || 'whatsapp';
      if (legacy.song || legacy.artist) migrated.config.songName ||= [legacy.song,legacy.artist].filter(Boolean).join(' · ');
      if (legacy.config?.giftType) migrated.config.giftTypes = [legacy.config.giftType];
    }
    if (!Array.isArray(migrated.venues) || !migrated.venues.length) migrated.venues = [{}];
    migrated.progress = Math.min(7, Math.max(0, Number(migrated.progress) || 0));
    migrated.current = Math.min(migrated.progress, Math.max(0, Number(migrated.current) || 0));
    return migrated;
  } catch {
    return blank();
  }
}

let draft = restore();
let attachments = [];
let busy = false;
let receipt = null;
let token = '';
let toastTimer;
const expanded = new Set([0,1]);
const $ = selector => document.querySelector(selector);
const screen = $('#screen');
const cash = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});
const uploadEnabled = /^https:\/\//.test(SITE_CONFIG.uploadEndpoint) && !!SITE_CONFIG.turnstileSiteKey;
const whatsapp = /^52\d{10}$/.test(SITE_CONFIG.whatsapp) ? SITE_CONFIG.whatsapp : '';
const selected = (...ids) => ids.some(id => draft.features.includes(id));
const cleanText = value => typeof value === 'string' ? value.trim() : '';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    $('#saved').textContent = 'Avance guardado en este dispositivo.';
  } catch {
    $('#saved').textContent = 'El navegador no pudo guardar el avance.';
  }
}
function changed() {
  receipt = null;
  submissionId = null;
  save();
}
function toast(message) {
  $('#toast').textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').textContent = ''; },4400);
}
function priceLabel(quote) {
  return quote.total === null ? 'Cotización personalizada' : cash.format(quote.total) + ' MXN';
}
function updatePrice() {
  const value = quoteFor(draft).total;
  const node = $('#price');
  const output = value === null ? 'Cotización personalizada' : cash.format(value) + ' <small>MXN</small>';
  node.classList.toggle('custom',value === null);
  if (node.innerHTML !== output) node.innerHTML = output;
}
function title(first, accent, description) {
  return `<h1 id="stage-title" tabindex="-1">${first} <i>${accent}</i></h1><p class="intro">${description}</p>`;
}
function input(definition, scope = '') {
  const [key,label,type = 'text',hint = ''] = definition;
  let value = scope === 'config' ? draft.config[key] : scope.startsWith('venue:') ? draft.venues[Number(scope.split(':')[1])]?.[key] : draft[key];
  value = escapeHTML(value);
  const attributes = `data-input="${key}" data-scope="${scope}" placeholder="${escapeHTML(hint)}"`;
  const options = type === 'number' ? ' min="1" max="100000" step="1"' :
    type === 'tel' ? ' autocomplete="tel" maxlength="25"' :
    type === 'email' ? ' autocomplete="email" maxlength="254"' :
    type === 'text' || type === 'url' ? ' maxlength="500"' : '';
  const control = type === 'area'
    ? `<textarea ${attributes} maxlength="1800">${value}</textarea>`
    : `<input type="${type}" ${attributes} value="${value}"${options}>`;
  return `<label class="field ${type === 'area' ? 'wide' : ''}">${label}${control}</label>`;
}
function fields(definitions, scope = '') {
  return `<div class="fields">${definitions.map(definition => input(definition,scope)).join('')}</div>`;
}
function choiceGrid(items, key) {
  const list = items.map(([id,label,presentation,text,ink]) => {
    const active = Array.isArray(draft[key]) ? draft[key].includes(id) : draft[key] === id;
    const preview = key === 'styles'
      ? `<span class="swatch" style="--swatch:${presentation};--sample-ink:${text}" aria-hidden="true">${ink}</span>`
      : `<span class="choice-icon" aria-hidden="true">${presentation}</span>`;
    return `<button class="choice" type="button" data-choice="${key}" data-value="${id}" aria-pressed="${active}">${preview}<span class="choice-name">${label}</span>${key === 'opening' ? `<small>${text}</small>` : ''}</button>`;
  }).join('');
  return `<div class="choices ${key === 'styles' ? 'style-choices' : ''}">${list}</div>`;
}
function celebration() {
  const name = EVENT_NAME[draft.event] || 'Nombre de quien festeja';
  return title('¿Qué vamos a','celebrar?','Elige tu evento para empezar. Los nombres y otros detalles los puedes agregar después.')
    + choiceGrid(EVENTS,'event')
    + `<div class="block">${fields([...(draft.event === 'otro' ? [['eventOther','¿Qué tipo de evento estás organizando?']] : []),['nameEvent',name,'text',draft.event === 'boda' ? 'Andrea y Daniel' : 'Escribe el nombre (opcional)']])}</div>`;
}
function style() {
  return title('Elige el estilo de tu','invitación.','Combina hasta tres estilos. Las muestras te ayudan a elegir el tono y la composición.')
    + choiceGrid(STYLES,'styles')
    + `<div class="block"><h2>Colores</h2><div class="inline">${PALETTES.map(([label,color],index) => `<button type="button" class="chip" data-palette="${index}" aria-pressed="${draft.palette === label}"><span aria-hidden="true" style="color:${color}">●</span> ${label}</button>`).join('')}<label class="field">Tu color <input type="color" id="custom-color" value="${/^#[a-f0-9]{6}$/i.test(draft.customColor || '') ? draft.customColor : '#9d73ba'}"></label>${draft.customColor ? '<button type="button" class="quiet" data-remove-color>Quitar color</button>' : ''}</div>`
    + fields([['palette','Colores que tienes en mente','text','Ej. marfil con toques de vino'],['theme','Tema o personajes','text','Ej. jardín nocturno'],['creativeNote','Describe tu idea','area','Cuéntanos qué quieres que recuerden tus invitados.']])
    + '</div>';
}
function opening() {
  const previews = {sobre:['sobre','Estás invitado'],regalo:['caja','¡Sorpresa!'],raspar:['raspar','Es una niña'],juego:['juego','Adivina el color'],galeria:['galeria','Nuestros recuerdos'],cine:['cine','Una gran noche'],tematica:['tema','El gran día'],acertijo:['juego','¿Qué celebramos?']};
  const preview = previews[draft.opening];
  return title('¿Cómo quieres','sorprender?','Así se abrirá tu invitación cuando alguien reciba el enlace.')
    + choiceGrid(OPENINGS,'opening')
    + (preview ? `<div class="sample"><div class="sample-visual" data-kind="${preview[0]}" aria-hidden="true"><span>${preview[1]}</span></div><div><h3>Muestra de apertura</h3>${preview[0] === 'juego' ? '<p class="hint">Elige el color lavanda.</p><div class="inline"><button class="chip" type="button" data-game="verde">Verde</button><button class="chip" type="button" data-game="lavanda">Lavanda</button></div>' : '<button class="quiet" type="button" data-preview>Probar la animación</button>'}<p class="hint" id="preview-status" role="status"></p></div></div>` : '')
    + (draft.opening === 'libre' ? input(['openingIdea','Describe cómo inicia tu invitación','area','Ej. una carta que revele el lugar al tocar un sello.']) : '');
}

const UNKNOWN = ['pendiente','Por definir'];
const choices = (...items) => [...items,UNKNOWN];
function setupSections() {
  const setup = [];
  const add = (active,name,controls) => { if (active) setup.push([name,controls]); };
  add(selected('musica'),'Música',[
    ['musicType','¿Ya tienes una canción?',choices(['elegida','Ya elegí una canción'],['sugerencia','Quiero recomendaciones'],['lista','Quiero varias canciones'])],
    ['songName','Canción y artista'],['songLink','Enlace de la canción','url'],
    ['musicFile','¿Tienes el archivo?',choices(['si','Puedo compartirlo'],['no','Aún no lo tengo'])]
  ]);
  add(selected('video') || draft.opening === 'video','Video',[
    ['videoType','¿Qué video quieres incluir?',choices(['archivo','Ya tengo el video'],['montaje','Montaje con mis fotos'],['produccion','Necesito crear el video'])],
    ['videoLink','Enlace de referencia','url']
  ]);
  add(selected(...GIFT),'Regalos',[
    ['giftTypes','Modalidades que quieres combinar',choices(['tiendas','Mesa de tienda'],['sobres','Lluvia de sobres'],['transferencia','Transferencia'],['personalizada','Lista personalizada']),'multi'],
    ['giftText','Mensaje para los invitados','area'],['giftLink','Enlaces de las mesas de regalos','area']
  ]);
  const responseOptions = choices(['whatsapp','Por WhatsApp'],['web','Formulario con registro'],['individual','Enlace por invitado']);
  if (selected('rsvpWeb')) responseOptions.shift();
  add(selected(...RSVP),'Asistencia y pases',[
    ...(selected('rsvp','rsvpWeb') ? [['rsvpType','Cómo recibes las confirmaciones',responseOptions]] : []),
    ['rsvpUnit','Confirmación',choices(['persona','Por persona'],['familia','Por familia'])],
    ['rsvpDeadline','Fecha límite de confirmación','date'],['rsvpGuests','Acompañantes permitidos','number'],
    ['rsvpQuestions','Preguntas adicionales o preferencias de menú','area']
  ]);
  add(selected('qr','checkin'),'Pases QR y entrada',[
    ['qrType','A quién se asigna el código',choices(['persona','Por persona'],['familia','Por familia'],['grupos','Por grupo'])],
    ['qrCount','Cantidad aproximada de pases','number'],['qrDoors','Número de accesos','number'],
    ['qrScan','¿Quieres escanear los pases?',choices(['si','Sí'],['no','No'])],
    ['qrDetails','Lista, cupos o requisitos especiales','area']
  ]);
  add(selected('mesas','mapaMesas'),'Mesas',[
    ['tableCount','Número aproximado de mesas','number'],['tableCapacity','Personas por mesa','number'],
    ['tableType','Tipo de asignación',choices(['lista','Lista de mesas'],['mapa','Mapa de mesas'],['porpersona','Asignación por persona'])],
    ['tableDetails','Cómo tienes organizada la lista de invitados','area']
  ]);
  add(selected(...ALBUM),'Álbum de invitados',[
    ['albumType','Contenido del álbum',choices(['fotos','Solo fotos'],['ambos','Fotos y videos'])],
    ['albumGuests','Asistentes con acceso al álbum','number'],['albumDuration','Tiempo de disponibilidad'],
    ['albumAccess','Acceso',choices(['publico','Con el enlace'],['privado','Privado'])],
    ['albumModeration','Revisión de publicaciones',choices(['si','Con moderación'],['no','Sin moderación'])]
  ]);
  add(selected(...GAMES) || ['juego','acertijo'].includes(draft.opening),'Juego o dinámica',[
    ['gameType','Tipo de juego',choices(['globos','Globos'],['memoria','Memoria'],['trivia','Trivia'],['raspar','Tarjeta para raspar'],['libre','Mi propia idea'])],
    ['gameAction','Qué hace el invitado'],['gameEnd','Qué sucede al terminar','area'],['gameReveal','Qué quieres revelar'],
    ['gameReference','Enlace de referencia','url'],['gameOriginal','¿Quieres un juego original?',choices(['si','Sí, a medida'],['no','Algo de muestra o reutilizable'])]
  ]);
  add(selected(...POLL),'Participación de invitados',[
    ['pollType','Tipo de participación',choices(['prediccion','Predicciones'],['votacion','Votación'],['trivia','Preguntas'],['cancion','Elegir canciones'])],
    ['pollDetails','Opciones, preguntas o mensaje de la dinámica','area']
  ]);
  add(selected(...BOOK),'Libro de recuerdos',[
    ['guestbookType','Qué pueden compartir',choices(['texto','Mensaje escrito'],['foto','Foto'],['audio','Nota de voz'],['video','Video'])]
  ]);
  add(selected('privada','privados'),'Acceso a la invitación',[
    ['privacyType','Cómo se abre',choices(['clave','Con contraseña'],['enlace','Con enlace individual'])]
  ]);
  add(selected('idiomas'),'Idiomas',[['languages','Idiomas de la invitación','text','Ej. español, inglés']]);
  add(selected('multi',...UNIQUE_PASSES),'Versiones y enlaces',[
    ['versions','Versiones aproximadas','number'],['versionDiff','Qué cambia entre versiones','area']
  ]);
  add(selected('hospedaje','transporte','estacionamiento','cercanas','extranjeros'),'Información para los invitados',[
    ['lodging','Hoteles, transporte, estacionamiento o enlaces','area']
  ]);
  add(selected('personalizado','sorpresa'),'Tu idea especial',[
    ['special','Qué ve, toca o descubre cada invitado','area']
  ]);
  return setup;
}

function setupControl(definition) {
  const [key,label,options,kind] = definition;
  if (!Array.isArray(options)) return input(definition,'config');
  let value = draft.config[key] || '';
  if (key === 'rsvpType' && !options.some(([id]) => id === value)) value = '';
  if (kind === 'multi') {
    const current = Array.isArray(value) ? value : [];
    return `<div class="wide"><h3>${label}</h3><div class="inline">${options.map(([id,text]) => `<button class="chip" type="button" data-config-choice="${key}" data-value="${id}" aria-pressed="${current.includes(id)}">${text}</button>`).join('')}</div></div>`;
  }
  return `<label class="field">${label}<select data-input="${key}" data-scope="config"><option value="">Selecciona una opción</option>${options.map(([id,text]) => `<option value="${id}"${value === id ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
}
function functionsPage() {
  const categories = FEATURE_GROUPS.map(([group,items],index) => {
    const count = items.filter(([id]) => selected(id)).length;
    return `<details class="category" data-group="${index}" ${expanded.has(index) ? 'open' : ''}><summary>${group} <small>${count ? count + ' seleccionadas' : ''}</small></summary><div class="features">${items.map(([id,label,desc]) => `<button type="button" class="feature" data-feature="${id}" aria-pressed="${selected(id)}"><span class="mark" aria-hidden="true">✓</span><span><strong>${label}</strong><small>${desc}</small></span></button>`).join('')}</div></details>`;
  }).join('');
  const details = setupSections();
  const totalSelected = draft.features.length;
  return title('Agrega las funciones','que necesitas.','Selecciona tus opciones y el estimado se ajustará al instante. Puedes combinar funciones de distintas categorías.')
    + `<p class="hint" id="selection-count">${totalSelected} funciones seleccionadas${details.length ? ' · <a class="quiet" href="#details-title">Configurar selección</a>' : ''}</p>`
    + categories
    + (details.length ? `<div class="block"><h2 id="details-title" tabindex="-1">Detalles de tu selección</h2><p class="hint">Completa lo que ya tengas definido.</p>${details.map(([name,controls]) => `<section class="panel"><h3>${name}</h3>${name === 'Regalos' ? '<p class="hint">Para transferencias, te pediremos los datos de forma privada.</p>' : ''}<div class="fields">${controls.map(setupControl).join('')}</div></section>`).join('')}</div>` : '')
    + input(['extraNote','¿Te gustaría agregar otra función?','area','Cuéntanos qué debería hacer.']);
}

function eventFields() {
  const list = EVENT_FIELDS.map(def => def[0] === 'nameEvent' && EVENT_NAME[draft.event] ? [def[0],EVENT_NAME[draft.event]] : def);
  if (selected('itinerario')) list.push(['itinerary','Itinerario y horarios','area']);
  if (selected('indicaciones')) list.push(['directions','Indicaciones especiales','area']);
  const conditional = EVENT_DETAILS[draft.event] || [];
  if (!conditional.some(([key]) => key === 'ceremony') && selected('ceremonia')) {
    return [...list,...conditional,['ceremony','Hora de la ceremonia','time'],['reception','Hora de la recepción','time']];
  }
  return [...list,...conditional];
}
function showVenues() {
  return selected('ceremonia','sedes') || ['boda','xv'].includes(draft.event);
}
const VENUE_FIELDS = [['name','Nombre del lugar'],['address','Dirección'],['date','Fecha','date'],['time','Hora','time'],['map','Enlace de Google Maps','url']];
function eventPage() {
  const venues = showVenues() ? `<div class="block"><h2>Otras ubicaciones</h2><p class="hint">Para la ceremonia, recepción u otra parte del evento.</p>${draft.venues.map((_,index) => `<section class="panel"><h3>Sede ${index + 2}</h3>${fields(VENUE_FIELDS,'venue:'+index)}${index ? `<button type="button" class="quiet" data-remove-venue="${index}">Quitar sede</button>` : ''}</section>`).join('')}${draft.venues.length < 5 ? '<button type="button" class="secondary" data-add-venue>Agregar otra sede</button>' : ''}</div>` : '';
  return title('Los datos de tu','evento.','Agrega la fecha, los nombres y el lugar si ya los tienes. Puedes dejar el resto pendiente.')
    + fields(eventFields()) + venues;
}
function materialPage() {
  return title('Comparte tu','inspiración.','Puedes compartir fotos del evento, ejemplos de otras invitaciones o enlaces a una carpeta.')
    + `<label class="file-picker">Seleccionar archivos<input id="files" type="file" multiple accept=".${Object.keys(FILE_TYPES).join(',.')}"><small class="hint">JPG, PNG, WebP, GIF, PDF, MP4, MOV, MP3 y WAV. Hasta ${MAX_FILES} archivos, 8 MB por archivo y 20 MB en total.</small></label>`
    + `<div class="file-grid">${attachments.map(({file,url},index) => `<div class="file-row">${url ? `<img src="${url}" alt="">` : ''}<span>${escapeHTML(file.name)} <small>(${(file.size / 1048576).toFixed(1)} MB)</small></span><button type="button" class="quiet" data-remove-file="${index}" aria-label="Quitar ${escapeHTML(file.name)}">Quitar</button></div>`).join('')}</div>`
    + `<p class="notice">${uploadEnabled ? 'Los archivos seleccionados se cargarán cuando envíes tu solicitud. Mantén esta pestaña abierta hasta recibir un folio.' : 'Vista previa local. Comparte tus materiales mediante un enlace o adjúntalos en WhatsApp cuando envíes tu solicitud.'}</p>`
    + fields([['referenceLinks','Enlaces de inspiración','area','TikTok, Instagram, Pinterest, YouTube u otra invitación'],['materialLinks','Enlaces a tus fotos o videos','area','Google Drive, Google Fotos, OneDrive u otro enlace compartido']]);
}
function contactPage() {
  return title('¿A dónde enviamos tu','cotización?','Te contactaremos para confirmar el alcance, el precio y la fecha de entrega.')
    + fields([['customerName','Nombre de contacto *','text','Tu nombre'],['customerPhone','Tu WhatsApp *','tel','Ej. tu número de 10 dígitos'],['customerEmail',draft.contactPreferred === 'correo' ? 'Correo electrónico *' : 'Correo electrónico (opcional)','email','nombre@correo.com']])
    + `<div class="block"><h2>Medio de contacto preferido</h2><div class="inline">${[['whatsapp','WhatsApp'],['correo','Correo electrónico']].map(([id,label]) => `<button type="button" class="chip" aria-pressed="${draft.contactPreferred === id}" data-choice="contactPreferred" data-value="${id}">${label}</button>`).join('')}</div></div>
    <div class="consent"><input id="consent" type="checkbox" ${draft.consent ? 'checked' : ''}><label for="consent">Autorizo a Eventos Digitales MX a usar mis datos y materiales para atender esta cotización. Si comparto fotos de terceros, cuento con su autorización y, para menores, con la de su madre, padre o tutor.</label></div>
    <button type="button" class="quiet" data-privacy>Leer el aviso de privacidad</button>`;
}

function toPairs(defs,source) {
  return defs.map(([key,label,options]) => {
    const raw = source[key];
    const formatted = Array.isArray(options)
      ? (Array.isArray(raw) ? raw : [raw]).map(id => itemLabel(options,id)).filter(Boolean).join(', ')
      : cleanText(raw);
    return [label,formatted];
  }).filter(([,value]) => value);
}
function sections() {
  const quote = quoteFor(draft);
  const pending = [['date','Fecha del evento'],['venue','Salón o lugar'],['delivery','Fecha de entrega']]
    .filter(([key]) => !draft[key]).map(([,label]) => label);
  const extraVenues = showVenues() ? draft.venues.map((venue,index) => [`Sede ${index+2}`,toPairs(VENUE_FIELDS,venue).map(([key,val]) => key + ' · ' + val).join('\n')]) : [];
  return [
    ['Celebración',0,[['Tipo de evento',itemLabel(EVENTS,draft.event)],['Otro evento',draft.event === 'otro' ? draft.eventOther : ''],['Festejados',draft.nameEvent]]],
    ['Estilo',1,[['Estilos',draft.styles.map(id => itemLabel(STYLES,id)).join(', ')],['Colores',[draft.palette,draft.customColor].filter(Boolean).join(' · ')],['Tema',draft.theme],['Idea creativa',draft.creativeNote]]],
    ['Apertura',2,[['Cómo abre',itemLabel(OPENINGS,draft.opening)],['Idea de apertura',draft.opening === 'libre' ? draft.openingIdea : '']]],
    ['Funciones y detalles',3,[['Selección',draft.features.map(id => itemLabel(FEATURES,id)).filter(Boolean).join(', ')],
      ...setupSections().flatMap(([,controls]) => toPairs(controls,draft.config)),['Solicitud adicional',draft.extraNote],['Por revisar',quote.review.join(', ')]]],
    ['Datos del evento',4,[...toPairs(eventFields(),draft),...extraVenues,['Datos pendientes',pending.join(', ')]]],
    ['Materiales',5,[['Referencias',draft.referenceLinks],['Carpetas compartidas',draft.materialLinks],
      ['Archivos seleccionados',attachments.map(({file}) => file.name).join('\n')]]],
    ['Contacto',6,[['Nombre',draft.customerName],['WhatsApp',draft.customerPhone],['Correo',draft.customerEmail],
      ['Prefiere contacto por',draft.contactPreferred === 'correo' ? 'Correo electrónico' : 'WhatsApp']]]
  ].map(([name,step,rows]) => [name,step,rows.filter(([,value]) => value)]);
}
function summaryPage() {
  const selection = sections().map(([label,step,rows]) => `<section class="review"><header><h3>${label}</h3><button type="button" class="quiet" data-step="${step}" aria-label="Editar ${label}">Editar</button></header>${rows.length ? `<dl>${rows.map(([name,value]) => `<dt>${escapeHTML(name)}</dt><dd>${escapeHTML(value)}</dd>`).join('')}</dl>` : '<p class="hint">Por definir</p>'}</section>`).join('');
  return title('Revisa tu','solicitud.','Verifica tus datos antes de enviar tu idea. Puedes regresar a cualquier sección para editarla.')
    + selection
    + (uploadEnabled ? `<div id="verification" ${receipt ? 'hidden' : ''}></div><p id="upload-status" class="hint" role="status">${receipt ? 'Solicitud guardada. Folio ' + escapeHTML(receipt.folio) + '.' : ''}</p>` : '')
    + `<div class="actions"><button type="button" class="primary" id="send" ${receipt && !whatsapp ? 'hidden' : ''}>${receipt ? 'Abrir WhatsApp con mi folio' : uploadEnabled ? 'Enviar mi solicitud' : 'Enviar mi idea por WhatsApp'}</button><button type="button" class="secondary" data-copy>Copiar ficha</button><button type="button" class="secondary" data-download>Descargar ficha</button></div>`
    + (!uploadEnabled ? '<p class="hint">Modo demostración de archivos. Los enlaces se incluyen en la ficha y los archivos del dispositivo se comparten aparte.</p>' : '')
    + (!whatsapp && !uploadEnabled ? '<p class="hint">WhatsApp del negocio pendiente de configurar. Puedes compartir el mensaje desde el selector de contactos.</p>' : '');
}
const PAGES = [celebration,style,opening,functionsPage,eventPage,materialPage,contactPage,summaryPage];

function render(keepFocus = false) {
  const active = document.activeElement;
  const focusSelector = keepFocus && active instanceof HTMLElement && active.dataset
    ? ['choice','feature','configChoice','palette','addVenue','removeFile','removeVenue'].find(key => Object.hasOwn(active.dataset,key)) : '';
  const focusValue = focusSelector ? active.dataset[focusSelector] : '';
  const secondaryValue = focusSelector ? active.dataset.value : '';
  screen.innerHTML = PAGES[draft.current]();
  $('#stage-number').textContent = `Paso ${draft.current + 1} de ${STEPS.length}`;
  $('#steps').innerHTML = STEPS.map((label,index) => `<button type="button" class="step-link ${index < draft.current ? 'past' : ''}" data-step="${index}" ${index === draft.current ? 'aria-current="step"' : ''} ${index > draft.progress ? 'disabled' : ''}>${label}</button>`).join('');
  $('#back').hidden = draft.current === 0;
  $('#next').hidden = draft.current === 7;
  $('.navigation').hidden = draft.current === 7;
  $('#next').textContent = draft.current === 6 ? 'Revisar mi solicitud' : 'Continuar';
  updatePrice();
  if (draft.current === 7 && uploadEnabled && !receipt) setupVerification();
  if (focusSelector) {
    const target = [...screen.querySelectorAll('button')].find(button => button.dataset[focusSelector] === focusValue && button.dataset.value === secondaryValue);
    (target || $('#stage-title')).focus({preventScroll:true});
  }
}
function validateContact() {
  if (!draft.customerName?.trim()) return ['customerName','Escribe tu nombre de contacto.'];
  const phone = draft.customerPhone?.replace(/[\s()\-]/g,'') || '';
  if (!/^(?:\d{10}|\+[1-9]\d{9,14}|52\d{10})$/.test(phone)) return ['customerPhone','Escribe un número válido de WhatsApp.'];
  const email = draft.customerEmail?.trim() || '';
  if ((email || draft.contactPreferred === 'correo') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ['customerEmail','Escribe un correo electrónico válido.'];
  if (!draft.consent) return ['consent','Confirma la autorización para preparar tu cotización.'];
  return null;
}
function go(step) {
  if (busy || step < 0 || step > 7 || step > draft.progress + 1) return;
  if (step > draft.current && !draft.event) {
    toast('Elige el tipo de celebración.');
    screen.querySelector('[data-choice="event"]')?.focus();
    return;
  }
  if (step > draft.current) {
    const invalid = [...screen.querySelectorAll('input[type="url"],input[type="number"]')]
      .find(control => !control.validity.valid || (control.type === 'url' && control.value && !/^https?:\/\//i.test(control.value)));
    if (invalid) {
      invalid.focus();
      toast(invalid.type === 'url' ? 'Usa un enlace completo que empiece con https://.' : 'Revisa el número que ingresaste.');
      return;
    }
  }
  if (step === 7) {
    const problem = validateContact();
    if (problem) {
      draft.current = 6;
      render();
      document.querySelector(`[data-input="${problem[0]}"]`)?.focus();
      if (problem[0] === 'consent') $('#consent')?.focus();
      toast(problem[1]);
      return;
    }
  }
  draft.current = step;
  draft.progress = Math.max(step,draft.progress);
  save();
  render();
  $('#stage-title').focus({preventScroll:true});
  window.scrollTo(0,0);
}

function privacy() {
  const contact = SITE_CONFIG.privacyContact ? escapeHTML(SITE_CONFIG.privacyContact) : 'el mismo canal por el que nos contactes';
  $('#privacy-text').innerHTML = `<h2>Aviso de privacidad</h2>
    <p>Eventos Digitales MX usa los datos de contacto, detalles del evento y materiales que compartas para revisar tu solicitud, preparar la cotización y comunicarse contigo.</p>
    <p>El avance se guarda en este navegador. Puedes usar «Borrar avance» para eliminarlo. Los archivos seleccionados se mantienen en la pestaña hasta que cierres o recargues la página.</p>
    <p>${uploadEnabled ? `Al enviar tu solicitud, guardamos la ficha y sus archivos con acceso limitado al equipo de Eventos Digitales MX. Podemos enviar un resumen en PDF al WhatsApp del equipo para darle seguimiento a tu cotización. Las cotizaciones sin contratar se conservan hasta ${Number(SITE_CONFIG.retentionDays)} días.` : 'En esta modalidad, eliges cómo compartir tu ficha y tus materiales. El sitio guarda el avance en el dispositivo. WhatsApp y los servicios de enlaces que uses aplican sus propios avisos.'}</p>
    <p>Para consultar, corregir o solicitar la eliminación de tus datos, contacta a Eventos Digitales MX por ${contact}.</p>`;
  $('#privacy').showModal();
}
function fileType(file) {
  return FILE_TYPES[file.name.split('.').pop().toLowerCase()];
}
function releaseAttachment(index) {
  const [removed] = attachments.splice(index,1);
  if (removed?.url) URL.revokeObjectURL(removed.url);
}
function clearAttachments() {
  while (attachments.length) releaseAttachment(attachments.length - 1);
}
function addFiles(files) {
  let rejected = 0;
  let total = attachments.reduce((sum,{file}) => sum + file.size,0);
  for (const file of files) {
    const type = fileType(file);
    const duplicate = attachments.some(row => row.file.name === file.name && row.file.size === file.size && row.file.lastModified === file.lastModified);
    if (!type || !file.size || file.size > MAX_FILE || attachments.length >= MAX_FILES || total + file.size > MAX_TOTAL) {
      rejected++;
      continue;
    }
    if (duplicate) continue;
    attachments.push({file,url:type.startsWith('image/') ? URL.createObjectURL(file) : ''});
    total += file.size;
  }
  changed();
  render();
  $('#files').focus();
  if (rejected) toast(`${rejected} archivo(s) superan el límite o usan un formato diferente.`);
}
function packet() {
  return {
    fechaSolicitud:new Date().toISOString(),
    precioEstimado:priceLabel(quoteFor(draft)),
    consentimiento:draft.consent,
    contacto:{nombre:draft.customerName,whatsapp:draft.customerPhone,correo:draft.customerEmail || '',preferencia:draft.contactPreferred},
    secciones:sections().map(([name,,rows]) => [name,rows])
  };
}
function longSummary() {
  const info = packet();
  return [
    'Solicitud de cotización | Eventos Digitales MX',
    'Fecha · ' + new Date(info.fechaSolicitud).toLocaleDateString('es-MX'),
    'Estimado · ' + info.precioEstimado,
    receipt ? 'Folio · ' + receipt.folio : 'Folio · Pendiente de recepción',
    ...info.secciones.map(([name,rows]) => name + '\n' + (rows.length ? rows.map(([key,value]) => key + ' · ' + value).join('\n') : 'Por definir')),
    attachments.length && !receipt ? 'Los archivos seleccionados están pendientes de compartir.' : ''
  ].filter(Boolean).join('\n\n');
}
function briefMessage() {
  const clip = (s,count = 90) => typeof s === 'string' ? Array.from(s.trim()).slice(0,count).join('') : '';
  const options = draft.features.filter(id => !INCLUDED.includes(id)).map(id => itemLabel(FEATURES,id));
  return [
    `Hola, soy ${clip(draft.customerName)}. Quiero cotizar una invitación con Eventos Digitales MX.`,
    receipt ? 'Folio: ' + receipt.folio : '',
    'Evento: ' + (draft.event === 'otro' && draft.eventOther ? clip(draft.eventOther) : itemLabel(EVENTS,draft.event)) + (draft.nameEvent ? ' · ' + clip(draft.nameEvent) : ''),
    [draft.date,clip(draft.city)].filter(Boolean).join(' · '),
    'Apertura: ' + itemLabel(OPENINGS,draft.opening),
    options.length ? 'Funciones: ' + options.slice(0,6).join(', ') + (options.length > 6 ? ' y otras.' : '.') : '',
    'Estimado: ' + priceLabel(quoteFor(draft)),
    !receipt && attachments.length ? 'Compartiré mis materiales en esta conversación.' : '',
    '¿Podrían revisar mi solicitud?'
  ].filter(Boolean).join('\n');
}
async function copy() {
  const summary = longSummary();
  try {
    await navigator.clipboard.writeText(summary);
  } catch {
    const box = document.createElement('textarea');
    box.value = summary;
    box.style.position = 'fixed';
    box.style.top = '0';
    document.body.append(box);
    box.select();
    const success = document.execCommand('copy');
    box.remove();
    $('[data-copy]')?.focus();
    if (!success) {
      toast('El navegador rechazó la copia. Puedes descargar la ficha.');
      return;
    }
  }
  toast('Ficha copiada.');
}
function download() {
  const source = URL.createObjectURL(new Blob([longSummary()],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = source;
  link.download = 'ficha-eventos-digitales-mx.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(source),1000);
}

let widgetScript;
let widgetId;
let submissionId;
function setupVerification() {
  token = '';
  if (widgetId != null && window.turnstile) {
    window.turnstile.remove(widgetId);
    widgetId = null;
  }
  if (!widgetScript) {
    widgetScript = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { script.remove(); widgetScript = null; reject(new Error('No se pudo cargar la verificación.')); };
      document.head.append(script);
    });
  }
  const box = $('#verification');
  widgetScript.then(() => {
    if (!box?.isConnected || receipt || widgetId != null) return;
    widgetId = window.turnstile.render(box,{
      sitekey:SITE_CONFIG.turnstileSiteKey,action:'cotizacion',size:'flexible',language:'es',
      callback:value => { token = value; },
      'expired-callback':() => { token = ''; },
      'error-callback':() => { token = ''; }
    });
  }).catch(() => {
    if (box?.isConnected) $('#upload-status').textContent = 'La verificación no cargó. Puedes volver a intentar o descargar la ficha.';
  });
}
function uploadForm(form) {
  return new Promise((resolve,reject) => {
    const request = new XMLHttpRequest();
    request.open('POST',SITE_CONFIG.uploadEndpoint);
    request.timeout = 80000;
    request.upload.onprogress = event => {
      if (event.lengthComputable) $('#upload-status').textContent = `Cargando solicitud… ${Math.floor(event.loaded / event.total * 100)}%`;
    };
    request.upload.onload = () => { $('#upload-status').textContent = 'Verificando y guardando la solicitud…'; };
    request.onload = () => {
      let response;
      try { response = JSON.parse(request.responseText); } catch { response = {}; }
      if (request.status >= 200 && request.status < 300 && /^EDMX-[a-f0-9-]{36}$/i.test(response.folio || '')) resolve(response);
      else reject(new Error(response.error || 'No se pudo guardar. Puedes volver a intentar.'));
    };
    request.onerror = request.ontimeout = () => reject(new Error('Se interrumpió la conexión. Puedes volver a intentar.'));
    request.send(form);
  });
}
function openChat() {
  window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(briefMessage())}`,'_blank','noopener,noreferrer');
}
async function send() {
  if (busy) return;
  if (validateContact() || !draft.event) {
    go(draft.event ? 6 : 0);
    return;
  }
  if (!uploadEnabled || receipt) {
    openChat();
    return;
  }
  if (!token) {
    toast('Completa la verificación antes de enviar.');
    if (widgetId == null) setupVerification();
    return;
  }
  busy = true;
  const sendButton = $('#send');
  sendButton.disabled = true;
  $('#upload-status').textContent = 'Preparando la solicitud…';
  const form = new FormData();
  submissionId ||= crypto.randomUUID();
  form.append('id',submissionId);
  form.append('challenge',token);
  form.append('request',JSON.stringify(packet()));
  for (const {file} of attachments) form.append('file',file);
  try {
    receipt = await uploadForm(form);
    $('#upload-status').textContent = `Solicitud guardada. Folio ${receipt.folio}.`;
    $('#verification').hidden = true;
    sendButton.textContent = 'Abrir WhatsApp con mi folio';
    if (!whatsapp) sendButton.hidden = true;
  } catch (error) {
    $('#upload-status').textContent = error.message;
    if (widgetId != null) window.turnstile.reset(widgetId);
  } finally {
    token = '';
    busy = false;
    sendButton.disabled = false;
  }
}
function reset() {
  if (busy) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
  clearAttachments();
  expanded.clear();
  expanded.add(0);
  expanded.add(1);
  draft = blank();
  receipt = null;
  submissionId = null;
  render();
  $('#saved').textContent = 'Tu avance se guarda en este dispositivo.';
  $('#stage-title').focus({preventScroll:true});
  window.scrollTo(0,0);
  toast('Avance borrado.');
}
function toggle(list,value) {
  return list.includes(value) ? list.filter(item => item !== value) : [...list,value];
}
function playExample(button) {
  const visual = $('.sample-visual');
  visual.classList.toggle('playing');
  button.textContent = visual.classList.contains('playing') ? 'Reiniciar muestra' : 'Probar la animación';
  $('#preview-status').textContent = visual.classList.contains('playing') ? 'Se reveló el mensaje de la invitación.' : '';
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const d = button.dataset;
  if (Object.hasOwn(d,'privacy')) { privacy(); return; }
  if (busy) return;
  if (button.id === 'back') { go(draft.current - 1); return; }
  if (button.id === 'next') { go(draft.current + 1); return; }
  if (button.id === 'send') { void send(); return; }
  if (d.step !== undefined) { go(Number(d.step)); return; }
  if (d.reset !== undefined) { $('#reset-dialog').returnValue = ''; $('#reset-dialog').showModal(); return; }
  if (d.copy !== undefined) { void copy(); return; }
  if (d.download !== undefined) { download(); return; }
  if (d.preview !== undefined) { playExample(button); return; }
  if (d.game) {
    const correct = d.game === 'lavanda';
    const visual = $('.sample-visual');
    visual.classList.toggle('playing',correct);
    visual.querySelector('span').textContent = correct ? '¡Lo descubriste!' : 'Adivina el color';
    $('#preview-status').textContent = correct ? 'Acertaste. La invitación se abre.' : 'Prueba con otro color.';
    return;
  }
  if (d.choice) {
    if (d.choice === 'styles' && draft.styles.length >= 3 && !draft.styles.includes(d.value)) {
      toast('Puedes combinar hasta tres estilos.');
      return;
    }
    draft[d.choice] = d.choice === 'styles' ? toggle(draft.styles,d.value) : d.value;
  } else if (d.feature) {
    draft.features = toggle(draft.features,d.feature);
    if (d.feature === 'checkin' && selected('checkin') && !selected('qr')) draft.features.push('qr');
    if (d.feature === 'qr' && !selected('qr')) {
      draft.features = draft.features.filter(id => id !== 'checkin');
      if (draft.config.qrScan === 'si') draft.config.qrScan = 'pendiente';
    }
    if (d.feature === 'checkin' && !selected('checkin') && draft.config.qrScan === 'si') draft.config.qrScan = 'pendiente';
  } else if (d.configChoice) {
    draft.config[d.configChoice] = toggle(draft.config[d.configChoice] || [],d.value);
  } else if (d.palette !== undefined) {
    draft.palette = draft.palette === PALETTES[d.palette][0] ? '' : PALETTES[d.palette][0];
  } else if (d.removeColor !== undefined) {
    draft.customColor = '';
  } else if (d.addVenue !== undefined) {
    draft.venues.push({});
  } else if (d.removeVenue !== undefined) {
    draft.venues.splice(Number(d.removeVenue),1);
  } else if (d.removeFile !== undefined) {
    releaseAttachment(Number(d.removeFile));
  } else {
    return;
  }
  changed();
  render(true);
});
document.addEventListener('input', event => {
  const control = event.target;
  const {input:key,scope} = control.dataset;
  if (key) {
    const target = scope === 'config' ? draft.config : scope.startsWith('venue:') ? draft.venues[Number(scope.split(':')[1])] : draft;
    target[key] = control.value;
    changed();
    updatePrice();
  } else if (control.id === 'consent') {
    draft.consent = control.checked;
    changed();
  }
});
document.addEventListener('change', event => {
  if (event.target.id === 'files') addFiles([...event.target.files]);
  if (event.target.id === 'custom-color') {
    draft.customColor = event.target.value;
    changed();
    render();
    $('#custom-color').focus();
  }
});
document.addEventListener('toggle', event => {
  const detail = event.target;
  if (!detail.matches('details[data-group]') || !detail.isConnected) return;
  const id = Number(detail.dataset.group);
  if (detail.open) expanded.add(id);
  else expanded.delete(id);
},true);
$('#reset-dialog').addEventListener('close', () => {
  if ($('#reset-dialog').returnValue === 'reset') reset();
});
if (draft.current === 7 && validateContact()) draft.current = 6;
render();
