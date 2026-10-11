import type { Proveedor, Resena, SolicitudServicio, Usuario } from '../types';

export const JANE_DOE_UID = 'client_jane';
export const CARLOS_GOMEZ_UID = 'prov_carlos';
export const SOFIA_ROJAS_UID = 'prov_sofia';
export const JUAN_MARTINEZ_UID = 'prov_juan';
export const ADMIN_UID = 'admin_vecinal';

export const INITIAL_USUARIOS: Usuario[] = [
  {
    id: JANE_DOE_UID,
    nombre: 'Jane Doe',
    email: 'jane.doe@example.com',
    telefono: '+56912345678',
    tipo_usuario: 'cliente',
  },
  {
    id: CARLOS_GOMEZ_UID,
    nombre: 'Carlos Gómez',
    email: 'carlos.gomez@example.com',
    telefono: '+56923456789',
    tipo_usuario: 'proveedor',
  },
  {
    id: SOFIA_ROJAS_UID,
    nombre: 'Sofía Rojas',
    email: 'sofia.rojas@example.com',
    telefono: '+56934567890',
    tipo_usuario: 'proveedor',
  },
  {
    id: JUAN_MARTINEZ_UID,
    nombre: 'Juan Martínez',
    email: 'juan.martinez@example.com',
    telefono: '+56945671234',
    tipo_usuario: 'proveedor',
  },
  {
    id: ADMIN_UID,
    nombre: 'Administrador Vecinal',
    email: 'admin@example.com',
    telefono: '+56900000000',
    tipo_usuario: 'admin',
  },
];

export const INITIAL_PROVEEDORES: Proveedor[] = [
  {
    id: CARLOS_GOMEZ_UID,
    usuario_id: CARLOS_GOMEZ_UID,
    nombre_publico: 'Carlos Gómez',
    categoria_id: 'electricidad',
    oficio: 'Electricista Certificado',
    experiencia: 12,
    descripcion:
      'Instalaciones eléctricas residenciales y comerciales. Certificación SEC Clase B. Atención de urgencias, cortocircuitos, cableados e instalación de luminarias LED.',
    ubicacion: 'Las Condes, Santiago',
    foto_perfil:
      'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&h=150&fit=crop&crop=faces',
    whatsapp: '+56923456789',
    calificacion_promedio: 4.5,
    cantidad_resenas: 2,
    verificado: true,
    fotos_trabajos: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&fit=crop',
      'https://images.unsplash.com/photo-1558224494-ef3b21c51236?w=400&fit=crop',
    ],
  },
  {
    id: SOFIA_ROJAS_UID,
    usuario_id: SOFIA_ROJAS_UID,
    nombre_publico: 'Sofía Rojas',
    categoria_id: 'pintura',
    oficio: 'Pintora de Interiores',
    experiencia: 8,
    descripcion:
      'Renovación de muros, acabados satinados, rústicos y colocación de papel mural. Protección cuidadosa de muebles y presupuestos sin compromiso.',
    ubicacion: 'Vitacura, Santiago',
    foto_perfil:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces',
    whatsapp: '+56934567890',
    calificacion_promedio: 5,
    cantidad_resenas: 1,
    verificado: false,
    fotos_trabajos: [
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&fit=crop',
    ],
  },
  {
    id: JUAN_MARTINEZ_UID,
    usuario_id: JUAN_MARTINEZ_UID,
    nombre_publico: 'Juan Martínez',
    categoria_id: 'cerrajeria',
    oficio: 'Cerrajero de Emergencia',
    experiencia: 15,
    descripcion:
      'Aperturas urgentes de puertas domiciliarias y vehículos. Instalación de cerraduras de alta seguridad y cerrojos auxiliares.',
    ubicacion: 'Providencia, Santiago',
    foto_perfil:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
    whatsapp: '+56945671234',
    calificacion_promedio: 4.5,
    cantidad_resenas: 2,
    verificado: true,
    fotos_trabajos: [
      'https://images.unsplash.com/photo-1509869175650-a1d979e25595?w=400&fit=crop',
    ],
  },
];

