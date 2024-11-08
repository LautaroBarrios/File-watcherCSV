import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const directoryPath = path.join(
  "C:",
  "Users",
  "TuNombreDeUsuario",
  "Desktop",
  "FilesWatcher"
); // Cambia esta ruta a tu carpeta de archivos CSV
const apiEndpoint = process.env.API; // URL a la que envia los archivos
const maxRetries = 5; // Número máximo de reintentos
const retryInterval = 60000; // Tiempo entre máximo entre reintentos

// Crear la carpeta si no existe
if (!fs.existsSync(directoryPath)) {
  fs.mkdirSync(directoryPath);
  console.log(`\x1b[92m Carpeta creada en: \x1b[93m${directoryPath}\x1b[0m`);
}

// Función para enviar el archivo a la API
async function sendFileToAPI(filePath) {
  const fileName = path.basename(filePath);

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      body: fs.createReadStream(filePath),
      headers: {
        "Content-Type": "text/csv",
      },
    });

    if (!response.ok) {
      throw new Error(`Error en la API: ${response.statusText}`);
    }

    console.log(
      `\x1b[92m     ✅ Archivo \x1b[93m${fileName} \x1b[92menviado exitosamente.\x1b[0m`
    );

    // Eliminar el archivo después de enviarlo correctamente
    await deleteFile(filePath);
  } catch (error) {
    console.error(
      `\x1b[91m     ❌ Error al enviar \x1b[93m${fileName}: \x1b[0m`,
      error
    );
    throw error; // Lanza el error para que lo capture retrySendFileToAPI
  }
}

// Función para intentar reenviar el archivo con reintentos y espera
async function retrySendFileToAPI(filePath, retries = 0) {
  try {
    await sendFileToAPI(filePath);
  } catch (error) {
    if (retries < maxRetries) {
      console.log(
        `\x1b[93m     ⏳ Reintentando (${
          retries + 1
        }/${maxRetries}) en 1 minuto...\x1b[0m`
      );
      setTimeout(
        () => retrySendFileToAPI(filePath, retries + 1),
        retryInterval
      );
    } else {
      console.error(
        `\x1b[91m     ❌ Error después de ${maxRetries} intentos. No se pudo enviar el archivo.\x1b[0m`
      );
    }
  }
}

// Función para eliminar el archivo después de enviarlo
async function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath); // Eliminar archivo de forma síncrona
    console.log(
      `\x1b[92m     🗑️  Archivo \x1b[93m${path.basename(
        filePath
      )} \x1b[92meliminado exitosamente.\x1b[0m`
    );
  } catch (error) {
    console.error(
      `\x1b[91m     ❌ Error al eliminar el archivo: \x1b[93m${path.basename(
        filePath
      )}\x1b[0m`,
      error
    );
  }
}

// Monitorizar la carpeta en busca de archivos nuevos
fs.watch(directoryPath, (eventType, filename) => {
  if (eventType === "rename" && filename.endsWith(".csv")) {
    const filePath = path.join(directoryPath, filename);

    // Verificar si el archivo existe (evita procesar eliminaciones)
    if (fs.existsSync(filePath)) {
      console.log(
        `\x1b[32m  🔎 Nuevo archivo detectado: \x1b[93m${filename}\x1b[0m`
      );
      retrySendFileToAPI(filePath); // Llamar a la función de reintento
    }
  }
});

// Mensaje de confirmación cuando la aplicación está montada y funcionando
console.log(
  "\x1b[96m🆗 App en funcionamiento y escuchando cambios en la carpeta de archivos...\x1b[0m"
);
