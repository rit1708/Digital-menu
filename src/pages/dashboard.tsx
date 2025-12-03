import { useState, useCallback, useRef, useEffect } from "react";
import Head from "next/head";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "~/components/ui/use-toast";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "~/components/ui/dialog";
import { Plus, LogOut, Settings, QrCode, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { useRequireAuth, AuthLoadingSkeleton } from "~/hooks/use-require-auth";
import { useAuth } from "~/contexts/auth-context";
import { useRestaurants } from "~/hooks/use-restaurants";
import { api } from "~/utils/api";
import { Skeleton } from "~/components/ui/skeleton";
import { createRestaurantSchema, type CreateRestaurantInput } from "~/lib/validations";
import { cn } from "~/lib/utils";
import { getFirstErrorField } from "~/lib/form-utils";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const { isLoading: isAuthLoading } = useRequireAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<{ id: string; name: string } | null>(null);
  const [restaurantToEdit, setRestaurantToEdit] = useState<{ id: string; name: string; location: string } | null>(null);

  const { 
    restaurants, 
    isLoading: restaurantsLoading, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch 
  } = useRestaurants(!!user);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const restaurantForm = useForm<CreateRestaurantInput>({
    resolver: zodResolver(createRestaurantSchema),
    mode: "onTouched",
    defaultValues: { name: "", location: "" },
  });


  const createRestaurant = api.restaurant.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant created successfully",
      });
      setShowCreateDialog(false);
      restaurantForm.reset();
      void refetch();
      createRestaurant.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create restaurant",
        variant: "destructive",
      });
    },
  });

  const updateRestaurant = api.restaurant.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant updated successfully",
      });
      setShowEditDialog(false);
      setRestaurantToEdit(null);
      restaurantForm.reset();
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update restaurant",
        variant: "destructive",
      });
    },
  });

  const deleteRestaurant = api.restaurant.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant deleted successfully",
      });
      setDeleteDialogOpen(false);
      setRestaurantToDelete(null);
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete restaurant",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (restaurant: { id: string; name: string }) => {
    setRestaurantToDelete(restaurant);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (restaurantToDelete) {
      deleteRestaurant.mutate({ id: restaurantToDelete.id });
    }
  };

  const handleCreateRestaurant = useCallback((data: CreateRestaurantInput) => {
    createRestaurant.mutate({
      name: data.name.trim(),
      location: data.location.trim(),
    });
  }, [createRestaurant]);

  const handleUpdateRestaurant = useCallback((data: CreateRestaurantInput) => {
    if (!restaurantToEdit) return;
    updateRestaurant.mutate({
      id: restaurantToEdit.id,
      name: data.name.trim(),
      location: data.location.trim(),
    });
  }, [restaurantToEdit, updateRestaurant]);

  const handleEditClick = useCallback((restaurant: { id: string; name: string; location: string }) => {
    setRestaurantToEdit(restaurant);
    restaurantForm.reset({
      name: restaurant.name,
      location: restaurant.location,
    });
    setShowEditDialog(true);
  }, [restaurantForm]);

  if (isAuthLoading || !user) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <>
      <Head>
        <title>Dashboard - My Restaurants | Digital Menu Management</title>
        <meta name="description" content="Manage your restaurants and create digital menus" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Dashboard - My Restaurants" />
        <meta property="og:description" content="Manage your restaurants and create digital menus" />
        <meta property="og:type" content="website" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <nav className="bg-white border-b shadow-sm sticky top-0 z-50" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900" id="main-heading">Dashboard</h1>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">{user.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void logout()}
                className="h-9 sm:h-10"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" aria-labelledby="main-heading">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">My Restaurants</h2>
          <Dialog 
            open={showCreateDialog} 
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) {
                restaurantForm.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button aria-label="Create new restaurant">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Create Restaurant
              </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Create New Restaurant</DialogTitle>
                <DialogDescription>
                  Add a new restaurant to manage its menu
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={restaurantForm.handleSubmit(handleCreateRestaurant)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name *</Label>
                  <Input
                    id="name"
                    placeholder="Super Restaurant Mumbai"
                    autoFocus={false}
                    {...restaurantForm.register("name")}
                    className={cn(
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
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="Mumbai, India"
                    autoFocus={false}
                    {...restaurantForm.register("location")}
                    className={cn(
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
                  disabled={createRestaurant.isPending}
                  className="w-full h-11 sm:h-12 text-base font-medium"
                >
                  {createRestaurant.isPending ? "Creating..." : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {restaurantsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
              <p className="text-gray-500 mb-4 text-center text-base sm:text-lg">No restaurants yet</p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="h-11 sm:h-12 px-6 text-base font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Restaurant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {restaurants.map((restaurant) => (
                <Card key={restaurant.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl line-clamp-1">{restaurant.name}</CardTitle>
                    <CardDescription className="text-sm sm:text-base">{restaurant.location}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-2">
                    <Link href={`/restaurant/${restaurant.id}`} className="flex-1">
                      <Button variant="outline" className="w-full h-10 sm:h-11 text-sm sm:text-base">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/menu/${restaurant.id}`} className="flex-1">
                      <Button variant="outline" className="w-full h-10 sm:h-11 text-sm sm:text-base">
                        <QrCode className="h-4 w-4 mr-2" />
                        View Menu
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(restaurant)}
                      className="h-10 sm:h-11 w-10 sm:w-11 p-0 flex-shrink-0"
                      aria-label={`Edit ${restaurant.name}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(restaurant)}
                      className="h-10 sm:h-11 w-10 sm:w-11 p-0 flex-shrink-0 hover:bg-red-50"
                      aria-label={`Delete ${restaurant.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="py-4">
              {isFetchingNextPage && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Skeleton className="h-10 flex-1" />
                          <Skeleton className="h-10 flex-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit Restaurant Dialog */}
        <Dialog 
          open={showEditDialog} 
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) {
              restaurantForm.reset();
              setRestaurantToEdit(null);
            }
          }}
        >
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Edit Restaurant</DialogTitle>
              <DialogDescription>
                Update restaurant information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={restaurantForm.handleSubmit(handleUpdateRestaurant)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Restaurant Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Super Restaurant Mumbai"
                  autoFocus={false}
                  {...restaurantForm.register("name")}
                  className={cn(
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
                <Label htmlFor="edit-location">Location *</Label>
                <Input
                  id="edit-location"
                  placeholder="Mumbai, India"
                  autoFocus={false}
                  {...restaurantForm.register("location")}
                  className={cn(
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Delete Restaurant</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{restaurantToDelete?.name}"? This action cannot be undone and will delete all associated categories, dishes, and menu data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setRestaurantToDelete(null);
                }}
                disabled={deleteRestaurant.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteRestaurant.isPending}
              >
                {deleteRestaurant.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
    </>
  );
}

