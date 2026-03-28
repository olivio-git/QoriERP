export interface JwtPayload {
  sub: string        // usuario_id
  tenantId: string   // tenant_id
  role: 'admin' | 'cashier'
  branchId?: string  // sucursal activa
}
