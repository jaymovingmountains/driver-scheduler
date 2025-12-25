import { useAuth } from "@/_core/hooks/useAuth";
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
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Calendar,
  CalendarDays,
  Check,
  Copy,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  PanelLeft,
  Phone,
  Plus,
  RefreshCw,
  Route,
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
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-2xl shadow-xl">
          <div className="p-4 bg-primary/10 rounded-full">
            <Truck className="h-12 w-12 text-primary" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-center">
              Driver Scheduling System
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Admin access required. Sign in to manage drivers, routes, and schedules.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full"
          >
            Sign in as Admin
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full bg-white rounded-2xl shadow-xl">
          <div className="p-4 bg-destructive/10 rounded-full">
            <Users className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-center">Access Denied</h1>
          <p className="text-sm text-muted-foreground text-center">
            You don't have admin privileges. Please contact the system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <AdminDashboardContent setSidebarWidth={setSidebarWidth} />
    </SidebarProvider>
  );
}

type AdminDashboardContentProps = {
  setSidebarWidth: (width: number) => void;
};

function AdminDashboardContent({ setSidebarWidth }: AdminDashboardContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => location.startsWith(item.path));
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Determine which content to show based on route
  const renderContent = () => {
    if (location === "/admin/drivers") {
      return <DriversPage />;
    }
    if (location === "/admin/routes") {
      return <RoutesPage />;
    }
    if (location === "/admin/schedule") {
      return <SchedulePage />;
    }
    if (location === "/admin/notifications") {
      return <NotificationsPage />;
    }
    return <DashboardOverview />;
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Truck className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold tracking-tight truncate">Admin Panel</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">{user?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">{user?.email || "-"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
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
        <main className="flex-1 p-4 md:p-6">{renderContent()}</main>
      </SidebarInset>
    </>
  );
}

