import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle, Route } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 flex flex-col">
      {/* Header with Admin Link */}
      <header className="w-full py-4 px-6">
        <div className="container max-w-6xl mx-auto flex justify-end">
          <button
            onClick={() => setLocation("/admin")}
            className="text-sm text-muted-foreground hover:text-orange-600 transition-colors"
          >
            Admin Login →
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <img 
              src="/mml-logo.png" 
              alt="MML Logo" 
              className="h-20 mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Driver Portal
            </h1>
            <p className="text-muted-foreground">
              Moving Mountains Logistics
            </p>
          </div>

          {/* Driver Login Card */}
          <Card className="shadow-xl border-0">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Features List */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Set Your Availability</p>
                      <p className="text-sm text-muted-foreground">Mark which days you can work</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Route className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">View Your Routes</p>
                      <p className="text-sm text-muted-foreground">See your assigned deliveries</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">Quick & Easy</p>
                      <p className="text-sm text-muted-foreground">Sign in with your phone number</p>
                    </div>
                  </div>
                </div>

                {/* Sign In Button */}
                <Button 
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 h-12 text-lg" 
                  size="lg"
                  onClick={() => setLocation("/driver")}
                >
                  Sign In
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Use the phone number provided to your dispatcher
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Need help? Contact your dispatcher
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground">
        © 2025 Moving Mountains Logistics
      </footer>
    </div>
  );
}
