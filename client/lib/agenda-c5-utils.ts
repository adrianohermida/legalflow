/**
 * Agenda C5 Utilities - Flow C5
 * Helper functions for timezone handling and event management
 */

import { supabase, lf } from "./supabase";

export interface EventoAgendaC5 {
  id: string;
  title: string;
  description?: string;
  event_type:
    | "reuniao"
    | "audiencia"
    | "prazo"
    | "entrega"
    | "compromisso"
    | "videoconferencia"
    | "outros";
  priority: "baixa" | "normal" | "alta" | "urgente";
  status:
    | "agendado"
    | "confirmado"
    | "em_andamento"
    | "realizado"
    | "cancelado"
    | "reagendado";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  video_link: string | null;
  numero_cnj: string | null;
  cliente_cpfcnpj: string | null;
  stage_instance_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventoFormData {
  title: string;
  description?: string;
  event_type: string;
  priority: string;
  starts_at: string;
  ends_at?: string;
  location?: string;
  video_link?: string;
  numero_cnj?: string;
  cliente_cpfcnpj?: string;
}

/**
 * São Paulo timezone constant
 */
export const SP_TIMEZONE = "America/Sao_Paulo";

/**
 * Convert Date to São Paulo timezone ISO string
 */
export const formatToSaoPauloTime = (date: Date): string => {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: SP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(" ", "T");
};

/**
 * Format date for Brazilian display
 */
export const formatDisplayDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

/**
 * Format time for Brazilian display
 */
export const formatDisplayTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Format full date and time for display
 */
export const formatDisplayDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Get current São Paulo time
 */
export const getSaoPauloNow = (): Date => {
  return new Date();
};

/**
 * Check if date is today in São Paulo timezone
 */
export const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = getSaoPauloNow();

  const dateStr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: SP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const todayStr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: SP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);

  return dateStr === todayStr;
};

/**
 * Check if date is in the past
 */
export const isPast = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = getSaoPauloNow();
  return date < now;
};

/**
 * Get week start and end dates
 */
export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  const end = new Date(date);

  // Sunday to Saturday
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);
  end.setDate(start.getDate() + 6);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Get month start and end dates
 */
export const getMonthRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Get event type color classes
 */
export const getEventTypeColor = (type: string): string => {
  switch (type) {
    case "audiencia":
      return "bg-red-100 text-red-800 border-red-200";
    case "reuniao":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "prazo":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "entrega":
      return "bg-green-100 text-green-800 border-green-200";
    case "videoconferencia":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "compromisso":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "urgente":
      return "bg-red-500";
    case "alta":
      return "bg-orange-500";
    case "normal":
      return "bg-blue-500";
    case "baixa":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
};

/**
 * Get status color
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case "agendado":
      return "bg-blue-100 text-blue-800";
    case "confirmado":
      return "bg-green-100 text-green-800";
    case "em_andamento":
      return "bg-yellow-100 text-yellow-800";
    case "realizado":
      return "bg-green-100 text-green-800";
    case "cancelado":
      return "bg-red-100 text-red-800";
    case "reagendado":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/**
 * Validate CNJ format
 */
export const validateCNJ = (cnj: string): boolean => {
  if (!cnj) return true; // Optional field
  const cleanCnj = cnj.replace(/\D/g, "");
  return cleanCnj.length === 20;
};

/**
 * Validate CPF/CNPJ format
 */
export const validateCpfCnpj = (doc: string): boolean => {
  if (!doc) return true; // Optional field
  const clean = doc.replace(/\D/g, "");
  return clean.length === 11 || clean.length === 14;
};

/**
 * Validate video link format
 */
export const validateVideoLink = (link: string): boolean => {
  if (!link) return true; // Optional field
  try {
    new URL(link);
    return true;
  } catch {
    return false;
  }
};

/**
 * Detect video platform from link
 */
export const detectVideoPlatform = (link: string): string => {
  if (!link) return "link";

  const url = link.toLowerCase();
  if (url.includes("meet.google.com")) return "Google Meet";
  if (url.includes("zoom.us")) return "Zoom";
  if (url.includes("teams.microsoft.com")) return "Microsoft Teams";
  if (url.includes("whereby.com")) return "Whereby";
  return "Videoconferência";
};

/**
 * Generate calendar grid for month view
 */
export const generateCalendarGrid = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);

  // Start from Sunday of the week containing the first day
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    // 6 weeks * 7 days
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }

  return days;
};

/**
 * Get events for a specific day
 */
export const getEventsForDay = (
  events: EventoAgendaC5[],
  day: Date,
): EventoAgendaC5[] => {
  return events.filter((evento) => {
    const eventoDate = new Date(evento.starts_at);
    return eventoDate.toDateString() === day.toDateString();
  });
};

/**
 * Sort events by start time
 */
