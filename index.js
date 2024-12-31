import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import xlsx from "xlsx";

const directoryPath = path.join(
  "C:",
  "Users",
  "IngreseSuUsuarioAqui",
  "Desktop",
  "FilesWatcherCSV"
); // Cambia esta ruta a tu carpeta de archivos CSV
const apiEndpoint = process.env.API; // URL a la que envia los archivos
const maxRetries = 5; // Número máximo de reintentos
const retryInterval = 60000; // Tiempo entre máximo entre reintentos (1 minuto)

// Crear la carpeta si no existe
if (!fs.existsSync(directoryPath)) {
  fs.mkdirSync(directoryPath);
  console.log(`\x1b[92m Carpeta creada en: \x1b[93m${directoryPath}\x1b[0m`);
}

// Función para convertir la hora decimal a formato HH:MM
function convertDecimalToTime(decimal) {
  const hours = Math.floor(decimal * 24);
  const minutes = Math.round((decimal * 24 - hours) * 60);

  // Formatear para mostrar siempre 2 dígitos
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

// Función para limpiar los valores específicos
function cleanResults(data) {
  const keysToIgnore = [
    "ID muestr",
    "Modo",
    "Fecha",
    "Hora",
    "Grupo de ref.",
    "Operador",
    "Mensaje RBC",
  ];

  // Valores a multiplicar
  const multipliers = {
    "PLT (10^9/L)": 1000,
    "WBC (10^9/L)": 1000,
    "RBC (10^12/L)": 1000000,
  };

  // Valores a mantener en decimales
  const decimals = ["HGB (g/dL)", "RDW-CV (%)"];

  // Función para normalizar y limpiar las claves de los datos y las del multipliers
  function normalizeKey(key) {
    return key
      .trim() // Eliminar espacios al principio y al final
      .toUpperCase() // Convertir a mayúsculas para comparación uniforme
      .normalize("NFD") // Normalizar caracteres Unicode
      .replace(/[\u0300-\u036f]/g, ""); // Eliminar los acentos
  }

  return data.map((row) => {
    Object.keys(row).forEach((key) => {
      if (keysToIgnore.includes(key)) return;

      let value = row[key];

      // Si el valor no es un string, convertirlo en string
      if (typeof value !== "string") {
        value = String(value);
      }

      // Eliminar prefijos de una letra seguida de espacio o varias letras con espacio
      value = value.replace(/^[A-Z]{1,}\s/, "");

      // Eliminar caracteres no numéricos si no hay letras ni espacios
      if (!/[a-zA-Z\s]/.test(value)) {
        value = value.replace(/[^\d.-]+/g, "");
      }

      row[key] = value.trimEnd(); // Asegurar limpieza final

      // Normalizar la clave
      const normalizedKey = normalizeKey(key);

      // Verificar si la clave existe en los multiplicadores
      if (multipliers[normalizedKey]) {
        // Multiplicar el valor antes de redondearlo
        let multipliedValue = row[key] * multipliers[normalizedKey];

        // Redondear después de la multiplicación
        multipliedValue = Math.round(multipliedValue);

        // Convertir el número a cadena y aplicar el formato de puntos
        row[key] = String(multipliedValue).replace(
          /\B(?=(\d{3})+(?!\d))/g,
          "."
        );
      }

      // Redondear salvo que esté en la lista de decimales
      else if (!decimals.includes(key)) {
        row[key] = Math.round(row[key]);
      } else {
        row[key] = row[key].replace(".", ",");
      }
    });
    return row;
  });
}

// Función para convertir un archivo XLSX a JSON
async function convertXLSXtoJSON(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  let jsonData = xlsx.utils.sheet_to_json(sheet);

  // Convertir la hora de decimal a formato HH:MM si está presente
  jsonData.forEach((row) => {
    if (row.Hora && typeof row.Hora === "number") {
      row.Hora = convertDecimalToTime(row.Hora);
    }
  });

  // Limpiar los resultados
  jsonData = cleanResults(jsonData);

  return JSON.stringify(jsonData, null, 2);
}

// Función para enviar el archivo a la API
async function sendFileToAPI(filePath) {
  const fileName = path.basename(filePath);

  try {
    const jsonData = await convertXLSXtoJSON(filePath);
    // return console.log(jsonData); // Puedes descomentar esto para depurar

    const response = await fetch(apiEndpoint, {
      method: "POST",
      body: JSON.stringify(jsonData),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error en la API: ${response.statusText}`);
    }

    // Mostrar la respuesta de la API
    // const responseData = await response.json();
    // console.log(`\x1b[96m     Respuesta de la API:\x1b[0m`, responseData);

    console.log(
      `\x1b[92m     OK - Archivo \x1b[93m${fileName} \x1b[92menviado exitosamente.\x1b[0m`
    );

    // Eliminar el archivo después de enviarlo correctamente
    await deleteFile(filePath);
  } catch (error) {
    console.error(
      `\x1b[91m     UPS - Error al enviar \x1b[93m${fileName}: \x1b[0m`,
      error
    );
    throw error;
  }
}

// Función para intentar reenviar el archivo con reintentos y espera
async function retrySendFileToAPI(filePath, retries = 0) {
  try {
    await sendFileToAPI(filePath);
  } catch (error) {
    if (retries < maxRetries) {
      console.log(
        `\x1b[93m     ESPERA - Reintentando (${
          retries + 1
        }/${maxRetries}) en 1 minuto...\x1b[0m`
      );
      setTimeout(
        () => retrySendFileToAPI(filePath, retries + 1),
        retryInterval
      );
    } else {
      console.error(
        `\x1b[91m     UPS - Error después de ${maxRetries} intentos. No se pudo enviar el archivo.\x1b[0m`
      );
    }
  }
}

// Función para eliminar el archivo después de enviarlo
async function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath); // Eliminar archivo de forma síncrona
    console.log(
      `\x1b[96m      LIMPIEZA - Archivo \x1b[93m${path.basename(
        filePath
      )} \x1b[92meliminado exitosamente.\x1b[0m`
    );
  } catch (error) {
    console.error(
      `\x1b[91m     UPS - Error al eliminar el archivo: \x1b[93m${path.basename(
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
        `\x1b[32m  BÚSQUEDA - Nuevo archivo detectado: \x1b[93m${filename}\x1b[0m`
      );
      retrySendFileToAPI(filePath); // Llamar a la función de reintento
    }
  }
});

// Mensaje de confirmación cuando la aplicación está montada y funcionando
console.log("\x1b[96m ░█████╗░░██████╗██╗░░░██╗\x1b[0m");
console.log("\x1b[96m ██╔══██╗██╔════╝██║░░░██║\x1b[0m");
console.log("\x1b[96m ██║░░╚═╝╚█████╗░╚██╗░██╔╝\x1b[0m");
console.log("\x1b[96m ██║░░██╗░╚═══██╗░╚████╔╝░\x1b[0m");
console.log("\x1b[96m ██║░░██╗░╚═══██╗░╚████╔╝░\x1b[0m");
console.log("\x1b[96m ╚█████╔╝██████╔╝░░╚██╔╝░░\x1b[0m");
console.log("\x1b[96m ░╚════╝░╚═════╝░░░░╚═╝░░░\x1b[0m");
console.log(
  "\x1b[96m App en funcionamiento y escuchando cambios en la carpeta de archivos...\x1b[0m"
);
