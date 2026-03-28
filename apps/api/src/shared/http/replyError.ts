import type { FastifyReply } from "fastify"; 
import { AppError } from "@shared/errors/AppError.js";

export function replyError(reply: FastifyReply, error: unknown) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Internal server error';
  reply.code(statusCode).send({ error: message });
}