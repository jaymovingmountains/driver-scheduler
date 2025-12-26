import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { ADMIN_TOKEN_KEY } from "@/lib/auth-constants";
import {
  Bell,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Search,
  Shield,
  GripVertical,
  Trash2,
  Truck,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Drivers", path: "/admin/drivers" },
  { icon: Route, label: "Routes", path: "/admin/routes" },
  { icon: CalendarDays, label: "Schedule", path: "/admin/schedule" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  { icon: Shield, label: "Security Logs", path: "/admin/security" },
];

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function AdminDashboard() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  
  const utils = trpc.useUtils();
  const { data: admin, isLoading } = trpc.adminAuth.me.useQuery();
  
  const handleAuthSuccess = async () => {
    await utils.adminAuth.me.invalidate();
  };

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (isLoading) {
    return <DashboardLayoutSkeleton />;
  }

  // Show login form if not authenticated
  if (!admin) {
    return <AdminLogin onSuccess={handleAuthSuccess} />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <AdminContent 
        admin={admin} 
        sidebarWidth={sidebarWidth} 
        setSidebarWidth={setSidebarWidth}
        onLogout={handleAuthSuccess}
      />
    </SidebarProvider>
  );
}

// Admin Login Component (email-based code login)
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const utils = trpc.useUtils();
  
  // Get the admin email to display
  const { data: adminEmailData } = trpc.adminAuth.getAdminEmail.useQuery();
  
  const sendCodeMutation = trpc.adminAuth.sendCode.useMutation({
    onSuccess: () => {
      toast.success("Login code sent to your email");
      setStep("code");
      setResendCooldown(60); // Start 60 second cooldown
    },
    onError: (error: any) => {
      toast.error("Failed to send code", { description: error.message });
    },
  });

  const verifyCodeMutation = trpc.adminAuth.verifyCode.useMutation({
    onSuccess: async (data: any) => {
      // Store token in localStorage for Authorization header
      if (data.token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      }
      toast.success("Welcome back!");
      // Force refetch the me query to get the updated session
      await utils.adminAuth.me.refetch();
      onSuccess();
    },
    onError: (error: any) => {
      toast.error("Invalid code", { description: error.message });
    },
  });

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !sendCodeMutation.isPending) {
      sendCodeMutation.mutate({ email });
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6 && !verifyCodeMutation.isPending) {
      verifyCodeMutation.mutate({ email, code });
    }
  };

  // Pre-fill email if we have it
  useEffect(() => {
    if (adminEmailData?.email && !email) {
      setEmail(adminEmailData.email);
    }
  }, [adminEmailData?.email, email]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            {step === "email" 
              ? "Enter your admin email to receive a login code" 
              : "Enter the 6-digit code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                {adminEmailData?.email && (
                  <p className="text-xs text-muted-foreground">
                    Authorized admin: {adminEmailData.email}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!email || sendCodeMutation.isPending}
              >
                {sendCodeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Login Code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Login Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Code sent to {email}
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
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
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
              >
                Use different email
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => {
                  sendCodeMutation.mutate({ email });
                }}
                disabled={sendCodeMutation.isPending || resendCooldown > 0}
              >
                {resendCooldown > 0 
                  ? `Resend code in ${resendCooldown}s` 
                  : "Resend code"
                }
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Content Component (main dashboard)
function AdminContent({ 
  admin, 
  sidebarWidth, 
  setSidebarWidth,
  onLogout 
}: { 
  admin: { id: number; email: string }; 
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  onLogout: () => void;
}) {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      // Clear token from localStorage
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      toast.success("Signed out");
      onLogout();
    },
  });

  const activeMenuItem = menuItems.find(
    (item) => item.path === location || (item.path !== "/admin" && location.startsWith(item.path))
  ) || menuItems[0];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, MIN_WIDTH), MAX_WIDTH);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div ref={sidebarRef} className="relative">
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                Driver Scheduler
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={activeMenuItem?.path === item.path}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                      {admin.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">Admin</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">{admin.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-foreground">{activeMenuItem?.label ?? "Dashboard"}</span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-6 overflow-auto">
          {location === "/admin" && <DashboardPage />}
          {location === "/admin/drivers" && <DriversPage />}
          {location === "/admin/routes" && <RoutesPage />}
          {location === "/admin/schedule" && <SchedulePage />}
          {location === "/admin/notifications" && <NotificationsPage />}
          {location === "/admin/security" && <SecurityLogsPage />}
        </main>
      </SidebarInset>
    </>
  );
}

