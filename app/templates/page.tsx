"use client";

import { LayoutTemplate } from "lucide-react";
import { editProfileCode } from "../compoents/EditProfileModalCode";
import { appleAccordionCode } from "../compoents/componentCodes";
import EditProfileModal from "../compoents/EditProfileModal";
import AppleAccordion from "../compoents/apple-accordion/AppleAccordion";
import PageHeader from "../compoents/ui/PageHeader";
import TemplateCard from "./TemplateCard";

export default function TemplatesPage() {
  return (
    <main className="mk-page">
      <PageHeader
        icon={<LayoutTemplate size={13} />}
        eyebrow="Templates"
        title="Bigger pieces, ready to drop in"
        description="Full-featured UI compositions you can copy and paste straight into your project. Every preview is live, so try it before you take it."
      />

      <div className="flex flex-col gap-6">
        <TemplateCard
          id="edit-profile"
          title="Edit profile modal"
          description="A profile form with a live preview card. Click it to expand into a modal with a shared-layout transition; the preview updates as you type."
          code={editProfileCode}
          tags={["framer-motion", "layoutId", "portal"]}
          previewClassName="min-h-[520px] px-4 py-10 sm:px-10"
        >
          <EditProfileModal />
        </TemplateCard>

        <TemplateCard
          id="apple-accordion"
          title="Apple accordion"
          description="A physics-based expandable accordion inspired by apple.com, with a media panel that crossfades between items."
          code={appleAccordionCode}
          tags={["framer-motion", "spring", "accordion"]}
        >
          <AppleAccordion />
        </TemplateCard>
      </div>
    </main>
  );
}
