import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

export const debugTimezone = (dateString: string, label: string = '') => {
  const date = new Date(dateString);
  
  console.group(`🕐 Timezone Debug: ${label}`);
  console.log('Original string:', dateString);
  console.log('Date object:', date);
  console.log('UTC string:', date.toUTCString());
  console.log('Local string:', date.toString());
  console.log('ISO string:', date.toISOString());
  
  // Formateo directo con date-fns (local time)
  console.log('date-fns direct:', format(date, 'dd/MM/yyyy HH:mm', { locale: es }));
  
  // Formateo con timezone México
  console.log('Mexico TZ (GMT-6):', formatInTimeZone(date, 'America/Mexico_City', 'dd/MM/yyyy HH:mm', { locale: es }));
  
  // Formateo con UTC
  console.log('UTC TZ:', formatInTimeZone(date, 'UTC', 'dd/MM/yyyy HH:mm', { locale: es }));
  
  // Timezone offset del browser
  console.log('Browser timezone offset (minutes):', date.getTimezoneOffset());
  console.log('Browser timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  console.groupEnd();
  
  return {
    original: dateString,
    utc: date.toUTCString(),
    local: date.toString(),
    iso: date.toISOString(),
    directFormat: format(date, 'dd/MM/yyyy HH:mm', { locale: es }),
    mexicoTZ: formatInTimeZone(date, 'America/Mexico_City', 'dd/MM/yyyy HH:mm', { locale: es }),
    utcTZ: formatInTimeZone(date, 'UTC', 'dd/MM/yyyy HH:mm', { locale: es }),
    browserOffset: date.getTimezoneOffset(),
    browserTZ: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
};