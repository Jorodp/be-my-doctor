import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

// Zona horaria de México
export const MEXICO_TIMEZONE = 'America/Mexico_City';

/**
 * Formatea una fecha en la zona horaria local de México
 */
export const formatInMexicoTZ = (
  date: string | Date, 
  formatString: string, 
  options?: { locale?: any }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  console.log('🇲🇽 formatInMexicoTZ processing:', {
    input: date,
    dateObj: dateObj,
    timezone: MEXICO_TIMEZONE,
    format: formatString
  });
  const result = formatInTimeZone(
    dateObj, 
    MEXICO_TIMEZONE, 
    formatString, 
    { 
      locale: options?.locale || es 
    }
  );
  console.log('🇲🇽 formatInMexicoTZ result:', result);
  return result;
};

/**
 * Formatea solo la hora en zona horaria local
 */
export const formatTimeInMexicoTZ = (date: string | Date): string => {
  console.log('🕐 formatTimeInMexicoTZ input:', date);
  console.log('🕐 formatTimeInMexicoTZ date object:', new Date(date));
  const result = formatInMexicoTZ(date, 'HH:mm');
  console.log('🕐 formatTimeInMexicoTZ result:', result);
  return result;
};

/**
 * Formatea fecha completa en zona horaria local
 */
export const formatDateInMexicoTZ = (date: string | Date): string => {
  return formatInMexicoTZ(date, 'dd/MM/yyyy');
};

/**
 * Formatea fecha y hora en zona horaria local
 */
export const formatDateTimeInMexicoTZ = (date: string | Date): string => {
  return formatInMexicoTZ(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Formatea fecha larga en zona horaria local
 */
export const formatLongDateInMexicoTZ = (date: string | Date): string => {
  return formatInMexicoTZ(date, 'EEEE, dd MMMM yyyy');
};

/**
 * Formatea fecha corta en zona horaria local
 */
export const formatShortDateInMexicoTZ = (date: string | Date): string => {
  return formatInMexicoTZ(date, 'PPP');
};

/**
 * Verifica si una fecha es hoy en la zona horaria local
 */
export const isToday = (date: string | Date): boolean => {
  const today = formatInMexicoTZ(new Date(), 'yyyy-MM-dd');
  const targetDate = formatInMexicoTZ(date, 'yyyy-MM-dd');
  return today === targetDate;
};

/**
 * Obtiene la fecha actual en zona horaria de México
 */
export const getNowInMexicoTZ = (): Date => {
  return new Date();
};

/**
 * Convierte una fecha UTC a hora local de México para mostrar
 */
export const convertUTCToMexicoTZ = (utcDate: string | Date): Date => {
  // Para uso interno cuando necesitemos manipular fechas
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return dateObj;
};