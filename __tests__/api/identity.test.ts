import { expect, test, describe, beforeEach, vi } from 'vitest'
import { GET as listSessions } from '@/app/api/admin/sessions/route'
import { POST as createScimUser } from '@/app/api/scim/v2/Users/route'
import { prismaMock } from '../setup'

describe('Enterprise Identity Security Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('SCIM Provisioning', () => {
        test('rejects SCIM request with invalid token', async () => {
            prismaMock.organization.findFirst.mockResolvedValue(null)

            const req = new Request('http://localhost:3000/api/scim/v2/Users', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer invalid-token' }
            })

            const res = await createScimUser(req)
            expect(res.status).toBe(401)
        })

        test('allows creating user with valid SCIM token', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1', scimSecret: 'valid-token' } as any)
            prismaMock.user.findUnique.mockResolvedValue(null)
            prismaMock.department.findFirst.mockResolvedValue({ id: 'dept-1' } as any)
            prismaMock.user.create.mockResolvedValue({ id: 'new-user-1', email: 'scim@test.com' } as any)

            const req = new Request('http://localhost:3000/api/scim/v2/Users', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer valid-token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userName: 'scim@test.com',
                    name: { givenName: 'Scim', familyName: 'User' }
                })
            })

            const res = await createScimUser(req)
            expect(res.status).toBe(201)
            expect(prismaMock.user.create).toHaveBeenCalled()
        })
    })

    describe('Session Management', () => {
        test('lists sessions for authorized admin', async () => {
            // Mock auth session
            vi.mock('@/lib/auth', () => ({
                auth: vi.fn().mockResolvedValue({
                    user: { id: 'admin-1', role: 'ADMIN', organizationId: 'org-1' }
                })
            }))

            prismaMock.userSession.findMany.mockResolvedValue([
                {
                    id: 'sess-1',
                    userId: 'user-1',
                    isRevoked: false,
                    expires: new Date(Date.now() + 10000),
                    user: { name: 'User 1', email: 'u1@test.com', avatar: null }
                }
            ])

            const req = new Request('http://localhost:3000/api/admin/sessions')
            const res = await listSessions(req)
            const json = await res.json()

            expect(res.status).toBe(200)
            expect(json.data.length).toBe(1)
        })
    })
})
