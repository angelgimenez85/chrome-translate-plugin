# Traductor de Selección - Google Translate

Extensión de Chrome (Manifest V3) que traduce al instante cualquier texto seleccionado en una página web usando Google Translate.

## Características

- **Icono flotante al seleccionar texto**: al seleccionar texto con el ratón aparece un icono junto a la selección; al pulsarlo se muestra una burbuja con la traducción.
- **Menú contextual**: clic derecho sobre un texto seleccionado → "Traducir con Google Translate".
- **Atajo de teclado**: `Alt+Shift+T` traduce la selección actual de la página.
- **Popup de la extensión**: permite escribir o pegar texto manualmente, o traducir la selección activa de la pestaña, con opción de copiar el resultado.
- **Página de opciones**: configura el idioma de destino por defecto y si se muestra el icono flotante.
- **Detección automática del idioma de origen**.

## Instalación (modo desarrollador)

1. Abre `chrome://extensions` en Chrome.
2. Activa el **Modo de desarrollador** (interruptor arriba a la derecha).
3. Haz clic en **Cargar descomprimida** y selecciona la carpeta de este proyecto.
4. La extensión quedará instalada y visible en la barra de herramientas.

## Uso

- **Desde la página**: selecciona texto → pulsa el icono flotante "G" → aparece la traducción en una burbuja.
- **Menú contextual**: selecciona texto → clic derecho → "Traducir ... con Google Translate".
- **Atajo de teclado**: selecciona texto → `Alt+Shift+T`.
- **Desde el popup**: haz clic en el icono de la extensión, escribe o pega texto (o pulsa "Traducir selección de la página") y luego "Traducir".

El idioma de destino y la visibilidad del icono flotante se configuran desde la página de **Opciones** de la extensión (también accesible desde el enlace "Opciones" del popup).

## Estructura del proyecto

```
manifest.json      Configuración de la extensión (Manifest V3)
background.js       Service worker: menú contextual, atajo de teclado y llamadas a la API de traducción
content.js           Script inyectado en las páginas: icono flotante y burbuja de resultado
content.css          Estilos del icono flotante y la burbuja
popup.html/js/css    Interfaz del popup de la extensión
options.html/js/css  Página de configuración (idioma por defecto, icono flotante)
languages.js         Listado de idiomas soportados
icons/               Iconos de la extensión en distintos tamaños
```

## Cómo funciona la traducción

La traducción se realiza desde el service worker (`background.js`) mediante peticiones al endpoint público de Google Translate:

```
https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=<idioma>&dt=t&dt=bd&dj=1&q=<texto>
```

Este endpoint no oficial no requiere API key, pero al no ser una API pública documentada puede cambiar de comportamiento o dejar de estar disponible sin aviso.

## Permisos utilizados

| Permiso | Motivo |
|---|---|
| `contextMenus` | Añadir la opción de traducción al menú contextual |
| `storage` | Guardar el idioma preferido y las preferencias del usuario |
| `activeTab` / `scripting` | Leer el texto seleccionado en la pestaña activa |
| `host_permissions` (`translate.googleapis.com`) | Realizar las peticiones de traducción |

## Notas

- Al usar un endpoint no oficial de Google Translate, no hay garantías de disponibilidad ni de límites de uso; para un uso intensivo o en producción se recomienda migrar a la API oficial de Cloud Translation.
- En páginas internas de Chrome (`chrome://...`) no es posible inyectar scripts, por lo que el icono flotante y el atajo de teclado no funcionarán en ellas.
