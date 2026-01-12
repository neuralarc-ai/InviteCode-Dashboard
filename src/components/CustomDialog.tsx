import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?:
    | "default"
    | "destructive"
    | "ghost"
    | "link"
    | "secondary"
    | "outline";
  onConfirm?: () => void;
  onCancel?: () => void;
  hideOptions?: boolean;
  isPending?: boolean;
  children: React.ReactNode;
};

function CustomDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText = "Cancel",
  confirmText = "Confirm",
  confirmVariant = "default",
  onConfirm,
  onCancel,
  hideOptions = false,
  isPending = false,
  children,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">{children}</div>
        {!hideOptions && (
          <DialogFooter>
            <Button onClick={onCancel} variant="outline" disabled={isPending}>
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              variant={confirmVariant}
              disabled={isPending}
            >
              {isPending ? "Loading..." : confirmText}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CustomDialog;
