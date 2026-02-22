/**
 * ARM UI Component Library
 * 
 * This is the main entry point for all UI components in the ARM platform.
 * Components follow the shadcn/ui pattern with ARM-specific customizations.
 * 
 * @module @/components/ui
 * @version 1.0.0
 */

// ============================================================================
// Core Form Components
// ============================================================================

export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";

export { Input } from "./input";
export { Textarea } from "./textarea";
export { Label } from "./label";
export { Checkbox } from "./checkbox";
export { Switch } from "./switch";
export type { SwitchProps } from "./switch";
export { Slider } from "./slider";

// ============================================================================
// Display Components
// ============================================================================

export { Badge, badgeVariants } from "./badge";
export type { BadgeProps } from "./badge";

export { Skeleton } from "./skeleton";
export { Progress } from "./progress";
export { Separator } from "./separator";
export type { SeparatorProps } from "./separator";

// ============================================================================
// Card & Container Components
// ============================================================================

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "./card";

// ============================================================================
// Avatar & Media Components
// ============================================================================

export { 
  Avatar, 
  AvatarImage, 
  AvatarFallback 
} from "./avatar";

// ============================================================================
// Selection Components
// ============================================================================

export { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectScrollDownButton, 
  SelectScrollUpButton, 
  SelectSeparator, 
  SelectTrigger, 
  SelectValue 
} from "./select";

export {
  Calendar
} from "./calendar";

// ============================================================================
// Dialog & Overlay Components
// ============================================================================

export { 
  Dialog, 
  DialogClose, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogOverlay, 
  DialogPortal, 
  DialogTitle, 
  DialogTrigger 
} from "./dialog";

export { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger
} from "./alert-dialog";

export { 
  Sheet, 
  SheetClose, 
  SheetContent, 
  SheetDescription, 
  SheetFooter, 
  SheetHeader, 
  SheetOverlay, 
  SheetPortal, 
  SheetTitle, 
  SheetTrigger 
} from "./sheet";

export {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "./popover";

// ============================================================================
// Menu Components
// ============================================================================

export { 
  DropdownMenu, 
  DropdownMenuPortal, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuLabel, 
  DropdownMenuItem, 
  DropdownMenuCheckboxItem, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuSeparator, 
  DropdownMenuShortcut, 
  DropdownMenuSub, 
  DropdownMenuSubTrigger, 
  DropdownMenuSubContent 
} from "./dropdown-menu";

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from "./command";

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport
} from "./navigation-menu";

// ============================================================================
// Navigation Components
// ============================================================================

export { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "./tabs";

export { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "./accordion";

// ============================================================================
// Feedback Components
// ============================================================================

export { Alert, AlertDescription, AlertTitle } from "./alert";
export type { AlertProps } from "./alert";

export { Toaster, useToast, toast } from "./use-toast";

export { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "./tooltip";

// ============================================================================
// Data Display Components
// ============================================================================

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "./table";

export { 
  ScrollArea, 
  ScrollBar 
} from "./scroll-area";

// ============================================================================
// ARM-Specific Components
// ============================================================================

export { HelpWidget } from "./help-widget";
