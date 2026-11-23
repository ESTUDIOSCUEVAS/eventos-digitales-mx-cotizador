'use strict';

const EVENTS = [
  ['boda','Boda','♡'], ['xv','XV años','✧'], ['cumple','Cumpleaños','♔'],
  ['baby','Baby shower','☾'], ['revelacion','Revelación de género','◇'], ['bautizo','Bautizo','✣'],
  ['comunion','Primera comunión','✚'], ['graduacion','Graduación','♧'], ['aniversario','Aniversario','∞'],
  ['despedida','Despedida','✿'], ['corporativo','Evento empresarial','▤'], ['escolar','Evento escolar','▣'],
  ['concierto','Concierto o festival','♫'], ['otro','Otro evento','＋']
];

const STYLES = [
  ['elegante','Elegante','#eadbc6','#5c3b28','Amelia'], ['romantica','Romántico','#f1dce5','#773955','Amor'],
  ['minimalista','Minimalista','#e8e9df','#343c32','Sofía'], ['cinematica','Cinematográfico','#332a37','#f0c895','La noche'],
  ['moderna','Moderno','#e6dbf7','#502a77','Fiesta'], ['divertida','Divertido','#ffe7b8','#654106','¡Hola!'],
  ['tematica','Temático','#dce8df','#254d44','Jardín'], ['vintage','Vintage','#efddca','#68452c','Invitación'],
  ['clasica','Clásico','#e6eafa','#27375c','Isabel'], ['fantasia','Fantasía','#e2d8f0','#5e3675','Luna'],
  ['editorial','Editorial','#eee7df','#3d3934','Celebrar'], ['tecnologico','Tecnológico','#233047','#ccece8','Noche'],
  ['sorprendente','Sorpresivo','#f5d9d4','#752e30','Shhh…'], ['otro','Otra idea','#ebe1ed','#5e3c64','Tu estilo']
];

const OPENINGS = [
  ['directa','Directo a la invitación','○','Los datos aparecen desde el comienzo.'],
  ['sobre','Sobre que se abre','✉︎','Un toque abre el sobre.'],
  ['regalo','Caja que revela','□','La invitación aparece al abrir la caja.'],
  ['video','Video de bienvenida','▶︎','Tu video recibe a los invitados.'],
  ['galeria','Presentación de fotos','▧','Una secuencia de tus imágenes favoritas.'],
  ['cine','Apertura cinematográfica','◐','Una entrada con títulos y transiciones.'],
  ['raspar','Tarjeta para raspar','◒','Raspa para descubrir el mensaje.'],
  ['juego','Minijuego','♧','Un reto cortito da paso a la invitación.'],
  ['acertijo','Acertijo','?','Una pregunta esconde la sorpresa.'],
  ['tematica','Animación temática','✿','La entrada sigue el tema de tu evento.'],
  ['libre','Tengo una idea diferente','＋','Cuéntanos qué quieres que pase.']
];

