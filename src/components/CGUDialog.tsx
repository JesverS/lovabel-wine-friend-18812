import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CGU_TEXT, CGU_TITLE, CGU_VERSION } from "@/content/cgu-text";

interface CGUDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CGUDialog({ open, onOpenChange }: CGUDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{CGU_TITLE}</DialogTitle>
          <DialogDescription>Version {CGU_VERSION}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {CGU_TEXT}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
