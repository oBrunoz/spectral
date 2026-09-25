import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

const POR_CODIGO: Record<string, { status: number; message: string }> = {
  P2020: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Valor fora da faixa aceita',
  },
  P2023: { status: HttpStatus.BAD_REQUEST, message: 'Identificador inválido' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Referência inexistente' },
};

@Catch()
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const codigo =
      typeof exception === 'object' && exception !== null && 'code' in exception
        ? String((exception as { code: unknown }).code)
        : null;

    const conhecido = codigo ? POR_CODIGO[codigo] : undefined;

    if (!conhecido) {
      super.catch(exception, host);
      return;
    }

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(conhecido.status)
      .json({ message: conhecido.message, statusCode: conhecido.status });
  }
}
