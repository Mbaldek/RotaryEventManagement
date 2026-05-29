// Élysée design system — barrel export.
// Import editorial components, app shell, form controls, status pills and tokens
// from a single path:
//   import { Eyebrow, PageShell, TextInput, StatusPill, NAVY } from "@/components/design";

// — Tokens —
export * from "@/components/design/tokens";
export * from "@/components/design/tokens.app"; // DANGER / WARNING / FOCUS_RING / …

// — Editorial (extracted from Index.jsx) —
export { default as Eyebrow } from "@/components/design/Eyebrow";
export { default as EditorialTitle } from "@/components/design/EditorialTitle";
export { default as HeroEventCard } from "@/components/design/HeroEventCard";
export { default as ActionRow } from "@/components/design/ActionRow";
export { default as UpcomingList } from "@/components/design/UpcomingList";

// — App shell —
export { default as PageShell } from "@/components/design/shell/PageShell";
export { default as TopNav } from "@/components/design/shell/TopNav";
export { default as NavMenu } from "@/components/design/shell/NavMenu";
export { default as Footer } from "@/components/design/shell/Footer";
export { default as LanguageSwitcher } from "@/components/design/shell/LanguageSwitcher";
export { default as SkipLink } from "@/components/design/shell/SkipLink";
export { default as SafeBackLink } from "@/components/design/shell/SafeBackLink";
export { default as CockpitTabs } from "@/components/design/shell/CockpitTabs";

// — Form controls —
export { default as Field } from "@/components/design/form/Field";
export { default as TextInput } from "@/components/design/form/TextInput";
export { default as Textarea } from "@/components/design/form/Textarea";
export { default as Select } from "@/components/design/form/Select";
export { default as TagSelect } from "@/components/design/form/TagSelect";
export { default as Dropzone } from "@/components/design/form/Dropzone";
export { default as RadioYesNo } from "@/components/design/form/RadioYesNo";
export { default as DateField } from "@/components/design/form/DateField";

// — Auth —
export { default as MagicLinkLogin } from "@/components/design/auth/MagicLinkLogin";

// — Status & data —
export { default as StatusPill, STATUS_MAP } from "@/components/design/StatusPill";
export { default as Skeleton, SkeletonList } from "@/components/design/Skeleton";
