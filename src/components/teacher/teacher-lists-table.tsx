"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "@/lib/sweetalert";
import { IconButton } from "@/components/ui/icon-button";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";

type TeacherListsTableProps = {
  lists: Array<{
    id: string;
    title: string;
    publishedAt: string | null;
    dueAt: string | null;
    questionsCount: number;
    assignmentsCount: number;
  }>;
};

export function TeacherListsTable({ lists }: TeacherListsTableProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pendingListId, setPendingListId] = useState<string | null>(null);

  async function handleDelete(listId: string) {
    const confirmed = await showConfirmAlert({
      title: t("TeacherLists.deleteTitle"),
      text: t("TeacherLists.deleteText"),
      confirmButtonText: t("TeacherLists.deleteConfirm"),
      cancelButtonText: t("TeacherLists.deleteCancel"),
    });

    if (!confirmed) {
      return;
    }

    setPendingListId(listId);

    const response = await fetch(`/api/teacher/lists/${listId}`, {
      method: "DELETE",
    });

    setPendingListId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      await showErrorAlert({
        title: t("TeacherLists.deleteErrorTitle"),
        text: body?.message ?? t("TeacherLists.deleteErrorText"),
      });
      return;
    }

    await showSuccessAlert({
      title: t("TeacherLists.deletedTitle"),
      text: t("TeacherLists.deletedText"),
      timer: 1000,
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{t("TeacherLists.title")}</h2>
          <p className="text-sm text-slate-500">{t("TeacherLists.subtitle")}</p>
        </div>
        <IconButton
          label={t("TeacherLists.newExam")}
          href="/professor/lists/new"
          icon={<PlusIcon />}
        />
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th className="px-4 py-3">{t("TeacherLists.columns.title")}</th>
              <th className="px-4 py-3">{t("TeacherLists.columns.status")}</th>
              <th className="px-4 py-3">{t("TeacherLists.columns.questions")}</th>
              <th className="px-4 py-3">{t("TeacherLists.columns.assignments")}</th>
              <th className="px-4 py-3">{t("TeacherLists.columns.dueDate")}</th>
              <th className="px-4 py-3 text-right">{t("Common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {lists.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t("TeacherLists.noExams")}
                </td>
              </tr>
            ) : (
              lists.map((list) => (
                <tr key={list.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{list.title}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span
                      className={
                        list.publishedAt
                          ? "app-badge app-badge-success"
                          : "app-badge"
                      }
                    >
                      {list.publishedAt ? t("Status.published") : t("Status.draft")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{list.questionsCount}</td>
                  <td className="px-4 py-3 text-slate-600">{list.assignmentsCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(list.dueAt, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        label={t("TeacherLists.editExam")}
                        href={`/professor/lists/${list.id}/edit`}
                        icon={<PencilIcon />}
                      />
                      <IconButton
                        label={t("TeacherLists.deleteExam")}
                        icon={<TrashIcon />}
                        variant="danger"
                        disabled={pendingListId === list.id}
                        onClick={() => handleDelete(list.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
