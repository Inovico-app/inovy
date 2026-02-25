import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export function DashboardGetStarted() {
  const steps = [
    {
      label: "Create your first project to organize recordings",
      action: (
        <Button size="sm" asChild>
          <Link href="/projects/create">Create Project</Link>
        </Button>
      ),
    },
    { label: "Upload a meeting recording for AI processing" },
    { label: "Review AI-generated summaries and action items" },
    { label: "Track and manage your tasks across all projects" },
  ];

  return (
    <Card className="mt-10">
      <CardHeader>
        <CardTitle>Get Started</CardTitle>
        <CardDescription>
          Follow these steps to start managing your meeting recordings and tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className="text-sm">{step.label}</span>
              {step.action}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
