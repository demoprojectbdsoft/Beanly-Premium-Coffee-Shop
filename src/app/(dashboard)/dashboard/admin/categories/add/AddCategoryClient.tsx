"use client";

import React, { useState } from "react";
import {
  Tabs,
  Tab,
  TabList,
  TabPanel,
  Card,
  Input,
  TextArea,
  Button,
  Select,
  ListBox,
  Switch,
} from "@heroui/react";
import { FolderPlus, Layers, Check } from "lucide-react";
import ImageUploader from "@/components/shared/ImageUploader";
import { Category, SubCategory } from "@/types";
import { addCategory } from "@/lib/action/categories";
import { addSubCategory } from "@/lib/action/subCategories";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";

interface AddCategoryClientProps {
  categories?: Category[];
}

// ─── Converts a name into a URL-friendly slug ─────────────────────────────────
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special characters
    .replace(/[\s_-]+/g, "-") // replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ""); // remove leading/trailing hyphens
}

export default function AddCategoryClient({
  categories = [],
}: AddCategoryClientProps) {
  const router = useRouter();
  const { guardDemo } = useDemoAdmin();

  // ── State for the "Add Category" form ──────────────────────────────────────
  const [categoryData, setCategoryData] = useState<Category>({
    name: "",
    slug: "",
    image: "",
    description: "",
    isActive: true,
  });

  // ── State for the "Add Subcategory" form ────────────────────────────────────
  const [subCategoryData, setSubCategoryData] = useState<SubCategory>({
    categoryId: "",
    name: "",
    slug: "",
    image: "",
    description: "",
    isActive: true,
  });

  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [isSubCategorySubmitting, setIsSubCategorySubmitting] = useState(false);

  // ── Category form handlers ──────────────────────────────────────────────────

  function handleCategoryNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setCategoryData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  }

  async function handleCategorySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guardDemo()) return;
    setIsCategorySubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const payload = {
      ...data,
      name: categoryData.name,
      slug: categoryData.slug,
      image: categoryData.image,
      description: categoryData.description,
      isActive: categoryData.isActive,
    };

    try {
      const result = await addCategory(payload);
      if (result?.success) {
        toast.success("Category added successfully!");
        router.push("/dashboard/admin/products");
        router.refresh();
      } else {
        toast.error(result?.message || "Failed to add category");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add category";
      toast.error(message);
      console.error("Failed to add category:", err);
    } finally {
      setIsCategorySubmitting(false);
    }
  }

  // ── Subcategory form handlers ───────────────────────────────────────────────

  function handleSubCategoryNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setSubCategoryData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  }

  async function handleSubCategorySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guardDemo()) return;
    if (!subCategoryData.categoryId) {
      toast.error("Please select a parent category");
      return;
    }
    setIsSubCategorySubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const payload = {
      ...data,
      categoryId: subCategoryData.categoryId,
      name: subCategoryData.name,
      slug: subCategoryData.slug,
      image: subCategoryData.image,
      description: subCategoryData.description,
      isActive: subCategoryData.isActive,
    };

    try {
      const result = await addSubCategory(payload);
      if (result?.success) {
        toast.success("Subcategory added successfully!");
        setSubCategoryData({
          categoryId: "",
          name: "",
          slug: "",
          image: "",
          description: "",
          isActive: true,
        });
        router.refresh();
      } else {
        toast.error(result?.message || "Failed to add subcategory");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add subcategory";
      toast.error(message);
      console.error("Failed to add subcategory:", err);
    } finally {
      setIsSubCategorySubmitting(false);
    }
  }

  // ── Shared CSS classes ──────────────────────────────────────────────────────
  const tabClass =
    "flex items-center gap-2 h-10 px-4 text-xs font-bold rounded-xl cursor-pointer transition-all outline-none text-gray-700 dark:text-gray-200 data-[selected]:bg-gradient-to-r data-[selected]:from-sky-500 data-[selected]:to-blue-600 data-[selected]:text-white data-[selected]:shadow-sm";

  const cardClass =
    "border border-slate-200/80 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 rounded-2xl mt-4";

  const labelClass = "text-xs font-semibold text-gray-700 dark:text-gray-300";

  const visibilityRowClass =
    "flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200/60 dark:border-gray-800 cursor-pointer";

  const saveBtnClass =
    "bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm inline-flex items-center gap-1.5 cursor-pointer hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Manage{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Categories
          </span>
        </h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Add new product categories or assign subcategories to existing ones.
        </p>
      </div>

      {/* ── Tabs: switch between Add Category and Add Subcategory ── */}
      <Tabs>
        <TabList className="flex gap-1 p-1 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 w-fit">
          <Tab id="category" className={tabClass}>
            <FolderPlus className="w-4 h-4" />
            Add Category
          </Tab>
          <Tab id="subcategory" className={tabClass}>
            <Layers className="w-4 h-4" />
            Add Subcategory
          </Tab>
        </TabList>

        {/* ════════════════════════════════════════════════════════
            TAB 1 — Add Category
        ════════════════════════════════════════════════════════ */}
        <TabPanel id="category">
          <Card className={cardClass}>
            <Card.Content className="p-6">
              <form onSubmit={handleCategorySubmit} className="space-y-6">
                {/* Name + Slug side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      Category Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      name="name"
                      placeholder="e.g. Laptops & Computers"
                      value={categoryData.name}
                      onChange={handleCategoryNameChange}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      Slug <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      name="slug"
                      placeholder="laptops-computers"
                      value={categoryData.slug}
                      onChange={(e) =>
                        setCategoryData((prev) => ({
                          ...prev,
                          slug: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Description</label>
                  <TextArea
                    name="description"
                    placeholder="Provide a brief description for this category..."
                    value={categoryData.description ?? ""}
                    onChange={(e) =>
                      setCategoryData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                {/* Thumbnail image */}
                <ImageUploader
                  label="Category Thumbnail"
                  name="image"
                  value={
                    typeof categoryData.image === "string"
                      ? categoryData.image
                      : ""
                  }
                  onChange={(url) =>
                    setCategoryData((prev) => ({ ...prev, image: url }))
                  }
                />

                {/* Active / Inactive toggle */}
                <div className={visibilityRowClass}>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      Category Visibility
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Enable to make this category active across the store
                      front.
                    </p>
                  </div>
                  <input
                    type="hidden"
                    name="isActive"
                    value={String(categoryData.isActive)}
                  />
                  <Switch
                    isSelected={categoryData.isActive}
                    onChange={(isSelected) =>
                      setCategoryData((prev) => ({
                        ...prev,
                        isActive: isSelected,
                      }))
                    }
                    className="cursor-pointer"
                  >
                    <Switch.Content className="cursor-pointer">
                      <Switch.Control className="cursor-pointer">
                        <Switch.Thumb className="cursor-pointer" />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    isDisabled={isCategorySubmitting}
                    className={saveBtnClass}
                  >
                    <Check className="w-4 h-4" />
                    {isCategorySubmitting ? "Saving..." : "Save Category"}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>
        </TabPanel>

        {/* ════════════════════════════════════════════════════════
            TAB 2 — Add Subcategory
        ════════════════════════════════════════════════════════ */}
        <TabPanel id="subcategory">
          <Card className={cardClass}>
            <Card.Content className="p-6">
              <form onSubmit={handleSubCategorySubmit} className="space-y-6">
                {/* Parent category dropdown */}
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>
                    Parent Category <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="hidden"
                    name="categoryId"
                    value={subCategoryData.categoryId}
                  />
                  {categories.length === 0 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                      No categories found. Please create a parent category
                      first.
                    </div>
                  ) : (
                    <Select
                      selectedKey={subCategoryData.categoryId || null}
                      onSelectionChange={(key) =>
                        setSubCategoryData((prev) => ({
                          ...prev,
                          categoryId: key ? String(key) : "",
                        }))
                      }
                      placeholder="Select existing parent category"
                      isRequired
                    >
                      <Select.Trigger className="w-full cursor-pointer">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {categories.map((cat) => {
                            const catId = (cat._id || cat.id || cat.slug) as string;
                            return (
                              <ListBox.Item
                                key={catId}
                                id={catId}
                                textValue={cat.name}
                                className="cursor-pointer"
                              >
                                {cat.name}
                              </ListBox.Item>
                            );
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                </div>

                {/* Name + Slug side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      Subcategory Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      name="name"
                      placeholder="e.g. Gaming Laptops"
                      value={subCategoryData.name}
                      onChange={handleSubCategoryNameChange}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      Slug <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      name="slug"
                      placeholder="gaming-laptops"
                      value={subCategoryData.slug}
                      onChange={(e) =>
                        setSubCategoryData((prev) => ({
                          ...prev,
                          slug: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Description</label>
                  <TextArea
                    name="description"
                    placeholder="Provide a brief description for this subcategory..."
                    value={subCategoryData.description ?? ""}
                    onChange={(e) =>
                      setSubCategoryData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                {/* Thumbnail image */}
                <ImageUploader
                  label="Subcategory Thumbnail"
                  name="image"
                  value={
                    typeof subCategoryData.image === "string"
                      ? subCategoryData.image
                      : ""
                  }
                  onChange={(url) =>
                    setSubCategoryData((prev) => ({ ...prev, image: url }))
                  }
                />

                {/* Active / Inactive toggle */}
                <div className={visibilityRowClass}>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      Subcategory Visibility
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Enable to make this subcategory active under its parent.
                    </p>
                  </div>
                  <input
                    type="hidden"
                    name="isActive"
                    value={String(subCategoryData.isActive)}
                  />
                  <Switch
                    isSelected={subCategoryData.isActive}
                    onChange={(isSelected) =>
                      setSubCategoryData((prev) => ({
                        ...prev,
                        isActive: isSelected,
                      }))
                    }
                    className="cursor-pointer"
                  >
                    <Switch.Content className="cursor-pointer">
                      <Switch.Control className="cursor-pointer">
                        <Switch.Thumb className="cursor-pointer" />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    isDisabled={isSubCategorySubmitting || categories.length === 0}
                    className={saveBtnClass}
                  >
                    <Check className="w-4 h-4" />
                    {isSubCategorySubmitting
                      ? "Saving..."
                      : "Save Subcategory"}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>
        </TabPanel>
      </Tabs>
    </div>
  );
}