// Dashboard Page Component
function DashboardPage() {
  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: routes } = trpc.routes.list.useQuery();

  const activeDrivers = drivers?.filter((d) => d.status === "active").length || 0;
  const pendingDrivers = drivers?.filter((d) => d.status === "pending").length || 0;
  const todayRoutes = routes?.filter((r) => {
    const routeDate = new Date(r.assignment.date).toDateString();
    return routeDate === new Date().toDateString();
  }).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your driver scheduling system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDrivers}</div>
            <p className="text-xs text-muted-foreground">
              {pendingDrivers} pending invitations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Routes</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayRoutes}</div>
            <p className="text-xs text-muted-foreground">Assigned for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registered drivers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Routes</CardTitle>
            <CardDescription>Latest route assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {routes?.slice(0, 5).map((route) => (
              <div key={route.assignment.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold ${
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
                  <p className="text-sm font-medium">{route.driver.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(route.assignment.date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">{route.assignment.status}</Badge>
              </div>
            ))}
            {(!routes || routes.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No routes yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Driver Status</CardTitle>
            <CardDescription>Current driver overview</CardDescription>
          </CardHeader>
          <CardContent>
            {drivers?.slice(0, 5).map((driver) => (
              <div key={driver.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs">{driver.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{driver.name}</p>
                  <p className="text-xs text-muted-foreground">{driver.phone}</p>
                </div>
                <Badge
                  variant={
                    driver.status === "active"
                      ? "default"
                      : driver.status === "pending"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {driver.status}
                </Badge>
              </div>
            ))}
            {(!drivers || drivers.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No drivers yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Drivers Page Component
function DriversPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [inviteForm, setInviteForm] = useState({ name: "", phone: "", email: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", status: "active" as "active" | "inactive" | "pending" });
  const [lastLoginCode, setLastLoginCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: drivers, isLoading } = trpc.drivers.list.useQuery();

  // Filter drivers based on search and status
  const filteredDrivers = drivers?.filter((driver) => {
    const matchesSearch = 
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.includes(searchQuery) ||
      (driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const inviteMutation = trpc.drivers.invite.useMutation({
    onSuccess: (data) => {
      toast.success("Driver invited successfully");
      setLastLoginCode(data.loginCode);
      setInviteForm({ name: "", phone: "", email: "" });
      utils.drivers.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to invite driver", { description: error.message });
    },
  });

  const updateMutation = trpc.drivers.update.useMutation({
    onSuccess: () => {
      toast.success("Driver updated successfully");
      setShowEditDialog(false);
      setSelectedDriver(null);
      utils.drivers.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update driver", { description: error.message });
    },
  });

  const deleteMutation = trpc.drivers.delete.useMutation({
    onSuccess: () => {
      toast.success("Driver removed");
      setShowDeleteConfirm(false);
      setSelectedDriver(null);
      utils.drivers.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to remove driver", { description: error.message });
    },
  });

  const resendMutation = trpc.drivers.resendInvite.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation resent", {
        description: `New login code: ${data.loginCode}`,
      });
      utils.drivers.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to resend invitation", { description: error.message });
    },
  });

  const handleInvite = () => {
    inviteMutation.mutate(inviteForm);
  };

  const handleEdit = (driver: any) => {
    setSelectedDriver(driver);
    setEditForm({
      name: driver.name,
      phone: driver.phone,
      email: driver.email || "",
      status: driver.status,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedDriver) return;
    updateMutation.mutate({
      id: selectedDriver.id,
      name: editForm.name,
      phone: editForm.phone,
      email: editForm.email || null,
      status: editForm.status,
    });
  };

  const handleDeleteClick = (driver: any) => {
    setSelectedDriver(driver);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedDriver) return;
    deleteMutation.mutate({ id: selectedDriver.id });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "inactive":
        return "outline";
      default:
        return "outline";
    }
  };

  // Stats
  const totalDrivers = drivers?.length || 0;
  const activeDrivers = drivers?.filter((d) => d.status === "active").length || 0;
  const pendingDrivers = drivers?.filter((d) => d.status === "pending").length || 0;
  const inactiveDrivers = drivers?.filter((d) => d.status === "inactive").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drivers</h1>
          <p className="text-muted-foreground">Manage your delivery drivers</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDrivers}</p>
              <p className="text-xs text-muted-foreground">Total Drivers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeDrivers}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <RefreshCw className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingDrivers}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <UserMinus className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inactiveDrivers}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Drivers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredDrivers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchQuery || statusFilter !== "all"
                    ? "No drivers match your search criteria."
                    : "No drivers yet. Add your first driver to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredDrivers?.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm bg-primary/10 text-primary">
                          {driver.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {driver.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{driver.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {driver.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{driver.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(driver.status)}>
                      {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(driver)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        {driver.status === "pending" && (
                          <DropdownMenuItem onClick={() => resendMutation.mutate({ id: driver.id })}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                        )}
                        {driver.status === "active" && (
                          <DropdownMenuItem
                            onClick={() => updateMutation.mutate({ id: driver.id, status: "inactive" })}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        )}
                        {driver.status === "inactive" && (
                          <DropdownMenuItem
                            onClick={() => updateMutation.mutate({ id: driver.id, status: "active" })}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(driver)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Driver Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => {
        setShowInviteDialog(open);
        if (!open) {
          setLastLoginCode(null);
          setInviteForm({ name: "", phone: "", email: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>
              Add a new driver to your team. They'll receive a login code to access the driver portal.
            </DialogDescription>
          </DialogHeader>
          {lastLoginCode ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-800 mb-1">Driver Added Successfully!</p>
                <p className="text-sm text-muted-foreground mb-3">Share this login code with the driver:</p>
                <div className="flex items-center justify-center gap-2 bg-white p-3 rounded-md border">
                  <span className="text-3xl font-mono font-bold tracking-widest">{lastLoginCode}</span>
                  <Button variant="ghost" size="icon" onClick={() => copyCode(lastLoginCode)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  The driver can use this code with their phone number to sign in
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setLastLoginCode(null);
                  setShowInviteDialog(false);
                  setInviteForm({ name: "", phone: "", email: "" });
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name *</Label>
                  <Input
                    id="invite-name"
                    placeholder="John Doe"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-phone">Phone Number *</Label>
                  <Input
                    id="invite-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Driver will use this to sign in</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="driver@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Required for sending login codes</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!inviteForm.name || !inviteForm.phone || !inviteForm.email || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</>
                  ) : (
                    "Add Driver"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setSelectedDriver(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Update driver information and status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: "active" | "inactive" | "pending") =>
                    setEditForm({ ...editForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => {
        setShowDeleteConfirm(open);
        if (!open) setSelectedDriver(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Driver</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{selectedDriver?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removing...</>
              ) : (
                "Remove Driver"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Routes Page Component
function RoutesPage() {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({
    driverId: "",
    date: "",
    routeType: "regular" as "regular" | "big-box" | "out-of-town",
    vanId: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: routes, isLoading } = trpc.routes.list.useQuery();
  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: vans } = trpc.vans.list.useQuery();

  const activeDrivers = drivers?.filter((d) => d.status === "active") || [];

  const assignMutation = trpc.routes.assign.useMutation({
    onSuccess: () => {
      toast.success("Route assigned successfully");
      setShowAssignDialog(false);
      setAssignForm({ driverId: "", date: "", routeType: "regular", vanId: "", notes: "" });
      utils.routes.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to assign route", { description: error.message });
    },
  });

  const deleteMutation = trpc.routes.delete.useMutation({
    onSuccess: () => {
      toast.success("Route cancelled");
      utils.routes.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to cancel route", { description: error.message });
    },
  });

  const handleAssign = () => {
    assignMutation.mutate({
      driverId: parseInt(assignForm.driverId),
      date: assignForm.date,
      routeType: assignForm.routeType,
      vanId: assignForm.vanId ? parseInt(assignForm.vanId) : undefined,
      notes: assignForm.notes || undefined,
    });
  };

  // Set minimum date to tomorrow (24-hour notice)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Routes</h1>
          <p className="text-muted-foreground">Manage route assignments</p>
        </div>
        <Button onClick={() => setShowAssignDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Route
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Van</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : routes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No routes assigned yet
                </TableCell>
              </TableRow>
            ) : (
              routes?.map((route) => (
                <TableRow key={route.assignment.id}>
                  <TableCell>
                    {new Date(route.assignment.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{route.driver.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {route.driver.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        route.assignment.routeType === "big-box"
                          ? "border-orange-300 text-orange-700 bg-orange-50"
                          : route.assignment.routeType === "out-of-town"
                          ? "border-purple-300 text-purple-700 bg-purple-50"
                          : "border-blue-300 text-blue-700 bg-blue-50"
                      }
                    >
                      {route.assignment.routeType === "big-box"
                        ? "Big Box"
                        : route.assignment.routeType === "out-of-town"
                        ? "Out of Town"
                        : "Regular"}
                    </Badge>
                  </TableCell>
                  <TableCell>{route.van?.name || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        route.assignment.status === "completed"
                          ? "default"
                          : route.assignment.status === "cancelled"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {route.assignment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate({ id: route.assignment.id })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancel Route
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Assign Route Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Route</DialogTitle>
            <DialogDescription>
              Assign a route to a driver. Requires 24-hour advance notice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select value={assignForm.driverId} onValueChange={(v) => setAssignForm({ ...assignForm, driverId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {activeDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                min={minDate}
                value={assignForm.date}
                onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Must be at least 24 hours from now</p>
            </div>
            <div className="space-y-2">
              <Label>Route Type</Label>
              <Select
                value={assignForm.routeType}
                onValueChange={(v: any) => setAssignForm({ ...assignForm, routeType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="big-box">Big Box (once/week)</SelectItem>
                  <SelectItem value="out-of-town">Out of Town (once/week)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Van (optional)</Label>
              <Select value={assignForm.vanId} onValueChange={(v) => setAssignForm({ ...assignForm, vanId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select van" />
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
                placeholder="Any special instructions..."
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!assignForm.driverId || !assignForm.date || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Draggable Route Card Component
function DraggableRouteCard({ route, isDragging }: { route: any; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `route-${route.assignment.id}`,
    data: { route },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2 rounded-lg text-xs border cursor-grab active:cursor-grabbing transition-shadow ${
        route.assignment.routeType === 'big-box'
          ? 'bg-orange-50 border-orange-200 hover:shadow-orange-200'
          : route.assignment.routeType === 'out-of-town'
          ? 'bg-purple-50 border-purple-200 hover:shadow-purple-200'
          : 'bg-blue-50 border-blue-200 hover:shadow-blue-200'
      } ${isDragging ? 'opacity-50' : 'hover:shadow-md'}`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-1 mb-1">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
        <div
          className={`h-2 w-2 rounded-full ${
            route.assignment.routeType === 'big-box'
              ? 'bg-orange-500'
              : route.assignment.routeType === 'out-of-town'
              ? 'bg-purple-500'
              : 'bg-blue-500'
          }`}
        />
        <span className="font-medium truncate">{route.driver.name}</span>
      </div>
      <div className="text-muted-foreground">
        {route.assignment.routeType === 'big-box'
          ? 'Big Box'
          : route.assignment.routeType === 'out-of-town'
          ? 'Out of Town'
          : 'Regular'}
        {route.van && (
          <span className="ml-1 px-1 py-0.5 bg-white rounded text-[10px]">
            {route.van.name}
          </span>
        )}
      </div>
      {route.assignment.status !== 'assigned' && (
        <Badge
          variant={route.assignment.status === 'completed' ? 'default' : 'destructive'}
          className="mt-1 text-[10px] h-4"
        >
          {route.assignment.status}
        </Badge>
      )}
    </div>
  );
}

// Droppable Day Column Component
function DroppableDayColumn({ day, children, isOver }: { day: Date; children: React.ReactNode; isOver: boolean }) {
  const dateStr = day.toISOString().split('T')[0];
  const { setNodeRef } = useDroppable({
    id: `day-${dateStr}`,
    data: { date: dateStr, type: 'day' },
  });

  const isToday = day.toDateString() === new Date().toDateString();
  const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
  const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = day.getDate();

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[300px] flex flex-col transition-colors ${
        isOver ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
      } ${
        isToday ? 'bg-blue-50/50' : isPast ? 'bg-muted/30' : ''
      }`}
    >
      {/* Day Header */}
      <div className={`p-3 border-b text-center ${
        isToday ? 'bg-blue-100' : 'bg-muted/50'
      }`}>
        <p className="text-xs font-medium text-muted-foreground uppercase">{dayName}</p>
        <p className={`text-lg font-bold ${
          isToday ? 'text-blue-600' : ''
        }`}>{dayNum}</p>
      </div>
      {/* Day Content */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// Droppable Driver Cell Component
function DroppableDriverCell({ driverId, day, children, isOver }: { 
  driverId: number; 
  day: Date; 
  children: React.ReactNode; 
  isOver: boolean;
}) {
  const dateStr = day.toISOString().split('T')[0];
  const { setNodeRef } = useDroppable({
    id: `driver-${driverId}-day-${dateStr}`,
    data: { driverId, date: dateStr, type: 'driver-day' },
  });

  const isToday = day.toDateString() === new Date().toDateString();

  return (
    <TableCell
      ref={setNodeRef}
      className={`text-center p-1 transition-colors ${
        isOver ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''
      } ${
        isToday ? 'bg-blue-50/50' : ''
      }`}
    >
      {children}
    </TableCell>
  );
}

// Schedule Page Component - Weekly View with Drag and Drop
function SchedulePage() {
  const utils = trpc.useUtils();
  
  // Get the start of the current week (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  // Calculate week end (Sunday)
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  }, [weekStart]);

  // Format dates for API
  const startDateStr = weekStart.toISOString().split("T")[0];
  const endDateStr = weekEnd.toISOString().split("T")[0];

  // Fetch data for the entire week
  const { data: routes, isLoading: routesLoading } = trpc.routes.list.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
  });

  const { data: allAvailability, isLoading: availLoading } = trpc.schedule.allAvailability.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
  });

  const { data: drivers } = trpc.drivers.list.useQuery();

  // Reassign mutation
  const reassignMutation = trpc.routes.reassign.useMutation({
    onSuccess: () => {
      utils.routes.list.invalidate();
      toast.success('Route reassigned successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generate array of days for the week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });
  }, [weekStart]);

  // Navigate to previous/next week
  const goToPreviousWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  // Get routes for a specific date
  const getRoutesForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return routes?.filter((route) => {
      const routeDate = new Date(route.assignment.date).toISOString().split("T")[0];
      return routeDate === dateStr;
    }) || [];
  };

  // Get available drivers for a specific date
  const getAvailableDriversForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return allAvailability?.filter((item) => 
      item.availability.some((a: any) => a.date === dateStr && a.isAvailable)
    ).map((item) => item.driver) || [];
  };

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Format week range for display
  const formatWeekRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = weekStart.toLocaleDateString('en-US', options);
    const endStr = weekEnd.toLocaleDateString('en-US', { ...options, year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const route = active.data.current?.route;
    if (route) {
      setActiveRoute(route);
    }
  };

  // Handle drag over
  const handleDragOver = (event: any) => {
    const { over } = event;
    setOverId(over?.id || null);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveRoute(null);
    setOverId(null);

    if (!over) return;

    const route = active.data.current?.route;
    const dropData = over.data.current;

    if (!route || !dropData) return;

    const routeId = route.assignment.id;
    const currentDate = new Date(route.assignment.date).toISOString().split('T')[0];
    const currentDriverId = route.driver.id;

    let newDate: string | undefined;
    let newDriverId: number | undefined;

    if (dropData.type === 'day') {
      // Dropped on a day column - change date only
      newDate = dropData.date;
    } else if (dropData.type === 'driver-day') {
      // Dropped on a driver-day cell - change both driver and date
      newDate = dropData.date;
      newDriverId = dropData.driverId;
    }

    // Only reassign if something changed
    if ((newDate && newDate !== currentDate) || (newDriverId && newDriverId !== currentDriverId)) {
      reassignMutation.mutate({
        id: routeId,
        newDate: newDate !== currentDate ? newDate : undefined,
        newDriverId: newDriverId !== currentDriverId ? newDriverId : undefined,
      });
    }
  };

  const isLoading = routesLoading || availLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Schedule</h1>
          <p className="text-muted-foreground">Drag routes to reassign them to different days or drivers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToCurrentWeek} className="min-w-[180px]">
            {formatWeekRange()}
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>Regular</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500" />
          <span>Big Box</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-purple-500" />
          <span>Out of Town</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2 ml-4 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span>Drag to reassign</span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Weekly Calendar Grid */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 divide-x">
                {weekDays.map((day, index) => {
                  const dayRoutes = getRoutesForDate(day);
                  const availableDrivers = getAvailableDriversForDate(day);
                  const dateStr = day.toISOString().split('T')[0];
                  const isDropTarget = overId === `day-${dateStr}`;

                  return (
                    <DroppableDayColumn key={index} day={day} isOver={isDropTarget}>
                      {/* Assigned Routes */}
                      {dayRoutes.length > 0 ? (
                        dayRoutes.map((route) => (
                          <DraggableRouteCard
                            key={route.assignment.id}
                            route={route}
                            isDragging={activeRoute?.assignment.id === route.assignment.id}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">No routes</p>
                      )}

                      {/* Available Drivers Section */}
                      {availableDrivers.length > 0 && (
                        <div className="pt-2 border-t mt-2">
                          <p className="text-[10px] font-medium text-green-700 mb-1 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Available ({availableDrivers.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {availableDrivers.slice(0, 3).map((driver: any) => (
                              <span
                                key={driver.id}
                                className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 rounded"
                              >
                                {driver.name.split(' ')[0]}
                              </span>
                            ))}
                            {availableDrivers.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                                +{availableDrivers.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </DroppableDayColumn>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Routes This Week</CardDescription>
              <CardTitle className="text-3xl">{routes?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Regular Routes</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {routes?.filter((r) => r.assignment.routeType === 'regular').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Big Box Routes</CardDescription>
              <CardTitle className="text-3xl text-orange-600">
                {routes?.filter((r) => r.assignment.routeType === 'big-box').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Out of Town Routes</CardDescription>
              <CardTitle className="text-3xl text-purple-600">
                {routes?.filter((r) => r.assignment.routeType === 'out-of-town').length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Driver Assignment Table with Drop Zones */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Assignments This Week</CardTitle>
            <CardDescription>Drop routes on a cell to reassign to that driver and day</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Driver</TableHead>
                  {weekDays.map((day, i) => (
                    <TableHead key={i} className={`text-center ${
                      isToday(day) ? 'bg-blue-50' : ''
                    }`}>
                      {day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers?.filter((d) => d.status === 'active').map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {driver.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{driver.name}</span>
                      </div>
                    </TableCell>
                    {weekDays.map((day, i) => {
                      const dayRoutes = getRoutesForDate(day).filter(
                        (r) => r.driver.id === driver.id
                      );
                      const isAvailable = getAvailableDriversForDate(day).some(
                        (d: any) => d.id === driver.id
                      );
                      const dateStr = day.toISOString().split('T')[0];
                      const isDropTarget = overId === `driver-${driver.id}-day-${dateStr}`;

                      return (
                        <DroppableDriverCell
                          key={i}
                          driverId={driver.id}
                          day={day}
                          isOver={isDropTarget}
                        >
                          {dayRoutes.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {dayRoutes.map((route) => (
                                <Badge
                                  key={route.assignment.id}
                                  variant="outline"
                                  className={`text-[10px] justify-center cursor-grab ${
                                    route.assignment.routeType === 'big-box'
                                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                                      : route.assignment.routeType === 'out-of-town'
                                      ? 'border-purple-300 bg-purple-50 text-purple-700'
                                      : 'border-blue-300 bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {route.assignment.routeType === 'big-box'
                                    ? 'BB'
                                    : route.assignment.routeType === 'out-of-town'
                                    ? 'OT'
                                    : 'REG'}
                                  {route.van && ` ${route.van.name}`}
                                </Badge>
                              ))}
                            </div>
                          ) : isAvailable ? (
                            <div className="flex justify-center">
                              <div className="h-2 w-2 rounded-full bg-green-500" title="Available" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </DroppableDriverCell>
                      );
                    })}
                  </TableRow>
                ))}
                {(!drivers || drivers.filter((d) => d.status === 'active').length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No active drivers
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeRoute ? (
            <div
              className={`p-2 rounded-lg text-xs border shadow-lg ${
                activeRoute.assignment.routeType === 'big-box'
                  ? 'bg-orange-50 border-orange-300'
                  : activeRoute.assignment.routeType === 'out-of-town'
                  ? 'bg-purple-50 border-purple-300'
                  : 'bg-blue-50 border-blue-300'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <div
                  className={`h-2 w-2 rounded-full ${
                    activeRoute.assignment.routeType === 'big-box'
                      ? 'bg-orange-500'
                      : activeRoute.assignment.routeType === 'out-of-town'
                      ? 'bg-purple-500'
                      : 'bg-blue-500'
                  }`}
                />
                <span className="font-medium">{activeRoute.driver.name}</span>
              </div>
              <div className="text-muted-foreground">
                {activeRoute.assignment.routeType === 'big-box'
                  ? 'Big Box'
                  : activeRoute.assignment.routeType === 'out-of-town'
                  ? 'Out of Town'
                  : 'Regular'}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// Notifications Page Component
function NotificationsPage() {
  const { data: logs, isLoading } = trpc.notifications.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">View sent notification history</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No notifications sent yet
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {log.type === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                      {log.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.subject || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Security Logs Page Component
function SecurityLogsPage() {
  const [filter, setFilter] = useState<'all' | 'failed' | 'success'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'driver' | 'admin'>('all');
  
  const { data: stats } = trpc.securityLogs.stats.useQuery();
  const { data: logs, isLoading } = trpc.securityLogs.list.useQuery({
    limit: 100,
    failedOnly: filter === 'failed' ? true : undefined,
    successOnly: filter === 'success' ? true : undefined,
    attemptType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Logs</h1>
        <p className="text-muted-foreground">Monitor login attempts and security events</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Attempts</CardDescription>
            <CardTitle className="text-3xl">{stats?.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Successful Logins</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats?.successful || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed Attempts</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats?.failed || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed (24h)</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats?.recentFailed || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Attempts</SelectItem>
            <SelectItem value="failed">Failed Only</SelectItem>
            <SelectItem value="success">Successful Only</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="driver">Driver Logins</SelectItem>
            <SelectItem value="admin">Admin Logins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Identifier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : !logs?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No login attempts recorded yet
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {log.attemptType === "admin" ? (
                        <Shield className="h-3 w-3" />
                      ) : (
                        <Truck className="h-3 w-3" />
                      )}
                      {log.attemptType.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.identifier}</TableCell>
                  <TableCell>
                    <Badge variant={log.success ? "default" : "destructive"}>
                      {log.success ? "Success" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.failureReason || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.ipAddress || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
