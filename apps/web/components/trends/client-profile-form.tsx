'use client'

import { Button, Input, Label, Textarea } from '@mirrorline/ui'
import * as React from 'react'

import {
  IDLE_PROFILE_STATE,
  type ProfileActionResult,
} from '@/app/app/(studio)/trends/profile-form-state'
import type { ClientProfile } from '@/lib/workspace/client-profile'

/**
 * The Voice and Facts profile, on the screen that spends it (V2, P1.6).
 *
 * ## Why it lives here and not in Settings
 *
 * This is the form that makes a scan about *this* business rather than about
 * the niche in general, and the scan is one control away. A profile edited two
 * screens from its only consumer is a profile nobody fills in — and an empty
 * one has a visible cost right here: the fit scores get vaguer, and "Your
 * first 3 videos" cannot be written at all, because every draft would fail the
 * fact check. Settings is where account facts live; this is a brief.
 *
 * ## Free text, on purpose
 *
 * CLAUDE.md: the product is industry-agnostic. "How you work" is a sentence,
 * not a radio group — a dropdown reading *positive reinforcement / balanced*
 * would make this a dog-training app, and the next client is a dentist. The
 * same reasoning runs through the schema; see `client_profiles`.
 *
 * ## Collapsed once it has been answered
 *
 * `<details>` rather than a modal or a route: the answers matter every time a
 * scan runs and are looked at roughly never. A native disclosure keeps them
 * one key away, keeps the page a server component, and needs no state.
 */

export interface ClientProfileFormProps {
  readonly profile: ClientProfile
  /**
   * The server action, handed in rather than imported — the same security
   * decision `RunScanForm` documents at length. `server-only.test.ts` walks
   * the client import graph, and importing the action here would put this
   * component one hop from the SDK chokepoint.
   */
  readonly action: (
    previous: ProfileActionResult,
    formData: FormData,
  ) => Promise<ProfileActionResult>
  /** Whether anything has been filled in. Drives the summary line, not the form. */
  readonly isEmpty: boolean
}

/** `Reactive dog intensive — $450 for 4 sessions`, one per line. */
function servicesText(profile: ClientProfile): string {
  return profile.services
    .map((service) => (service.price ? `${service.name} — ${service.price}` : service.name))
    .join('\n')
}

export function ClientProfileForm({ profile, action, isEmpty }: ClientProfileFormProps) {
  const [state, formAction, isSaving] = React.useActionState(action, IDLE_PROFILE_STATE)

  /*
   * Open when there is nothing in it, because then it is the next thing to do;
   * closed once answered, because then it is reference.
   *
   * **State rather than `open={isEmpty}`**, and the difference is a bug I
   * shipped for ten minutes: saving the form makes the profile non-empty, the
   * server re-renders, and a prop-driven `open` then slammed the panel shut on
   * the person who had just pressed Save — taking the confirmation message
   * with it. The initial value is the server's answer; every toggle after that
   * is the reader's.
   */
  const [isOpen, setIsOpen] = React.useState(isEmpty)

  const isError = state.status === 'failed'

  return (
    <details
      className="rounded-lg border border-border bg-surface"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      open={isOpen}
    >
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4 text-label font-semibold text-text">
        About your business
        <span className="font-body text-meta font-normal text-text-muted">
          {isEmpty
            ? 'Not set — the scan scores fit against this, and your videos are written from it'
            : [
                profile.brandName,
                profile.serviceArea,
                profile.method,
                profile.services.length > 0
                  ? `${profile.services.length} service${profile.services.length === 1 ? '' : 's'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </span>
      </summary>

      <form action={formAction} aria-label="Your business" className="flex flex-col gap-4 px-5 pb-5">
        {/*
          First, because it is the name on the report we hand to a prospect
          (D131) — and the only field whose absence showed up as *our* account
          label on the cover of a document about somebody else's business.
        */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-brand">What your business is called</Label>
          <Input
            defaultValue={profile.brandName ?? ''}
            id="profile-brand"
            maxLength={120}
            name="brandName"
            placeholder="e.g. Oakline Dog Training"
            type="text"
          />
          <p className="m-0 text-meta text-text-muted">
            Printed on your niche report and its PDF, and the agents may say it in a script.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-area">Where you work</Label>
            <Input
              defaultValue={profile.serviceArea ?? ''}
              id="profile-area"
              maxLength={120}
              name="serviceArea"
              placeholder="e.g. Miami, or online only"
              type="text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-method">How you work</Label>
            <Input
              defaultValue={profile.method ?? ''}
              id="profile-method"
              maxLength={400}
              name="method"
              placeholder="e.g. positive reinforcement only"
              type="text"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-services">What you sell, one per line</Label>
          <Textarea
            defaultValue={servicesText(profile)}
            id="profile-services"
            name="services"
            placeholder={'Reactive dog intensive — $450 for 4 sessions\nPuppy start — $120'}
            rows={3}
          />
          <p className="m-0 text-caption text-text-muted">
            Put the price after a dash if you publish one. The scripts quote these, so write them
            as you would say them.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-avoid">Never recommend, one per line</Label>
          <Textarea
            defaultValue={profile.avoid.join('\n')}
            id="profile-avoid"
            name="avoid"
            placeholder={'Prong collars\nBoard-and-train'}
            rows={2}
          />
          {/*
            The field with teeth. A format contradicting the client's method is
            not a weak suggestion — it is one they would have to refuse in
            public, in their own niche.
          */}
          <p className="m-0 text-caption text-text-muted">
            Anything here is off limits for both agents: no format, topic or script will suggest it.
          </p>
        </div>

        <fieldset className="m-0 grid gap-4 border-0 p-0 md:grid-cols-3">
          <legend className="mb-1.5 p-0 text-label font-semibold text-text">
            Your accounts, if you have them
          </legend>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-instagram">Instagram</Label>
            <Input
              defaultValue={profile.handles.instagram ?? ''}
              id="profile-instagram"
              maxLength={60}
              name="instagram"
              placeholder="@handle"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-tiktok">TikTok</Label>
            <Input
              defaultValue={profile.handles.tiktok ?? ''}
              id="profile-tiktok"
              maxLength={60}
              name="tiktok"
              placeholder="@handle"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-youtube">YouTube</Label>
            <Input
              defaultValue={profile.handles.youtube ?? ''}
              id="profile-youtube"
              maxLength={60}
              name="youtube"
              placeholder="@handle"
              type="text"
            />
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={isSaving} type="submit" variant="secondary">
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          {state.message ? (
            <p
              className={
                isError ? 'm-0 text-caption text-on-danger-soft' : 'm-0 text-caption text-text-muted'
              }
              role="status"
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </details>
  )
}
