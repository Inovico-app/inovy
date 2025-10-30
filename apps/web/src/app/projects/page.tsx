import { KindeUserService } from "@/server/services";
import { CalendarIcon, FileTextIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ProjectService } from "../../server/services/project.service";

export default async function ProjectsPage() {
  const projectsResult = await ProjectService.getProjectsByOrganization();

  if (projectsResult.isErr()) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-red-500">
            Failed to load projects: {projectsResult.error}
          </p>
        </div>
      </div>
    );
  }

  const projects = projectsResult.value;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCreatorName = async (createdById: string) => {
    const creator = await KindeUserService.getUserById(createdById);
    if (creator.isErr()) {
      return "Unknown Creator";
    }
    if (!creator.value) {
      return "Unknown Creator";
    }
    const { given_name, family_name } = creator.value;
    if (given_name && family_name) {
      return `${given_name} ${family_name}`;
    }
    if (given_name) {
      return given_name;
    }
    if (family_name) {
      return family_name;
    }
    return "Unknown Creator";
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-2">
              Organize your meeting recordings by project
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/create">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Project
            </Link>
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <Link href={`/projects/${project.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{project.name}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${
                          project.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {project.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {project.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        Created {formatDate(project.createdAt)}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <FileTextIcon className="h-3 w-3 mr-1" />
                        By {getCreatorName(project.createdById)}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first project to start organizing your meeting
                recordings.
              </p>
              <Button asChild>
                <Link href="/projects/create">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

