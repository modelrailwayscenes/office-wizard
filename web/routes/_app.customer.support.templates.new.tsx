import { useNavigate } from "react-router";
import { AutoForm, SubmitResultBanner, AutoSubmit } from "@/components/auto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { api } from "../api";

export default function NewPlaybookPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/customer/support/templates");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/customer/support/templates")}
          aria-label="Close"
          className="hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold text-foreground">Create New Playbook</h2>
      </div>

      <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Playbook Details</CardTitle>
            <CardDescription className="text-muted-foreground">
              Define usage criteria and guidance. Avoid full canned email bodies.
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
