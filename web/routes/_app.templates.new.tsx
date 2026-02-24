import { useNavigate } from "react-router";
import { AutoForm, SubmitResultBanner, AutoSubmit } from "@/components/auto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { api } from "../api";

export default function NewTemplatePage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/templates");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/templates")}
          aria-label="Close"
          className="hover:bg-zinc-800 hover:text-amber-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold text-white">Create New Template</h2>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Template Details</CardTitle>
            <CardDescription className="text-zinc-400">
              Fill in the information below to create a new email template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AutoForm
              action={api.template.create}
              onSuccess={handleSuccess}
            />
          </CardContent>
        </Card>
    </div>
  );
}