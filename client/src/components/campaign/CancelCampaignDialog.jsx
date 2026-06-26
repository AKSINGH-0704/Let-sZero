import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

function getDialogErrorMessage(err) {
  if (!err) return null;
  if (err.status === 403) return "You don't have permission to cancel this campaign.";
  if (err.status === 404) return "Campaign not found — it may have been deleted.";
  return err.message || "Something went wrong. Please try again.";
}

export default function CancelCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onConfirm,
  isPending,
  error,
}) {
  const sentSoFar = campaign?.sentEmails ?? 0;
  const creditsConsumed = campaign?.creditsUsed ?? 0;
  const errorMessage = getDialogErrorMessage(error);

  // Non-retryable errors: close dialog and understand state. Retryable (5xx/network): keep button active.
  const isNonRetryable = error?.status === 403 || error?.status === 404;

  return (
    <Dialog open={open} onOpenChange={isPending ? () => {} : onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby="cancel-campaign-desc">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
              <AlertTriangle
                className="h-5 w-5 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
            </div>
            <div>
              <DialogTitle>Cancel Campaign?</DialogTitle>
              <DialogDescription id="cancel-campaign-desc" className="mt-1">
                This will immediately stop{" "}
                <span className="font-medium text-foreground">
                  {campaign?.name || "this campaign"}
                </span>
                . Emails already sent cannot be recalled.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <p className="text-xl font-semibold text-green-600">{formatNumber(sentSoFar)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Emails sent so far</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <p className="text-xl font-semibold">
              {formatNumber(creditsConsumed > 0 ? creditsConsumed : sentSoFar)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Credits used</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Credits already consumed will not be refunded.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30"
          >
            <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            autoFocus
            data-testid="button-keep-sending"
          >
            Keep Sending
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending || isNonRetryable}
            data-testid="button-confirm-cancel"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Cancelling…
              </>
            ) : (
              "Cancel Campaign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
