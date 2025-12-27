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
  ClipboardCheck,
  GraduationCap,
  Loader2,
  LogOut,
  Phone,
  Route,
  Save,
  Star,
  Truck,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DRIVER_TOKEN_KEY } from "@/lib/auth-constants";

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
  const [rememberMe, setRememberMe] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const requestCodeMutation = trpc.driverAuth.requestCode.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setStep("code");
      setResendCooldown(60); // Start 60 second cooldown
    },
    onError: (error) => {
      toast.error("Failed to send code", { description: error.message });
    },
  });

  const utils = trpc.useUtils();

  const verifyCodeMutation = trpc.driverAuth.verifyCode.useMutation({
    onSuccess: (data) => {
      // Store token in localStorage for preview environment
      if (data.token) {
        localStorage.setItem(DRIVER_TOKEN_KEY, data.token);
      }
      toast.success("Welcome back!");
      // Invalidate and refetch
      utils.driverAuth.me.invalidate().then(() => {
        onSuccess();
      });
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
      verifyCodeMutation.mutate({ phone, code, rememberMe });
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                  Remember me for 90 days
                </Label>
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
              <Button
                variant="link"
                className="w-full text-sm"
                onClick={() => requestCodeMutation.mutate({ phone })}
                disabled={requestCodeMutation.isPending || resendCooldown > 0}
              >
                {resendCooldown > 0 
                  ? `Resend code in ${resendCooldown}s` 
                  : "Resend code"
                }
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
  const [activeTab, setActiveTab] = useState<"routes" | "availability" | "training">("routes");
  
  const logoutMutation = trpc.driverAuth.logout.useMutation({
    onSuccess: () => {
      // Clear token from localStorage
      localStorage.removeItem(DRIVER_TOKEN_KEY);
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
            <button
              onClick={() => setActiveTab("training")}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === "training"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-4 w-4 inline mr-2" />
              Training
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6">
        {activeTab === "routes" && <MyRoutes />}
        {activeTab === "availability" && <AvailabilityCalendar />}
        {activeTab === "training" && <MyTraining driverId={driver.id} />}
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

  // Track pending changes locally before saving
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  const saveAvailabilityMutation = trpc.driverPortal.saveAvailabilityBatch.useMutation({
    onSuccess: (data) => {
      utils.driverPortal.myAvailability.invalidate();
      setPendingChanges({});
      setHasUnsavedChanges(false);
      toast.success("Availability saved!", { 
        description: `${data.savedCount} day(s) updated. Your admin can now see your schedule.` 
      });
    },
    onError: (error) => {
      toast.error("Failed to save availability", { description: error.message });
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
    
    // Check pending changes first
    if (dateStr in pendingChanges) {
      return { isAvailable: pendingChanges[dateStr], isPending: true };
    }
    
    const saved = availability?.find((a) => {
      const availDate = new Date(a.date).toISOString().split("T")[0];
      return availDate === dateStr;
    });
    
    return saved ? { isAvailable: saved.isAvailable, isPending: false } : undefined;
  };

  const toggleAvailability = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const current = getAvailabilityForDate(date);
    const newValue = !current?.isAvailable;
    
    setPendingChanges(prev => ({
      ...prev,
      [dateStr]: newValue,
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    const availabilityEntries = Object.entries(pendingChanges).map(([date, isAvailable]) => ({
      date,
      isAvailable,
    }));
    
    if (availabilityEntries.length === 0) {
      toast.info("No changes to save");
      return;
    }
    
    saveAvailabilityMutation.mutate({ availability: availabilityEntries });
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
              const dateStr = date.toISOString().split("T")[0];
              const isPending = dateStr in pendingChanges;

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isPast && toggleAvailability(date)}
                  disabled={isPast || saveAvailabilityMutation.isPending}
                  className={`
                    aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all
                    ${isPast ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
                    ${isToday ? "ring-2 ring-primary ring-offset-2" : ""}
                    ${isPending ? "ring-2 ring-orange-400 ring-offset-1" : ""}
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
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded ring-2 ring-orange-400" />
            <span className="text-orange-600 font-medium">Unsaved</span>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex flex-col items-center gap-2">
        <Button 
          onClick={handleSave} 
          disabled={!hasUnsavedChanges || saveAvailabilityMutation.isPending}
          size="lg"
          className="w-full max-w-xs"
        >
          {saveAvailabilityMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saveAvailabilityMutation.isPending ? "Saving..." : "Save Availability"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {hasUnsavedChanges 
            ? "You have unsaved changes. Click Save to update your availability."
            : "Click on days to mark yourself available or unavailable, then save."}
        </p>
      </div>
    </div>
  );
}


// Training category labels for display
const TRAINING_CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  'mml-yard': { label: 'MML Yard Procedures', description: 'Keys, van features, and yard operations' },
  'warehouse': { label: 'Warehouse Procedures', description: 'Check-in, scanning, sorting, and check-out' },
  'on-road-delivery': { label: 'On-Road: Basic Delivery', description: 'Navigation, delivery basics, and customer interaction' },
  'on-road-apartments': { label: 'On-Road: Apartments', description: 'Apartment complex deliveries' },
  'on-road-businesses': { label: 'On-Road: Businesses', description: 'Business and commercial deliveries' },
  'on-road-first-attempts': { label: 'On-Road: First Attempts', description: 'Handling delivery attempts and re-deliveries' },
  'on-road-pickups': { label: 'On-Road: Pickups', description: 'Package pickup procedures' },
};

// Improvement area options
const IMPROVEMENT_AREAS = [
  'Time management',
  'Navigation skills',
  'Customer communication',
  'Package handling',
  'Vehicle operation',
  'Safety awareness',
  'Scanning accuracy',
  'Route efficiency',
  'Problem solving',
  'Following procedures',
];

// My Training Component
function MyTraining({ driverId }: { driverId: number }) {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [confidenceRating, setConfidenceRating] = useState(5);
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([]);
  const [trainerNotes, setTrainerNotes] = useState('');

  const { data: sessions, isLoading, refetch } = trpc.training.mySessions.useQuery({});
  
  const { data: sessionDetail, refetch: refetchDetail } = trpc.training.get.useQuery(
    { sessionId: selectedSession! },
    { enabled: selectedSession !== null }
  );
  
  const { data: progress } = trpc.training.getProgress.useQuery(
    { sessionId: selectedSession! },
    { enabled: selectedSession !== null }
  );

  const updateChecklistMutation = trpc.training.updateChecklistItem.useMutation({
    onSuccess: () => {
      refetchDetail();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const completeMutation = trpc.training.complete.useMutation({
    onSuccess: () => {
      toast.success('Training session completed!');
      setShowCompleteDialog(false);
      refetch();
      refetchDetail();
    },
    onError: (error) => {
      toast.error(`Failed to complete: ${error.message}`);
    },
  });

  const handleToggleItem = (itemId: number, currentState: boolean) => {
    updateChecklistMutation.mutate({
      itemId,
      isCompleted: !currentState,
    });
  };

  const handleComplete = () => {
    if (!selectedSession) return;
    completeMutation.mutate({
      sessionId: selectedSession,
      confidenceRating,
      improvementAreas: selectedImprovements,
      trainerNotes: trainerNotes || undefined,
    });
  };

  const toggleImprovement = (area: string) => {
    setSelectedImprovements(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Scheduled</span>;
      case 'in-progress':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">In Progress</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Cancelled</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100">{status}</span>;
    }
  };

  // If viewing a specific session
  if (selectedSession && sessionDetail) {
    const isTrainer = sessionDetail.trainerId === driverId;
    const canEdit = sessionDetail.status === 'in-progress' && isTrainer;
    const canComplete = sessionDetail.status === 'in-progress' && isTrainer;

    // Group checklist items by category
    const groupedItems: Record<string, typeof sessionDetail.checklistItems> = {};
    sessionDetail.checklistItems?.forEach((item: any) => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push(item);
    });

    return (
      <div className="space-y-4">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Sessions
        </Button>

        {/* Session Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Training Session</CardTitle>
                <CardDescription>
                  {new Date(sessionDetail.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </CardDescription>
              </div>
              {getStatusBadge(sessionDetail.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Trainer</p>
                  <p className="font-medium">{sessionDetail.trainer?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Trainee</p>
                  <p className="font-medium">{sessionDetail.trainee?.name}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span className="font-medium">{progress?.completed || 0} / {progress?.total || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress?.percentage || 0}%` }}
                />
              </div>
            </div>

            {/* Complete Button for Trainer */}
            {canComplete && (
              <Button onClick={() => setShowCompleteDialog(true)} className="w-full">
                Complete Training Session
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Completed Session Info */}
        {sessionDetail.status === 'completed' && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Training Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-green-700 mb-1">Confidence Rating</p>
                <div className="flex items-center gap-1">
                  {[...Array(10)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${i < (sessionDetail.confidenceRating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="font-bold ml-2">{sessionDetail.confidenceRating}/10</span>
                </div>
              </div>
              {sessionDetail.improvementAreas && (
                <div>
                  <p className="text-xs text-green-700 mb-1">Areas for Improvement</p>
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(sessionDetail.improvementAreas).map((area: string) => (
                      <span key={area} className="px-2 py-0.5 text-xs rounded bg-white border">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {sessionDetail.trainerNotes && (
                <div>
                  <p className="text-xs text-green-700 mb-1">Trainer Notes</p>
                  <p className="text-sm bg-white p-2 rounded border">{sessionDetail.trainerNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Checklist Categories */}
        <div className="space-y-3">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-orange-500" />
                  {TRAINING_CATEGORY_LABELS[category]?.label || category}
                </CardTitle>
                <CardDescription className="text-xs">
                  {TRAINING_CATEGORY_LABELS[category]?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {items.map((item: any) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        canEdit ? 'cursor-pointer hover:bg-muted/50' : ''
                      } ${item.isCompleted ? 'bg-green-50' : ''}`}
                      onClick={() => canEdit && handleToggleItem(item.id, item.isCompleted)}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        item.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {item.isCompleted && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className={item.isCompleted ? 'line-through text-muted-foreground' : ''}>
                        {item.itemLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complete Training Dialog */}
        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete Training</DialogTitle>
              <DialogDescription>
                Rate the trainee's confidence and note areas for improvement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Confidence Rating (1-10)</Label>
                <div className="flex items-center gap-1 flex-wrap">
                  {[...Array(10)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setConfidenceRating(i + 1)}
                      className="p-0.5"
                    >
                      <Star 
                        className={`h-6 w-6 ${i < confidenceRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold">{confidenceRating}/10</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Areas for Improvement</Label>
                <div className="grid grid-cols-2 gap-1">
                  {IMPROVEMENT_AREAS.map((area) => (
                    <div
                      key={area}
                      onClick={() => toggleImprovement(area)}
                      className={`p-2 rounded border cursor-pointer text-xs ${
                        selectedImprovements.includes(area)
                          ? 'bg-orange-100 border-orange-300 text-orange-800'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {area}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={trainerNotes}
                  onChange={(e) => setTrainerNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={completeMutation.isPending}>
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Completing...
                  </>
                ) : (
                  'Complete'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Sessions List
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!sessions?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Training Sessions</h3>
          <p className="text-sm text-muted-foreground">
            You don't have any training sessions assigned yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate sessions by role
  const asTrainer = sessions.filter((s: any) => s.trainerId === driverId);
  const asTrainee = sessions.filter((s: any) => s.traineeId === driverId);

  return (
    <div className="space-y-6">
      {/* As Trainer */}
      {asTrainer.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            Training Others ({asTrainer.length})
          </h3>
          {asTrainer.map((session: any) => (
            <Card 
              key={session.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedSession(session.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{session.trainee?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.confidenceRating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {session.confidenceRating}/10
                      </div>
                    )}
                    {getStatusBadge(session.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* As Trainee */}
      {asTrainee.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            My Training ({asTrainee.length})
          </h3>
          {asTrainee.map((session: any) => (
            <Card 
              key={session.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedSession(session.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">With {session.trainer?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.confidenceRating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {session.confidenceRating}/10
                      </div>
                    )}
                    {getStatusBadge(session.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
