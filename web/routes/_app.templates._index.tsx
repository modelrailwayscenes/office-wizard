import { useNavigate } from "react-router";
import { useFindMany } from "@gadgetinc/react";
import { AutoTable } from "@/components/auto";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import { api } from "../api";

export default function TemplatesIndex() {
  const navigate = useNavigate();
  const [{ data: templates, fetching, error }] = useFindMany(api.template, {
    first: 100,
    sort: { updatedAt: "Descending" },
  });

  const formatCategory = (category: string): string => {
    return category
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatSafetyLevel = (level: string): string => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="flex-1 overflow-auto bg-slate-950 p-8">
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-red-400 text-lg">Error loading templates: {error.message}</p>
        </div>
      </div>
    );
  }

  if (fetching && !templates) {
    return (
      <div className="flex-1 overflow-auto bg-slate-950 p-8">
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-slate-400 text-lg">Loading templates...</p>
        </div>
      </div>
    );
  }

  const isEmpty = !templates || templates.length === 0;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
        <h1 className="text-2xl font-semibold text-white">Email Templates</h1>
        <p className="text-sm text-slate-400 mt-1">Create and manage email response templates</p>
      </div>
      
      <div className="px-8 pb-8">
        <div className="flex justify-end mb-6">
        <Button 
          onClick={() => navigate("/templates/new")}
          className="bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/50 rounded-lg border border-slate-800">
          <FileText className="h-20 w-20 text-slate-700 mb-6" />
          <h2 className="text-2xl font-semibold text-white mb-2">
            No email templates yet
          </h2>
          <p className="text-slate-400 mb-8 text-center max-w-md">
            Create your first template to automate email responses and save time
          </p>
          <Button 
            onClick={() => navigate("/templates/new")}
            className="bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-lg border border-slate-800">
          <AutoTable
            model={api.template}
            columns={[
              {
                header: "Name",
                field: "name",
              },
              {
                header: "Category",
                render: ({ record }: { record: any }) => (
                  <Badge variant="secondary" className="bg-slate-800 text-slate-100 border-slate-700">
                    {formatCategory(record.category)}
                  </Badge>
                ),
              },
              {
                header: "Subject",
                field: "subject",
              },
              {
                header: "Safety Level",
                render: ({ record }: { record: any }) => (
                  <span className="text-slate-300">{formatSafetyLevel(record.safetyLevel)}</span>
                ),
              },
              {
                header: "Auto Send",
                render: ({ record }: { record: any }) => (
                  <span className="text-slate-300">{record.autoSendEnabled ? "Yes" : "No"}</span>
                ),
              },
              {
                header: "Updated",
                render: ({ record }: { record: any }) => (
                  <span className="text-slate-400">{formatDate(record.updatedAt)}</span>
                ),
              },
            ]}
            onClick={(record: any) => navigate(`/templates/${record.id}`)}
          />
        </div>
      )}
      </div>
    </div>
  );
}