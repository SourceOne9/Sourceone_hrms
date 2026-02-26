import { describe, it, expect } from 'vitest'
import { calculateNetSalary, calculatePFContributions, calculateMonthlyTax } from './payroll-engine'

describe('Payroll Engine', () => {
    describe('calculateNetSalary', () => {
        it('should correctly calculate net salary with all components', () => {
            const result = calculateNetSalary({
                basicSalary: 50000,
                allowances: 10000,
                pfDeduction: 6000,
                tax: 5000,
                otherDed: 1000
            })
            expect(result).toBe(48000)
        })

        it('should handle zero allowances and deductions', () => {
            const result = calculateNetSalary({
                basicSalary: 30000,
                allowances: 0,
                pfDeduction: 0,
                tax: 0,
                otherDed: 0
            })
            expect(result).toBe(30000)
        })
    })

    describe('calculatePFContributions', () => {
        it('should calculate 12% for both employee and employer', () => {
            const result = calculatePFContributions(10000)
            expect(result.employeeContribution).toBe(1200)
            expect(result.employerContribution).toBe(1200)
            expect(result.totalContribution).toBe(2400)
        })
    })

    describe('calculateMonthlyTax', () => {
        it('should return 0 tax for low income', () => {
            const result = calculateMonthlyTax(240000) // 20k/month
            expect(result.taxAmount).toBe(0)
        })

        it('should calculate slab-based tax correctly for mid income', () => {
            const result = calculateMonthlyTax(600000) // 50k/month
            // Slab 3-6L: 5% of (50k - 25k) = 1250
            expect(result.taxAmount).toBe(1250)
        })

        it('should calculate slab-based tax correctly for very high income', () => {
            const result = calculateMonthlyTax(1800000) // 150k/month
            // Slab >15L: 30% of (150k - 125k) + 15000 = 7500 + 15000 = 22500
            expect(result.taxAmount).toBe(22500)
        })

        it('should calculate slab-based tax correctly for high income', () => {
            const result = calculateMonthlyTax(1200000) // 100k/month
            // Slab 9-12L: 15% of (100k - 75k) + 6250 = 3750 + 6250 = 10000
            expect(result.taxAmount).toBe(10000)
        })
    })
})
