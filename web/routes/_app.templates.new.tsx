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
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/templates")}
            aria-label="Go back to templates"
            className="hover:bg-zinc-800 hover:text-amber-500"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Create New Template</h1>
            <p className="text-zinc-400 mt-1">
              Create a new email template for automated responses
            </p>
          </div>
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
    </div>
  );
}