const FEATURE_GROUPS = [
  ['Información básica',[
    ['datos','Fecha, hora y lugar','Los datos principales del evento.'],
    ['mapa','Ubicación con Google Maps','Abre la ruta con un toque.'],
    ['contador','Cuenta regresiva','Los días que faltan para celebrar.'],
    ['calendario','Agregar al calendario','Guarda la fecha en tu teléfono.'],
    ['vestimenta','Código de vestimenta','Comparte el estilo o colores sugeridos.'],
    ['indicaciones','Indicaciones','Notas para llegar o prepararse.'],
    ['ceremonia','Ceremonia y recepción','Separa ambas partes del evento.'],
    ['sedes','Varias ubicaciones','Agrega mapas para distintos lugares.'],
    ['itinerario','Itinerario','Horarios y actividades del día.']
  ]],
  ['Experiencia visual',[
    ['musica','Música de fondo','Incluye un reproductor con tu canción.'],
    ['fotos','Galería de fotos','Los invitados pueden explorar tus imágenes.'],
    ['video','Video integrado','Comparte un clip dentro de la invitación.'],
    ['presentacion','Presentación animada','Muestra fotos en secuencia.'],
    ['animaciones','Animaciones decorativas','Detalles en movimiento.'],
    ['historia','Historia de los festejados','Una sección para contar su historia.'],
    ['sobre','Sobre interactivo','Un sobre digital que se abre al tocar.'],
    ['efectos','Efectos interactivos','Elementos que reaccionan al tocar.'],
    ['pantallas','Secciones temáticas','Aplica el tema a partes del diseño.'],
    ['agradecimiento','Página de agradecimiento','Un mensaje especial para después.']
  ]],
  ['Regalos',[
    ['regalos','Mesa de regalos','Reúne tiendas o distintas formas de regalar.'],
    ['liverpool','Liverpool','Abre tu mesa de regalos en Liverpool.'],
    ['amazon','Amazon','Abre tu lista de regalos en Amazon.'],
    ['tiendas','Otras tiendas','Enlaza otras mesas y tiendas.'],
    ['sobres','Lluvia de sobres','Comparte cómo participar.'],
    ['transferencia','Transferencia','Indica que aceptas esta modalidad.'],
    ['regaloLista','Lista personalizada','Comparte las ideas de regalos que elijas.'],
    ['regaloTexto','Mensaje sobre regalos','Incluye un mensaje para tus invitados.']
  ]],
  ['Invitados',[
    ['rsvp','Confirmación por WhatsApp','Abre una conversación para confirmar.'],
    ['rsvpWeb','Confirmación por formulario','Registra y organiza respuestas.'],
    ['acompanantes','Registrar acompañantes','Pregunta cuántas personas vienen.'],
    ['pasePersona','Pases por persona','Un cupo por invitado.'],
    ['paseFamilia','Pases por familia','Un cupo compartido por familia.'],
    ['paseNumero','Pases numerados','Identifica cada pase con un número.'],
    ['invitacionUnica','Invitaciones por nombre','Personaliza cada enlace.'],
    ['enlaces','Enlaces exclusivos','Cada invitado recibe su propia versión.'],
    ['qr','Pases con código QR','Un código para cada pase.'],
    ['lista','Panel de confirmaciones','Consulta respuestas reunidas.'],
    ['padron','Lista de invitados','Organiza los nombres y cupos.'],
    ['mesas','Control de mesas','Asigna lugares a tus invitados.'],
    ['mapaMesas','Mapa de mesas','Muestra las ubicaciones de las mesas.'],
    ['checkin','Validación de acceso por QR','Escanea los pases a la entrada.'],
    ['recordatorios','Recordatorios','Envía avisos antes del evento.']
  ]],
  ['Recuerdos',[
    ['album','Álbum QR','Escanea un código para abrir el álbum.'],
    ['albumFotos','Fotos de invitados','Recibe las imágenes que compartan.'],
    ['albumVideos','Videos de invitados','Recibe también sus videos.'],
    ['libro','Libro de firmas','Guarda mensajes de tus invitados.'],
    ['mensajes','Mensajes personalizados','Invita a dejar una nota especial.'],
    ['dedicatorias','Dedicatorias','Reúne recuerdos por escrito.'],
    ['audio','Mensajes de voz','Recibe dedicatorias grabadas.'],
    ['mensajeVideo','Mensajes en video','Recibe saludos grabados.']
  ]],
  ['Entretenimiento',[
    ['minijuego','Minijuego a medida','Un reto diseñado para tu evento.'],
    ['trivia','Trivia','Pon a prueba lo que saben los invitados.'],
    ['memoria','Juego de memoria','Encuentra pares para revelar un detalle.'],
    ['raspa','Tarjeta para raspar','Descubre un mensaje oculto.'],
    ['globos','Globos interactivos','Revienta globos para revelar algo.'],
    ['acertijo','Acertijos','Una pista lleva a la sorpresa.'],
    ['ruleta','Ruleta','Gira para descubrir un resultado.'],
    ['votacion','Votaciones','Participa y guarda votos.'],
    ['encuesta','Encuestas','Reúne respuestas o preferencias.'],
    ['prediccion','Predicciones','Registra qué creen que se revelará.'],
    ['canciones','Selección de canciones','Recibe propuestas de tus invitados.'],
    ['sorpresa','Experiencia original','Desarrolla una dinámica especial.']
  ]],
  ['Complementos',[
    ['idiomas','Versión bilingüe','Muestra la invitación en dos idiomas.'],
    ['privada','Contraseña de acceso','Pide una clave antes de mostrar el contenido.'],
    ['privados','Enlaces privados','Restringe el acceso por invitado.'],
    ['multi','Versiones para invitados VIP','Cambia el mensaje para grupos especiales.'],
    ['hospedaje','Hospedaje','Comparte opciones para quedarse.'],
    ['transporte','Transporte','Explica cómo trasladarse al evento.'],
    ['estacionamiento','Estacionamiento','Indica dónde dejar el vehículo.'],
    ['cercanas','Recomendaciones cercanas','Sugiere lugares de interés.'],
    ['extranjeros','Información para extranjeros','Agrega indicaciones para visitar el destino.'],
    ['personalizado','Otra función','Cuéntanos qué te gustaría agregar.']
  ]]
];
const FEATURES = FEATURE_GROUPS.flatMap(([, items]) => items);
const GIFT = FEATURE_GROUPS[2][1].map(([id]) => id);
const RSVP = ['rsvp','rsvpWeb','acompanantes','pasePersona','paseFamilia','paseNumero','invitacionUnica','enlaces','lista','padron'];
const UNIQUE_PASSES = ['pasePersona','paseFamilia','paseNumero','invitacionUnica','enlaces'];
const ALBUM = ['album','albumFotos','albumVideos'];
const BOOK = ['libro','mensajes','dedicatorias','audio','mensajeVideo'];
const GAMES = ['minijuego','trivia','memoria','raspa','globos','acertijo','ruleta','sorpresa'];
const POLL = ['votacion','encuesta','prediccion','canciones'];
const INCLUDED = ['datos','mapa','contador','calendario','vestimenta','rsvp'];
const PRICING = {
  bands: [[0,299],[12,500],[18,699],[24,899],[30,1099]],
  standard: {
    musica:1, fotos:2, video:2, presentacion:2, animaciones:2, historia:1, sobre:3, efectos:2, pantallas:2,
    agradecimiento:1, indicaciones:1, ceremonia:1, sedes:2, itinerario:1, acompanantes:2, idiomas:2,
    multi:2, hospedaje:1, transporte:1, estacionamiento:1, cercanas:1, extranjeros:1, raspa:3,
    trivia:3, memoria:3, globos:3, ruleta:3
  },
  opening: {directa:[null,0], sobre:['sobre',3], regalo:['caja',3], video:['video',2], galeria:['presentacion',2], cine:['cine',4], raspar:['raspa',3], tematica:['tema',3]},
  custom: ['recordatorios','minijuego','sorpresa','acertijo','votacion','audio','mensajeVideo','personalizado','privados'],
  variants: {gift:1, playlist:1, montage:2},
  modules: {rsvp:400, individual:600, rsvpIndividual:700, guestList:650, panelWithIndividual:300, qr:650, checkin:650, tables:550, album:500, albumVideo:200, guestbook:350, poll:250, password:300},
  limits: {passes:100, albumGuests:150}
};

