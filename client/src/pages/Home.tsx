import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Route, Shield, Truck, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6">
            <Truck className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Driver Scheduling System
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Streamline your delivery operations with efficient driver management, route assignments, and real-time availability tracking.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Admin Portal Card */}
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-bl-full" />
            <CardHeader className="relative">
              <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Admin Portal</CardTitle>
              <CardDescription className="text-base">
                Manage drivers, assign routes, and send notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Invite and manage drivers</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Route className="h-4 w-4 text-primary" />
                  <span>Assign regular, Big Box, and Out of Town routes</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>View driver availability</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setLocation("/admin")}
              >
                Go to Admin Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Driver Portal Card */}
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-500/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-bl-full" />
            <CardHeader className="relative">
              <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-4">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Driver Portal</CardTitle>
              <CardDescription className="text-base">
                View routes, set availability, and log your work
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>Set your 2-week availability</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Route className="h-4 w-4 text-blue-600" />
                  <span>View assigned routes</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span>Select van and log work details</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                size="lg"
                onClick={() => setLocation("/driver")}
              >
                Go to Driver Portal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center mb-10">Key Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-xl mb-4">
                <Users className="h-6 w-6 text-green-700" />
              </div>
              <h3 className="font-semibold mb-2">Driver Management</h3>
              <p className="text-sm text-muted-foreground">
                Invite drivers via email with secure phone-based login
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-xl mb-4">
                <Route className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="font-semibold mb-2">Route Types</h3>
              <p className="text-sm text-muted-foreground">
                Regular, Big Box, and Out of Town routes with weekly limits
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-xl mb-4">
                <Calendar className="h-6 w-6 text-purple-700" />
              </div>
              <h3 className="font-semibold mb-2">Availability Calendar</h3>
              <p className="text-sm text-muted-foreground">
                2-week availability tracking for better scheduling
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-xl mb-4">
                <Truck className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="font-semibold mb-2">Van Tracking</h3>
              <p className="text-sm text-muted-foreground">
                12 predefined vans (T1-T6, Z1-Z5, M1) for assignment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur">
        <div className="container max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Driver Scheduling System • Manage your delivery operations efficiently
        </div>
      </footer>
    </div>
  );
}