// Dashboard Overview Component
function DashboardOverview() {
  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: routes } = trpc.routes.list.useQuery();

  const activeDrivers = drivers?.filter((d) => d.status === "active").length || 0;
  const pendingDrivers = drivers?.filter((d) => d.status === "pending").length || 0;
  const todayRoutes = routes?.filter((r) => {
    const today = new Date().toISOString().split("T")[0];
    const routeDate = new Date(r.assignment.date).toISOString().split("T")[0];
    return routeDate === today;
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
            <p className="text-xs text-muted-foreground">Ready for assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDrivers}</div>
            <p className="text-xs text-muted-foreground">Awaiting first login</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Routes</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayRoutes}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vans</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">T1-T6, Z1-Z5, M1</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Drivers</CardTitle>
            <CardDescription>Latest driver activity</CardDescription>
          </CardHeader>
          <CardContent>
            {drivers?.slice(0, 5).map((driver) => (
              <div key={driver.id} className="flex items-center gap-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{driver.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{driver.name}</p>
                  <p className="text-xs text-muted-foreground">{driver.phone}</p>
                </div>
                <Badge
                  variant={driver.status === "active" ? "default" : driver.status === "pending" ? "secondary" : "outline"}
                >
                  {driver.status}
                </Badge>
              </div>
            ))}
            {(!drivers || drivers.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">No drivers yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Routes</CardTitle>
            <CardDescription>Next scheduled assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {routes?.slice(0, 5).map((route) => (
              <div key={route.assignment.id} className="flex items-center gap-3 py-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    route.assignment.routeType === "big-box"
                      ? "bg-orange-100 text-orange-800"
                      : route.assignment.routeType === "out-of-town"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {route.assignment.routeType === "big-box" ? "BB" : route.assignment.routeType === "out-of-town" ? "OT" : "R"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{route.driver.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(route.assignment.date).toLocaleDateString()}
                  </p>
                </div>
                {route.van && <Badge variant="outline">{route.van.name}</Badge>}
              </div>
            ))}
            {(!routes || routes.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">No routes scheduled</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Drivers Page Component
function DriversPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<any>(null);
  const [notifyDriver, setNotifyDriver] = useState<any>(null);
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", email: "" });
  const [notification, setNotification] = useState({ subject: "", message: "", email: true, sms: true });

  const utils = trpc.useUtils();
  const { data: drivers, isLoading } = trpc.drivers.list.useQuery();

  const inviteMutation = trpc.drivers.invite.useMutation({
    onSuccess: (data) => {
      toast.success("Driver invited successfully", {
        description: `Login code: ${data.loginCode}`,
      });
      setInviteOpen(false);
      setNewDriver({ name: "", phone: "", email: "" });
      utils.drivers.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to invite driver", { description: error.message });
    },
  });

  const updateMutation = trpc.drivers.update.useMutation({
    onSuccess: () => {
      toast.success("Driver updated");
      setEditDriver(null);
      utils.drivers.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update driver", { description: error.message });
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

  const notifyMutation = trpc.drivers.notify.useMutation({
    onSuccess: (result) => {
      const sent = [];
      if (result.emailSent) sent.push("email");
      if (result.smsSent) sent.push("SMS");
      if (sent.length > 0) {
        toast.success(`Notification sent via ${sent.join(" and ")}`);
      } else {
        toast.warning("Notification could not be sent");
      }
      setNotifyDriver(null);
      setNotification({ subject: "", message: "", email: true, sms: true });
    },
    onError: (error) => {
      toast.error("Failed to send notification", { description: error.message });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drivers</h1>
          <p className="text-muted-foreground">Manage your driver roster</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
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
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : drivers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                        driver.status === "active" ? "default" : driver.status === "pending" ? "secondary" : "outline"
                      }
                    >
                      {driver.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(driver.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditDriver(driver)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setNotifyDriver(driver)}>
                          <Bell className="h-4 w-4 mr-2" />
                          Send Notification
                        </DropdownMenuItem>
                        {driver.status === "pending" && (
                          <DropdownMenuItem onClick={() => resendMutation.mutate({ id: driver.id })}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to remove this driver?")) {
                              deleteMutation.mutate({ id: driver.id });
                            }
                          }}
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

      {/* Invite Driver Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Driver</DialogTitle>
            <DialogDescription>Send an invitation to a new driver to join the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newDriver.name}
                onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={newDriver.email}
                onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                inviteMutation.mutate({
                  name: newDriver.name,
                  phone: newDriver.phone,
                  email: newDriver.email || undefined,
                })
              }
              disabled={!newDriver.name || !newDriver.phone || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Inviting..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={!!editDriver} onOpenChange={() => setEditDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
          </DialogHeader>
          {editDriver && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editDriver.name}
                  onChange={(e) => setEditDriver({ ...editDriver, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editDriver.phone}
                  onChange={(e) => setEditDriver({ ...editDriver, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editDriver.email || ""}
                  onChange={(e) => setEditDriver({ ...editDriver, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editDriver.status}
                  onValueChange={(value) => setEditDriver({ ...editDriver, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDriver(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateMutation.mutate({
                  id: editDriver.id,
                  name: editDriver.name,
                  phone: editDriver.phone,
                  email: editDriver.email || null,
                  status: editDriver.status,
                })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Driver Dialog */}
      <Dialog open={!!notifyDriver} onOpenChange={() => setNotifyDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>Send a message to {notifyDriver?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notify-subject">Subject</Label>
              <Input
                id="notify-subject"
                placeholder="Important Update"
                value={notification.subject}
                onChange={(e) => setNotification({ ...notification, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-message">Message</Label>
              <Textarea
                id="notify-message"
                placeholder="Your message here..."
                rows={4}
                value={notification.message}
                onChange={(e) => setNotification({ ...notification, message: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notification.email}
                  onChange={(e) => setNotification({ ...notification, email: e.target.checked })}
                  className="rounded"
                />
                <Mail className="h-4 w-4" />
                Email
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notification.sms}
                  onChange={(e) => setNotification({ ...notification, sms: e.target.checked })}
                  className="rounded"
                />
                <MessageSquare className="h-4 w-4" />
                SMS
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDriver(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                notifyMutation.mutate({
                  id: notifyDriver.id,
                  subject: notification.subject,
                  message: notification.message,
                  email: notification.email,
                  sms: notification.sms,
                })
              }
              disabled={!notification.subject || !notification.message || notifyMutation.isPending}
            >
              {notifyMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Routes Page Component
function RoutesPage() {
  const [assignOpen, setAssignOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
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

  const assignMutation = trpc.routes.assign.useMutation({
    onSuccess: () => {
      toast.success("Route assigned successfully");
      setAssignOpen(false);
      setNewRoute({ driverId: "", date: "", routeType: "regular", vanId: "", notes: "" });
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

  const activeDrivers = drivers?.filter((d) => d.status === "active") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Routes</h1>
          <p className="text-muted-foreground">Manage route assignments</p>
        </div>
        <Button onClick={() => setAssignOpen(true)}>
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
              <TableHead>Route Type</TableHead>
              <TableHead>Van</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
                  No routes assigned yet.
                </TableCell>
              </TableRow>
            ) : (
              routes?.map((route) => (
                <TableRow key={route.assignment.id}>
                  <TableCell className="font-medium">
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
                      className={
                        route.assignment.routeType === "big-box"
                          ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                          : route.assignment.routeType === "out-of-town"
                          ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                          : "bg-blue-100 text-blue-800 hover:bg-blue-100"
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
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to cancel this route?")) {
                              deleteMutation.mutate({ id: route.assignment.id });
                            }
                          }}
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
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Route</DialogTitle>
            <DialogDescription>
              Assign a route to a driver. Routes require 24 hours advance notice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select value={newRoute.driverId} onValueChange={(v) => setNewRoute({ ...newRoute, driverId: v })}>
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
                value={newRoute.date}
                onChange={(e) => setNewRoute({ ...newRoute, date: e.target.value })}
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Route Type</Label>
              <Select
                value={newRoute.routeType}
                onValueChange={(v: "regular" | "big-box" | "out-of-town") => setNewRoute({ ...newRoute, routeType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="big-box">Big Box</SelectItem>
                  <SelectItem value="out-of-town">Out of Town</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Van (optional)</Label>
              <Select value={newRoute.vanId} onValueChange={(v) => setNewRoute({ ...newRoute, vanId: v })}>
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
                value={newRoute.notes}
                onChange={(e) => setNewRoute({ ...newRoute, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                assignMutation.mutate({
                  driverId: parseInt(newRoute.driverId),
                  date: newRoute.date,
                  routeType: newRoute.routeType,
                  vanId: newRoute.vanId ? parseInt(newRoute.vanId) : undefined,
                  notes: newRoute.notes || undefined,
                })
              }
              disabled={!newRoute.driverId || !newRoute.date || assignMutation.isPending}
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
  
  const { data: availableDrivers } = trpc.availability.getForDate.useQuery({ date: selectedDate });
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
                {availableDrivers?.map((item) => (
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
  const { data: logs, isLoading } = trpc.notifications.logs.useQuery();

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
              logs?.map((log) => (
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
