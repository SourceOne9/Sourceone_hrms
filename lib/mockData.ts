import { Asset, Document } from "@/types";

export const mockAssets: Asset[] = [
    {
        id: "1",
        name: "MacBook Pro 16",
        type: "Hardware",
        serialNumber: "FVFXL1J2",
        status: "Assigned",
        assignedTo: "1", // Michael Johnson
        assignedDate: "2023-03-15",
        purchaseDate: "2023-01-10",
        value: 2499,
        image: "laptop"
    },
    {
        id: "2",
        name: "Dell XPS 15",
        type: "Hardware",
        serialNumber: "987654321",
        status: "Available",
        purchaseDate: "2023-02-20",
        value: 1899,
        image: "laptop"
    },
    {
        id: "3",
        name: "LG UltraFine 5K",
        type: "Hardware",
        serialNumber: "monitor-001",
        status: "Assigned",
        assignedTo: "2", // Lisa Anderson
        assignedDate: "2023-04-01",
        purchaseDate: "2023-03-01",
        value: 1299,
        image: "monitor"
    },
    {
        id: "4",
        name: "Adobe Creative Cloud",
        type: "Software",
        serialNumber: "N/A",
        status: "Assigned",
        assignedTo: "2",
        assignedDate: "2023-01-15",
        purchaseDate: "2023-01-15",
        value: 600,
        image: "software"
    },
    {
        id: "5",
        name: "Magic Keyboard",
        type: "Accessory",
        serialNumber: "ACC-KB-001",
        status: "Maintenance",
        purchaseDate: "2022-11-05",
        value: 149,
        image: "accessory"
    }
];

export const mockDocuments: Document[] = [
    {
        id: "1",
        title: "Employee Handbook 2024",
        category: "Policy",
        url: "#",
        uploadDate: "2024-01-01",
        size: "2.4 MB",
        isPublic: true
    },
    {
        id: "2",
        title: "Holiday Calendar 2024",
        category: "Policy",
        url: "#",
        uploadDate: "2024-01-01",
        size: "1.1 MB",
        isPublic: true
    },
    {
        id: "3",
        title: "Employment Contract - MJ",
        category: "Contract",
        url: "#",
        uploadDate: "2023-03-10",
        size: "1.8 MB",
        employeeId: "1",
        isPublic: false
    },
    {
        id: "4",
        title: "Payslip - Jan 2024",
        category: "Payslip",
        url: "#",
        uploadDate: "2024-01-31",
        size: "0.5 MB",
        employeeId: "1",
        isPublic: false
    },
    {
        id: "5",
        title: "Tax Form 2023",
        category: "Tax",
        url: "#",
        uploadDate: "2023-04-15",
        size: "0.8 MB",
        employeeId: "2",
        isPublic: false
    }
];
