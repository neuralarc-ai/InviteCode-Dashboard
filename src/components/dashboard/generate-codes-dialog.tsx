'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { generateCodesAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const [isPending, startTransition] = React.useTransition();
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? 'Generating...' : 'Generate Codes'}
    </Button>
  );
}

export function GenerateCodesDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleAction = async (formData: FormData) => {
    const result = await generateCodesAction(formData);
    if (result.success) {
      setIsOpen(false);
      // Not using toast for success per instructions
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Generate Codes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form ref={formRef} action={handleAction}>
          <DialogHeader>
            <DialogTitle>Generate Invite Codes</DialogTitle>
            <DialogDescription>
              Specify how many unique invite codes you want to create.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="count" className="text-right">
                Amount
              </Label>
              <Input
                id="count"
                name="count"
                type="number"
                defaultValue="10"
                className="col-span-3"
                min="1"
                max="100"
              />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
