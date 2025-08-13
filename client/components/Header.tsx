import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import {
  Search,
  Grid3X3,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  User,
  HelpCircle,
} from "lucide-react";
import { cn } from "../lib/utils";

interface HeaderProps {
  userType: "advogado" | "cliente";
  onAppLauncherToggle: () => void;
  onNotificationToggle: () => void;
  onChatToggle: () => void;
  onSearchClick: () => void;
  user?: any;
  logout?: () => void;
}

export function Header({
  userType,
  onAppLauncherToggle,
  onNotificationToggle,
  onChatToggle,
  onSearchClick,
  user,
  logout,
}: HeaderProps) {
  const notificationCount = 3; // TODO: Get from real data
  const hasUnreadMessages = true; // TODO: Get from real data

  const searchPlaceholder =
    userType === "advogado"
      ? "Buscar CNJ/CPF/Cliente..."
      : "Buscar nos seus processos...";

  // Get auth mode for display
  const authMode = localStorage.getItem("auth-mode") as
    | "demo"
    | "supabase"
    | null;

  return (
    <>
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-brand-700 text-white px-4 py-2 rounded-lg z-50"
      >
        Pular para o conteúdo principal
      </a>

      <header className="app-header" role="banner">
        {/* Left section - App Launcher & Search */}
        <div className="flex items-center flex-1 space-x-4">
          {/* App Launcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onAppLauncherToggle}
            className="text-neutral-600 hover:text-neutral-900"
            title="Apps (Alt+A)"
          >
            <Grid3X3 className="w-5 h-5" />
          </Button>

          {/* Global Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white"
              onClick={onSearchClick}
              readOnly
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-neutral-400 bg-neutral-100 rounded border">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right section - Actions & User */}
        <div className="flex items-center space-x-2">
          {/* Chat Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onChatToggle}
            className={cn(
              "relative text-neutral-600 hover:text-neutral-900",
              hasUnreadMessages && "text-brand-700",
            )}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {hasUnreadMessages && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-700 rounded-full" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onNotificationToggle}
            className="relative text-neutral-600 hover:text-neutral-900"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs font-medium"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar} alt={user?.email || ""} />
                  <AvatarFallback className="bg-brand-100 text-brand-700 font-medium">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none">
                    {user?.email || "Usuário"}
                  </p>
                  {user?.oab && (
                    <p className="text-xs leading-none text-muted-foreground">
                      OAB: {user.oab}
                    </p>
                  )}
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        userType === "advogado"
                          ? "border-brand-200 text-brand-700"
                          : "border-brand-200 text-brand-700",
                      )}
                    >
                      {userType === "advogado" ? "Advogado" : "Cliente"}
                    </Badge>
                    {authMode === "demo" && (
                      <Badge variant="secondary" className="text-xs">
                        Demo
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Ajuda</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
