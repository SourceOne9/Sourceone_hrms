import { vi } from 'vitest'

// Mocking Prisma Client
export const prismaMock = {
    employee: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn()
    },
    organization: {
        findFirst: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
    $transaction: vi.fn((queries) => {
        if (Array.isArray(queries)) return Promise.all(queries)
        return queries(prismaMock)
    })
}

vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
}))

// Mock NextAuth
vi.mock('@/lib/auth', () => ({
    auth: vi.fn().mockResolvedValue({
        user: { id: 'test-user-id', role: 'ADMIN', organizationId: 'org-1' }
    })
}))

