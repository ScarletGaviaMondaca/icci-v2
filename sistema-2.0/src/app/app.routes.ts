import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { LayoutPrincipal } from './componentes/layout-principal/layout-principal';
import { Noticias } from './componentes/noticias/noticias';
import { Carrera } from './componentes/jefe/carrera/carrera';
import { Organigrama } from './organizacion/organigrama/organigrama';
import { Nosotros } from './componentes/nosotros/nosotros';
import { Mision } from './componentes/mision/mision';
import { Contacto } from './componentes/contacto/contacto';
import { Jefe } from './componentes/jefe/jefe';
import { EditarAlumno } from './componentes/jefe/alumnos/editar-alumno/editar-alumno';
import { VerAlumno } from './componentes/jefe/alumnos/ver-alumno/ver-alumno';
import { Alumnos } from './componentes/jefe/alumnos/alumnos';
import { Plan } from './plan/plan';
import { Portafolio } from './componentes/jefe/alumnos/portafolio/portafolio';
import { VistaPlan } from './plan/vista-plan/vista-plan';
import { Reglamentos } from './componentes/jefe/carrera/reglamentos/reglamentos';
import { Indicadores } from './componentes/jefe/carrera/indicadores/indicadores';
import { EditarPlan } from './plan/editar-plan/editar-plan';
import { Malla } from './plan/malla/malla';
import { Seguimiento } from './seguimiento/seguimiento';
import { Practica1 } from './seguimiento/practica1/practica1';
import { AlumnosAsociados } from './componentes/jefe/alumnos/alumnos-asociados/alumnos-asociados';
import { SeguimientoPractica } from './seguimiento/seguimiento-practica/seguimiento-practica';
import { AlumnosCandidatos } from './seguimiento/alumnos-candidatos/alumnos-candidatos';
import { ListaAlumnos } from './componentes/jefe/alumnos/lista-alumnos/lista-alumnos';
import { Mapa } from './alumno/mapa/mapa';
import { Alumno } from './alumno/alumno';
import { Exalumnos } from './exalumnos/exalumnos';
import { ExalumnosList } from './exalumnos/exalumnos-list/exalumnos-list';
import { authGuard } from './guards/auth.guard';
import { rolGuard } from './guards/rol.guard';
import { SinPermiso } from './sin-permiso/sin-permiso';
import { GestionUsuarios } from './admin/gestion-usuarios/gestion-usuarios';
import { SeguimientoAlumno } from './alumno/seguimiento-alumno/seguimiento-alumno';
import { ExalumnosPerfil } from './exalumnos/exalumnos-perfil/exalumnos-perfil';
import { ExalumnosEditar } from './exalumnos/exalumnos-editar/exalumnos-editar';
import { CrearPlan } from './plan/crear-plan/crear-plan';
import { CrearAlumno } from './componentes/jefe/alumnos/crear-alumno/crear-alumno';
import { MiPerfil } from './admin/mi-perfil/mi-perfil';
import { Acreditacion } from './acreditacion/acreditacion';
import { AlumnosAprobados } from './acreditacion/alumnos-aprobados/alumnos-aprobados';
import { Profesores } from './admin/profesores/profesores';
import { AgregarAlumnoEspecial } from './componentes/jefe/alumnos/agregar-alumno-especial/agregar-alumno-especial';
import { DatosAcreditacion } from './acreditacion/datos-acreditacion/datos-acreditacion';
import { InformacionCarrera } from './componentes/jefe/carrera/informacion-carrera/informacion-carrera';
import { ListaEmpresas } from './acreditacion/lista-empresas/lista-empresas';
import { Academicos } from './organizacion/academicos/academicos';
import { Certificados } from './admin/certificados/certificados';
import { CertificadoAlumno } from './alumno/certificado-alumno/certificado-alumno';
import { SubirCertificado } from './admin/subir-certificado/subir-certificado';
import { VerificarCertificado } from './verificar-certificado/verificar-certificado';
import { Organizacion } from './organizacion/organizacion';
import { RegistroEmpleador } from './empleador/registro-empleador/registro-empleador';
import { VistaEmpleador } from './empleador/vista-empleador/vista-empleador';
import { EvaluacionInforme } from './evaluacion-informe/evaluacion-informe'
import { EvaluacionEmpresa } from './evaluacion-empresa/evaluacion-empresa';

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
            { path: 'organizacion', component: Organizacion, 
                children: [
                    { path: '', redirectTo: 'organigrama', pathMatch: 'full' },
                    { path: 'organigrama', component : Organigrama},
                    { path: 'academicos', component: Academicos},
                ]
            },
            //Vistas para la secretaria y el administrador
            { path: 'jefe', component : Jefe,
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria', 'jefe_carrera', 'alumno'] },
                children: [
                { path: 'listado-alumnos', component : Alumnos,
                    children: [
                        { path: '', redirectTo: 'alumnos', pathMatch: 'full' },
                        { path: 'alumnos', component : ListaAlumnos},
                        { path: 'crear-alumno', component : CrearAlumno},
                        { path: 'ver-alumno/:id', component : VerAlumno},
                        { path: 'editar-alumno/:id', component : EditarAlumno}, 
                        { path: 'crear-plan', component : CrearPlan, data: { contexto: 'listado-alumnos' } },
                        { path: 'malla/:id', component : Malla, data: { contexto: 'listado-alumnos' } },
                        { path: 'alumnos-asociados/:planId', component : AlumnosAsociados, data: { contexto: 'listado-alumnos' } },
                        { path: 'editar-plan/:id', component : EditarPlan, data: { contexto: 'listado-alumnos' } },
                        { path: 'portafolio', component : Portafolio},
                        { path: ':id', component : VistaPlan, data: { contexto: 'listado-alumnos' } },
                    ]
                },
                { path: 'carrera', component : Carrera,
                    children: [
                        { path: '', redirectTo: 'informacion', pathMatch: 'full' },
                        { path: 'informacion', component: InformacionCarrera,},
                        { path: 'reglamentos', component : Reglamentos},
                        { path: 'indicadores', component : Indicadores}, 
                        { path: 'crear-plan', component : CrearPlan, data: { contexto: 'carrera' } },
                        { path: 'malla/:id', component : Malla, data: { contexto: 'carrera' } },
                        { path: 'editar-plan/:id', component : EditarPlan,
                            canActivate: [rolGuard], data: { roles: ['admin'], contexto: 'carrera' } },
                        { path: 'alumnos-asociados/:planId', component : AlumnosAsociados, data: { contexto: 'carrera' } },
                     //   { path: '', redirectTo: '2', pathMatch: 'full' },
                        { path: ':id', component : VistaPlan, data: { contexto: 'carrera' } },

                    ]
                },    
                { path: 'ver-plan/:id', component : VistaPlan},
                { path: 'crear-plan', component : CrearPlan},
                { path: '', redirectTo: 'listado-alumnos', pathMatch: 'full' }
                ]
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
            { path: 'exalumnos', component : Exalumnos, 
                canActivate: [rolGuard], data: { roles: ['admin', 'secretaria'] },
                children: [
                { path: '', redirectTo: 'listado', pathMatch: 'full' },
                { path: 'perfil/:id', component : ExalumnosPerfil },
                { path: 'editar/:id', component : ExalumnosEditar},
                { path: 'listado', component: ExalumnosList },
            ]},
            { path: 'certificados', component: Certificados},
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
            { path: 'profesores', component: Profesores,
                canActivate: [rolGuard], data: { roles: ['admin'] }
            },
            { path: 'admin-plan', component: Plan,
                canActivate: [rolGuard], data: { roles: ['admin'] },
            },
            { path: 'mi-perfil', component: MiPerfil,
                canActivate: [authGuard]
            },
            { path: 'subir-certificado', component: SubirCertificado,
                canActivate: [authGuard]
             },
            { path: 'empleador', component: VistaEmpleador,
                canActivate: [rolGuard], data: { roles: ['admin', 'empleador'] }
            },
            { path: 'evaluar-informe/:seguimientoId', component: EvaluacionInforme,
                canActivate: [rolGuard], data: { roles: ['profesor', 'admin', 'secretaria'] }
            },
            { path: 'evaluar-empresa', component: EvaluacionEmpresa,
                canActivate: [rolGuard], data: { roles: ['empleador', 'admin'] }
            },

        ]
    },

            
];
