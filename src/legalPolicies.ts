import { getCountryConfig, type SupportedCountryCode } from './data/countries';

export const LEGAL_POLICIES_VERSION = '2026-08-11-17';
export const SUPPORT_EMAIL = 'soporte.serviciosvecinales@gmail.com';

// El proyecto es administrado actualmente por una persona natural. Completar identidad y domicilio
// legal antes de un lanzamiento público/comercial de gran escala o cuando la normativa lo exija.
export const DATA_CONTROLLER_NAME = 'Titular individual de Servicios Vecinales';
export const DATA_CONTROLLER_COUNTRY = 'Chile';
export const DATA_CONTROLLER_LEGAL_ID = 'Identificación legal pendiente de completar antes del lanzamiento';
export const DATA_CONTROLLER_POSTAL_ADDRESS = 'Domicilio legal pendiente de completar antes del lanzamiento';

export type LegalSectionId = 'terminos' | 'privacidad' | 'normas';

export interface LegalSection {
  id: LegalSectionId;
  title: string;
  shortTitle: string;
  intro: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
}

interface CountryLegalInfo {
  title: string;
  framework: string[];
  privacyRights: string;
  localNote: string;
}

export const COUNTRY_LEGAL_INFO: Record<SupportedCountryCode, CountryLegalInfo> = {
  CL: {
    title: 'Anexo para Chile',
    framework: ['Ley N.º 19.628 sobre protección de la vida privada', 'Ley N.º 21.719, con vigencia diferida desde el 1 de diciembre de 2026'],
    privacyRights: 'Las solicitudes de privacidad se atenderán considerando los derechos y procedimientos aplicables en Chile y las actualizaciones normativas que entren en vigencia.',
    localNote: 'Para usuarios residentes en Chile, las referencias territoriales de la aplicación se organizan por región y comuna.',
  },
  AR: {
    title: 'Anexo para Argentina',
    framework: ['Ley N.º 25.326 de Protección de los Datos Personales y normativa complementaria aplicable'],
    privacyRights: 'Las personas podrán utilizar el Centro de privacidad para solicitar acceso, rectificación, actualización o supresión, sin perjuicio de otros derechos reconocidos por la normativa argentina.',
    localNote: 'Para usuarios residentes en Argentina, la ubicación se organiza por provincia y municipio o localidad.',
  },
  MX: {
    title: 'Anexo para México',
    framework: ['Ley Federal de Protección de Datos Personales en Posesión de los Particulares y normativa vigente aplicable'],
    privacyRights: 'El Centro de privacidad permite canalizar solicitudes relacionadas con acceso, rectificación, cancelación/supresión y oposición, además de otros derechos aplicables.',
    localNote: 'Para usuarios residentes en México, la ubicación se organiza por estado y municipio o alcaldía.',
  },
  CO: {
    title: 'Anexo para Colombia',
    framework: ['Ley Estatutaria 1581 de 2012 y reglamentación aplicable sobre protección de datos personales'],
    privacyRights: 'El Centro de privacidad permite presentar consultas y solicitudes sobre conocimiento, actualización, rectificación, supresión u oposición al tratamiento cuando corresponda.',
    localNote: 'Para usuarios residentes en Colombia, la ubicación se organiza por departamento y municipio o distrito.',
  },
  PE: {
    title: 'Anexo para Perú',
    framework: ['Ley N.º 29733 de Protección de Datos Personales y su reglamento vigente'],
    privacyRights: 'Las solicitudes se gestionarán considerando los derechos de información, acceso, actualización, rectificación, supresión y oposición previstos por el marco peruano aplicable.',
    localNote: 'Para usuarios residentes en Perú, la ubicación se organiza por departamento y distrito o localidad.',
  },
};

