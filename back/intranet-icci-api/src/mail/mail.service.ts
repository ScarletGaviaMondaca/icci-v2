import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { encrypt, decrypt } from './crypto.util';

export interface DestinatarioHito {
  correo: string;
  rol: string;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private correoTransporterActual: string | null = null;

  constructor(private prisma: PrismaService) {}

  // ── Configuración (admin) ──────────────────────────────────────────

  async getConfig() {
    const config = await this.prisma.configuracion_correo.findUnique({ where: { id: 1 } });
    return { correo: config?.correo ?? null, configurado: !!config };
  }

  async actualizarConfig(correo: string, appPassword: string | undefined, adminUsuarioId: number) {
    if (!correo?.trim()) throw new BadRequestException('El correo es requerido');

    const existente = await this.prisma.configuracion_correo.findUnique({ where: { id: 1 } });
    if (!appPassword?.trim() && !existente) {
      throw new BadRequestException('Debes ingresar la contraseña de aplicación la primera vez');
    }

    const data: any = { correo: correo.trim(), actualizado_por: adminUsuarioId };
    if (appPassword?.trim()) {
      data.app_password_cifrada = encrypt(appPassword.trim());
    }

    await this.prisma.configuracion_correo.upsert({
      where: { id: 1 },
      create: { id: 1, correo: correo.trim(), app_password_cifrada: encrypt(appPassword?.trim() ?? ''), actualizado_por: adminUsuarioId },
      update: data,
    });

    this.transporter = null; // fuerza reconstrucción con las nuevas credenciales
    return { ok: true };
  }

  // ── Envío ───────────────────────────────────────────────────────────

  private async getTransporter(): Promise<nodemailer.Transporter | null> {
    const config = await this.prisma.configuracion_correo.findUnique({ where: { id: 1 } });
    if (!config) return null;

    if (this.transporter && this.correoTransporterActual === config.correo) {
      return this.transporter;
    }

    const password = decrypt(config.app_password_cifrada);
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: config.correo, pass: password },
    });
    this.correoTransporterActual = config.correo;
    return this.transporter;
  }

  async enviarCorreo(to: string | string[], subject: string, html: string): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.warn('[MailService] No hay correo remitente configurado; no se envió:', subject);
        return;
      }
      const config = await this.prisma.configuracion_correo.findUnique({ where: { id: 1 } });
      await transporter.sendMail({ from: config?.correo, to, subject, html });
    } catch (e) {
      console.error('[MailService] Error al enviar correo:', e);
    }
  }

  async enviarBienvenidaEmpleador(correo: string, link: string): Promise<void> {
    await this.enviarCorreo(
      correo,
      'Invitación a registrar tu cuenta — Sistema de Prácticas ICCI',
      `<p>Hola,</p>
       <p>Secretaría del Departamento de Ingeniería en Computación e Informática (ICCI) te invita a crear tu cuenta de empresa en el Sistema de Prácticas.</p>
       <p>Para registrarte, haz clic en el siguiente enlace:</p>
       <p><a href="${link}">${link}</a></p>
       <p>Si no esperabas este correo, puedes ignorarlo.</p>`,
    );
  }

  async enviarHitoExcedido(
    destinatarios: DestinatarioHito[],
    datos: { alumnoNombre: string; hitoLabel: string; practicaNum: number },
  ): Promise<void> {
    const practica = datos.practicaNum === 1 ? 'Práctica I' : 'Práctica II';
    for (const d of destinatarios) {
      await this.enviarCorreo(
        d.correo,
        `Aviso: plazo vencido — ${datos.hitoLabel}`,
        `<p>Se informa que el plazo correspondiente a <strong>${datos.hitoLabel}</strong>, dentro de la ${practica} del alumno/a <strong>${datos.alumnoNombre}</strong>, se encuentra vencido.</p>
         <p>Por favor revisa el estado de esta práctica en el Sistema de Prácticas ICCI.</p>`,
      );
    }
  }
}