export const INITIAL_SOLICITUDES: SolicitudServicio[] = [
  {
    id: 'sol_carlos_jane',
    cliente_id: JANE_DOE_UID,
    cliente_nombre: 'Jane Doe',
    proveedor_id: CARLOS_GOMEZ_UID,
    proveedor_oficio: 'Electricista Certificado',
    descripcion: 'Revisión de un cortocircuito en la cocina.',
    ubicacion: 'Ñuñoa, Santiago',
    telefono_contacto: '+56912345678',
    estado: 'completada',
    createdAt: '2026-05-14T12:00:00Z',
    updatedAt: '2026-05-15T12:00:00Z',
  },
  {
    id: 'sol_carlos_rodrigo',
    cliente_id: 'client_anon_2',
    cliente_nombre: 'Rodrigo Fuentes',
    proveedor_id: CARLOS_GOMEZ_UID,
    proveedor_oficio: 'Electricista Certificado',
    descripcion: 'Instalación de tablero eléctrico.',
    ubicacion: 'La Reina, Santiago',
    telefono_contacto: '+56911111111',
    estado: 'completada',
    createdAt: '2026-05-22T18:30:00Z',
    updatedAt: '2026-05-24T18:30:00Z',
  },
  {
    id: 'sol_sofia_paulina',
    cliente_id: 'client_anon_3',
    cliente_nombre: 'Paulina Osorio',
    proveedor_id: SOFIA_ROJAS_UID,
    proveedor_oficio: 'Pintora de Interiores',
    descripcion: 'Pintura completa del living.',
    ubicacion: 'Vitacura, Santiago',
    telefono_contacto: '+56922222222',
    estado: 'completada',
    createdAt: '2026-05-18T09:45:00Z',
    updatedAt: '2026-05-20T09:45:00Z',
  },
  {
    id: 'sol_juan_pedro',
    cliente_id: 'client_anon_4',
    cliente_nombre: 'Pedro Alarcón',
    proveedor_id: JUAN_MARTINEZ_UID,
    proveedor_oficio: 'Cerrajero de Emergencia',
    descripcion: 'Apertura de puerta blindada.',
    ubicacion: 'Providencia, Santiago',
    telefono_contacto: '+56933333333',
    estado: 'completada',
    createdAt: '2026-05-29T22:10:00Z',
    updatedAt: '2026-05-29T23:10:00Z',
  },
  {
    id: 'sol_juan_camila',
    cliente_id: 'client_anon_5',
    cliente_nombre: 'Camila Muñoz',
    proveedor_id: JUAN_MARTINEZ_UID,
    proveedor_oficio: 'Cerrajero de Emergencia',
    descripcion: 'Instalación de cierres de seguridad.',
    ubicacion: 'Macul, Santiago',
    telefono_contacto: '+56944444444',
    estado: 'completada',
    createdAt: '2026-06-01T12:20:00Z',
    updatedAt: '2026-06-01T14:20:00Z',
  },
];

export const INITIAL_RESENAS: Record<string, Resena[]> = {
  [CARLOS_GOMEZ_UID]: [
    {
      id: 'sol_carlos_jane',
      solicitud_id: 'sol_carlos_jane',
      cliente_id: JANE_DOE_UID,
      cliente_nombre: 'Jane Doe',
      proveedor_id: CARLOS_GOMEZ_UID,
      calificacion: 5,
      comentario: 'Excelente trabajo. Detectó el cortocircuito y explicó claramente la solución.',
      fecha: '2026-05-15T12:00:00Z',
    },
    {
      id: 'sol_carlos_rodrigo',
      solicitud_id: 'sol_carlos_rodrigo',
      cliente_id: 'client_anon_2',
      cliente_nombre: 'Rodrigo Fuentes',
      proveedor_id: CARLOS_GOMEZ_UID,
      calificacion: 4,
      comentario: 'Llegó a la hora acordada y dejó todo limpio.',
      fecha: '2026-05-24T18:30:00Z',
    },
  ],
  [SOFIA_ROJAS_UID]: [
    {
      id: 'sol_sofia_paulina',
      solicitud_id: 'sol_sofia_paulina',
      cliente_id: 'client_anon_3',
      cliente_nombre: 'Paulina Osorio',
      proveedor_id: SOFIA_ROJAS_UID,
      calificacion: 5,
      comentario: 'Pintó el living con mucho cuidado y excelente terminación.',
      fecha: '2026-05-20T09:45:00Z',
    },
  ],
  [JUAN_MARTINEZ_UID]: [
    {
      id: 'sol_juan_pedro',
      solicitud_id: 'sol_juan_pedro',
      cliente_id: 'client_anon_4',
      cliente_nombre: 'Pedro Alarcón',
      proveedor_id: JUAN_MARTINEZ_UID,
      calificacion: 4,
      comentario: 'Abrió la puerta rápidamente y sin dañarla.',
      fecha: '2026-05-29T23:10:00Z',
    },
    {
      id: 'sol_juan_camila',
      solicitud_id: 'sol_juan_camila',
      cliente_id: 'client_anon_5',
      cliente_nombre: 'Camila Muñoz',
      proveedor_id: JUAN_MARTINEZ_UID,
      calificacion: 5,
      comentario: 'Excelente servicio e instalación muy rápida.',
      fecha: '2026-06-01T14:20:00Z',
    },
  ],
};
