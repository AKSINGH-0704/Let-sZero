/**
 * First-login Teams welcome/education modal, shown once to each ROOT_ADMIN.
 *
 * Purely educational, not configuration: the "how many people" answer is
 * never sent to the server or used to gate anything — every plan already
 * includes the same 25 seats, so there is nothing to configure. The answer
 * only picks which explanation copy to show next (see ANSWER_COPY below).
 *
 * Three short screens (question -> education -> completion), ~20-30 seconds
 * end to end, always completed via a primary CTA rather than a "skip" link —
 * the point of this modal is that every admin actually sees the education.
 *
 * "Seen" state is a per-user localStorage flag, not a DB column — this stays
 * a frontend-only feature with no schema change, consistent with the
 * educational (not configuration) intent.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users, ArrowRight, Globe, ShieldCheck, LayoutGrid, BarChart3, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { hasSeenTeamsEducation, markTeamsEducationSeen } from "@/lib/teamsEducation";

const STEPS = ["question", "education", "done"];

const ANSWERS = [
  { id: "solo", label: "Just me", sub: "No teammates yet" },
  { id: "small", label: "2–5 people", sub: "A small crew" },
  { id: "medium", label: "5–10 people", sub: "A growing team" },
  { id: "large", label: "10–25 people", sub: "A full team" },
  { id: "enterprise", label: "More than 25", sub: "A large organization" },
];

// Personalized intro shown above the "Why Teams?" section on the education
// screen — tone, not gating, since every plan below Enterprise already
// includes the same 25 seats.
const ANSWER_INTRO = {
  solo: "You're all set to get started on your own. Whenever you're ready, you can invite teammates anytime — free, up to 25 people, no plan change needed.",
  small: "Once your sending domain is verified, invite your teammates — they'll share it immediately, with no separate setup on their end.",
  medium: "Every teammate you invite shares your verified sending domain and workspace automatically — no separate setup, and you control what each person can access.",
  large: "With a team this size, a shared workspace makes the biggest difference: everyone sends from the same verified domain, and centralized management keeps credits, permissions, and activity in one place.",
  enterprise: "For teams larger than 25, Enterprise is designed for you — unlimited seats, the same shared workspace and centralized management, with dedicated support as you grow.",
};

const WHY_TEAMS = [
  { icon: Globe, text: "A shared, verified sending domain — every teammate sends from the same trusted domain, automatically." },
  { icon: LayoutGrid, text: "One shared workspace — everyone's campaigns and contacts live in the same place." },
  { icon: BarChart3, text: "Centralized management — credits, activity, and audit logs in one view." },
  { icon: ShieldCheck, text: "Role-based permissions — control what each person can see and do." },
  { icon: UserPlus, text: "Invite anytime — no rush, nothing to set up until you're ready." },
];

// Completion-screen closing note + optional secondary link, per answer.
const COMPLETION = {
  solo: { note: "Whenever you're ready, invite teammates from Team Management — up to 25 people, free.", linkLabel: "Go to Team Management", linkTo: "/app/users" },
  small: { note: "Invite teammates anytime from Team Management — up to 25 people, free.", linkLabel: "Go to Team Management", linkTo: "/app/users?invite=1" },
  medium: { note: "Invite teammates anytime from Team Management — up to 25 people, free.", linkLabel: "Go to Team Management", linkTo: "/app/users?invite=1" },
  large: { note: "Invite teammates anytime from Team Management — up to 25 people, free.", linkLabel: "Go to Team Management", linkTo: "/app/users?invite=1" },
  enterprise: { note: "We're here whenever you're ready to talk about Enterprise.", linkLabel: "Contact us about Enterprise", linkTo: "/contact?reason=enterprise" },
};

export default function TeamsWelcomeModal() {
  const { user, isRootAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("question");
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    if (!isRootAdmin || !user?.id) return;
    // M37: shared with PostPurchaseActivation, so a customer who just had Teams
    // explained on the activation panel is not asked "How many people do you
    // plan to work with?" the moment they land on the dashboard. See
    // @/lib/teamsEducation.
    if (!hasSeenTeamsEducation(user.id)) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRootAdmin, user?.id]);

  const markSeen = () => markTeamsEducationSeen(user?.id);

  const handleOpenChange = (next) => {
    if (!next) markSeen();
    setOpen(next);
  };

  const selectAnswer = (id) => {
    setAnswer(id);
    setStep("education");
  };

  const finish = () => {
    markSeen();
    setOpen(false);
  };

  const goToLink = (path) => {
    markSeen();
    setOpen(false);
    setLocation(path);
  };

  if (!isRootAdmin) return null;

  const stepIndex = STEPS.indexOf(step);
  const completion = answer ? COMPLETION[answer] : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-teams-welcome">
        {/* Progress indicator — 3 short screens, always visible so the flow
            never feels open-ended even though there's no skip option. */}
        <div className="flex items-center justify-center gap-1.5 pb-1" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        {step === "question" && (
          <>
            <DialogHeader>
              <DialogTitle>Welcome to RepMail</DialogTitle>
              <DialogDescription>
                How many people do you plan to work with?
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 pt-2">
              {ANSWERS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => selectAnswer(a.id)}
                  data-testid={`button-teams-answer-${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-card-border bg-card px-4 py-3 text-left transition-colors hover:border-primary hover:bg-accent"
                >
                  <span>
                    <span className="block text-sm font-medium">{a.label}</span>
                    <span className="block text-xs text-muted-foreground">{a.sub}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === "education" && answer && (
          <>
            <DialogHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="pt-2">Why Teams?</DialogTitle>
              <DialogDescription>{ANSWER_INTRO[answer]}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2.5 pt-1">
              {WHY_TEAMS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-3">
              <Button onClick={() => setStep("done")} data-testid="button-teams-welcome-continue">
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "done" && completion && (
          <>
            <DialogHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="pt-2">You're all set</DialogTitle>
              <DialogDescription>{completion.note}</DialogDescription>
            </DialogHeader>
            {/* M37: was `flex-col-reverse`, which reverses the VISUAL order but
                not the DOM order. On a phone a sighted user saw "Got it" first
                and "Go to Team Management" second, while a keyboard or screen
                reader user met them the other way round — WCAG 1.3.2 / 2.4.3.
                Ordering the DOM the way it is actually read on mobile (primary
                first) and using `sm:flex-row-reverse` to put the primary on the
                right at desktop keeps both presentations conventional without
                the two orders ever disagreeing. */}
            <div className="flex flex-col gap-2 pt-3 sm:flex-row-reverse sm:justify-start">
              <Button onClick={finish} data-testid="button-teams-welcome-done">
                Got it
              </Button>
              <Button variant="outline" onClick={() => goToLink(completion.linkTo)} data-testid="button-teams-welcome-link">
                {completion.linkLabel}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
