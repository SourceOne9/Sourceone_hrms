/**
 * HRMS Payroll Engine
 * Centralized logic for salary, tax, and PF calculations.
 */

export interface SalaryComponents {
    basicSalary: number
    allowances: number
    pfDeduction: number
    tax: number
    otherDed: number
}

export interface PFContributions {
    employeeContribution: number
    employerContribution: number
    totalContribution: number
}

export interface TaxCalculation {
    taxAmount: number
    effectiveRate: number
}

/**
 * Calculates net salary based on basic components.
 */
export function calculateNetSalary(components: SalaryComponents): number {
    const gross = (components.basicSalary || 0) + (components.allowances || 0)
    const totalDeductions = (components.pfDeduction || 0) + (components.tax || 0) + (components.otherDed || 0)
    return Number((gross - totalDeductions).toFixed(2))
}

/**
 * Calculates PF contributions (standard 12% rules).
 */
export function calculatePFContributions(basicSalary: number): PFContributions {
    const employeeContribution = Math.round(basicSalary * 0.12)
    const employerContribution = Math.round(basicSalary * 0.12)
    return {
        employeeContribution,
        employerContribution,
        totalContribution: employeeContribution + employerContribution
    }
}

/**
 * Baseline Tax Calculation logic (Slab based - Simplified for MVP)
 */
export function calculateMonthlyTax(annualSalary: number): TaxCalculation {
    // Simplified India Income Tax New Regime slab (monthly estimate)
    const monthlyIncome = annualSalary / 12
    let tax = 0

    if (monthlyIncome > 125000) { // > 15L
        tax = (monthlyIncome - 125000) * 0.3 + 15000
    } else if (monthlyIncome > 100000) { // 12-15L
        tax = (monthlyIncome - 100000) * 0.2 + 10000
    } else if (monthlyIncome > 75000) { // 9-12L
        tax = (monthlyIncome - 75000) * 0.15 + 6250
    } else if (monthlyIncome > 50000) { // 6-9L
        tax = (monthlyIncome - 50000) * 0.1 + 3750
    } else if (monthlyIncome > 25000) { // 3-6L
        tax = (monthlyIncome - 25000) * 0.05
    }

    return {
        taxAmount: Math.round(tax),
        effectiveRate: annualSalary > 0 ? (tax * 12 / annualSalary) : 0
    }
}
