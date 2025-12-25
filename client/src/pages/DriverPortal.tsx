import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Phone,
  Route,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DriverPortal() {
  const { data: driver, isLoading, refetch } = trpc.driverAuth.me.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driver) {
    return <DriverLogin onSuccess={() => refetch()} />;
  }

  return <DriverDashboard driver={driver} onLogout={() => refetch()} />;
}

// Driver Login Component
function DriverLogin({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const requestCodeMutation = trpc.driverAuth.requestCode.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setStep("code");
    },
    onError: (error) => {
      toast.error("Failed to send code", { description: error.message });
    },
  });

  const verifyCodeMutation = trpc.driverAuth.verifyCode.useMutation({
    onSuccess: () => {
      toast.success("Welcome back!");
      onSuccess();
    },
    onError: (error) => {
      toast.error("Invalid code", { description: error.message });
    },
  });

  const handleRequestCode = () => {
    if (phone.length >= 10) {
      requestCodeMutation.mutate({ phone });
    }
  };

  const handleVerifyCode = () => {
    if (code.length === 6) {
      verifyCodeMutation.mutate({ phone, code });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Driver Portal</CardTitle>
          <CardDescription>
            {step === "phone" ? "Enter your phone number to sign in" : "Enter the code sent to your phone"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleRequestCode}
                disabled={phone.length < 10 || requestCodeMutation.isPending}
              >
                {requestCodeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Login Code"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Login Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Code sent to {phone}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleVerifyCode}
                disabled={code.length !== 6 || verifyCodeMutation.isPending}
              >
                {verifyCodeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("phone")}>
                Use different number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Driver Dashboard Component
function DriverDashboard({ driver, onLogout }: { driver: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"routes" | "availability">("routes");
  
  const logoutMutation = trpc.driverAuth.logout.useMutation({
    onSuccess: () => {
      toast.success("Signed out");
      onLogout();
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{driver.name}</h1>
              <p className="text-xs text-muted-foreground">{driver.phone}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="container max-w-4xl mx-auto px-4">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab("routes")}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === "routes"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Route className="h-4 w-4 inline mr-2" />
              My Routes
            </button>
            <button
              onClick={() => setActiveTab("availability")}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === "availability"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Availability
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6">
        {activeTab === "routes" ? <MyRoutes /> : <AvailabilityCalendar />}
      </main>
    </div>
  );
}

// My Routes Component
function MyRoutes() {
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [vanId, setVanId] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  
  // Get routes for next 2 weeks
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);
  
  const { data: routes, isLoading } = trpc.driverPortal.myRoutes.useQuery({
    startDate: today.toISOString().split("T")[0],
    endDate: twoWeeksLater.toISOString().split("T")[0],
  });
  
  const { data: vans } = trpc.vans.list.useQuery();

  const updateRouteMutation = trpc.driverPortal.updateRoute.useMutation({
    onSuccess: () => {
      toast.success("Route updated");
      setSelectedRoute(null);
      utils.driverPortal.myRoutes.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update route", { description: error.message });
    },
  });

  const completeRouteMutation = trpc.driverPortal.completeRoute.useMutation({
    onSuccess: () => {
      toast.success("Route marked as completed");
      setSelectedRoute(null);
      utils.driverPortal.myRoutes.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to complete route", { description: error.message });
    },
  });

  const openRouteDialog = (route: any) => {
    setSelectedRoute(route);
    setVanId(route.assignment.vanId?.toString() || "");
    setNotes(route.assignment.notes || "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Upcoming Routes</h2>
      
      {routes?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No routes assigned yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {routes?.map((route) => (
            <Card
              key={route.assignment.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                route.assignment.status === "completed" ? "opacity-60" : ""
              }`}
              onClick={() => openRouteDialog(route)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center text-sm font-bold ${
                      route.assignment.routeType === "big-box"
                        ? "bg-orange-100 text-orange-800"
                        : route.assignment.routeType === "out-of-town"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {route.assignment.routeType === "big-box"
                      ? "BB"
                      : route.assignment.routeType === "out-of-town"
                      ? "OT"
                      : "REG"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {new Date(route.assignment.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {route.assignment.status === "completed" && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {route.assignment.routeType === "big-box"
                        ? "Big Box Route"
                        : route.assignment.routeType === "out-of-town"
                        ? "Out of Town Route"
                        : "Regular Route"}
                    </p>
                  </div>
                  {route.van ? (
                    <Badge variant="outline" className="gap-1">
                      <Truck className="h-3 w-3" />
                      {route.van.name}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">No van selected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Route Details Dialog */}
      <Dialog open={!!selectedRoute} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Route Details</DialogTitle>
            <DialogDescription>
              {selectedRoute &&
                new Date(selectedRoute.assignment.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </DialogDescription>
          </DialogHeader>
          {selectedRoute && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    selectedRoute.assignment.routeType === "big-box"
                      ? "bg-orange-100 text-orange-800"
                      : selectedRoute.assignment.routeType === "out-of-town"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {selectedRoute.assignment.routeType === "big-box"
                    ? "BB"
                    : selectedRoute.assignment.routeType === "out-of-town"
                    ? "OT"
                    : "REG"}
                </div>
                <div>
                  <p className="font-medium">
                    {selectedRoute.assignment.routeType === "big-box"
                      ? "Big Box Route"
                      : selectedRoute.assignment.routeType === "out-of-town"
                      ? "Out of Town Route"
                      : "Regular Route"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {selectedRoute.assignment.status}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Van</Label>
                <Select value={vanId} onValueChange={setVanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your van" />
                  </SelectTrigger>
                  <SelectContent>
                    {vans?.map((van) => (
                      <SelectItem key={van.id} value={van.id.toString()}>
                        {van.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any notes about this route..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {selectedRoute?.assignment.status !== "completed" && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    updateRouteMutation.mutate({
                      routeId: selectedRoute.assignment.id,
                      vanId: parseInt(vanId),
                      notes: notes || undefined,
                    })
                  }
                  disabled={!vanId || updateRouteMutation.isPending}
                >
                  Save Changes
                </Button>
                <Button
                  onClick={() =>
                    completeRouteMutation.mutate({
                      routeId: selectedRoute.assignment.id,
                      vanId: parseInt(vanId),
                      notes: notes || undefined,
                    })
                  }
                  disabled={!vanId || completeRouteMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Availability Calendar Component
function AvailabilityCalendar() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const utils = trpc.useUtils();

  // Calculate date range for 2 weeks
  const startDate = currentWeekStart.toISOString().split("T")[0];
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 13);
  const endDateStr = endDate.toISOString().split("T")[0];

  const { data: availability, isLoading } = trpc.driverPortal.myAvailability.useQuery({
    startDate,
    endDate: endDateStr,
  });

  const setAvailabilityMutation = trpc.driverPortal.setAvailability.useMutation({
    onSuccess: () => {
      utils.driverPortal.myAvailability.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update availability", { description: error.message });
    },
  });

  const navigateWeek = (direction: number) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    setCurrentWeekStart(newStart);
  };

  // Generate 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const getAvailabilityForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return availability?.find((a) => {
      const availDate = new Date(a.date).toISOString().split("T")[0];
      return availDate === dateStr;
    });
  };

  const toggleAvailability = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const current = getAvailabilityForDate(date);
    setAvailabilityMutation.mutate({
      date: dateStr,
      isAvailable: !current?.isAvailable,
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Set Your Availability</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[140px] text-center">
            {currentWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {days.map((date) => {
              const avail = getAvailabilityForDate(date);
              const isPast = date < today;
              const isToday = date.toDateString() === today.toDateString();

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isPast && toggleAvailability(date)}
                  disabled={isPast || setAvailabilityMutation.isPending}
                  className={`
                    aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all
                    ${isPast ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
                    ${isToday ? "ring-2 ring-primary ring-offset-2" : ""}
                    ${
                      avail?.isAvailable
                        ? "bg-green-100 border-green-400 text-green-800"
                        : avail
                        ? "bg-red-100 border-red-400 text-red-800"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }
                  `}
                >
                  <span className="text-lg font-semibold">{date.getDate()}</span>
                  {avail?.isAvailable ? (
                    <Check className="h-4 w-4" />
                  ) : avail ? (
                    <X className="h-4 w-4" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-green-100 border-2 border-green-400" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-red-100 border-2 border-red-400" />
          <span>Not Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gray-50 border-2 border-gray-200" />
          <span>Not Set</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Click on a day to toggle your availability. Your admin will see this when assigning routes.
      </p>
    </div>
  );
}
