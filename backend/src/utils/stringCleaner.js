/**
 * Función para limpiar y formatear strings para enviar a la API
 * @param {string|object} data - Los datos a limpiar
 * @returns {string} - String limpio y formateado
 */
function cleanStringForAPI(data) {
  let cleanString = '';
  
  try {
    // Si es un objeto, convertirlo a JSON string
    if (typeof data === 'object') {
      cleanString = JSON.stringify(data, null, 2);
    } else if (typeof data === 'string') {
      // Si es string, intentar parsearlo como JSON primero
      try {
        const parsed = JSON.parse(data);
        cleanString = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Si no es JSON válido, usar como string
        cleanString = data;
      }
    } else {
      // Si es otro tipo, convertirlo a string
      cleanString = String(data);
    }
    
    // Limpiar caracteres problemáticos para la API
    cleanString = cleanString
      .replace(/"/g, "'")  // Reemplazar comillas dobles por simples
      .replace(/\n/g, ' ')  // Reemplazar saltos de línea por espacios
      .replace(/\r/g, ' ')  // Reemplazar retornos de carro por espacios
      .replace(/\t/g, ' ')  // Reemplazar tabulaciones por espacios
      .replace(/\s+/g, ' ')  // Reemplazar múltiples espacios por uno solo
      .replace(/[^\x20-\x7E]/g, ' ')  // Reemplazar caracteres no ASCII por espacios
      .trim();  // Eliminar espacios al inicio y final
    
    // Limitar longitud para evitar problemas con la API
    if (cleanString.length > 2000) {
      cleanString = cleanString.substring(0, 1997) + '...';
    }
    
    return cleanString;
    
  } catch (error) {
    console.error('Error limpiando string para API:', error);
    return 'Datos originales no disponibles';
  }
}

module.exports = { cleanStringForAPI }; 