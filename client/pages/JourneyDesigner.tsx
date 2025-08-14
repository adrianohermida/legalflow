import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { JourneyDesigner } from "../components/JourneyDesigner";

export default function JourneyDesignerPage() {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();

  const handleSave = () => {
    navigate("/jornadas");
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b bg-white">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/jornadas")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Jornadas
          </Button>
        </div>
      </div>

      <JourneyDesigner templateId={templateId} onSave={handleSave} />
    </div>
  );
}
