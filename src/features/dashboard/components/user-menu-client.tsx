"use client";

import { CalendarDays, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GuardedLink, useNavigationGuard } from "@/components/navigation/navigation-guard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function UserMenuClient({
  name,
  email,
  image,
  showAdmin,
}: {
  name: string;
  email: string;
  image: string | null;
  showAdmin: boolean;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const guard = useNavigationGuard();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={name}>
          <Avatar className="size-9">
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback className="bg-brand-100 font-semibold text-brand-800">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{name}</span>
          <span className="truncate font-normal text-muted-foreground text-xs">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <GuardedLink href="/dashboard">
            <CalendarDays />
            {t("myEvents")}
          </GuardedLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <GuardedLink href="/dashboard/settings">
            <Settings />
            {t("settings")}
          </GuardedLink>
        </DropdownMenuItem>
        {showAdmin ? (
          <DropdownMenuItem asChild>
            <GuardedLink href="/admin">
              <ShieldCheck />
              {t("moderation")}
            </GuardedLink>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            guard.attempt(async () => {
              await signOut();
              router.replace("/");
              router.refresh();
            })
          }
        >
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
