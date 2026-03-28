#!/usr/bin/env node
/**
 * sync-bruno.mjs
 * Sincroniza rutas nuevas del swagger hacia la collection de Bruno.
 * Solo crea archivos que no existen — nunca toca los existentes.
 *
 * Uso:
 *   node scripts/sync-bruno.mjs
 *   SWAGGER_URL=http://localhost:3000/docs/json node scripts/sync-bruno.mjs
 *   BRUNO_DIR=/otro/path node scripts/sync-bruno.mjs
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

const SWAGGER_URL = process.env.SWAGGER_URL ?? 'http://localhost:3000/docs/json'
const BRUNO_DIR   = process.env.BRUNO_DIR   ?? '/home/oliviodev/Documents/bruno/QoriERP API'

// ─── Fetch swagger ────────────────────────────────────────────────────────────

let spec
try {
  const res = await fetch(SWAGGER_URL)
  spec = await res.json()
} catch {
  console.error(`No se pudo conectar a ${SWAGGER_URL}`)
  console.error('Asegurate de que la API esté corriendo antes de ejecutar este script.')
  process.exit(1)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte parámetros OpenAPI {param} al formato Bruno {{param}} */
function tobrunoUrl(path) {
  return `{{baseUrl}}${path.replace(/\{(\w+)\}/g, '{{$1}}')}`
}

/** Genera el body JSON de ejemplo a partir del schema de requestBody */
function buildBodyData(operation) {
  const content = operation.requestBody?.content?.['application/json']
  if (!content?.schema?.properties) return null

  const example = {}
  for (const [key, prop] of Object.entries(content.schema.properties)) {
    if      (prop.type === 'string')  example[key] = ''
    else if (prop.type === 'number')  example[key] = 0
    else if (prop.type === 'boolean') example[key] = false
    else if (prop.type === 'array')   example[key] = []
    else                              example[key] = {}
  }
  return JSON.stringify(example, null, 2)
}

/** Genera los examples de Bruno a partir de los responses del swagger */
function buildExamples(operation, path, method, bodyData) {
  const responses = operation.responses ?? {}
  const examples  = []

  for (const [status, response] of Object.entries(responses)) {
    const statusCode = parseInt(status, 10)
    const statusText = statusTexts[statusCode] ?? 'Response'
    const resSchema  = response.content?.['application/json']?.schema

    let resBody = '{}'
    if (resSchema?.properties) {
      const obj = {}
      for (const [key, prop] of Object.entries(resSchema.properties)) {
        if      (prop.type === 'string')  obj[key] = ''
        else if (prop.type === 'number')  obj[key] = 0
        else if (prop.type === 'boolean') obj[key] = false
        else if (prop.type === 'array')   obj[key] = [prop.items?.type === 'object' ? {} : '']
        else                              obj[key] = {}
      }
      resBody = JSON.stringify(obj, null, 2)
    }

    const bodySection = bodyData
      ? `      body:\n        type: json\n        data: |-\n${indent(bodyData, 10)}`
      : ''

    examples.push(`  - name: ${status} Response
    description: ${response.description ?? 'Default Response'}
    request:
      url: "${tobrunoUrl(path)}"
      method: ${method.toUpperCase()}
${bodySection}
    response:
      status: ${statusCode}
      statusText: ${statusText}
      headers:
        - name: Content-Type
          value: application/json
      body:
        type: json
        data: |-
${indent(resBody, 10)}`)
  }

  return examples.join('\n')
}

function indent(str, spaces) {
  const pad = ' '.repeat(spaces)
  return str.split('\n').map(l => pad + l).join('\n')
}

const statusTexts = {
  200: 'OK', 201: 'Created', 204: 'No Content',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 409: 'Conflict', 422: 'Unprocessable Entity',
  500: 'Internal Server Error',
}

/** Cuenta los .yml de requests en una carpeta para asignar seq */
function countRequests(folderPath) {
  if (!existsSync(folderPath)) return 0
  return readdirSync(folderPath).filter(f => f.endsWith('.yml') && f !== 'folder.yml').length
}

// ─── Generar archivos Bruno ───────────────────────────────────────────────────

let created = 0
let skipped = 0

for (const [path, methods] of Object.entries(spec.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods)) {
    // Ignorar métodos que no son HTTP verbs reales
    if (['parameters', 'servers', 'summary', 'description'].includes(method)) continue

    const tag      = operation.tags?.[0] ?? 'default'
    const name     = operation.summary ?? `${method.toUpperCase()} ${path}`
    const folderDir = join(BRUNO_DIR, tag)

    // Crear carpeta si no existe
    if (!existsSync(folderDir)) {
      mkdirSync(folderDir, { recursive: true })
      writeFileSync(join(folderDir, 'folder.yml'), `info:\n  name: ${tag}\n`)
      console.log(`  FOLDER  ${tag}/`)
    }

    // Sanitizar nombre de archivo (Bruno no acepta ciertos caracteres)
    const filename = `${name.replace(/[/\\?%*:|"<>]/g, '-')}.yml`
    const filepath  = join(folderDir, filename)

    if (existsSync(filepath)) {
      console.log(`  SKIP    ${tag}/${filename}`)
      skipped++
      continue
    }

    const seq      = countRequests(folderDir) + 1
    const bodyData = buildBodyData(operation)
    const hasBody  = !!bodyData

    const bodySection = hasBody
      ? `  body:\n    type: json\n    data: |-\n${indent(bodyData, 6)}`
      : ''

    const tagsSection = (operation.tags ?? [])
      .map(t => `    - ${t}`)
      .join('\n')

    const examplesSection = buildExamples(operation, path, method, bodyData)

    const content = `info:
  name: ${name}
  type: http
  seq: ${seq}${tagsSection ? `\n  tags:\n${tagsSection}` : ''}

http:
  method: ${method.toUpperCase()}
  url: "${tobrunoUrl(path)}"
${bodySection ? bodySection + '\n' : ''}  auth: inherit

settings:
  encodeUrl: true
  timeout: 0
  followRedirects: true
  maxRedirects: 5
${examplesSection ? `\nexamples:\n${examplesSection}\n` : ''}
docs: ${operation.description ?? ''}
`

    writeFileSync(filepath, content)
    console.log(`  CREATE  ${tag}/${filename}`)
    created++
  }
}

console.log(`\nDone — ${created} creados, ${skipped} omitidos.`)
