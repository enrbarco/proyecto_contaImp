// Textos e íconos de la portada. Para cambiar un servicio, edita estas listas.

export const VALUES = [
  { icon: 'shield', title: 'Tu socio en contabilidad', text: 'Transformamos la gestión contable en una estrategia poderosa. Hablamos tu idioma y entendemos las necesidades de tu negocio para ofrecerte soluciones integrales.' },
  { icon: 'people', title: 'Impulsamos tu éxito', text: 'Apoyamos a microempresas, pymes y empresas familiares para maximizar su rentabilidad y crecer de manera sostenible con asesoramiento personalizado.' },
  { icon: 'trophy', title: 'Confianza en cada paso', text: 'Cuentas con un apoyo cercano y confidencial, que convierte tus números en herramientas útiles para tomar decisiones estratégicas.' },
];

export const SERVICES = [
  { icon: 'screen', title: 'Contabilidad y gestión financiera', text: 'Contabilidad general, control de costos, presupuestos y tesorería para que tu empresa tenga la visibilidad y el control que necesita.' },
  { icon: 'bulb', title: 'Control y auditoría', text: 'Auditorías internas y evaluaciones que alinean tus procesos con los estándares más altos y fortalecen la transparencia.' },
  { icon: 'chart-up', title: 'Área tributaria e impuestos', text: 'Planificación tributaria y cumplimiento de obligaciones fiscales para optimizar tu carga tributaria conforme a la ley.' },
  { icon: 'pen', title: 'Capacitaciones empresariales', text: 'Capacitaciones adaptadas a tu equipo sobre gestión financiera y buenas prácticas contables.' },
  { icon: 'chat', title: 'Consultoría para empresas familiares', text: 'Organización administrativa, separación de finanzas y planificación de sucesión para una gestión profesional y sostenible.' },
  { icon: 'chart', title: 'Análisis financiero', text: 'Análisis y reportes gerenciales que te ayudan a entender tu situación y decidir con información.' },
];

const PATHS = {
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2A5.5 5.5 0 0 1 21.5 20" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 20h8" /></>,
  screen: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4M10 8l-2 2 2 2M14 8l2 2-2 2" /></>,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
  'chart-up': <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /><path d="M15 6l3-3 3 3" /></>,
  pen: <><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" /><path d="M14 7l3 3" /></>,
  chat: <><path d="M4 5h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /><path d="M19 9h1a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1v3l-4-3h-4" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>,
  pin: <><path d="M12 21s7-6.1 7-11.5a7 7 0 0 0-14 0C5 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  phone: <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" className="dot" /></>,
};

export function Icon({ name }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}
