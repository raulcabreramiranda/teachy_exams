"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const [pendingListId, setPendingListId] = useState<string | null>(null);

  async function handleDelete(listId: string) {
    const confirmed = await showConfirmAlert({
      title: "Delete this exam?",
      text: "This action removes the exam and its current assignments.",
      confirmButtonText: "Delete",
      cancelButtonText: "Keep",
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
        title: "Unable to delete the exam",
        text: body?.message ?? "Try again in a moment.",
      });
      return;
    }

    await showSuccessAlert({
      title: "Exam deleted",
      text: "The exam was removed successfully.",
      timer: 1000,
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Exams</h2>
          <p className="text-sm text-slate-500">Create, edit, and delete exams.</p>
        </div>
        <IconButton
          label="New exam"
          href="/professor/lists/new"
          icon={<PlusIcon />}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Assignments</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lists.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No exams found.
                </td>
              </tr>
            ) : (
              lists.map((list) => (
                <tr key={list.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{list.title}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {list.publishedAt ? "Published" : "Draft"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{list.questionsCount}</td>
                  <td className="px-4 py-3 text-slate-600">{list.assignmentsCount}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(list.dueAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        label="Edit exam"
                        href={`/professor/lists/${list.id}/edit`}
                        icon={<PencilIcon />}
                      />
                      <IconButton
                        label="Delete exam"
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
