import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-card-border">
        <CardContent className="pt-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <p className="text-xl font-medium mb-2">Page Not Found</p>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/dashboard">
            <Button className="gap-2" data-testid="button-go-home">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
