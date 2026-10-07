"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage as getBackendErrorMessage } from "@/lib/error-message";
import {
  FileText,
  FolderKanban,
  Loader2,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";

type ProjectFile = {
  id: string;
  filename: string;
  label: string;
  uploadStatus: string;
  processingStatus: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  status: string;
  files: ProjectFile[];
  updatedAt: string;
};

type BackendProjectFile = {
  id?: string;
  project_file_id?: string;
  filename?: string | null;
  label?: string | null;
  upload_status?: string | null;
  processing_status?: string | null;
};

type BackendProject = {
  id?: string;
  project_id?: string;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  files?: BackendProjectFile[];
  updated_at?: string | null;
  created_at?: string | null;
};

type ProjectUpload = {
  project_file_id: string;
  filename: string;
  upload_url: string;
};

type CreateProjectResponse = {
  project_id: string;
  status?: string;
  uploads?: ProjectUpload[];
};

type CreateProjectPayload = {
  name: string;
  description: string;
  files: {
    filename: string;
    content_type: string;
    file_size: number;
  }[];
};

function getErrorMessage(data: unknown, fallback: string) {
  return getBackendErrorMessage(data, fallback);
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return "recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  const differenceInDays = Math.floor(
    (Date.now() - date.getTime()) / 86_400_000
  );

  if (differenceInDays <= 0) return "Today";
  if (differenceInDays === 1) return "Yesterday";
  if (differenceInDays < 7) return `${differenceInDays} days ago`;

  const differenceInWeeks = Math.floor(differenceInDays / 7);
  return differenceInWeeks === 1
    ? "1 week ago"
    : `${differenceInWeeks} weeks ago`;
}

function normalizeText(value: string | null | undefined) {
  return value ?? "";
}

function prettifyStatus(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "ready" || normalized === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "failed" || normalized === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalized === "processing" || normalized === "uploading") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function mapBackendProjectFile(file: BackendProjectFile): ProjectFile {
  const filename = normalizeText(file.filename);

  return {
    id: file.id ?? file.project_file_id ?? filename,
    filename,
    label: normalizeText(file.label) || filename,
    uploadStatus: normalizeText(file.upload_status) || "pending",
    processingStatus: normalizeText(file.processing_status) || "pending",
  };
}

function mapBackendProject(project: BackendProject): Project {
  const id = project.id ?? project.project_id ?? crypto.randomUUID();

  return {
    id,
    name: normalizeText(project.name) || "Untitled Project",
    description:
      normalizeText(project.description) ||
      "Knowledge base project ready for processing.",
    status: normalizeText(project.status) || "processing",
    files: (project.files ?? []).map(mapBackendProjectFile),
    updatedAt: formatUpdatedAt(project.updated_at ?? project.created_at),
  };
}