function itemLabel(items, id) {
  return items.find(item => item[0] === id)?.[1] || '';
}
function quoteFor(data) {
  const selected = new Set(data.features);
  const has = (...ids) => ids.some(id => selected.has(id));
  const requirements = new Set();
  const c = data.config;
  const standard = new Map();
  const p = PRICING;
  for (const id of selected) {
    if (Object.hasOwn(p.standard,id)) standard.set(id,p.standard[id]);
    if (p.custom.includes(id)) requirements.add(itemLabel(FEATURES,id));
  }
  const opening = p.opening[data.opening];
  if (!opening) requirements.add(itemLabel(OPENINGS,data.opening) || 'Apertura especial');
  else if (opening[0]) standard.set(opening[0], Math.max(standard.get(opening[0]) || 0, opening[1]));
  if (has(...GIFT)) standard.set('regalos',p.variants.gift);
  if ((has('ceremonia','sedes') || ['boda','xv'].includes(data.event)) &&
      data.venues?.some(venue => Object.values(venue).some(Boolean))) {
    standard.set('sedes',p.standard.sedes);
  }
  if (has('musica') && c.musicType === 'lista') standard.set('playlist',p.variants.playlist);
  if (has('video') || data.opening === 'video') {
    if (c.videoType === 'montaje') standard.set('montage',p.variants.montage);
    if (c.videoType === 'produccion') requirements.add('Producción de video');
  }
  if (has('idiomas') && (c.languages || '').split(/[,;]+/).filter(s => s.trim()).length > 2) requirements.add('Más de dos idiomas');
  if (has('multi') && Number(c.versions) > 2) requirements.add('Varias versiones VIP');
  if ((has(...GAMES) || data.opening === 'juego' || data.opening === 'acertijo') && c.gameOriginal === 'si') requirements.add('Juego original');
  if (has('personalizado') || data.extraNote?.trim()) requirements.add('Función adicional por definir');

  const m = p.modules;
  const usesRsvp = has('rsvp','rsvpWeb');
  const individualRsvp = usesRsvp && c.rsvpType === 'individual';
  const formRsvp = has('rsvpWeb') || (usesRsvp && c.rsvpType === 'web');
  const unique = has(...UNIQUE_PASSES) || individualRsvp;
  const tables = has('mesas','mapaMesas');
  const panel = has('lista','padron');
  const qr = has('qr','checkin');
  const album = has(...ALBUM);
  let advanced = Math.max(formRsvp ? m.rsvp : 0, unique ? m.individual : 0,
    individualRsvp ? m.rsvpIndividual : 0, panel || tables ? m.guestList : 0);
  if (panel && individualRsvp) advanced += m.panelWithIndividual;
  if (qr) advanced += m.qr;
  if (qr && (has('checkin') || c.qrScan === 'si')) advanced += m.checkin;
  if (tables) advanced += m.tables;
  if (album) advanced += m.album;
  if (album && (has('albumVideos') || c.albumType === 'ambos')) advanced += m.albumVideo;
  if (has(...BOOK)) advanced += m.guestbook;
  if (has(...BOOK) && ['audio','video'].includes(c.guestbookType)) requirements.add('Dedicatorias multimedia');
  if (has(...POLL)) advanced += m.poll;
  if (has('privada') && c.privacyType !== 'enlace') advanced += m.password;
  if (has('privada') && c.privacyType === 'enlace') requirements.add('Enlaces privados');
  if ((unique || qr) && Math.max(Number(data.guests) || 0,Number(c.qrCount) || 0) > p.limits.passes) requirements.add('Cantidad de pases o invitaciones');
  if (album && Math.max(Number(data.guests) || 0,Number(c.albumGuests) || 0) > p.limits.albumGuests) requirements.add('Capacidad del álbum de invitados');

  const points = [...standard.values()].reduce((sum, value) => sum + value, 0);
  const band = p.bands.find(([max]) => points <= max);
  if (!band) requirements.add('Combinación amplia de funciones');
  return {total: requirements.size ? null : band[1] + advanced, review:[...requirements]};
}
