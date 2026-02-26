"use client"

import * as React from "react"
import { Modal } from "@/components/ui/Modal"
import { PersonIcon } from "@radix-ui/react-icons"
import { UseFormReturn } from "react-hook-form"

interface Department {
    id: string
    name: string
}

interface EmployeeFormModalProps {
    isOpen: boolean
    onClose: () => void
    modalMode: "CREATE" | "EDIT" | "VIEW"
    form: UseFormReturn<any>
    departments: Department[]
    onSubmit: (data: any) => void
    handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    onOpenDeptModal: () => void
}

export const EmployeeFormModal = React.memo(function EmployeeFormModal({
    isOpen,
    onClose,
    modalMode,
    form,
    departments,
    onSubmit,
    handleAvatarUpload,
    onOpenDeptModal,
}: EmployeeFormModalProps) {
    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalMode === "CREATE" ? "Add New Employee" : modalMode === "EDIT" ? "Edit Employee" : "View Employee"}
        >
            <div className="flex flex-col items-center mb-6 pt-2">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-[var(--bg2)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text3)] text-[24px] font-bold overflow-hidden">
                        {form.watch("avatarUrl") ? (
                            <img src={form.watch("avatarUrl")!} className="w-full h-full object-cover" />
                        ) : (
                            <PersonIcon className="w-10 h-10 opacity-20" />
                        )}
                    </div>
                    {modalMode !== "VIEW" && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                            {form.watch("avatarUrl") ? "CHANGE" : "UPLOAD"}
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    )}
                </div>
                {modalMode !== "VIEW" && <p className="text-[11px] text-[var(--text3)] mt-2">Recommended: Square image, max 2MB</p>}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">First Name *</label>
                        <input
                            {...form.register('firstName')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                        {form.formState.errors.firstName && <span className="text-[11px] text-red-500">{form.formState.errors.firstName?.message?.toString()}</span>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Last Name *</label>
                        <input
                            {...form.register('lastName')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                        {form.formState.errors.lastName && <span className="text-[11px] text-red-500">{form.formState.errors.lastName?.message?.toString()}</span>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Employee Code *</label>
                        <input
                            {...form.register('employeeCode')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                        {form.formState.errors.employeeCode && <span className="text-[11px] text-red-500">{form.formState.errors.employeeCode?.message?.toString()}</span>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Date Of Joining *</label>
                        <input
                            type="date"
                            {...form.register('dateOfJoining')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                        {form.formState.errors.dateOfJoining && <span className="text-[11px] text-red-500">{form.formState.errors.dateOfJoining?.message?.toString()}</span>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Email *</label>
                        <input
                            type="email"
                            {...form.register('email')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                        {form.formState.errors.email && <span className="text-[11px] text-red-500">{form.formState.errors.email?.message?.toString()}</span>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Phone</label>
                        <input
                            {...form.register('phone')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Department *</label>
                            {modalMode !== "VIEW" && (
                                <button
                                    type="button"
                                    onClick={onOpenDeptModal}
                                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                                >
                                    + New
                                </button>
                            )}
                        </div>
                        <select
                            {...form.register('departmentId')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        >
                            <option value="">Select Department...</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {form.formState.errors.departmentId && <span className="text-[11px] text-red-500">{form.formState.errors.departmentId?.message?.toString()}</span>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Designation *</label>
                        <input
                            {...form.register('designation')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                        {form.formState.errors.designation && <span className="text-[11px] text-red-500">{form.formState.errors.designation?.message?.toString()}</span>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Salary (Monthly) *</label>
                        <input
                            type="number"
                            {...form.register('salary', { valueAsNumber: true })}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                        {form.formState.errors.salary && <span className="text-[11px] text-red-500">{form.formState.errors.salary?.message?.toString()}</span>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Status *</label>
                        <select
                            {...form.register('status')}
                            disabled={modalMode === "VIEW"}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="ON_LEAVE">On Leave</option>
                            <option value="RESIGNED">Resigned</option>
                            <option value="TERMINATED">Terminated</option>
                        </select>
                    </div>
                </div>

                {modalMode !== "VIEW" && (
                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {form.formState.isSubmitting ? "Saving..." : modalMode === "CREATE" ? "Create Employee" : "Save Changes"}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    )
})
