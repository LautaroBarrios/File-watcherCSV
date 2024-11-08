# AnalysisFilesWatcher

Este programa está diseñado para monitorear una carpeta en busca de nuevos archivos CSV y enviar estos archivos a un servidor API. Si el envío de un archivo falla, el programa intentará reenviarlo hasta un número máximo de veces especificado.

## Descripción

- **Monitoreo de carpeta:** El programa observa una carpeta específica para detectar archivos CSV nuevos.
- **Envío de archivos:** Los archivos CSV detectados son enviados a un endpoint de API especificado.
- **Reintentos:** Si el envío de un archivo falla, el programa intentará reenviarlo hasta 5 veces.
- **Notificaciones en consola:** El programa imprime mensajes en la consola para indicar el estado de los archivos (éxito, error, reintentos).

## Requisitos

- **Node.js**: Se requiere tener Node.js instalado para ejecutar este programa.
- **Generar un archivo ".env" en la ruta principal y agregar las siguientes variables de entorno:**
  - `API`: "colocar URL de la API para el envio de los archivos.".
- **Dependencias instaladas:**
  - `node-fetch`: Para realizar las solicitudes HTTP a la API.
  - `fs` y `path`: Para gestionar el sistema de archivos y las rutas.

## Instalación

1. Clona este repositorio o descarga los archivos del programa.
2. Instala las dependencias necesarias con el siguiente comando:

   ```bash
   npm install
   ```

## Ejecución

- **Comando de producción:**

```bash
  npm start
```

- **Comando de desarrollo:**

```bash
  npm run nodemon
```
