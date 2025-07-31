/**
 * Configuración centralizada de dayjs con plugins de timezone
 * Zona horaria: America/Mexico_City (GMT-6)
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

// Extender dayjs con todos los plugins necesarios
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Zona horaria de México
export const MEXICO_TIMEZONE = "America/Mexico_City";

/**
 * Convierte una fecha UTC de Supabase a zona horaria local de México
 */
export const convertUTCToMexicoTZ = (utcDate: string | Date): dayjs.Dayjs => {
  return dayjs.utc(utcDate).tz(MEXICO_TIMEZONE);
};

/**
 * Convierte una fecha local a UTC para guardar en Supabase
 */
export const convertMexicoTZToUTC = (localDate: string | Date): dayjs.Dayjs => {
  return dayjs.tz(localDate, MEXICO_TIMEZONE).utc();
};

/**
 * Obtiene la fecha/hora actual en zona horaria de México
 */
export const getNowInMexicoTZ = (): dayjs.Dayjs => {
  return dayjs().tz(MEXICO_TIMEZONE);
};

/**
 * Formatea una fecha UTC a hora local de México
 */
export const formatUTCToMexicoTime = (utcDate: string | Date, format: string = "HH:mm"): string => {
  return convertUTCToMexicoTZ(utcDate).format(format);
};

/**
 * Formatea una fecha UTC a fecha local de México
 */
export const formatUTCToMexicoDate = (utcDate: string | Date, format: string = "YYYY-MM-DD"): string => {
  return convertUTCToMexicoTZ(utcDate).format(format);
};

/**
 * Verifica si una fecha es hoy en zona horaria de México
 */
export const isTodayInMexicoTZ = (date: string | Date): boolean => {
  const today = getNowInMexicoTZ().startOf('day');
  const compareDate = convertUTCToMexicoTZ(date).startOf('day');
  return today.isSame(compareDate);
};

/**
 * Crea una fecha específica en zona horaria de México
 */
export const createMexicoTZDate = (date: string, time: string): dayjs.Dayjs => {
  return dayjs.tz(`${date} ${time}`, MEXICO_TIMEZONE);
};

export { dayjs };