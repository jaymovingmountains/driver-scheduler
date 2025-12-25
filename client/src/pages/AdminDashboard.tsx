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
import {
  Bell,
  Calendar,
  CalendarDays,
  Check,
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
  Phone,
  Plus,
  RefreshCw,
  Route,
  Shield,
  Trash2,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Drivers", path: "/admin/drivers" },
  { icon: Route, label: "Routes", path: "/admin/routes" },
  { icon: CalendarDays, label: "Schedule", path: "/admin/schedule" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
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
  const { data: adminExists, isLoading: checkingExists } = trpc.adminAuth.exists.useQuery();
  
  const handleAuthSuccess = async () => {
    await utils.adminAuth.me.invalidate();
    await utils.adminAuth.exists.invalidate();
  };

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (isLoading || checkingExists) {
    return <DashboardLayoutSkeleton />;
  }

  // Show setup form if no admin exists yet
  if (!adminExists) {
    return <AdminSetup onSuccess={handleAuthSuccess} />;
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

// Admin Setup Component (first-time setup)
function AdminSetup({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const setupMutation = trpc.adminAuth.setup.useMutation({
    onSuccess: () => {
      toast.success("Admin account created! Please sign in.");
      onSuccess();
    },
    onError: (error) => {
      toast.error("Setup failed", { description: error.message });
    },
  });

  const handleSetup = () => {
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setupMutation.mutate({ username, password });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Setup Admin Account</CardTitle>
          <CardDescription>
            Create your admin credentials to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSetup}
            disabled={!username || !password || !confirmPassword || setupMutation.isPending}
          >
            {setupMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Admin Account"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Login Component
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();
  
  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: async (data) => {
      // Store token in localStorage for Authorization header
      if (data.token) {
        localStorage.setItem('admin_session_token', data.token);
      }
      toast.success("Welcome back!");
      // Force refetch the me query to get the updated session
      await utils.adminAuth.me.refetch();
      onSuccess();
    },
    onError: (error) => {
      toast.error("Login failed", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password && !loginMutation.isPending) {
      loginMutation.mutate({ username, password });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Sign in to manage drivers and routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!username || !password || loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
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
  admin: { id: number; username: string }; 
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
      localStorage.removeItem('admin_session_token');
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
                      {admin.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">{admin.username}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">Administrator</p>
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
  const [inviteForm, setInviteForm] = useState({ name: "", phone: "", email: "" });
  const [lastLoginCode, setLastLoginCode] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: drivers, isLoading } = trpc.drivers.list.useQuery();

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

  const deleteMutation = trpc.drivers.delete.useMutation({
    onSuccess: () => {
      toast.success("Driver removed");
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
    },
    onError: (error) => {
      toast.error("Failed to resend invitation", { description: error.message });
    },
  });

  const handleInvite = () => {
    inviteMutation.mutate(inviteForm);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drivers</h1>
          <p className="text-muted-foreground">Manage your delivery drivers</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Driver
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : drivers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No drivers yet. Invite your first driver to get started.
                </TableCell>
              </TableRow>
            ) : (
              drivers?.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{driver.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{driver.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {driver.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    {driver.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {driver.email}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {driver.status === "pending" && (
                          <DropdownMenuItem onClick={() => resendMutation.mutate({ id: driver.id })}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate({ id: driver.id })}
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

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Driver</DialogTitle>
            <DialogDescription>
              Send an invitation to a new driver. They'll receive a login code.
            </DialogDescription>
          </DialogHeader>
          {lastLoginCode ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Driver Login Code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-mono font-bold tracking-widest">{lastLoginCode}</span>
                  <Button variant="ghost" size="icon" onClick={() => copyCode(lastLoginCode)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with the driver to let them sign in
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setLastLoginCode(null);
                  setShowInviteDialog(false);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="driver@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteForm.name || !inviteForm.phone || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? "Inviting..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </>
          )}
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

// Schedule Page Component
function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  
  const { data: scheduleData } = trpc.schedule.byDate.useQuery({ date: selectedDate });
  const availableDrivers = scheduleData?.available;
  const { data: routes } = trpc.routes.list.useQuery({
    startDate: selectedDate,
    endDate: selectedDate,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">View driver availability and assignments</p>
      </div>

      <div className="flex gap-4 items-center">
        <Label>Select Date:</Label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Available Drivers
            </CardTitle>
            <CardDescription>
              Drivers available on {new Date(selectedDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableDrivers?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No drivers marked as available
              </p>
            ) : (
              <div className="space-y-2">
                {availableDrivers?.map((item: any) => (
                  <div key={item.driver.id} className="flex items-center gap-3 p-2 rounded-lg bg-green-50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-green-100">
                        {item.driver.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{item.driver.name}</p>
                      <p className="text-xs text-muted-foreground">{item.driver.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-blue-600" />
              Assigned Routes
            </CardTitle>
            <CardDescription>
              Routes for {new Date(selectedDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {routes?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No routes assigned</p>
            ) : (
              <div className="space-y-2">
                {routes?.map((route) => (
                  <div key={route.assignment.id} className="flex items-center gap-3 p-2 rounded-lg bg-blue-50">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
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
                        : "R"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{route.driver.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {route.assignment.routeType === "big-box"
                          ? "Big Box"
                          : route.assignment.routeType === "out-of-town"
                          ? "Out of Town"
                          : "Regular"}
                        {route.van && ` • ${route.van.name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
