"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "@/lib/sweetalert";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  assignmentsCount: number;
};

type StudentManagementTableProps = {
  students: StudentRow[];
};

type StudentFormState = {
  name: string;
  email: string;
  password: string;
};

const emptyStudentForm: StudentFormState = {
  name: "",
  email: "",
  password: "",
};

export function StudentManagementTable({
  students,
}: StudentManagementTableProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreateModal() {
    setEditingStudentId(null);
    setForm(emptyStudentForm);
    setIsModalOpen(true);
  }

  function openEditModal(student: StudentRow) {
    setEditingStudentId(student.id);
    setForm({
      name: student.name,
      email: student.email,
      password: "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(emptyStudentForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch(
      editingStudentId
        ? `/api/teacher/students/${editingStudentId}`
        : "/api/teacher/students",
      {
        method: editingStudentId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      },
    );

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      await showErrorAlert({
        title: "Unable to save the student",
        text: body?.message ?? "Review the form data and try again.",
      });
      return;
    }

    closeModal();
    await showSuccessAlert({
      title: editingStudentId ? "Student updated" : "Student created",
      text: editingStudentId
        ? "The student account was updated successfully."
        : "The student account was created successfully.",
      timer: 1000,
    });
    router.refresh();
  }

  async function handleDelete(studentId: string) {
    const confirmed = await showConfirmAlert({
      title: "Archive student?",
      text: "The student will no longer appear in active exams.",
      confirmButtonText: "Archive",
      cancelButtonText: "Keep",
    });

    if (!confirmed) {
      return;
    }

    setPendingStudentId(studentId);

    const response = await fetch(`/api/teacher/students/${studentId}`, {
      method: "DELETE",
    });

    setPendingStudentId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      await showErrorAlert({
        title: "Unable to archive the student",
        text: body?.message ?? "Try again in a moment.",
      });
      return;
    }

    await showSuccessAlert({
      title: "Student archived",
      text: "The account was moved out of the active exam roster.",
      timer: 1000,
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Students</h2>
          <p className="text-sm text-slate-500">Manage active student accounts.</p>
        </div>
        <IconButton label="New student" icon={<PlusIcon />} onClick={openCreateModal} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Assignments</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No students found.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                  <td className="px-4 py-3 text-slate-600">{student.email}</td>
                  <td className="px-4 py-3 text-slate-600">{student.assignmentsCount}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(student.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        label="Edit student"
                        icon={<PencilIcon />}
                        onClick={() => openEditModal(student)}
                      />
                      <IconButton
                        label="Archive student"
                        icon={<TrashIcon />}
                        variant="danger"
                        disabled={pendingStudentId === student.id}
                        onClick={() => handleDelete(student.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={isModalOpen}
        title={editingStudentId ? "Edit student" : "New student"}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              value={form.email}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  email: event.target.value,
                }))
              }
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              value={form.password}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  password: event.target.value,
                }))
              }
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              placeholder={editingStudentId ? "Leave blank to keep current password" : ""}
              required={!editingStudentId}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-slate-900 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
