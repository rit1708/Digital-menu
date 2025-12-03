import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Head from "next/head";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "~/components/ui/dialog";
import { useToast } from "~/components/ui/use-toast";
import { Skeleton } from "~/components/ui/skeleton";
import { Plus, Trash2, Edit, ArrowLeft, QrCode } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRequireAuth, AuthLoadingSkeleton } from "~/hooks/use-require-auth";
import { useCategories } from "~/hooks/use-categories";
import { useDishes } from "~/hooks/use-dishes";
import { unwrapData } from "~/hooks/use-unwrap-data";
import {
  createCategorySchema,
  dishFormSchema,
  createRestaurantSchema,
  type CreateCategoryInput,
  type DishFormInput,
  type CreateRestaurantInput,
} from "~/lib/validations";
import { cn } from "~/lib/utils";
import { getFirstErrorField } from "~/lib/form-utils";

export default function RestaurantManagement() {
  const { query } = useRouter();
  const { id } = query;
  const { toast } = useToast();
  const { isLoading: isAuthLoading } = useRequireAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showDishDialog, setShowDishDialog] = useState(false);
  const [showRestaurantDialog, setShowRestaurantDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [showDeleteDishDialog, setShowDeleteDishDialog] = useState(false);
  const [editingDish, setEditingDish] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [dishToDelete, setDishToDelete] = useState<{ id: string; name: string } | null>(null);

  const restaurantQuery = api.restaurant.getById.useQuery(
    { id: id as string },
    { 
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    }
  );
  const restaurant = unwrapData<{ name: string; location: string; id: string }>(restaurantQuery.data);

  const { 
    categories, 
    isLoading: categoriesLoading, 
    isFetchingNextPage: isFetchingNextCategory,
    hasNextPage: hasNextCategory,
    fetchNextPage: fetchNextCategory,
    refetch: refetchCategories 
  } = useCategories(
    id as string | undefined,
    !!id
  );

  const { 
    dishes, 
    isLoading: dishesLoading, 
    isFetchingNextPage: isFetchingNextDish,
    hasNextPage: hasNextDish,
    fetchNextPage: fetchNextDish,
    refetch: refetchDishes 
  } = useDishes(
    id as string | undefined,
    !!id
  );

  // Infinite scroll observers
  const loadMoreCategoriesRef = useRef<HTMLDivElement>(null);
  const loadMoreDishesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextCategory && !isFetchingNextCategory) {
          void fetchNextCategory();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreCategoriesRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextCategory, isFetchingNextCategory, fetchNextCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextDish && !isFetchingNextDish) {
          void fetchNextDish();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreDishesRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextDish, isFetchingNextDish, fetchNextDish]);

  // Restaurant form
  const restaurantForm = useForm<CreateRestaurantInput>({
    resolver: zodResolver(createRestaurantSchema),
    mode: "onTouched",
    defaultValues: { name: "", location: "" },
  });

  // Category form
  const categoryForm = useForm<Omit<CreateCategoryInput, "restaurantId">>({
    resolver: zodResolver(createCategorySchema.omit({ restaurantId: true })),
    mode: "onTouched",
    defaultValues: { name: "" },
  });

  // Dish form (for create and update)
  const dishForm = useForm<DishFormInput>({
    resolver: zodResolver(dishFormSchema) as any,
    mode: "onTouched",
    defaultValues: {
      name: "",
      description: "",
      image: "",
      price: undefined,
      spiceLevel: undefined,
      isVegetarian: true,
      categoryIds: [],
    },
  });


  const createCategory = api.category.create.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Category created" });
      setShowCategoryDialog(false);
      categoryForm.reset();
      void restaurantQuery.refetch();
      void refetchCategories();
    },
  });

  const updateRestaurant = api.restaurant.update.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Restaurant updated" });
      setShowRestaurantDialog(false);
      restaurantForm.reset();
      void restaurantQuery.refetch();
    },
  });

  const updateCategory = api.category.update.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Category updated" });
      setShowCategoryDialog(false);
      setEditingCategory(null);
      categoryForm.reset();
      void restaurantQuery.refetch();
      void refetchCategories();
    },
  });

  const deleteCategory = api.category.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Category deleted" });
      setShowDeleteCategoryDialog(false);
      setCategoryToDelete(null);
      void restaurantQuery.refetch();
      void refetchCategories();
    },
  });

  const createDish = api.dish.create.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Dish created" });
      setShowDishDialog(false);
      dishForm.reset();
      void restaurantQuery.refetch();
      void refetchDishes();
    },
  });

  const updateDish = api.dish.update.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Dish updated" });
      setShowDishDialog(false);
      setEditingDish(null);
      dishForm.reset();
      void restaurantQuery.refetch();
      void refetchDishes();
    },
  });

  const deleteDish = api.dish.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Dish deleted" });
      setShowDeleteDishDialog(false);
      setDishToDelete(null);
      void restaurantQuery.refetch();
      void refetchDishes();
    },
  });

  const handleCreateCategory = useCallback((data: Omit<CreateCategoryInput, "restaurantId">) => {
    if (!id) return;
    createCategory.mutate({
      restaurantId: id as string,
      name: data.name.trim(),
    });
  }, [id, createCategory]);

  const handleUpdateCategory = useCallback((data: Omit<CreateCategoryInput, "restaurantId">) => {
    if (!editingCategory) return;
    updateCategory.mutate({
      id: editingCategory,
      name: data.name.trim(),
    });
  }, [editingCategory, updateCategory]);

  const handleEditCategory = useCallback((categoryId: string) => {
    const category = categories?.find((c) => c.id === categoryId);
    if (category) {
      setEditingCategory(categoryId);
      categoryForm.reset({ name: category.name });
      setShowCategoryDialog(true);
    }
  }, [categories, categoryForm]);

  const handleUpdateRestaurant = useCallback((data: CreateRestaurantInput) => {
    if (!id) return;
    updateRestaurant.mutate({
      id: id as string,
      name: data.name.trim(),
      location: data.location.trim(),
    });
  }, [id, updateRestaurant]);

  const handleEditRestaurant = useCallback(() => {
    if (restaurant) {
      restaurantForm.reset({
        name: restaurant.name,
        location: restaurant.location,
      });
      setShowRestaurantDialog(true);
    }
  }, [restaurant, restaurantForm]);

  const handleDeleteCategoryClick = useCallback((category: { id: string; name: string }) => {
    setCategoryToDelete(category);
    setShowDeleteCategoryDialog(true);
  }, []);

  const handleConfirmDeleteCategory = useCallback(() => {
    if (categoryToDelete) {
      deleteCategory.mutate({ id: categoryToDelete.id });
    }
  }, [categoryToDelete, deleteCategory]);

  const handleDeleteDishClick = useCallback((dish: { id: string; name: string }) => {
    setDishToDelete(dish);
    setShowDeleteDishDialog(true);
  }, []);

  const handleConfirmDeleteDish = useCallback(() => {
    if (dishToDelete) {
      deleteDish.mutate({ id: dishToDelete.id });
    }
  }, [dishToDelete, deleteDish]);

  const handleCreateDish = useCallback((data: DishFormInput) => {
    if (!id) return;
    createDish.mutate({
      restaurantId: id as string,
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      image: data.image?.trim() || undefined,
      price: data.price ?? undefined,
      spiceLevel: data.spiceLevel ?? undefined,
      isVegetarian: data.isVegetarian ?? true,
      categoryIds: data.categoryIds && data.categoryIds.length > 0 ? data.categoryIds : undefined,
    });
  }, [id, createDish]);

  const handleUpdateDish = useCallback((data: DishFormInput) => {
    if (!editingDish) return;
    updateDish.mutate({
      id: editingDish,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      image: data.image?.trim() || null,
      price: data.price ?? null,
      spiceLevel: data.spiceLevel ?? null,
      isVegetarian: data.isVegetarian,
      categoryIds: data.categoryIds || [],
    });
  }, [editingDish, updateDish]);

  const openEditDish = useCallback((dish: { 
    id: string; 
    name: string; 
    description: string | null; 
    image: string | null; 
    price: number | null; 
    spiceLevel: number | null; 
    isVegetarian: boolean | null;
    categories: Array<{ category: { id: string } }>;
  }) => {
    setEditingDish(dish.id);
    dishForm.reset({
      name: dish.name,
      description: dish.description || "",
      image: dish.image || "",
      price: dish.price ?? undefined,
      spiceLevel: dish.spiceLevel ?? undefined,
      isVegetarian: dish.isVegetarian ?? true,
      categoryIds: dish.categories.map((dc) => dc.category.id),
    });
    setShowDishDialog(true);
  }, [dishForm]);

  const filteredDishes = useMemo(() => {
    if (!selectedCategory) return dishes;
    return dishes?.filter((dish) =>
      dish.categories.some((dc) => dc.category.id === selectedCategory)
    );
  }, [dishes, selectedCategory]);

  if (isAuthLoading) {
    return <AuthLoadingSkeleton />;
  }

  const pageTitle = restaurant ? `Manage ${restaurant.name} | Digital Menu Management` : "Restaurant Management";
  const pageDescription = restaurant 
    ? `Manage menu, categories, and dishes for ${restaurant.name} located in ${restaurant.location}`
    : "Manage your restaurant menu";

  if (restaurantQuery.isLoading || categoriesLoading || dishesLoading || !restaurant) {
    return (
      <>
        <Head>
          <title>Loading... | Digital Menu Management</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <nav className="bg-white border-b" role="navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-32" />
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={restaurant ? `Manage ${restaurant.name}` : "Restaurant Management"} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="h-9 sm:h-10" aria-label="Go back to dashboard">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <h1 className="text-lg sm:text-xl font-semibold truncate">
                {restaurant && "name" in restaurant ? restaurant.name : ""}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditRestaurant}
                className="h-9 sm:h-10"
                aria-label="Edit restaurant"
              >
                <Edit className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <Link href={`/menu/${id}`}>
              <Button variant="outline" size="sm" className="h-9 sm:h-10" aria-label="View public menu">
                <QrCode className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">View Menu</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" role="main">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 lg:top-24">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg sm:text-xl">Categories</CardTitle>
                  <Dialog 
                    open={showCategoryDialog} 
                    onOpenChange={(open) => {
                      setShowCategoryDialog(open);
                      if (!open) {
                        categoryForm.reset();
                        setEditingCategory(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-9 w-9 sm:h-10 sm:w-10" aria-label="Create new category">
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">
                          {editingCategory ? "Edit Category" : "Create Category"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={categoryForm.handleSubmit(editingCategory ? handleUpdateCategory : handleCreateCategory)} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="category-name" className="text-sm sm:text-base">Category Name *</Label>
                          <Input
                            id="category-name"
                            placeholder="e.g., Starters, Main Course"
                            autoFocus={false}
                            {...categoryForm.register("name")}
                            className={cn(
                              "h-10 sm:h-11",
                              ((categoryForm.formState.touchedFields.name || categoryForm.formState.isSubmitted) && 
                               categoryForm.formState.errors.name && 
                               getFirstErrorField(categoryForm.formState.errors) === "name") ? "!border-red-500" : ""
                            )}
                          />
                          {(categoryForm.formState.touchedFields.name || categoryForm.formState.isSubmitted) && categoryForm.formState.errors.name && (
                            <p className="text-sm text-red-500">
                              {categoryForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        <Button 
                          type="submit"
                          disabled={createCategory.isPending || updateCategory.isPending}
                          className="w-full h-11 sm:h-12 text-base font-medium"
                        >
                          {editingCategory 
                            ? (updateCategory.isPending ? "Updating..." : "Update")
                            : (createCategory.isPending ? "Creating..." : "Create")
                          }
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  <Button
                    variant={selectedCategory === null ? "default" : "ghost"}
                    className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All Dishes
                  </Button>
                  {categories?.map((category) => (
                    <div key={category.id} className="flex items-center justify-between group gap-2">
                      <Button
                        variant={selectedCategory === category.id ? "default" : "ghost"}
                        className="flex-1 justify-start h-10 sm:h-11 text-sm sm:text-base"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        {category.name}
                      </Button>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category.id)}
                          className="h-10 w-10 sm:h-11 sm:w-11"
                          aria-label={`Edit ${category.name}`}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategoryClick(category)}
                          className="h-10 w-10 sm:h-11 sm:w-11"
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {/* Infinite scroll trigger for categories */}
                  <div ref={loadMoreCategoriesRef} className="py-2">
                    {isFetchingNextCategory && (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dishes */}
          <div className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {selectedCategory
                  ? categories?.find((c) => c.id === selectedCategory)?.name ?? "Dishes"
                  : "All Dishes"}
              </h2>
              <Dialog open={showDishDialog} onOpenChange={(open) => {
                setShowDishDialog(open);
                if (!open) {
                  setEditingDish(null);
                  dishForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base font-medium" aria-label="Add new dish">
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Dish
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-3xl" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">
                      {editingDish ? "Edit Dish" : "Create Dish"}
                    </DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={dishForm.handleSubmit((data) => {
                      const formData = data as DishFormInput;
                      if (editingDish) {
                        handleUpdateDish(formData);
                      } else {
                        handleCreateDish(formData);
                      }
                    })}
                    className="space-y-4 py-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="dish-name" className="text-sm sm:text-base">Dish Name *</Label>
                      <Input
                        id="dish-name"
                        placeholder="e.g., Aloo Tikki"
                        autoFocus={false}
                        {...dishForm.register("name")}
                        className={cn(
                          "h-10 sm:h-11",
                          ((dishForm.formState.touchedFields.name || dishForm.formState.isSubmitted) && 
                           dishForm.formState.errors.name && 
                           getFirstErrorField(dishForm.formState.errors) === "name") ? "!border-red-500" : ""
                        )}
                      />
                      {(dishForm.formState.touchedFields.name || dishForm.formState.isSubmitted) && dishForm.formState.errors.name && (
                        <p className="text-sm text-red-500">
                          {dishForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dish-description" className="text-sm sm:text-base">Description</Label>
                      <textarea
                        id="dish-description"
                        className={cn(
                          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none",
                          ((dishForm.formState.touchedFields.description || dishForm.formState.isSubmitted) && 
                           dishForm.formState.errors.description && 
                           getFirstErrorField(dishForm.formState.errors) === "description") ? "!border-red-500" : ""
                        )}
                        {...dishForm.register("description")}
                        placeholder="Dish description..."
                        autoFocus={false}
                      />
                      {(dishForm.formState.touchedFields.description || dishForm.formState.isSubmitted) && dishForm.formState.errors.description && (
                        <p className="text-sm text-red-500">
                          {dishForm.formState.errors.description.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dish-image" className="text-sm sm:text-base">Image URL</Label>
                      <Input
                        id="dish-image"
                        placeholder="https://example.com/image.jpg"
                        autoFocus={false}
                        {...dishForm.register("image")}
                        className={cn(
                          "h-10 sm:h-11",
                          ((dishForm.formState.touchedFields.image || dishForm.formState.isSubmitted) && 
                           dishForm.formState.errors.image && 
                           getFirstErrorField(dishForm.formState.errors) === "image") ? "!border-red-500" : ""
                        )}
                      />
                      {(dishForm.formState.touchedFields.image || dishForm.formState.isSubmitted) && dishForm.formState.errors.image && (
                        <p className="text-sm text-red-500">
                          {dishForm.formState.errors.image.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dish-price" className="text-sm sm:text-base">Price (₹)</Label>
                        <Input
                          id="dish-price"
                          type="number"
                          min="0"
                          step="0.01"
                          autoFocus={false}
                          {...dishForm.register("price", {
                            valueAsNumber: true,
                            setValueAs: (v) => {
                              if (v === "" || v === null || v === undefined) return undefined;
                              const num = parseFloat(v);
                              return isNaN(num) ? undefined : num;
                            },
                          })}
                          placeholder="0.00"
                          className={cn(
                            "h-10 sm:h-11",
                            ((dishForm.formState.touchedFields.price || dishForm.formState.isSubmitted) && 
                             dishForm.formState.errors.price && 
                             getFirstErrorField(dishForm.formState.errors) === "price") ? "!border-red-500" : ""
                          )}
                        />
                        {(dishForm.formState.touchedFields.price || dishForm.formState.isSubmitted) && dishForm.formState.errors.price && (
                          <p className="text-sm text-red-500">
                            {dishForm.formState.errors.price.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dish-spice" className="text-sm sm:text-base">Spice Level (0-5)</Label>
                        <Input
                          id="dish-spice"
                          type="number"
                          min="0"
                          max="5"
                          autoFocus={false}
                          {...dishForm.register("spiceLevel", {
                            valueAsNumber: true,
                            setValueAs: (v) => {
                              if (v === "" || v === null || v === undefined) return undefined;
                              const num = parseInt(v);
                              return isNaN(num) ? undefined : num;
                            },
                          })}
                          placeholder="0"
                          className={cn(
                            "h-10 sm:h-11",
                            ((dishForm.formState.touchedFields.spiceLevel || dishForm.formState.isSubmitted) && 
                             dishForm.formState.errors.spiceLevel && 
                             getFirstErrorField(dishForm.formState.errors) === "spiceLevel") ? "!border-red-500" : ""
                          )}
                        />
                        {(dishForm.formState.touchedFields.spiceLevel || dishForm.formState.isSubmitted) && dishForm.formState.errors.spiceLevel && (
                          <p className="text-sm text-red-500">
                            {dishForm.formState.errors.spiceLevel.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="dish-vegetarian"
                        {...dishForm.register("isVegetarian")}
                        className="cursor-pointer"
                      />
                      <Label htmlFor="dish-vegetarian" className="text-sm sm:text-base cursor-pointer">
                        Vegetarian
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">Categories</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                        {categories?.length === 0 ? (
                          <p className="text-sm text-gray-500">No categories available. Create one first.</p>
                        ) : (
                          categories?.map((category) => (
                            <label
                              key={category.id}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={dishForm.watch("categoryIds")?.includes(category.id) ?? false}
                                onChange={(e) => {
                                  const currentIds = dishForm.getValues("categoryIds") || [];
                                  if (e.target.checked) {
                                    dishForm.setValue("categoryIds", [...currentIds, category.id]);
                                  } else {
                                    dishForm.setValue(
                                      "categoryIds",
                                      currentIds.filter((id) => id !== category.id)
                                    );
                                  }
                                }}
                                className="cursor-pointer"
                              />
                              <span className="text-sm sm:text-base">{category.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 sm:h-12 text-base font-medium"
                      disabled={createDish.isPending || updateDish.isPending}
                    >
                      {createDish.isPending || updateDish.isPending
                        ? editingDish
                          ? "Updating..."
                          : "Creating..."
                        : editingDish
                          ? "Update"
                          : "Create" + " Dish"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {filteredDishes && filteredDishes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 sm:py-16 text-center">
                    <p className="text-gray-500 text-base sm:text-lg mb-4">No dishes yet. Create your first dish!</p>
                    <Button 
                      onClick={() => setShowDishDialog(true)}
                      className="h-10 sm:h-11 text-sm sm:text-base font-medium"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Dish
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {filteredDishes?.map((dish) => (
                    <Card key={dish.id} className="hover:shadow-md transition-shadow duration-200">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex gap-3 sm:gap-4">
                          {dish.image && (
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={dish.image}
                                alt={`${dish.name}${dish.description ? ` - ${dish.description}` : ""}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 80px, 96px"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <div
                                  className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${
                                    dish.isVegetarian ? "bg-green-500" : "bg-red-500"
                                  }`}
                                  role="img"
                                  aria-label={dish.isVegetarian ? "Vegetarian dish" : "Non-vegetarian dish"}
                                  title={dish.isVegetarian ? "Vegetarian" : "Non-vegetarian"}
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-base sm:text-lg text-gray-900">{dish.name}</h3>
                                  {dish.description && (
                                    <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                                      {dish.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                                    {dish.price !== null && dish.price !== undefined && (
                                      <span className="font-semibold text-gray-900 text-sm sm:text-base">
                                        ₹ {dish.price.toFixed(0)}
                                      </span>
                                    )}
                                    {dish.spiceLevel !== null && dish.spiceLevel !== undefined && dish.spiceLevel > 0 && (
                                      <div className="flex items-center gap-1" role="img" aria-label={`Spice level: ${dish.spiceLevel} out of 5`}>
                                        {Array.from({ length: Math.min(dish.spiceLevel, 5) }).map((_, i) => (
                                          <span key={i} className="text-xs sm:text-sm" aria-hidden="true">
                                            🌶️
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {dish.categories.length > 0 && (
                                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                                        {dish.categories.map((dc) => (
                                          <span
                                            key={dc.category.id}
                                            className="text-xs bg-gray-100 px-2 py-0.5 sm:py-1 rounded text-gray-700"
                                          >
                                            {dc.category.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDish(dish)}
                                  className="h-9 w-9 sm:h-10 sm:w-10 p-0"
                                  aria-label={`Edit ${dish.name}`}
                                >
                                  <Edit className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDishClick(dish)}
                                  className="h-9 w-9 sm:h-10 sm:w-10 p-0"
                                  aria-label={`Delete ${dish.name}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {/* Infinite scroll trigger for dishes */}
                  <div ref={loadMoreDishesRef} className="py-4">
                    {isFetchingNextDish && (
                      <div className="space-y-3 sm:space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="hover:shadow-md">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex gap-3 sm:gap-4">
                                <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-5 w-3/4" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-1/2" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Restaurant Dialog */}
      <Dialog 
        open={showRestaurantDialog} 
        onOpenChange={(open) => {
          setShowRestaurantDialog(open);
          if (!open) {
            restaurantForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Restaurant</DialogTitle>
            <DialogDescription>
              Update restaurant information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={restaurantForm.handleSubmit(handleUpdateRestaurant)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name" className="text-sm sm:text-base">Restaurant Name *</Label>
              <Input
                id="restaurant-name"
                placeholder="e.g., Super Restaurant Mumbai"
                autoFocus={false}
                {...restaurantForm.register("name")}
                className={cn(
                  "h-10 sm:h-11",
                  ((restaurantForm.formState.touchedFields.name || restaurantForm.formState.isSubmitted) && 
                   restaurantForm.formState.errors.name && 
                   getFirstErrorField(restaurantForm.formState.errors) === "name") ? "!border-red-500" : ""
                )}
              />
              {(restaurantForm.formState.touchedFields.name || restaurantForm.formState.isSubmitted) && restaurantForm.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {restaurantForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurant-location" className="text-sm sm:text-base">Location *</Label>
              <Input
                id="restaurant-location"
                placeholder="e.g., Mumbai, India"
                autoFocus={false}
                {...restaurantForm.register("location")}
                className={cn(
                  "h-10 sm:h-11",
                  ((restaurantForm.formState.touchedFields.location || restaurantForm.formState.isSubmitted) && 
                   restaurantForm.formState.errors.location && 
                   getFirstErrorField(restaurantForm.formState.errors) === "location") ? "!border-red-500" : ""
                )}
              />
              {(restaurantForm.formState.touchedFields.location || restaurantForm.formState.isSubmitted) && restaurantForm.formState.errors.location && (
                <p className="text-sm text-red-500">
                  {restaurantForm.formState.errors.location.message}
                </p>
              )}
            </div>
            <Button 
              type="submit"
              disabled={updateRestaurant.isPending}
              className="w-full h-11 sm:h-12 text-base font-medium"
            >
              {updateRestaurant.isPending ? "Updating..." : "Update"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone and will remove the category from all associated dishes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteCategoryDialog(false);
                setCategoryToDelete(null);
              }}
              disabled={deleteCategory.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteCategory}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dish Confirmation Dialog */}
      <Dialog open={showDeleteDishDialog} onOpenChange={setShowDeleteDishDialog}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Delete Dish</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{dishToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDishDialog(false);
                setDishToDelete(null);
              }}
              disabled={deleteDish.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteDish}
              disabled={deleteDish.isPending}
            >
              {deleteDish.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

