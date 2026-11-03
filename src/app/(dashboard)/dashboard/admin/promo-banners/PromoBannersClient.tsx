"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Modal, Switch } from "@heroui/react";
import {
  Megaphone,
  LayoutGrid,
  RectangleHorizontal,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  AlertTriangle,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import { Promo } from "@/types";
import { addPromo, updatePromo, deletePromo } from "@/lib/action/promo";
import ImageUploader from "@/components/shared/ImageUploader";
import PromoBanners from "@/components/homepage/PromoBanners";
import PromoStrip from "@/components/homepage/PromoStrip";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";

type Placement = "tile" | "strip";

interface PromoBannersClientProps {
  initialPromos: Promo[];
}

// The homepage has two promo blocks and they are filled in separately. This
// page shows them one under the other, each with its own list and its own
// preview, so editing a tile can never touch the strip by accident.
const PLACEMENT_INFO: Record<
  Placement,
  { title: string; subtitle: string; addLabel: string }
> = {
  tile: {
    title: "Promo Tiles",
    subtitle:
      "The two banners that sit side by side between the product rows.",
    addLabel: "Add Tile",
  },
  strip: {
    title: "Promo Strip",
    subtitle:
      "The wide band lower down the homepage. Only the first live strip is used.",
    addLabel: "Add Strip Banner",
  },
};

// Everything the owner can type for one banner. The `placement` is not in here
// on purpose: it is decided by which section you pressed "Add" in.
interface PromoDraft {
  name: string;
  image: string;
  imageAlt: string;
  subtitle: string;
  highlightText: string;
  title: string;
  badgeLabel: string;
  badgeValue: string;
  buttonText: string;
  href: string;
  order: number;
  isActive: boolean;
}

const EMPTY_DRAFT: PromoDraft = {
  name: "",
  image: "",
  imageAlt: "",
  subtitle: "",
  highlightText: "",
  title: "",
  badgeLabel: "",
  badgeValue: "",
  buttonText: "",
  href: "",
  order: 0,
  isActive: true,
};

/** The database id can arrive as `id` or `_id`, so read whichever is there. */
const idOf = (promo: Promo) => promo.id || promo._id || "";

/** Turns a saved banner into the shape the editor form uses. */
const draftFromPromo = (promo: Promo): PromoDraft => ({
  name: promo.name || "",
  image: promo.image || "",
  imageAlt: promo.imageAlt || "",
  subtitle: promo.subtitle || "",
  highlightText: promo.highlightText || "",
  title: promo.title || "",
  badgeLabel: promo.badgeLabel || "",
  badgeValue: promo.badgeValue || "",
  buttonText: promo.buttonText || "",
  href: promo.href || "",
  order: promo.order ?? 0,
  isActive: promo.isActive !== false,
});

export default function PromoBannersClient({
  initialPromos = [],
}: PromoBannersClientProps) {
  const router = useRouter();
  const { guardDemo } = useDemoAdmin();

  // The rows come from the server. Rather than copying them into state (which
  // goes stale after every save), we remember only what changed on this visit:
  //   removedIds - banners deleted here
  //   edits      - banners switched on/off or saved here
  //   added      - banners created here, until the refresh brings the real ones
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<Promo>>>({});
  const [added, setAdded] = useState<Promo[]>([]);

  // Editor modal
  const [editorPlacement, setEditorPlacement] = useState<Placement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PromoDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal
  const [promoToDelete, setPromoToDelete] = useState<Promo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const promos = useMemo(() => {
    const fromServer = Array.isArray(initialPromos) ? initialPromos : [];

    // Once the refresh lands, the real row replaces the one we added locally.
    const serverIds = fromServer.map(idOf);
    const localOnly = added.filter((promo) => !serverIds.includes(idOf(promo)));

    return [...fromServer, ...localOnly]
      .filter((promo) => !removedIds.includes(idOf(promo)))
      .map((promo) => ({ ...promo, ...(edits[idOf(promo)] || {}) }));
  }, [initialPromos, removedIds, edits, added]);

  const tiles = promos.filter((promo) => promo.placement === "tile");
  const strips = promos.filter((promo) => promo.placement === "strip");

  // ─── Open / close the editor ───────────────────────────────────────────────

  /** The next free position in one block, so a new banner lands last. */
  const nextOrder = (placement: Placement) => {
    const sameBlock = promos.filter((promo) => promo.placement === placement);
    if (sameBlock.length === 0) return 0;
    const highest = Math.max(
      ...sameBlock.map((promo) => Number(promo.order) || 0)
    );
    return highest + 1;
  };

  const openCreate = (placement: Placement) => {
    setEditorPlacement(placement);
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, order: nextOrder(placement) });
  };

  const openEdit = (promo: Promo) => {
    setEditorPlacement(promo.placement === "strip" ? "strip" : "tile");
    setEditingId(idOf(promo));
    setDraft(draftFromPromo(promo));
  };

  const closeEditor = () => {
    setEditorPlacement(null);
    setEditingId(null);
  };

  /** Every field on the form updates the draft through this one helper. */
  const setField = <K extends keyof PromoDraft>(key: K, value: PromoDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Save (create or update) ───────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardDemo()) return;
    if (!editorPlacement) return;

    if (!draft.name.trim()) {
      toast.error("Give the banner a name so you can recognise it in this list");
      return;
    }
    if (!draft.image.trim()) {
      toast.error("Add an image: a banner without one stays hidden on the homepage");
      return;
    }

    const payload = {
      name: draft.name.trim(),
      placement: editorPlacement,
      isActive: draft.isActive,
      order: Number(draft.order) || 0,
      image: draft.image.trim(),
      imageAlt: draft.imageAlt.trim(),
      subtitle: draft.subtitle.trim(),
      highlightText: draft.highlightText.trim(),
      title: draft.title.trim(),
      badgeLabel: draft.badgeLabel.trim(),
      badgeValue: draft.badgeValue.trim(),
      buttonText: draft.buttonText.trim(),
      href: draft.href.trim(),
    };

    setIsSaving(true);
    try {
      const res = editingId
        ? await updatePromo(editingId, payload)
        : await addPromo(payload);

      if (res?.success === false) {
        toast.error(res?.message || "Could not save the banner");
        return;
      }

      if (editingId) {
        // Show the new wording straight away; the refresh below confirms it.
        setEdits((prev) => ({ ...prev, [editingId]: payload }));
      } else if (res?.data) {
        setAdded((prev) => [...prev, res.data as Promo]);
      }

      toast.success(editingId ? "Banner updated" : "Banner added");
      closeEditor();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the banner");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Switch a banner on or off ─────────────────────────────────────────────

  const handleToggle = async (promo: Promo, isActive: boolean) => {
    if (guardDemo()) return;
    const id = idOf(promo);
    if (!id) return;

    // Move the switch immediately, then save.
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), isActive } }));

    try {
      const res = await updatePromo(id, { isActive });
      if (res?.success === false) {
        // The server refused, so put the switch back where it was.
        setEdits((prev) => ({
          ...prev,
          [id]: { ...(prev[id] || {}), isActive: promo.isActive },
        }));
        toast.error(res?.message || "Could not update the banner");
        return;
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the banner");
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    if (guardDemo()) return;
    if (!promoToDelete) return;
    const id = idOf(promoToDelete);
    if (!id) return;

    setIsDeleting(true);
    try {
      const res = await deletePromo(id);
      if (res?.success === false) {
        toast.error(res?.message || "Could not delete the banner");
        return;
      }
      setRemovedIds((prev) => [...prev, id]);
      toast.success("Banner deleted");
      setPromoToDelete(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the banner");
    } finally {
      setIsDeleting(false);
    }
  };

  // The draft, in the shape the real homepage components expect.
  const draftPreview: Promo = {
    ...draft,
    placement: editorPlacement ?? "tile",
    isActive: true,
    name: draft.name || "Untitled banner",
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Promo Banners</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
            Homepage <span className="text-primary">Promos</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1 max-w-2xl">
            The homepage has two promo blocks. Each one below is edited on its
            own list, and the preview under each list is the real component the
            storefront uses.
          </p>
        </div>

        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--surface-alt)] text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <Eye className="w-3.5 h-3.5 text-primary" />
          <span>View Homepage</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </Link>
      </div>

      {/* ── The two blocks, edited separately ── */}
      <PromoBlock
        placement="tile"
        promos={tiles}
        onAdd={() => openCreate("tile")}
        onEdit={openEdit}
        onDelete={setPromoToDelete}
        onToggle={handleToggle}
      />

      <PromoBlock
        placement="strip"
        promos={strips}
        onAdd={() => openCreate("strip")}
        onEdit={openEdit}
        onDelete={setPromoToDelete}
        onToggle={handleToggle}
      />

      {/* ════════════════════════════════════════════════════════
          ADD / EDIT BANNER MODAL
      ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={editorPlacement !== null}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
              <Modal.Header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <Modal.Heading className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" />
                  {editingId ? "Edit" : "Add"}{" "}
                  {editorPlacement === "strip" ? "Strip Banner" : "Promo Tile"}
                </Modal.Heading>
                <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg">
                  ✕
                </Modal.CloseTrigger>
              </Modal.Header>

              <Modal.Body>
                <form onSubmit={handleSave} id="promo-form" className="space-y-5">
                  {/* Live preview of exactly what is typed right now */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                      <Eye className="w-3 h-3" /> Preview — updates as you type
                    </p>
                    <div className="rounded-xl bg-[var(--surface-alt)] border border-dashed border-[var(--border-color)] overflow-hidden pointer-events-none">
                      {draft.image ? (
                        editorPlacement === "strip" ? (
                          <PromoStrip strip={draftPreview} />
                        ) : (
                          <PromoBanners banners={[draftPreview]} />
                        )
                      ) : (
                        <div className="py-8 text-center text-[11px] text-[var(--foreground-muted)]">
                          Add an image below to see the banner here.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name — only used in this dashboard list */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--foreground)]">
                      Banner Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={draft.name}
                      onChange={(e) => setField("name", e.target.value)}
                      placeholder="e.g. Weekend offer"
                      className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      required
                    />
                    <span className="text-[10px] text-[var(--foreground-muted)]">
                      Only shown here, so you can tell the banners apart.
                    </span>
                  </div>

                  {/* Image */}
                  <ImageUploader
                    label="Banner Image"
                    required
                    value={draft.image}
                    onChange={(url) => setField("image", url)}
                    urlPlaceholder="https://example.com/banner.webp"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Image Description
                      </label>
                      <Input
                        value={draft.imageAlt}
                        onChange={(e) => setField("imageAlt", e.target.value)}
                        placeholder="e.g. Beach umbrella on sand"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      />
                      <span className="text-[10px] text-[var(--foreground-muted)]">
                        Read out by screen readers. Left blank, the headline is used.
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Link
                      </label>
                      <Input
                        value={draft.href}
                        onChange={(e) => setField("href", e.target.value)}
                        placeholder="/shop?sort=newest"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs font-mono"
                      />
                      <span className="text-[10px] text-[var(--foreground-muted)]">
                        Left blank, the banner opens /shop.
                      </span>
                    </div>
                  </div>

                  {/* Wording */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Small Line
                      </label>
                      <Input
                        value={draft.subtitle}
                        onChange={(e) => setField("subtitle", e.target.value)}
                        placeholder="e.g. NEW SEASON"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Bold Word
                      </label>
                      <Input
                        value={draft.highlightText}
                        onChange={(e) => setField("highlightText", e.target.value)}
                        placeholder="e.g. UP TO 40%"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Main Line
                      </label>
                      <Input
                        value={draft.title}
                        onChange={(e) => setField("title", e.target.value)}
                        placeholder="e.g. OFF EVERYTHING"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Badge and button */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Badge Label
                      </label>
                      <Input
                        value={draft.badgeLabel}
                        onChange={(e) => setField("badgeLabel", e.target.value)}
                        placeholder="e.g. STARTING AT"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Badge Value
                      </label>
                      <Input
                        value={draft.badgeValue}
                        onChange={(e) => setField("badgeValue", e.target.value)}
                        placeholder="e.g. $19.99"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Button Text
                      </label>
                      <Input
                        value={draft.buttonText}
                        onChange={(e) => setField("buttonText", e.target.value)}
                        placeholder="e.g. Shop Now"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-[var(--foreground-muted)] bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                    Badge and button are free text. A tile with a badge always
                    shows it; with no button text the arrow on the badge becomes
                    the link.
                  </p>

                  {/* Order */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--foreground)]">
                      Position
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={String(draft.order)}
                      onChange={(e) =>
                        setField("order", parseInt(e.target.value) || 0)
                      }
                      placeholder="0"
                      className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs font-mono"
                    />
                    <span className="text-[10px] text-[var(--foreground-muted)]">
                      Lower numbers come first. The strip block only shows the
                      first live banner.
                    </span>
                  </div>

                  {/* On / off */}
                  <div className="flex items-center justify-between p-3.5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]/60">
                    <div>
                      <p className="text-xs font-bold text-[var(--foreground)]">
                        Live on Homepage
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        Off banners stay saved here but are hidden from shoppers.
                      </p>
                    </div>
                    <Switch
                      isSelected={draft.isActive}
                      onChange={(val) => setField("isActive", val)}
                      className="cursor-pointer"
                    >
                      <Switch.Content className="cursor-pointer">
                        <Switch.Control className="cursor-pointer">
                          <Switch.Thumb className="cursor-pointer" />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                  </div>
                </form>
              </Modal.Body>

              <Modal.Footer className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button
                  variant="outline"
                  onPress={closeEditor}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-[var(--border-color)] text-[var(--foreground)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="promo-form"
                  isDisabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-xs cursor-pointer hover:opacity-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? "Saving..." : editingId ? "Update Banner" : "Add Banner"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          DELETE CONFIRMATION
      ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!promoToDelete}
        onOpenChange={(open) => {
          if (!open) setPromoToDelete(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/40">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Delete Banner?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-[var(--foreground)]">
                    &ldquo;{promoToDelete?.name}&rdquo;
                  </span>
                  ? It disappears from the homepage right away.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onPress={() => setPromoToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-[var(--border-color)] text-[var(--foreground)]"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  isDisabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

// ─── One block: header, live preview, then its own rows ───────────────────────

interface PromoBlockProps {
  placement: Placement;
  promos: Promo[];
  onAdd: () => void;
  onEdit: (promo: Promo) => void;
  onDelete: (promo: Promo) => void;
  onToggle: (promo: Promo, isActive: boolean) => void;
}

function PromoBlock({
  placement,
  promos,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: PromoBlockProps) {
  const info = PLACEMENT_INFO[placement];
  const isStrip = placement === "strip";
  const BlockIcon = isStrip ? RectangleHorizontal : LayoutGrid;

  // The homepage only receives banners that are switched on and have an image,
  // so the preview uses exactly the same rule.
  const livePromos = promos.filter((promo) => promo.isActive && promo.image);

  return (
    <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-2xs overflow-hidden">
      {/* Block header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-[var(--border-color)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BlockIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              {info.title}
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[var(--surface-alt)] text-[var(--foreground-muted)]">
                {promos.length} {promos.length === 1 ? "banner" : "banners"}
              </span>
            </h2>
            <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
              {info.subtitle}
            </p>
          </div>
        </div>

        <Button
          onPress={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{info.addLabel}</span>
        </Button>
      </div>

      {/* Homepage preview — the real component, so nothing can drift */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--surface-alt)]">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-2">
          <Eye className="w-3 h-3" /> Homepage preview
        </p>
        <div className="rounded-xl bg-[var(--surface-elevated)] border border-dashed border-[var(--border-color)] overflow-hidden pointer-events-none">
          {livePromos.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-[var(--foreground-muted)]">
              Nothing live yet. Add a banner with an image and switch it on to
              see it here.
            </div>
          ) : isStrip ? (
            <PromoStrip strip={livePromos[0]} />
          ) : (
            <PromoBanners banners={livePromos} />
          )}
        </div>
      </div>

      {/* Rows of this block only */}
      {promos.length === 0 ? (
        <div className="py-10 text-center space-y-1">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            No banners in this block yet
          </p>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Press &ldquo;{info.addLabel}&rdquo; to create the first one.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-color)]">
          {promos.map((promo) => (
            <div
              key={idOf(promo)}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4"
            >
              {/* Thumbnail */}
              <div className="relative w-24 h-16 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] overflow-hidden shrink-0 flex items-center justify-center">
                {promo.image ? (
                  <Image
                    src={promo.image}
                    alt={promo.imageAlt || promo.name}
                    fill
                    sizes="96px"
                    className="object-contain p-1"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[var(--foreground-muted)]" />
                )}
              </div>

              {/* Name and wording */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--foreground)] truncate">
                  {promo.name || "Untitled banner"}
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                  {[promo.subtitle, promo.highlightText, promo.title]
                    .filter(Boolean)
                    .join(" ") || "No headline text yet"}
                </p>
                <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5 truncate">
                  Link:{" "}
                  <span className="font-mono">
                    {promo.href || "/shop (default)"}
                  </span>
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-semibold text-[var(--foreground-muted)]">
                    Order
                  </p>
                  <p className="text-xs font-bold font-mono text-[var(--foreground)]">
                    {promo.order ?? 0}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    isSelected={promo.isActive}
                    onChange={(val) => onToggle(promo, val)}
                    className="cursor-pointer"
                  >
                    <Switch.Content className="cursor-pointer">
                      <Switch.Control className="cursor-pointer">
                        <Switch.Thumb className="cursor-pointer" />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      promo.isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--foreground-muted)]"
                    }`}
                  >
                    {promo.isActive ? "Live" : "Off"}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5">
                  <button
                    onClick={() => onEdit(promo)}
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 dark:hover:bg-[var(--accent)]/10 transition-colors cursor-pointer"
                    title="Edit banner"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(promo)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
