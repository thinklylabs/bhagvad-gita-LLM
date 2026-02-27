"use client";

import Link from "next/link";
import { useAuiState, ThreadListItemPrimitive, ThreadListPrimitive } from "@assistant-ui/react";
import type { Session } from "@supabase/supabase-js";
import { Thread } from "@/components/assistant-ui/thread";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SquarePen, MessageSquare, MoreHorizontal, Trash2, Archive, LogOut, ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Shows a pulsing dot only on the specific thread item that is both active AND currently generating.
function RunningIndicator() {
  const isMain = useAuiState((s) => s.threadListItem.isMain);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  if (!isMain || !isRunning) return null;
  return (
    <span className="ml-2 inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
  );
}

// ─── Single conversation item ─────────────────────────────────────────────────

function ConversationItem() {
  return (
    <SidebarMenuItem>
      <ThreadListItemPrimitive.Root className="w-full">
        <ThreadListItemPrimitive.Trigger asChild>
          <SidebarMenuButton
            className="w-full data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
            tooltip="Open conversation"
          >
            <MessageSquare className="shrink-0" />
            <span className="truncate">
              <ThreadListItemPrimitive.Title fallback="New conversation" />
            </span>
            <RunningIndicator />
          </SidebarMenuButton>
        </ThreadListItemPrimitive.Trigger>
      </ThreadListItemPrimitive.Root>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover className="data-[state=open]:opacity-100">
            <MoreHorizontal />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          className="w-44 border-stone-700 bg-stone-900 text-stone-200"
        >
          <ThreadListItemPrimitive.Archive asChild>
            <DropdownMenuItem className="cursor-pointer focus:bg-stone-800">
              <Archive className="mr-2 h-4 w-4 text-stone-400" />
              Archive
            </DropdownMenuItem>
          </ThreadListItemPrimitive.Archive>
          <ThreadListItemPrimitive.Delete asChild>
            <DropdownMenuItem className="cursor-pointer text-red-400 focus:bg-stone-800 focus:text-red-300">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </ThreadListItemPrimitive.Delete>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function GitaSidebar({ session }: { session: Session }) {
  const handleSignOut = async () => {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
  };
  const userEmail = session.user.email ?? "Unknown user";
  const metadataName =
    (session.user.user_metadata.full_name as string | undefined) ??
    (session.user.user_metadata.name as string | undefined) ??
    "";
  const derivedName = userEmail.includes("@")
    ? userEmail.split("@")[0]
    : "User";
  const userName = metadataName.trim() || derivedName;
  const fallbackText = userName.slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border pb-3">
        <div className="flex items-center justify-between px-1 pt-1">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-sm shadow-sm">
              🕉
            </div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Gita AI
            </span>
          </Link>

          <ThreadListPrimitive.New asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="New conversation"
            >
              <SquarePen className="h-4 w-4" />
              <span className="sr-only">New conversation</span>
            </Button>
          </ThreadListPrimitive.New>
        </div>
      </SidebarHeader>

      {/* Conversations list */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/50 px-2 py-1">
            Conversations
          </SidebarGroupLabel>
          <SidebarMenu>
            <ThreadListPrimitive.Root>
              <ThreadListPrimitive.Items
                components={{ ThreadListItem: ConversationItem }}
              />
            </ThreadListPrimitive.Root>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={session.user.user_metadata.avatar_url} alt={userEmail} />
                    <AvatarFallback className="rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                      {fallbackText}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{userName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/65">{userEmail}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border-stone-700 bg-stone-900 text-stone-200"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-stone-800"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

// ─── Shell export ─────────────────────────────────────────────────────────────

export function ChatShell({ session }: { session: Session }) {
  return (
    <SidebarProvider defaultOpen>
      <GitaSidebar session={session} />
      <SidebarInset className="flex h-screen min-h-0 flex-col bg-stone-950">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-stone-800/60 px-4">
          <SidebarTrigger className="-ml-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200" />
          <Separator orientation="vertical" className="h-5 bg-stone-800" />
          <span className="text-sm font-medium text-stone-400">Gita AI</span>
        </header>

        <div className="relative min-h-0 flex-1">
          <Thread />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
