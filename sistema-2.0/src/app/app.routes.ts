import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { LayoutPrincipal } from './componentes/layout-principal/layout-principal';
import { Noticias } from './componentes/noticias/noticias';
import { Nosotros } from './componentes/nosotros/nosotros';
import { Mision } from './componentes/mision/mision';
import { Contacto } from './componentes/contacto/contacto';
import { EditarAlumno } from './componentes/jefe/alumnos/editar-alumno/editar-alumno';
import { VerAlumno } from './componentes/jefe/alumnos/ver-alumno/ver-alumno';
import { Portafolio } from './componentes/jefe/alumnos/portafolio/portafolio';
import { Seguimiento } from './seguimiento/seguimiento';
import { Practica1 } from './seguimiento/practica1/practica1';
import { SeguimientoPractica } from './seguimiento/seguimiento-practica/seguimiento-practica';
import { AlumnosCandidatos } from './seguimiento/alumnos-candidatos/alumnos-candidatos';
import { ListaAlumnos } from './componentes/jefe/alumnos/lista-alumnos/lista-alumnos';
import { Mapa } from './alumno/mapa/mapa';
import { Alumno } from './alumno/alumno';
import { authGuard } from './guards/auth.guard';
import { rolGuard } from './guards/rol.guard';
import { SinPermiso } from './sin-permiso/sin-permiso';
import { GestionUsuarios } from './admin/gestion-usuarios/gestion-usuarios';
import { SeguimientoAlumno } from './alumno/seguimiento-alumno/seguimiento-alumno';
import { CrearAlumno } from './componentes/jefe/alumnos/crear-alumno/crear-alumno';
import { MiPerfil } from './admin/mi-perfil/mi-perfil';
import { ConfigCorreo } from './admin/config-correo/config-correo';
import { Acreditacion } from './acreditacion/acreditacion';
import { AlumnosAprobados } from './acreditacion/alumnos-aprobados/alumnos-aprobados';
import { AgregarAlumnoEspecial } from './componentes/jefe/alumnos/agregar-alumno-especial/agregar-alumno-especial';
import { DatosAcreditacion } from './acreditacion/datos-acreditacion/datos-acreditacion';
import { ListaEmpresas } from './acreditacion/lista-empresas/lista-empresas';
import { Certificados } from './admin/certificados/certificados';
import { CertificadoAlumno } from './alumno/certificado-alumno/certificado-alumno';
import { SubirCertificado } from './admin/subir-certificado/subir-certificado';
import { VerificarCertificado } from './verificar-certificado/verificar-certificado';
import { RegistroEmpleador } from './empleador/registro-empleador/registro-empleador';
import { VistaEmpleador } from './empleador/vista-empleador/vista-empleador';
import { EvaluacionInforme } from './evaluacion-informe/evaluacion-informe'
import { EvaluacionEmpresa } from './empleador/evaluacion-empresa/evaluacion-empresa';
import { EvaluacionesEmpresa } from './empleador/evaluaciones/evaluaciones';
import { ListaAlumnosEmpresa } from './empleador/lista-alumnos/lista-alumnos';
import { VistaSolicitud } from './solicitud-practica/vista-solicitud/vista-solicitud';
import { Practicas } from './jefe-carrera/practicas/practicas';
import { Solicitudes } from './jefe-carrera/solicitudes/solicitudes';
import { SolicitudesEmpresa } from './jefe-carrera/solicitudes-empresa/solicitudes-empresa';
import { EvaluacionInformes } from './jefe-carrera/evaluacion-informes/evaluacion-informes';
import { ProfesorEvaluador } from './director/profesor-evaluador/profesor-evaluador';
import { Practicantes } from './jefe-carrera/practicantes/practicantes';
import { Evaluar } from './secretaria/evaluar/evaluar';
import { AlumnosEvaluados } from './director/alumnos-evaluados/alumnos-evaluados';
import { ComiteCarrera } from './jefe-carrera/comite-carrera/comite-carrera';
import { InformesAtrasados } from './jefe-carrera/informes-atrasados/informes-atrasados';
import { Subrogante } from './secretaria/subrogante/subrogante';
import { InvitarEmpresa } from './secretaria/invitar-empresa/invitar-empresa';

