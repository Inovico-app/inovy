import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { GlobalTaskList } from "@/features/tasks/components/global-task-list";
import { getUserTasks } from "@/features/tasks/actions/get-user-tasks";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Loader } from "@/components/loader";

async function TasksContent() {
  // Check authentication
  const authResult = await getAuthSession();
  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    redirect("/api/auth/[kindeAuth]/login");
  }

  // Fetch user tasks
  const tasksResult = await getUserTasks();

  if (tasksResult.isErr()) {
    return (
      <GlobalTaskList
        tasks={[]}
        error={tasksResult.error}
      />
    );
  }

  const tasks = tasksResult.value;

  return <GlobalTaskList tasks={tasks} />;
}

export default function TasksPage() {
  return (
    <PageLayout
      title="Mijn taken"
      description="Alle taken toegewezen aan u"
    >
      <Suspense fallback={<Loader text="Taken laden..." />}>
        <TasksContent />
      </Suspense>
    </PageLayout>
  );
}