export const sortEventsByTime = (
  events: EventoAgendaC5[],
): EventoAgendaC5[] => {
  return events.sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
};

/**
 * Check for event conflicts
 */
export const checkEventConflicts = (
  newEvent: { starts_at: string; ends_at?: string },
  existingEvents: EventoAgendaC5[],
): EventoAgendaC5[] => {
  const newStart = new Date(newEvent.starts_at);
  const newEnd = newEvent.ends_at
    ? new Date(newEvent.ends_at)
    : new Date(newStart.getTime() + 60 * 60 * 1000); // 1 hour default

  return existingEvents.filter((evento) => {
    const eventoStart = new Date(evento.starts_at);
    const eventoEnd = evento.ends_at
      ? new Date(evento.ends_at)
      : new Date(eventoStart.getTime() + 60 * 60 * 1000);

    // Check for overlap
    return newStart < eventoEnd && newEnd > eventoStart;
  });
};

/**
 * Calculate event duration in minutes
 */
export const getEventDuration = (
  starts_at: string,
  ends_at?: string,
): number => {
  const start = new Date(starts_at);
  const end = ends_at
    ? new Date(ends_at)
    : new Date(start.getTime() + 60 * 60 * 1000);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

/**
 * Format event duration for display
 */
export const formatEventDuration = (
  starts_at: string,
  ends_at?: string,
): string => {
  const duration = getEventDuration(starts_at, ends_at);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
};

/**
 * Get upcoming events (next 7 days)
 */
export const getUpcomingEvents = async (
  limit: number = 10,
): Promise<EventoAgendaC5[]> => {
  const now = getSaoPauloNow();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await lf
    .from("eventos_agenda")
    .select("*")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", oneWeekFromNow.toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data as EventoAgendaC5[];
};

/**
 * Create quick event with smart defaults
 */
export const createQuickEvent = async (
  title: string,
  starts_at: string,
  options: Partial<EventoFormData> = {},
): Promise<EventoAgendaC5> => {
  const eventData = {
    title,
    starts_at,
    event_type: options.event_type || "compromisso",
    priority: options.priority || "normal",
    status: "agendado",
    description: options.description || null,
    ends_at: options.ends_at || null,
    location: options.location || null,
    video_link: options.video_link || null,
    numero_cnj: options.numero_cnj || null,
    cliente_cpfcnpj: options.cliente_cpfcnpj || null,
  };

  const { data, error } = await lf
    .from("eventos_agenda")
    .insert([eventData])
    .select()
    .single();

  if (error) throw error;
  return data as EventoAgendaC5;
};

/**
 * Update event status
 */
export const updateEventStatus = async (
  eventId: string,
  status:
    | "agendado"
    | "confirmado"
    | "em_andamento"
    | "realizado"
    | "cancelado"
    | "reagendado",
): Promise<EventoAgendaC5> => {
  const { data, error } = await lf
    .from("eventos_agenda")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select()
    .single();

  if (error) throw error;
  return data as EventoAgendaC5;
};

/**
 * Get events by CNJ
 */
export const getEventsByCNJ = async (
  numero_cnj: string,
): Promise<EventoAgendaC5[]> => {
  const { data, error } = await lf
    .from("eventos_agenda")
    .select("*")
    .eq("numero_cnj", numero_cnj)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data as EventoAgendaC5[];
};

/**
 * Get events by client
 */
export const getEventsByClient = async (
  cliente_cpfcnpj: string,
): Promise<EventoAgendaC5[]> => {
  const { data, error } = await lf
    .from("eventos_agenda")
    .select("*")
    .eq("cliente_cpfcnpj", cliente_cpfcnpj)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data as EventoAgendaC5[];
};

/**
 * Export events to calendar format (ICS)
 */
export const generateICSEvent = (evento: EventoAgendaC5): string => {
  const formatICSDate = (date: string): string => {
    return (
      new Date(date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    );
  };

  const escapeText = (text: string): string => {
    return text.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
  };

  let ics = "BEGIN:VEVENT\n";
  ics += `UID:${evento.id}@advogaai.com\n`;
  ics += `DTSTART:${formatICSDate(evento.starts_at)}\n`;
  if (evento.ends_at) {
    ics += `DTEND:${formatICSDate(evento.ends_at)}\n`;
  }
  ics += `SUMMARY:${escapeText(evento.title)}\n`;
  if (evento.description) {
    ics += `DESCRIPTION:${escapeText(evento.description)}\n`;
  }
  if (evento.location) {
    ics += `LOCATION:${escapeText(evento.location)}\n`;
  }
  ics += `STATUS:${evento.status.toUpperCase()}\n`;
  ics += `PRIORITY:${evento.priority === "urgente" ? "1" : evento.priority === "alta" ? "3" : "5"}\n`;
  ics += "END:VEVENT\n";

  return ics;
};
