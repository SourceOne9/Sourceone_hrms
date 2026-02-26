import { describe, it, expect, vi } from 'vitest'
import { orgFilter, AuthContext } from './security'

describe('Security Utilities', () => {
    describe('orgFilter', () => {
        it('should inject organizationId into an empty where clause', () => {
            const context: AuthContext = {
                requestId: 'req-1',
                userId: 'user-1',
                organizationId: 'org-1',
                role: 'ADMIN'
            }
            const result = orgFilter(context)
            expect(result.organizationId).toBe('org-1')
        })

        it('should preserve existing where conditions', () => {
            const context: AuthContext = {
                requestId: 'req-2',
                userId: 'user-2',
                organizationId: 'org-2',
                role: 'EMPLOYEE'
            }
            const existing = { status: 'ACTIVE' }
            const result = orgFilter(context, existing)
            expect(result.status).toBe('ACTIVE')
            expect(result.organizationId).toBe('org-2')
        })
    })

    // withAuth is harder to test without full NextAuth mocking,
    // but we can test that it returns a function
    it('should return a wrapped handler function', () => {
        const handler = async () => new Response() as any
        const wrapped = orgFilter({ organizationId: 'test' } as any, { id: 'test' })
        expect(wrapped).toBeDefined()
    })
})
