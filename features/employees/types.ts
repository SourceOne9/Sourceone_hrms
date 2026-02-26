export type Department = {
    id: string
    name: string
    color: string
}

export type EmployeeApiData = {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    designation: string
    departmentId: string
    dateOfJoining: string
    salary: number
    status: string
    avatarUrl?: string | null
    department?: Department
    createdAt?: string
}

export type TableEmployee = {
    id: string
    name: string
    email: string
    dept: string
    role: string
    status: string
    start: string
    initials: string
    color: string
    avatarUrl: string | null
    raw: EmployeeApiData
}
