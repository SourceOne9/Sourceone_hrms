export type AssetType = 'Hardware' | 'Software' | 'Accessory';
export type AssetStatus = 'Available' | 'Assigned' | 'Maintenance' | 'Retired';

export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    serialNumber: string;
    status: AssetStatus;
    assignedTo?: string; // Employee ID
    assignedDate?: string;
    purchaseDate: string;
    value: number;
    image?: string;
}

export type DocCategory = 'Policy' | 'Contract' | 'Payslip' | 'Tax' | 'Identification';

export interface Document {
    id: string;
    title: string;
    category: DocCategory;
    url: string;
    uploadDate: string;
    size: string;
    employeeId?: string; // If specific to an employee, null if public policy
    isPublic: boolean; // Visible to all employees
}
