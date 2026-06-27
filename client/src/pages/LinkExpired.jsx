import { Card, CardContent } from "@/components/ui/card";
import { Link2Off } from "lucide-react";

export default function LinkExpired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-card-border">
        <CardContent className="pt-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-6">
            <Link2Off className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">This link is no longer active</h1>
          <p className="text-muted-foreground">
            Please contact the sender for an updated link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
