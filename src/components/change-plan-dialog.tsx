"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { UserProfile } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
  onSuccess?: () => void;
};

function ChangePlanDialog({ onOpenChange, open, profile, onSuccess }: Props) {
    console.log('profile', profile)
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(
    profile?.planType
  );
  const [showQuantumWarning, setShowQuantumWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && profile) {
      setSelectedPlan(profile.planType);
    }
  }, [open, profile]);

  const handlePlanChange = (value: string) => {
    setSelectedPlan(value);

    if (value === "quantum") {
      setShowQuantumWarning(true);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlan || !profile) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/update-user-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: profile.id,
          newPlanType: selectedPlan,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: result.message || "Plan updated successfully",
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({
        title: "Error",
        description:
          "Network error. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Plan</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Plans <strong>seed</strong> and <strong>edge</strong> are for{" "}
              <strong>individual</strong> account types.
            </p>
            <p>
              Plan <strong>quantum</strong> is for <strong>business</strong>{" "}
              account types.
            </p>
            <p>
              Changing from <strong>seed</strong> / <strong>edge</strong> to{" "}
              <strong>quantum</strong> will automatically change the user’s
              account type from <strong>individual</strong> to{" "}
              <strong>business</strong>.
            </p>
          </div>

          <Select value={selectedPlan} onValueChange={handlePlanChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seed">Seed</SelectItem>
              <SelectItem value="edge">Edge</SelectItem>
              <SelectItem value="quantum">Quantum</SelectItem>
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlan || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Change Plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showQuantumWarning}
        onOpenChange={setShowQuantumWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change account type?</AlertDialogTitle>
            <AlertDialogDescription>
              Selecting the <strong>quantum</strong> plan will change the
              selected user’s account type to <strong>business</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex justify-end gap-2">
            <AlertDialogCancel
              onClick={() => {
                setSelectedPlan(profile?.planType); // 🔁 reset selection
                setShowQuantumWarning(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ChangePlanDialog;
