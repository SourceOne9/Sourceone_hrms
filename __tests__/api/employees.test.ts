import { expect, test, describe, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/employees/route'
import { prismaMock } from '../setup'

describe('Employee API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('GET /api/employees', () => {
        test('returns paginated employees successfully', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })
            prismaMock.employee.count.mockResolvedValue(2)
            prismaMock.employee.findMany.mockResolvedValue([
                { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
            ])

            const req = new Request('http://localhost:3000/api/employees?page=1&limit=10')
            const res = await GET(req)
            const json = await res.json()

            expect(res.status).toBe(200)
            expect(json.meta.total).toBe(2)
            expect(json.data.length).toBe(2)
            expect(prismaMock.employee.findMany).toHaveBeenCalledTimes(1)
        })
    })

    describe('POST /api/employees', () => {
        test('rejects malformed data due to Zod validation', async () => {
            // Missing first name, missing employeeCode
            const payload = { lastName: 'Doe', email: 'invalid-email' }
            const req = new Request('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(400)
            expect(json.error.message).toBe('Validation Error')
            expect(json.error.details).toBeDefined()
        })

        test('creates employee successfully with valid data', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })
            prismaMock.employee.findUnique.mockResolvedValue(null) // No existing email/code
            prismaMock.user.create.mockResolvedValue({ id: 'new-user-1' })
            prismaMock.employee.create.mockResolvedValue({
                id: 'new-emp-1',
                employeeCode: 'EMP-001'
            })
            prismaMock.user.findUnique.mockResolvedValue(null)

            const payload = {
                employeeCode: 'EMP-001',
                firstName: 'Alice',
                lastName: 'Wonder',
                email: 'alice@example.com',
                designation: 'Engineer',
                departmentId: 'dept-1',
                dateOfJoining: '2024-01-01',
                salary: 50000,
                status: 'ACTIVE'
            }

            const req = new Request('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(201)
            expect(json.data.employeeCode).toBe('EMP-001')
            // Assert that the credentials generation trigger fired (if applicable)
            expect(prismaMock.employee.create).toHaveBeenCalled()
        })
    })
})