function commonTerms(countryCode: SupportedCountryCode): LegalSection {
  const country = getCountryConfig(countryCode);
  const legal = COUNTRY_LEGAL_INFO[countryCode];
  return {
    id: 'terminos',
    title: `Términos de uso · ${country.name}`,
    shortTitle: 'Términos',
    intro: `Estas condiciones regulan el uso de Servicios Vecinales para una cuenta registrada en ${country.name}.`,
    sections: [
      {
        title: '1. Finalidad de la plataforma',
        paragraphs: [
          'Servicios Vecinales facilita el encuentro entre personas que necesitan un servicio y proveedores que ofrecen oficios o trabajos en su comunidad.',
          'La plataforma permite buscar perfiles, enviar solicitudes, conversar, recibir cotizaciones, registrar el avance del trabajo, dejar reseñas y utilizar herramientas de seguridad y moderación.',
        ],
      },
      {
        title: '2. Cuenta, país y edad mínima',
        paragraphs: [
          'Para crear una cuenta se exige declarar que se tienen 18 años o más. Cada persona debe registrar información propia, proteger su contraseña y mantener actualizados sus datos.',
          `El país, ${country.regionLabel.toLowerCase()} y ${country.localityLabel.toLowerCase()} seleccionados se utilizan para organizar la experiencia, mostrar proveedores cercanos y determinar el anexo informativo aplicable a la cuenta.`,
          'No se permite suplantar a terceros ni utilizar datos deliberadamente falsos para obtener ventajas dentro de la plataforma.',
        ],
      },
      {
        title: '3. Proveedores, clientes y servicios',
        paragraphs: [
          'Los proveedores deben describir sus servicios, experiencia, disponibilidad, ubicación y antecedentes de forma veraz. La verificación de un perfil no garantiza el resultado de cada trabajo.',
          'El cliente debe entregar información suficiente para que el proveedor pueda evaluar la solicitud. Los acuerdos finales sobre alcance, precio, materiales, fechas y forma de pago corresponden a las partes.',
        ],
      },
      {
        title: '4. Cotizaciones, moneda y pagos',
        paragraphs: [
          `La moneda predeterminada para cuentas de ${country.name} es ${country.currencyCode}. La aplicación puede mostrar montos en esa moneda cuando la función correspondiente esté disponible.`,
          'Mientras Servicios Vecinales no incorpore expresamente un sistema propio de pagos, los pagos se coordinan directamente entre cliente y proveedor y la plataforma no actúa como entidad financiera ni medio de pago.',
        ],
      },
      {
        title: '5. Reseñas, reportes y moderación',
        paragraphs: [
          'Las reseñas deben corresponder a experiencias reales y expresarse de forma respetuosa. Los usuarios pueden reportar contenido, perfiles o conductas que consideren engañosas, abusivas o contrarias a las normas.',
          'Administración puede revisar antecedentes, retirar verificaciones, suspender cuentas o eliminarlas de la aplicación. Las personas afectadas pueden utilizar el sistema de revisión o apelación disponible.',
        ],
      },
      {
        title: '6. Uso responsable y seguridad',
        paragraphs: [
          'No está permitido usar la plataforma para acosar, amenazar, engañar, enviar spam, ofrecer actividades ilegales o intentar obtener acceso no autorizado a cuentas o datos.',
          'Cliente y proveedor deben adoptar precauciones razonables antes de reunirse, entregar bienes, compartir información adicional o realizar pagos.',
        ],
      },
      {
        title: legal.title,
        paragraphs: [
          `Marco de referencia informado para esta versión: ${legal.framework.join('; ')}.`,
          legal.localNote,
          'Este anexo es informativo y no sustituye una revisión jurídica profesional cuando la plataforma se lance comercialmente o cambien las normas aplicables.',
        ],
      },
      {
        title: '8. Cambios y contacto',
        paragraphs: [
          'Estas condiciones pueden actualizarse cuando cambien las funciones, el país de operación o la normativa. La aplicación puede solicitar una nueva aceptación cuando cambie la versión aplicable.',
          `Canal de soporte: ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  };
}

function privacyPolicy(countryCode: SupportedCountryCode): LegalSection {
  const country = getCountryConfig(countryCode);
  const legal = COUNTRY_LEGAL_INFO[countryCode];
  return {
    id: 'privacidad',
    title: `Política de privacidad · ${country.name}`,
    shortTitle: 'Privacidad',
    intro: `Esta política describe el tratamiento de datos de una cuenta registrada en ${country.name} y los mecanismos disponibles para ejercer derechos.`,
    sections: [
      {
        title: '1. Responsable y contacto',
        paragraphs: [
          `Responsable actual del tratamiento: ${DATA_CONTROLLER_NAME}, con país base ${DATA_CONTROLLER_COUNTRY}. ${DATA_CONTROLLER_LEGAL_ID}.`,
          `Domicilio: ${DATA_CONTROLLER_POSTAL_ADDRESS}. Canal electrónico para privacidad y soporte: ${SUPPORT_EMAIL}.`,
          'La identificación y domicilio definitivos deben completarse antes del lanzamiento comercial cuando corresponda legalmente.',
        ],
      },
      {
        title: '2. Datos que se tratan',
        paragraphs: [
          `Datos de cuenta y contacto; país, ${country.regionLabel.toLowerCase()} y ${country.localityLabel.toLowerCase()}; rol de cliente o proveedor; información profesional; solicitudes; agenda; mensajes; cotizaciones; favoritos; reseñas; reportes; apelaciones; notificaciones y registros administrativos.`,
          'Los datos provienen principalmente de la información que entrega el usuario y de las acciones que realiza dentro de la plataforma.',
          'Las fotografías de perfil continúan guardándose localmente en el dispositivo mientras no se habilite un almacenamiento compartido.',
        ],
      },
      {
        title: '3. Finalidades',
        paragraphs: [
          'Crear y administrar la cuenta, mostrar proveedores según ubicación, permitir solicitudes y comunicaciones, gestionar cotizaciones y estados de trabajo, mantener seguridad y moderación, resolver reportes y apelaciones y atender solicitudes de privacidad.',
          'La ubicación declarada se utiliza para filtrar resultados y adaptar elementos como moneda, prefijo telefónico y documentación legal. No se exige GPS para crear una cuenta.',
        ],
      },
      {
        title: '4. Bases y consentimiento',
        paragraphs: [
          'Los tratamientos necesarios para prestar las funciones solicitadas se realizan sobre la base jurídica que corresponda en cada jurisdicción. Seguridad, prevención de abuso y cumplimiento de obligaciones pueden apoyarse en bases adicionales permitidas por la normativa aplicable.',
          'Cuando una función opcional necesite consentimiento, éste debe solicitarse de forma específica. Haber leído esta política no equivale por sí solo a consentir tratamientos opcionales.',
        ],
      },
      {
        title: '5. Visibilidad y destinatarios',
        paragraphs: [
          'Los perfiles profesionales pueden ser visibles para quienes buscan servicios. Los datos de contacto directo del proveedor se muestran únicamente a clientes autenticados según las reglas de la aplicación.',
          'Cliente y proveedor acceden a los datos necesarios para coordinar solicitudes en las que participan. Administración accede a la información necesaria para soporte, seguridad, moderación, privacidad y auditoría.',
          'Servicios Vecinales utiliza Firebase Authentication y Cloud Firestore como infraestructura tecnológica. La configuración efectiva y los proveedores tecnológicos deberán mantenerse documentados antes del lanzamiento definitivo.',
        ],
      },
      {
        title: '6. Transferencias y tratamiento internacional',
        paragraphs: [
          'La infraestructura tecnológica puede implicar almacenamiento, procesamiento o acceso desde países distintos del país del usuario.',
          'Antes del lanzamiento comercial se deberán verificar y documentar las ubicaciones y garantías aplicables a transferencias internacionales según cada país habilitado.',
        ],
      },
      {
        title: '7. Conservación',
        paragraphs: [
          'Los datos se conservarán durante el tiempo necesario para mantener una cuenta activa, completar operaciones pendientes, atender derechos, prevenir abusos y cumplir obligaciones aplicables.',
          'Como objetivo operativo inicial, solicitudes, chats y cotizaciones cerradas podrán conservarse hasta 24 meses; reportes, apelaciones, auditoría y solicitudes de privacidad hasta 36 meses, salvo necesidad o exigencia distinta. Estos plazos deben revisarse antes del lanzamiento comercial.',
        ],
      },
      {
        title: `8. Derechos de privacidad en ${country.name}`,
        paragraphs: [
          legal.privacyRights,
          'Servicios Vecinales dispone de un Centro de privacidad dentro del perfil para presentar solicitudes y consultar su estado. También se puede utilizar el correo de soporte.',
          `Marco de referencia informado para esta versión: ${legal.framework.join('; ')}.`,
        ],
      },
      {
        title: '9. Seguridad y decisiones administrativas',
        paragraphs: [
          'La aplicación utiliza autenticación, reglas de Firestore, separación de roles y registros de auditoría. Ninguna plataforma puede garantizar riesgo cero; los incidentes deben evaluarse y documentarse conforme a la normativa aplicable.',
          'Las medidas de moderación relevantes no se deciden exclusivamente mediante un algoritmo: existe intervención administrativa para reportes, verificaciones y apelaciones.',
        ],
      },
      {
        title: '10. Versiones y cambio de país',
        paragraphs: [
          `Versión actual: ${LEGAL_POLICIES_VERSION}. La aceptación queda asociada al país seleccionado en la cuenta.`,
          'Si el usuario cambia posteriormente su país principal, la aplicación puede solicitar que revise y acepte nuevamente la documentación aplicable a la nueva jurisdicción.',
        ],
      },
    ],
  };
}

function communityRules(countryCode: SupportedCountryCode): LegalSection {
  const country = getCountryConfig(countryCode);
  return {
    id: 'normas',
    title: `Normas de convivencia y seguridad · ${country.name}`,
    shortTitle: 'Normas',
    intro: 'Estas reglas buscan mantener una comunidad útil, respetuosa y segura para clientes y proveedores.',
    sections: [
      { title: 'Información verdadera', paragraphs: ['No publiques identidad, experiencia, certificaciones, fotografías, trabajos realizados, ubicación o datos de contacto falsos o deliberadamente engañosos.'] },
      { title: 'Respeto entre usuarios', paragraphs: ['No se permite hostigamiento, discriminación, amenazas, insultos persistentes ni presión indebida mediante chat, reseñas, solicitudes o datos de contacto.'] },
      { title: 'Solicitudes y cotizaciones', paragraphs: [`Describe el trabajo con claridad. Cuando se muestren precios, la moneda de referencia de la cuenta será ${country.currencyCode}, salvo que las partes acuerden expresamente otra cosa.`] },
      { title: 'Reseñas responsables', paragraphs: ['Las reseñas deben estar relacionadas con trabajos reales completados y no deben utilizarse para publicar información privada innecesaria de terceros.'] },
      { title: 'Reportes y moderación', paragraphs: ['Utiliza la función Reportar para informar problemas. Administración puede revisar antecedentes y aplicar medidas proporcionales, manteniendo disponible un mecanismo de revisión.'] },
      { title: 'Datos y seguridad', paragraphs: ['No compartas contraseñas, códigos de verificación, datos financieros completos ni otra información sensible que no sea necesaria para coordinar el servicio.'] },
    ],
  };
}

export function getLegalSections(countryCode?: string | null): LegalSection[] {
  const code = (countryCode && countryCode in COUNTRY_LEGAL_INFO ? countryCode : 'CL') as SupportedCountryCode;
  return [commonTerms(code), privacyPolicy(code), communityRules(code)];
}

// Compatibilidad con componentes o imports anteriores.
export const LEGAL_SECTIONS: LegalSection[] = getLegalSections('CL');
