# Estación de Servicio Adrián

![Icono](./icon.svg)

Una Progressive Web App (PWA) inmersiva que simula una estación de servicio y área de inflado de neumáticos, diseñada con una estética moderna e industrial ("Analog Digitalist").

## Características Principales

*   **Surtidor de Combustible:** Selecciona tipo de gasolina y cantidad de prepago. Recrea el proceso de llenado interactivo al mantener pulsado el gatillo, que incluye notificaciones visuales, sonidos realistas y **vibración continua** simulada en el dispositivo móvil. Finaliza el repostaje para imprimir tu ticket digital interactivo.
*   **Inflado de Neumáticos:** Configura la presión objetivo de tus neumáticos e inicia el llenado. Observa el progreso de la aguja, con sonido ambiental del compresor y alertas sonoras de confirmación al llegar a la presión destino.
*   **Diseño PWA Nativo:** Instálala como una aplicación nativa desde tu navegador a la pantalla de inicio del móvil. Diseñada sin líneas de scroll y con un manifiesto e icono totalmente soportados para comportarse de forma nativa. Otorga una respuesta inmediata y funciona completamente `offline` mediante un Service Worker.

## Tecnologías Utilizadas

*   **HTML5 y Vanilla JavaScript**
*   **Web Audio API y Vibration API:** Para efectos inmersivos y realismo de interacción táctil/sonora.
*   **TailwindCSS:** Para un diseño fluido y estructurado.
*   **Service Workers & Manifest.json:** Habilitando las capacidades completas y de caché de la PWA.

## Ejecución Local

Para levantar el proyecto localmente y probarlo a fondo (recuerda que los service workers funcionan en `localhost` o en entornos bajo `HTTPS`):

1. Utiliza cualquier servidor de archivos estático. Por ejemplo con NodeJS:
    ```bash
    npx serve .
    ```
2. Accede a través de tu navegador local y selecciona **"Instalar Aplicación"** desde la barra de direcciones o menú lateral si usas un dispositivo Android/iOS para probar la instalación real.

## Estructura

- `index.html`: Vista principal de la aplicación e interfaz de usuario.
- `app.js`: Tiempos de los efectos, navegación entre pestañas, lógica del surtidor y del control de inflado.
- `sw.js`: Manejo de caché para capacidades de trabajo sin conexión.
- `manifest.json` & `icon.svg`: Configuración y assets para la App Drawer del sistema.
