/**
 * ZAPIER WEBHOOK ENDPOINT DOCUMENTATION
 * 
 * Este archivo ha sido migrado a una API Route de Next.js.
 * Ver: src/app/api/zapier/lead/route.ts
 * 
 * ENDPOINT: POST /api/zapier/lead
 * 
 * PAYLOAD REQUERIDO:
 * {
 *   "full_name": "Nombre Completo" (OBLIGATORIO),
 *   "email": "email@example.com" (OPCIONAL),
 *   "phone": "+1234567890" (OPCIONAL),
 *   "channel": "facebook_ads|instagram|referido|google_ads|otro" (OPCIONAL, default: "otro")
 * }
 * 
 * RESPUESTAS:
 * 
 * 200 OK - Éxito:
 * {
 *   "status": "success",
 *   "message": "Lead registrado de manera exitosa en la bandeja de entrada del sistema."
 * }
 * 
 * 200 OK - Duplicado bloqueado (RF-05):
 * {
 *   "status": "blocked",
 *   "message": "Duplicado detectado bajo la regla RF-05. El registro ha sido archivado como descartado."
 * }
 * 
 * 400 Bad Request - Validación fallida:
 * {
 *   "error": "El campo 'full_name' es obligatorio."
 * }
 * 
 * 500 Error - Error del servidor:
 * {
 *   "error": "Descripción del error"
 * }
 * 
 * FLUJO DE NEGOCIO:
 * 1. Se valida que full_name no esté vacío
 * 2. Se verifica si el lead es duplicado (por email o teléfono) - RF-05
 * 3. Si es duplicado, se marca como "descartado" y se registra en auditoría
 * 4. Si es nuevo, se registra con estado "nuevo" y origin "zapier"
 * 
 * CONFIGURACIÓN EN ZAPIER:
 * 1. URL Webhook: https://tu-dominio.com/api/zapier/lead
 * 2. Método: POST
 * 3. Headers: Content-Type: application/json
 * 4. Mapear campos del origen (FormSubmit, Email, Etc.) a:
 *    - full_name
 *    - email
 *    - phone
 *    - channel (opcional)
 */

export {};