export const routes: Routes = [
    { path: 'login', component : Login},
    { path: 'sin-permiso', component : SinPermiso},
    //Empleador 
    { path: 'registro-empleador', component: RegistroEmpleador },
    // Esta ruta NO necesita guard de autenticación
    { path: 'verificar', component: VerificarCertificado },
    { path: '',
        component: LayoutPrincipal,
        canActivate: [authGuard],
        children:[      
            //vistas para todos los usuarios
            { path: '', redirectTo: 'noticias', pathMatch: 'full' },
            { path: 'noticias', component : Noticias},
            { path: 'nosotros', component: Nosotros },
            { path: 'mision', component: Mision},
            { path: 'contacto', component: Contacto },
            { path: 'vista-solicitud/:id', component: VistaSolicitud },
            //Vistas para la secretaria y el administrador
            { path: 'lista-alumnos', component: ListaAlumnos,
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] },
            },
            { path: 'lista-alumnos/crear-alumno', component: CrearAlumno,
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] },
            },
            { path: 'lista-alumnos/ver-alumno/:id', component: VerAlumno,
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] },
            },
            { path: 'lista-alumnos/editar-alumno/:id', component: EditarAlumno,
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] },
            },
            { path: 'lista-alumnos/portafolio', component: Portafolio,
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] },
            },
            
            { path: 'seguimiento', component : Seguimiento, 
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] },
                children: [
                { path: '', redirectTo: 'candidatos', pathMatch: 'full' },
                { path: 'practica/:num', component: Practica1 },
                { path: 'avance/:id/:practica_num', component : SeguimientoPractica},
                { path: 'candidatos', component : AlumnosCandidatos},
                { path: 'agregar-especial', component : AgregarAlumnoEspecial},
            ]},
            { path: 'acreditacion', component : Acreditacion,
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] },
                children: [
                    {path: '', redirectTo: 'datos', pathMatch: 'full' },
                    { path: 'alumnos', component : AlumnosAprobados},
                    { path: 'datos', component : DatosAcreditacion},
                    { path: 'empresas', component: ListaEmpresas},
                ]
            },
            { path: 'evaluar', component: Evaluar,
                canActivate: [rolGuard], data: { roles: ['secretaria', 'admin'] },
            },
            { path: 'secretaria/subrogante', component: Subrogante,
                canActivate: [rolGuard], data: { roles: ['secretaria', 'secretaria_dici', 'admin'] },
            },
            { path: 'secretaria/invitar-empresa', component: InvitarEmpresa,
                canActivate: [rolGuard], data: { roles: ['secretaria', 'admin'] },
            },
            { path: 'practicas', component : Practicas,
                canActivate: [rolGuard], data: { roles: ['jefe_carrera', 'secretaria'] },
                children: [
                    { path: '', redirectTo: 'practicantes', pathMatch: 'full' },
                    { path: 'solicitudes', component : Solicitudes,
                        canActivate: [rolGuard], data: { roles: ['jefe_carrera'] },
                    },
                  //  { path: 'solicitudes-empresa', component : SolicitudesEmpresa},
                    { path: 'practicantes', component : Practicantes},
                    { path: 'evaluacion-informes', component : EvaluacionInformes},
                    { path: 'evaluacion-empresas', component : Solicitudes},
                    { path: 'informes-atrasados', component : InformesAtrasados},
            ]},
            { path: 'solicitudes-empresa', component : SolicitudesEmpresa,
                canActivate: [rolGuard], data: { roles: ['jefe_carrera'] },
            },
            { path: 'comite', component : ComiteCarrera,
                canActivate: [rolGuard], data: { roles: ['jefe_carrera', 'secretaria'] },
            },
            { path: 'certificados', component: Certificados,
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] }
            },
            //Vista solo para alumnos y admin
            { path: 'alumno', component : Alumno,
                canActivate: [rolGuard], data: { roles: ['admin', 'alumno'] },
                children: [
                { path: 'mapa', component: Mapa},
                { path: 'perfil', component: VerAlumno },
                { path: 'editar-perfil', component: EditarAlumno },
                { path: '', redirectTo: 'mapa', pathMatch: 'full' },
            ]},
            { path: 'miseguimiento', component: SeguimientoAlumno},
            { path: 'miscertificados', component: CertificadoAlumno},

            // Solo admin
            { path: 'usuarios', component: GestionUsuarios,
                canActivate: [rolGuard], data: { roles: ['admin'] }
            },
            { path: 'mi-perfil', component: MiPerfil,
                canActivate: [authGuard]
            },
            { path: 'config-correo', component: ConfigCorreo,
                canActivate: [rolGuard], data: { roles: ['admin'] },
            },
            { path: 'subir-certificado', component: SubirCertificado,
                canActivate: [authGuard]
                },
            { path: 'empleador', component: VistaEmpleador,
                canActivate: [rolGuard], data: { roles: ['admin', 'empleador'] }
            },
            { path: 'evaluaciones', component: EvaluacionesEmpresa,
                canActivate: [rolGuard], data: { roles: ['admin', 'empleador'] }
            },
            { path: 'lista-alumnos', component: ListaAlumnosEmpresa,
                canActivate: [rolGuard], data: { roles: ['admin', 'empleador'] }
            },
            { path: 'evaluar-informe/:seguimientoId', component: EvaluacionInforme,
                canActivate: [rolGuard], data: { roles: ['profesor', 'admin', 'secretaria'] }
            },
            { path: 'evaluar-empresa', component: EvaluacionEmpresa,
                canActivate: [rolGuard], data: { roles: ['empleador', 'admin'] }
            },
            { path: 'profesor-evaluador', component: ProfesorEvaluador,
                canActivate: [rolGuard], data: { roles: ['director_departamento', 'admin', 'secretaria_dici'] }
            },
            { path: 'alumnos-evaluados', component: AlumnosEvaluados,
                canActivate: [rolGuard], data: { roles: ['profesor', 'director_departamento', 'admin'] }
            },
        ]
    },

]

