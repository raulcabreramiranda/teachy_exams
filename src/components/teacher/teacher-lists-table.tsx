"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
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
  const [error, setError] = useState<string | null>(null);
  const [pendingListId, setPendingListId] = useState<string | null>(null);

  async function handleDelete(listId: string) {
    if (!window.confirm("Delete this list?")) {
      return;
    }

    setPendingListId(listId);
    setError(null);

    const response = await fetch(`/api/teacher/lists/${listId}`, {
      method: "DELETE",
    });

    setPendingListId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Unable to delete the list.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Lists</h2>
          <p className="text-sm text-slate-500">Create, edit, and delete exercise lists.</p>
        </div>
        <IconButton
          label="New list"
          href="/professor/lists/new"
          icon={<PlusIcon />}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

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
                  No lists found.
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
                        label="Edit list"
                        href={`/professor/lists/${list.id}/edit`}
                        icon={<PencilIcon />}
                      />
                      <IconButton
                        label="Delete list"
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