async function fetchProjects() {
  const response = await fetch(`${backendUrl}/api/v1/projects`, {
    headers: {
      accept: "application/json",
    },
    credentials: "include",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Unable to load projects."));
  }

  const projectData = Array.isArray(data) ? data : data.projects;
  return (projectData ?? []).map(mapBackendProject);
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="group rounded-[24px] border border-slate-200/90 bg-white/95 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_20px_50px_rgba(14,165,233,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950">
              {project.name}
            </h3>
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-500">
              {project.description}
            </p>
          </div>
        </div>

        <span
          className={
            "shrink-0 rounded-full border px-3 py-1 text-xs font-medium " +
            getStatusClasses(project.status)
          }
        >
          {prettifyStatus(project.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
            Files
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {project.files.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
            Updated
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {project.updatedAt}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
          Uploaded Files
        </p>
        {project.files.length ? (
          <div className="flex flex-wrap gap-2">
            {project.files.map((file) => (
              <span
                key={file.id}
                title={`${prettifyStatus(file.uploadStatus)} / ${prettifyStatus(file.processingStatus)}`}
                className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {file.filename}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No files uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

export function KnowledgeBasePage() {
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const syncProjects = useCallback(async () => {
    const nextProjects = await fetchProjects();
    setProjects(nextProjects);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialProjects() {
      try {
        const nextProjects = await fetchProjects();

        if (!ignore) {
          setProjects(nextProjects);
          setLoadError("");
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load projects.";
          setLoadError(message);
          showToast(message, "error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialProjects();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const hasProcessingProjects = useMemo(() => {
    return projects.some((project) =>
      ["processing", "uploading"].includes(project.status.toLowerCase())
    );
  }, [projects]);

  useEffect(() => {
    if (!hasProcessingProjects) return;

    const interval = window.setInterval(() => {
      syncProjects().catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unable to load projects.";
        showToast(message, "error");
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [hasProcessingProjects, showToast, syncProjects]);

  const filteredProjects = useMemo(() => {
    const query = projectSearch.toLowerCase();

    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)
      );
    });
  }, [projectSearch, projects]);

  function resetDialog() {
    setProjectName("");
    setProjectDescription("");
    setProjectFiles([]);
    setDialogOpen(false);
  }

  async function refreshProject(projectId: string) {
    const response = await fetch(`${backendUrl}/api/v1/projects/${projectId}`, {
      headers: {
        accept: "application/json",
      },
      credentials: "include",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(data, "Unable to refresh project."));
    }

    const refreshedProject = mapBackendProject(data as BackendProject);
    setProjects((current) => {
      const exists = current.some((project) => project.id === refreshedProject.id);

      if (!exists) {
        return [refreshedProject, ...current];
      }

      return current.map((project) =>
        project.id === refreshedProject.id ? refreshedProject : project
      );
    });
  }

  async function handleSaveProject() {
    const trimmedName = projectName.trim();
    const trimmedDescription = projectDescription.trim();

    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload: CreateProjectPayload = {
        name: trimmedName,
        description: trimmedDescription,
        files: projectFiles.map((file) => ({
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          file_size: file.size,
        })),
      };

      const createResponse = await fetch(`${backendUrl}/api/v1/projects`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          getErrorMessage(createData, "Unable to create project.")
        );
      }

      const createdProject = createData as CreateProjectResponse;

      await Promise.all(
        (createdProject.uploads ?? []).map(async (upload) => {
          const file = projectFiles.find((item) => item.name === upload.filename);

          if (!file) {
            throw new Error(`Missing selected file for ${upload.filename}.`);
          }

          const uploadResponse = await fetch(upload.upload_url, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Unable to upload ${file.name}.`);
          }
        })
      );

      const completeResponse = await fetch(
        `${backendUrl}/api/v1/projects/${createdProject.project_id}/complete`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
          },
          credentials: "include",
        }
      );
      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        throw new Error(
          getErrorMessage(completeData, "Unable to start project processing.")
        );
      }

      setProjects((current) => [
        mapBackendProject({
          ...(completeData as BackendProject),
          project_id: createdProject.project_id,
          name: trimmedName,
          description: trimmedDescription,
        }),
        ...current.filter((project) => project.id !== createdProject.project_id),
      ]);
      await refreshProject(createdProject.project_id);
      resetDialog();
      showToast("Project uploaded and processing started.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create project.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="rounded-[30px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_14px_45px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Project Cards
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isLoading
                  ? "Loading projects..."
                  : `${filteredProjects.length} projects`}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
              <div className="relative w-full lg:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search project cards..."
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <Button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="h-11 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(14,165,233,0.22)] hover:bg-sky-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[22rem] items-center justify-center rounded-[30px] border border-slate-200 bg-white/80 px-6 text-center text-sm font-medium text-slate-500">
            Loading projects...
          </div>
        ) : filteredProjects.length ? (
          <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-[30px] border border-dashed border-slate-300 bg-white/80 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-700">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
              No project found
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {loadError ||
                "Create a new project and its card will appear here so you can start generating knowledge."}
            </p>
            <Button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="mt-6 h-11 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </div>
        )}
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Add Project
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add project details and upload source files.
                </p>
              </div>

              <button
                type="button"
                onClick={resetDialog}
                disabled={isSubmitting}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-50"
                aria-label="Close project dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveProject();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Project Name
                </label>
                <Input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  required
                  placeholder="Healthcare Project"
                  className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Project Description
                </label>
                <Textarea
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="Healthcare knowledge base"
                  className="min-h-32 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-sm font-semibold text-slate-950">
                      Source files
                    </label>
                    <Input
                      type="file"
                      multiple
                      onChange={(event) =>
                        setProjectFiles(Array.from(event.target.files ?? []))
                      }
                      className="mt-3 h-auto cursor-pointer rounded-xl border-slate-200 bg-white py-2 text-sm shadow-none file:mr-3 file:rounded-lg file:bg-slate-100 file:px-3 file:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500/30"
                    />
                    {projectFiles.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {projectFiles.map((file) => (
                          <span
                            key={`${file.name}-${file.size}`}
                            className="max-w-full truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {file.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDialog}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border-slate-200 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Generate Knowledge Base"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
