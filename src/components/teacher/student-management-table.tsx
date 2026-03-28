"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
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
  const t = useTranslations();
  const locale = useLocale();
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
        title: t("TeacherStudents.saveErrorTitle"),
        text: body?.message ?? t("TeacherStudents.saveErrorText"),
      });
      return;
    }

    closeModal();
    await showSuccessAlert({
      title: editingStudentId
        ? t("TeacherStudents.updatedTitle")
        : t("TeacherStudents.createdTitle"),
      text: editingStudentId
        ? t("TeacherStudents.updatedText")
        : t("TeacherStudents.createdText"),
      timer: 1000,
    });
    router.refresh();
  }

  async function handleDelete(studentId: string) {
    const confirmed = await showConfirmAlert({
      title: t("TeacherStudents.archiveTitle"),
      text: t("TeacherStudents.archiveText"),
      confirmButtonText: t("TeacherStudents.archiveConfirm"),
      cancelButtonText: t("TeacherStudents.archiveCancel"),
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
        title: t("TeacherStudents.archiveErrorTitle"),
        text: body?.message ?? t("TeacherStudents.archiveErrorText"),
      });
      return;
    }

    await showSuccessAlert({
      title: t("TeacherStudents.archivedTitle"),
      text: t("TeacherStudents.archivedText"),
      timer: 1000,
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {t("TeacherStudents.title")}
          </h2>
          <p className="text-sm text-slate-500">{t("TeacherStudents.subtitle")}</p>
        </div>
        <IconButton
          label={t("TeacherStudents.newStudent")}
          icon={<PlusIcon />}
          onClick={openCreateModal}
        />
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th className="px-4 py-3">{t("TeacherStudents.columns.name")}</th>
              <th className="px-4 py-3">{t("TeacherStudents.columns.email")}</th>
              <th className="px-4 py-3">{t("TeacherStudents.columns.assignments")}</th>
              <th className="px-4 py-3">{t("TeacherStudents.columns.created")}</th>
              <th className="px-4 py-3 text-right">{t("Common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t("TeacherStudents.noStudents")}
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                  <td className="px-4 py-3 text-slate-600">{student.email}</td>
                  <td className="px-4 py-3 text-slate-600">{student.assignmentsCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(student.createdAt, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        label={t("TeacherStudents.editStudent")}
                        icon={<PencilIcon />}
                        onClick={() => openEditModal(student)}
                      />
                      <IconButton
                        label={t("TeacherStudents.archiveStudent")}
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
        title={
          editingStudentId
            ? t("TeacherStudents.modalEditTitle")
            : t("TeacherStudents.modalNewTitle")
        }
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("TeacherStudents.name")}
            </label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value,
                }))
              }
              className="app-input"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("TeacherStudents.email")}
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
              className="app-input"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("TeacherStudents.password")}
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
              className="app-input"
              placeholder={
                editingStudentId ? t("TeacherStudents.passwordPlaceholder") : ""
              }
              required={!editingStudentId}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="app-button-secondary px-3 py-2"
            >
              {t("Common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="app-button-primary px-3 py-2"
            >
              {isSaving ? t("Common.loading") : t("Common.save")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
